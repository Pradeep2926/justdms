import { Instagram, Shield, ArrowRight } from "lucide-react";
import AuthLayout from "../components/layout/AuthLayout";
import { useSearchParams } from "react-router-dom";
import { API_BASE_URL } from "../api/api";
import { useAuth } from "../hooks/useAuth";

export default function ConnectMeta() {
  const [searchParams] = useSearchParams();
  const instagramError = searchParams.get("instagramError");
  const { user, loading } = useAuth({ redirectOnFail: true });

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

    window.location.href = `${API_BASE_URL}/auth/meta?userEmail=${encodeURIComponent(userEmail)}`;
  };

  return (
    <AuthLayout
      title="Connect Instagram"
      subtitle="One last step before you can automate DMs"
    >
      <div className="text-center space-y-6">
        <div className="w-20 h-20 bg-gradient-to-br from-pink-500 via-purple-500 to-orange-400 rounded-3xl flex items-center justify-center mx-auto shadow-lg">
          <Instagram className="w-10 h-10 text-white" />
        </div>

        <div className="space-y-2">
          {instagramError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-left text-sm text-red-700">
              {instagramError}
            </div>
          )}

          <p className="text-slate-600 text-sm leading-relaxed">
            Connect your Instagram Business or Creator account through Meta's
            official OAuth. Your credentials are never stored on our servers.
          </p>
          <div className="flex items-center justify-center gap-2 text-xs text-emerald-600">
            <Shield className="w-4 h-4" />
            Meta Verified · Secure OAuth
          </div>
        </div>

        <button
          onClick={connectInstagram}
          disabled={loading}
          className="w-full btn-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Checking account..." : "Connect Instagram"}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </AuthLayout>
  );
}
