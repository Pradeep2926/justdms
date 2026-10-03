import { Instagram, Shield, ArrowRight } from "lucide-react";
import AuthLayout from "../components/layout/AuthLayout";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { API_BASE_URL } from "../api/api";
import api from "../api/api";
import { useAuth } from "../hooks/useAuth";

export default function ConnectMeta() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const instagramError = searchParams.get("instagramError");
  const connectionId = searchParams.get("connectionId");
  const switchAccount = searchParams.get("switch") === "1";
  const { user, loading } = useAuth({ redirectOnFail: true });
  const [accounts, setAccounts] = useState([]);
  const [accountError, setAccountError] = useState("");
  const [selecting, setSelecting] = useState("");

  useEffect(() => {
    if (loading || !user?.email || switchAccount || connectionId || instagramError) return;

    api.get(`/instagram/dashboard/${encodeURIComponent(user.email)}`)
      .then(({ data }) => {
        if (data?.connected) navigate("/dashboard", { replace: true });
      })
      .catch(() => {
        // A missing connection is the expected state for first-time users.
      });
  }, [connectionId, instagramError, loading, navigate, switchAccount, user?.email]);

  useEffect(() => {
    if (!connectionId || !user?.email) return;

    api.get(`/auth/meta/options/${connectionId}`, {
      params: { userEmail: user.email },
    }).then(({ data }) => setAccounts(data))
      .catch((err) => setAccountError(err.response?.data?.error || err.message));
  }, [connectionId, user?.email]);

  const connectInstagram = (provider = "instagram") => {
    if (!user) {
      alert("User not logged in");
      return;
    }

    const userEmail = user.email;

    if (!userEmail) {
      alert("User email not found");
      return;
    }

    window.location.href = `${API_BASE_URL}/auth/${provider}?userEmail=${encodeURIComponent(userEmail)}`;
  };

  const selectAccount = async (pageId) => {
    try {
      setSelecting(pageId);
      setAccountError("");
      await api.post("/auth/meta/select", {
        connectionId,
        userEmail: user.email,
        pageId,
      });
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setAccountError(err.response?.data?.error || err.message);
      setSelecting("");
    }
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
            {connectionId
              ? "Choose which Instagram professional account JustDMs should use."
              : "Connect your Instagram Business or Creator account through Meta's official OAuth. Your credentials are never stored on our servers."}
          </p>
          <div className="flex items-center justify-center gap-2 text-xs text-emerald-600">
            <Shield className="w-4 h-4" />
            Meta Verified · Secure OAuth
          </div>
        </div>

        {accountError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-left text-sm text-red-700">
            {accountError}
          </div>
        )}

        {connectionId ? (
          <div className="space-y-3 text-left">
            {accounts.map((account) => (
              <button
                key={account.page_id}
                type="button"
                onClick={() => selectAccount(account.page_id)}
                disabled={Boolean(selecting)}
                className="flex w-full items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 transition hover:border-brand-400 hover:bg-brand-50 disabled:opacity-60"
              >
                {account.profile_picture_url ? (
                  <img src={account.profile_picture_url} alt="" className="h-11 w-11 rounded-lg object-cover" />
                ) : (
                  <Instagram className="h-8 w-8 text-brand-600" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-ink-900">@{account.instagram_username || account.instagram_id}</span>
                  <span className="block truncate text-xs text-slate-500">Facebook Page: {account.page_name}</span>
                </span>
                <ArrowRight className="h-4 w-4 text-slate-400" />
              </button>
            ))}
            {!accounts.length && !accountError && (
              <p className="py-3 text-center text-sm text-slate-500">Loading available accounts...</p>
            )}
          </div>
        ) : (
        <div className="space-y-3">
        <button
          onClick={() => connectInstagram("instagram")}
          disabled={loading}
          className="w-full btn-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Checking account..." : "Continue with Instagram"}
          <ArrowRight className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => connectInstagram("meta")}
          disabled={loading}
          className="w-full btn-secondary disabled:cursor-not-allowed disabled:opacity-60"
        >
          Connect through Facebook Page
        </button>
        </div>
        )}
      </div>
    </AuthLayout>
  );
}
