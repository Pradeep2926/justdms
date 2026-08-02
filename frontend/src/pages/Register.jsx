import { useState } from "react";
import { supabase } from "../lib/supabase";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../components/layout/AuthLayout";

export default function Register() {
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister(e) {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    const user = data.user;

    if (!user) {
      alert("Signup failed");
      setLoading(false);
      return;
    }

    const { error: profileError } = await supabase
      .from("ProfileUsers")
      .insert({
        id: user.id,
        FirstName: firstName,
        LastName: lastName,
        Email: email,
        Mobile: mobile,
      });

    if (profileError) {
      console.error(profileError);
      alert("Profile creation failed");
      setLoading(false);
      return;
    }

    setLoading(false);
    navigate("/connect-meta");
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Free to start — no credit card required"
    >
      <form onSubmit={handleRegister} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">
              First name
            </label>
            <input
              required
              placeholder="John"
              className="input"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">
              Last name
            </label>
            <input
              required
              placeholder="Doe"
              className="input"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700 mb-1.5 block">
            Mobile
          </label>
          <input
            required
            placeholder="+1 234 567 8900"
            className="input"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700 mb-1.5 block">
            Email
          </label>
          <input
            required
            type="email"
            placeholder="you@example.com"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700 mb-1.5 block">
            Password
          </label>
          <input
            required
            type="password"
            placeholder="Create a strong password"
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button type="submit" disabled={loading} className="w-full btn-primary">
          {loading ? "Creating account..." : "Create account"}
        </button>
      </form>

      <p className="text-sm text-center mt-6 text-slate-500">
        Already have an account?{" "}
        <Link to="/login" className="text-brand-600 font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
