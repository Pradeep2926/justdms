import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Mail } from "lucide-react";
import AuthLayout from "../components/layout/AuthLayout";
import { supabase } from "../lib/supabase";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState("");

  const sendReset = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo: `${window.location.origin}/reset-password` }
    );

    if (error) {
      setMessage(error.message);
    } else {
      setSent(true);
      if (import.meta.env.VITE_USE_LOCAL_AUTH === "true") {
        window.setTimeout(() => {
          window.location.href = "/reset-password";
        }, 800);
      }
    }
    setLoading(false);
  };

  return (
    <AuthLayout title="Reset your password" subtitle="We’ll email you a secure reset link">
      {sent ? (
        <div className="space-y-5 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <Mail className="h-6 w-6" />
          </span>
          <div>
            <h2 className="text-xl font-bold text-slate-950">Check your inbox</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              If an account exists for <span className="font-semibold text-slate-700">{email}</span>, a password reset link has been sent. Check spam too.
            </p>
          </div>
          <button type="button" onClick={() => setSent(false)} className="text-sm font-semibold text-brand-600 hover:underline">
            Send again
          </button>
        </div>
      ) : (
        <form onSubmit={sendReset} className="space-y-5">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">Email address</span>
            <input
              required
              type="email"
              autoComplete="email"
              className="input min-h-12"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
            />
          </label>
          {message && <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{message}</p>}
          <button type="submit" disabled={loading} className="btn-primary min-h-12 w-full">
            {loading ? "Sending..." : "Send reset link"}
          </button>
        </form>
      )}

      <Link to="/login" className="mt-7 flex items-center justify-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-950">
        <ArrowLeft className="h-4 w-4" />
        Back to sign in
      </Link>
    </AuthLayout>
  );
}
