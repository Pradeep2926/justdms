import { useState } from "react";
import { supabase } from "../lib/supabase";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../components/layout/AuthLayout";
import { BadgeCheck, ChevronDown } from "lucide-react";

export default function Register() {
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  function normalizeMobile(value) {
    const trimmed = value.trim();
    if (!trimmed) return "";
    return trimmed.startsWith("+") ? trimmed : `+91 ${trimmed}`;
  }

  async function saveProfile(user, profile) {
    return supabase.from("ProfileUsers").upsert(
      {
        id: user.id,
        FirstName: profile.firstName || null,
        LastName: profile.lastName || null,
        Email: user.email || profile.email,
        Mobile: profile.mobile || null,
      },
      {
        onConflict: "id",
      }
    );
  }

  async function handleRegister(e) {
    e.preventDefault();
    setLoading(true);

    const profile = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      mobile: normalizeMobile(mobile),
      email: email.trim().toLowerCase(),
    };

    localStorage.setItem("pendingProfile", JSON.stringify(profile));

    const { data, error } = await supabase.auth.signUp({
      email: profile.email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/verify`,
        data: {
          first_name: profile.firstName,
          last_name: profile.lastName,
          mobile: profile.mobile,
        },
      },
    });

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    const user = data.user;

    if (!user) {
      navigate(`/verify?email=${encodeURIComponent(profile.email)}`);
      setLoading(false);
      return;
    }

    if (!data.session || !user.email_confirmed_at) {
      navigate(`/verify?email=${encodeURIComponent(profile.email)}&sent=1`);
      setLoading(false);
      return;
    }

    const { error: profileError } = await saveProfile(user, profile);

    if (profileError) {
      console.error(profileError);
      if (!data.session) {
        navigate(`/verify?email=${encodeURIComponent(profile.email)}`);
        setLoading(false);
        return;
      }
      alert(`Profile creation failed: ${profileError.message}`);
      setLoading(false);
      return;
    }

    localStorage.removeItem("pendingProfile");
    setLoading(false);
    navigate("/connect-meta");
  }

  async function handleGoogleSignup() {
    setGoogleLoading(true);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/connect-meta`,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });

    if (error) {
      alert(error.message);
      setGoogleLoading(false);
    }
  }

  return (
    <AuthLayout title="Create your account" hideHeader>
      <form onSubmit={handleRegister} className="space-y-5">
        <button
          type="button"
          onClick={handleGoogleSignup}
          disabled={googleLoading}
          className="w-full min-h-[56px] rounded-2xl border border-slate-200 bg-white px-5 text-lg font-semibold text-slate-700 shadow-sm transition hover:border-brand-200 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-70"
        >
          <span className="inline-flex items-center justify-center gap-4">
            <span className="text-xl font-bold text-blue-500">G</span>
            {googleLoading ? "Opening Google..." : "Sign up with Google"}
          </span>
        </button>

        <div className="flex items-center gap-4">
          <div className="h-px flex-1 bg-slate-200" />
          <span className="text-sm font-bold uppercase text-slate-400">or</span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <input
              required
              placeholder="First Name"
              className="input min-h-[52px] rounded-xl bg-slate-50 text-base font-medium"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>
          <div>
            <input
              required
              placeholder="Last Name"
              className="input min-h-[52px] rounded-xl bg-slate-50 text-base font-medium"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
        </div>

        <div>
          <div className="flex min-h-[56px] items-center rounded-xl border border-slate-200 bg-slate-50 px-4 transition focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-100">
            <span className="mr-2 text-2xl" aria-hidden="true">
              🇮🇳
            </span>
            <ChevronDown className="mr-3 h-4 w-4 text-slate-400" />
            <span className="mr-2 text-base font-medium text-slate-900">+91</span>
            <input
              required
              inputMode="tel"
              placeholder="77991 00870"
              className="min-w-0 flex-1 bg-transparent text-base font-medium text-slate-900 outline-none placeholder:text-slate-400"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
            />
          </div>
        </div>

        <div>
          <input
            required
            type="email"
            placeholder="Email"
            className="input min-h-[56px] rounded-xl bg-blue-50/80 text-base font-medium"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {email.trim() && (
            <p className="mt-2 px-2 text-sm font-medium text-slate-500">
              Verification link will be sent to{" "}
              <span className="text-brand-600">{email.trim().toLowerCase()}</span>
            </p>
          )}
        </div>

        <div>
          <input
            required
            type="password"
            minLength={6}
            placeholder="Password"
            className="input min-h-[56px] rounded-xl bg-slate-50 text-base font-medium"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-blue-500">
            <BadgeCheck className="h-7 w-7" />
          </div>
          <div>
            <p className="text-sm font-bold text-blue-600">Meta-verified partner</p>
            <p className="text-sm font-medium leading-5 text-slate-500">
              We only use official Instagram APIs and processes. Your Instagram
              account is secure, and you stay in full control.
            </p>
          </div>
        </div>

        <p className="text-center text-sm font-medium text-slate-400">
          By joining you agree to our{" "}
          <Link to="/privacy" className="text-brand-600 hover:underline">
            Terms & Privacy Policy
          </Link>
        </p>

        <button
          type="submit"
          disabled={loading}
          className="w-full min-h-[56px] rounded-xl bg-brand-600 px-5 text-lg font-bold text-white shadow-lg shadow-brand-600/20 transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? "Creating Account..." : "Create Account"}
        </button>
      </form>

      <p className="mt-8 text-center text-base font-medium text-slate-500">
        Already have an account?{" "}
        <Link to="/login" className="font-bold text-brand-600 hover:underline">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
