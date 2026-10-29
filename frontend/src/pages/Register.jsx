import metaLogo from "../assets/meta-logo.png";
import { GoogleMark, PasswordField } from "../components/auth/AuthControls";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../components/layout/AuthLayout";


export default function Register() {
  const navigate = useNavigate();

  const [formError, setFormError] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("ref");
    if (code) localStorage.setItem("justdmsReferralCode", code.trim().toUpperCase());
  }, []);

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
    try {
    e.preventDefault();
    setFormError("");
    setLoading(true);

    const profile = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
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
        },
      },
    });

    if (error) {
      setFormError(error.message);
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
      setFormError(`Profile creation failed: ${profileError.message}`);
      setLoading(false);
      return;
    }

    localStorage.removeItem("pendingProfile");
    setLoading(false);
    navigate("/dashboard");
    } catch (error) {
      setFormError(error.message || "Unable to connect. Please try again.");
      setLoading(false);
      setGoogleLoading(false);
    }
  }

  async function handleGoogleSignup() {
    try {
    setFormError("");
    setGoogleLoading(true);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
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
    <AuthLayout compact title="Create your account" subtitle="Free automation. No credit card required.">
      <form onSubmit={handleRegister} className="space-y-3">
        {formError && <p role="alert" className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm leading-6 text-red-700">{formError}</p>}
        <div>
        <button
          type="button"
          onClick={handleGoogleSignup}
          disabled={googleLoading || loading}
          className="w-full min-h-12 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-brand-200 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-70"
        >
          <span className="inline-flex items-center justify-center gap-4">
            <GoogleMark />
            {googleLoading ? "Opening Google..." : "Continue with Google"}
          </span>
        </button>
          <p className="mt-2 text-center text-[11px] text-slate-500">Quick sign-up · No new password needed</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="h-px flex-1 bg-slate-200" />
          <span className="text-sm font-bold uppercase text-slate-400">or</span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="firstName" className="mb-1.5 block text-sm font-semibold text-slate-700">First name</label>
            <input
              id="firstName"
              autoComplete="given-name"
              required
              placeholder="First name"
              className="input min-h-12 rounded-xl bg-white text-base font-medium"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="lastName" className="mb-1.5 block text-sm font-semibold text-slate-700">Last name</label>
            <input
              id="lastName"
              autoComplete="family-name"
              required
              placeholder="Last name"
              className="input min-h-12 rounded-xl bg-white text-base font-medium"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label htmlFor="signup-email" className="mb-1.5 block text-sm font-semibold text-slate-700">Email address</label>
          <input
            id="signup-email"
            autoComplete="email"
            required
            type="email"
            placeholder="Email"
            className="input min-h-12 rounded-xl bg-white text-base font-medium"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {email.trim() && (
            <p className="mt-1 text-xs text-slate-500">
              Verification link will be sent to{" "}
              <span className="text-brand-600">{email.trim().toLowerCase()}</span>
            </p>
          )}
        </div>

        <PasswordField signup value={password} onChange={(e) => setPassword(e.target.value)} />

        <div className="flex gap-2.5 rounded-xl border border-brand-100 bg-gradient-to-r from-cyan-50/50 to-violet-50/50 p-3"><img src={metaLogo} alt="Meta" width="100" height="100" className="mt-0.5 h-7 w-9 shrink-0 object-contain" /><div><p className="text-xs font-semibold text-slate-800">Official Instagram integration</p><p className="mt-1 text-[11px] leading-[17px] text-slate-500">We use official Instagram APIs and authorization. Your Instagram password stays with Instagram, and you control access.</p></div></div>

        <p className="text-center text-xs leading-5 text-slate-400">
          By joining, you agree to our{" "}
          <Link to="/terms" className="text-brand-600 hover:underline">Terms</Link> and <Link to="/privacy" className="text-brand-600 hover:underline">Privacy Policy</Link>.
        </p>

        <button
          type="submit"
          disabled={loading || googleLoading}
          className="w-full min-h-12 rounded-xl bg-gradient-to-r from-cyan-400 via-brand-600 to-violet-600 px-5 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? "Creating Account..." : "Create free account"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link to="/login" className="font-bold text-brand-600 hover:underline">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
