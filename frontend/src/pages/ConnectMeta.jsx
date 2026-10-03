import { BadgeCheck, CheckCircle2, Instagram } from "lucide-react";
import AuthLayout from "../components/layout/AuthLayout";
import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { API_BASE_URL } from "../api/api";
import api from "../api/api";
import { useAuth } from "../hooks/useAuth";

export default function ConnectMeta() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const instagramError = searchParams.get("instagramError");
  const switchAccount = searchParams.get("switch") === "1";
  const { user, loading, logout } = useAuth({ redirectOnFail: true });

  useEffect(() => {
    if (loading || !user?.email || switchAccount || instagramError) return;

    api.get(`/instagram/dashboard/${encodeURIComponent(user.email)}`)
      .then(({ data }) => {
        if (data?.connected) navigate("/dashboard", { replace: true });
      })
      .catch(() => {
        // A missing connection is the expected state for first-time users.
      });
  }, [instagramError, loading, navigate, switchAccount, user?.email]);

  const connectInstagram = () => {
    if (!user) {
      alert("User not logged in");
      return;
    }

    const userEmail = user.email;

    if (!userEmail) {
      alert("User email not found");
      return;
    }

    window.location.href = `${API_BASE_URL}/auth/instagram?userEmail=${encodeURIComponent(userEmail)}`;
  };

  return (
    <AuthLayout
      title="Connect Instagram Account"
      subtitle="Only a few steps away from automating your DMs"
    >
      <div className="text-center space-y-6">
        {instagramError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-left text-sm text-red-700">
            {instagramError}
          </div>
        )}

        <div className="rounded-lg border border-blue-100 bg-slate-50 px-5 py-6 text-left">
          <div className="flex items-center justify-center gap-2 text-blue-600">
            <BadgeCheck className="h-8 w-8" />
            <h2 className="text-lg font-bold">Official Instagram API</h2>
          </div>
          <p className="mt-3 text-center text-sm leading-6 text-slate-600">
            JustDMs uses Instagram&apos;s official authorization process. Your
            password is entered only on Instagram and is never shared with us.
          </p>
          <div className="mt-5 space-y-3 text-sm font-medium text-slate-600">
            {["Official Instagram OAuth login", "Safe and secure", "You stay in full control"].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={connectInstagram}
          disabled={loading}
          className="flex min-h-14 w-full items-center justify-center gap-3 rounded-lg bg-gradient-to-r from-purple-600 via-pink-500 to-orange-400 px-5 text-base font-bold text-white shadow-lg transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Instagram className="h-5 w-5" />
          {loading ? "Checking account..." : "Login with Instagram"}
        </button>

        <p className="text-xs leading-5 text-slate-500">
          By continuing, you agree to our{" "}
          <a href="/terms" className="font-semibold text-brand-600 hover:underline">Terms of Service</a>
          {" "}and{" "}
          <a href="/privacy" className="font-semibold text-brand-600 hover:underline">Privacy Policy</a>.
        </p>

        <button
          type="button"
          onClick={logout}
          className="text-sm font-semibold text-slate-500 hover:text-slate-900"
        >
          Sign out
        </button>
      </div>
    </AuthLayout>
  );
}
