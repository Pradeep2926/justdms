import { GoogleMark, PasswordField } from "../components/auth/AuthControls";
import { useState } from "react";
import { supabase } from "../lib/supabase";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../components/layout/AuthLayout";


export default function Login() {
  const [formError, setFormError] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleLogin(e) {
    try {
    e.preventDefault();
    setFormError("");
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      if (error.message?.toLowerCase().includes("email not confirmed")) {
        navigate(`/verify?email=${encodeURIComponent(email.trim().toLowerCase())}`);
      } else {
        setFormError(error.message);
      }
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

    window.location.replace("/dashboard");
    } catch (error) {
      setFormError(error.message || "Unable to connect. Please try again.");
      setLoading(false);
      setGoogleLoading(false);
    }
  }

  async function handleGoogleLogin() {
    try {
    setFormError("");
    setGoogleLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });

    if (error) {
      setFormError(error.message);
      setGoogleLoading(false);
    }
    } catch (error) {
      setFormError(error.message || "Unable to connect. Please try again.");
      setLoading(false);
      setGoogleLoading(false);
    }
  }

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to your JustDMs account.">
      <form onSubmit={handleLogin} className="space-y-5">
        {formError && <p role="alert" className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm leading-6 text-red-700">{formError}</p>}
        <div>
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading || googleLoading}
          className="auth-google w-full min-h-12 inline-flex items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-60"
        >
          <GoogleMark />
          {googleLoading ? "Opening Google…" : "Continue with Google"}
        </button>
          <p className="mt-2 text-center text-[11px] text-slate-500">Quick sign-in · No new password needed</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-slate-200" />
          <span className="text-xs font-medium text-slate-400">or</span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        <div>
          <label htmlFor="login-email" className="text-sm font-semibold text-slate-700 mb-2 block">
            Email address
          </label>
          <input
            required
            id="login-email"
            name="email"
            autoComplete="email"
            type="email"
            placeholder="you@example.com"
            className="input min-h-12 rounded-xl bg-white text-base"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div>
          <PasswordField value={password} onChange={(e) => setPassword(e.target.value)} />
          <div className="mt-2 text-right">
            <Link to="/forgot-password" className="text-sm font-semibold text-brand-600 hover:underline">
              Forgot password?
            </Link>
          </div>
        </div>

        <button type="submit" disabled={loading || googleLoading} className="w-full btn-primary min-h-12 rounded-xl ">
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
