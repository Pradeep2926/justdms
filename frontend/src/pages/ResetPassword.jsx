import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, LockKeyhole } from "lucide-react";
import AuthLayout from "../components/layout/AuthLayout";
import { supabase } from "../lib/supabase";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [checking, setChecking] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ready, setReady] = useState(false);
  const [complete, setComplete] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;

    const prepareSession = async () => {
      try {
        const code = searchParams.get("code");
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        }

        const { data } = await supabase.auth.getSession();
        if (!active) return;
        if (!data?.session) {
          setMessage("This password reset link is invalid or has expired. Request a new one.");
        } else {
          setReady(true);
        }
      } catch (error) {
        if (active) setMessage(error.message || "Unable to open this reset link.");
      } finally {
        if (active) setChecking(false);
      }
    };

    prepareSession();
    return () => {
      active = false;
    };
  }, [searchParams]);

  const updatePassword = async (event) => {
    event.preventDefault();
    setMessage("");

    if (password.length < 8) {
      setMessage("Use at least 8 characters for your new password.");
      return;
    }
    if (password !== confirmPassword) {
      setMessage("The passwords do not match.");
      return;
    }

    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setMessage(error.message);
    } else {
      setComplete(true);
      setTimeout(() => navigate("/login", { replace: true }), 1800);
    }
    setSaving(false);
  };

  return (
    <AuthLayout title="Create a new password" subtitle="Choose a strong password for your JustDMs account">
      {checking ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
        </div>
      ) : complete ? (
        <div className="space-y-4 py-5 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
          <h2 className="text-xl font-bold text-slate-950">Password updated</h2>
          <p className="text-sm text-slate-500">Redirecting you to sign in...</p>
        </div>
      ) : ready ? (
        <form onSubmit={updatePassword} className="space-y-5">
          <PasswordField label="New password" value={password} onChange={setPassword} />
          <PasswordField label="Confirm new password" value={confirmPassword} onChange={setConfirmPassword} />
          {message && <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{message}</p>}
          <button type="submit" disabled={saving} className="btn-primary min-h-12 w-full">
            <LockKeyhole className="h-4 w-4" />
            {saving ? "Updating..." : "Update password"}
          </button>
        </form>
      ) : (
        <div className="space-y-5 text-center">
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{message}</p>
          <Link to="/forgot-password" className="inline-flex font-semibold text-brand-600 hover:underline">
            Request a new reset link
          </Link>
        </div>
      )}
    </AuthLayout>
  );
}

function PasswordField({ label, value, onChange }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-700">{label}</span>
      <input
        required
        type="password"
        minLength={8}
        autoComplete="new-password"
        className="input min-h-12"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="At least 8 characters"
      />
    </label>
  );
}
