import { useState } from "react";
import { supabase } from "../lib/supabase";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../components/layout/AuthLayout";
import { Chrome } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    const user = data.user;

    const { data: profile, error: profileError } = await supabase
      .from("ProfileUsers")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile && !profileError) {
      const pending = JSON.parse(
        localStorage.getItem("pendingProfile") || "{}"
      );

      await supabase.from("ProfileUsers").insert({
        id: user.id,
        Email: user.email ?? null,
        FirstName: pending.firstName ?? null,
        LastName: pending.lastName ?? null,
        Mobile: pending.mobile ?? null,
      });

      localStorage.removeItem("pendingProfile");
    }

    setLoading(false);
    navigate("/dashboard");
  }

  async function handleGoogleLogin() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });

    if (error) {
      alert(error.message);
    }
  }

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to your JustDMs account">
      <form onSubmit={handleLogin} className="space-y-4">
        <button
          type="button"
          onClick={handleGoogleLogin}
          className="w-full btn-secondary"
        >
          <Chrome className="w-4 h-4" />
          Continue with Google
        </button>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-slate-200" />
          <span className="text-xs font-medium text-slate-400">or</span>
          <div className="h-px flex-1 bg-slate-200" />
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
            placeholder="••••••••"
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button type="submit" disabled={loading} className="w-full btn-primary">
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <p className="text-sm text-center mt-6 text-slate-500">
        Don't have an account?{" "}
        <Link to="/register" className="text-brand-600 font-medium hover:underline">
          Create one free
        </Link>
      </p>
    </AuthLayout>
  );
}
