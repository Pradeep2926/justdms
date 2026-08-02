import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useInstagram } from "../hooks/useInstagram";
import AppLayout from "../components/layout/AppLayout";
import StatsCard from "../components/dashboard/StatsCard";
import Badge from "../components/ui/Badge";
import {
  AlertCircle,
  ArrowRight,
  CalendarClock,
  Instagram,
  RefreshCw,
  ShieldCheck,
  Zap,
} from "lucide-react";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth({ redirectOnFail: true });
  const {
    ig,
    media,
    comments,
    connected,
    loading: igLoading,
    syncing,
    error,
    sync,
  } = useInstagram(user?.email);

  const loading = authLoading || igLoading;

  return (
    <AppLayout
      title="Dashboard"
      subtitle={
        connected && ig
          ? `Welcome back — @${ig.username} is connected`
          : "Connect Instagram to get started"
      }
    >
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && error && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!loading && !connected && (
        <div className="card p-10 text-center max-w-xl mx-auto">
          <div className="w-16 h-16 bg-gradient-to-br from-brand-500 to-coral-500 rounded-lg flex items-center justify-center mx-auto mb-5 shadow-glow">
            <Instagram className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-bold mb-2 text-ink-900">Connect your Instagram</h2>
          <p className="text-slate-500 text-sm mb-6 max-w-sm mx-auto">
            Link your account to start automating comment replies and DMs with
            official Meta APIs.
          </p>
          <button
            onClick={() => navigate("/connect-meta")}
            className="btn-primary"
          >
            Connect Instagram
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {!loading && connected && ig && (
        <>
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-white/80 bg-white/70 p-4 shadow-card backdrop-blur">
            <div className="flex items-center gap-3">
              <Badge variant="success">Instagram Connected</Badge>
              <Badge variant="muted">{ig.token_status || "active"} token</Badge>
            </div>
            <button
              type="button"
              onClick={sync}
              disabled={syncing}
              className="btn-secondary text-sm py-2.5"
            >
              <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "Syncing..." : "Sync"}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
            <StatsCard
              label="Followers"
              value={ig.followers ?? ig.followers_count}
              icon="followers"
            />
            <StatsCard label="Following" value={ig.following ?? ig.follows_count} icon="followers" />
            <StatsCard label="Posts" value={ig.media_count} icon="posts" />
            <StatsCard label="Comments" value={comments.length} icon="dms" />
          </div>

          <div className="grid lg:grid-cols-[360px_1fr] gap-6 mb-8">
            <div className="card overflow-hidden">
              <div className="h-20 bg-gradient-to-r from-ink-900 via-brand-800 to-brand-500" />
              <div className="p-6 pt-0">
              <div className="flex items-center gap-4">
                {ig.profile_picture_url ? (
                  <img
                    src={ig.profile_picture_url}
                    alt=""
                    className="-mt-8 h-16 w-16 rounded-lg object-cover ring-4 ring-white"
                  />
                ) : (
                  <div className="-mt-8 flex h-16 w-16 items-center justify-center rounded-lg bg-brand-50 ring-4 ring-white">
                    <Instagram className="h-8 w-8 text-brand-600" />
                  </div>
                )}
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-bold text-ink-900">@{ig.username}</h2>
                  <p className="text-sm text-slate-500">{ig.account_type || "Instagram Business"}</p>
                </div>
              </div>

              <div className="mt-5 space-y-3 text-sm">
                <InfoRow label="Instagram ID" value={ig.instagram_user_id} />
                <InfoRow label="Page ID" value={ig.facebook_page_id || ig.page_id} />
                <InfoRow label="Connected" value={formatDate(ig.connected_at)} />
                <InfoRow label="Last synced" value={formatDate(ig.last_sync)} />
              </div>

              <button
                onClick={() => navigate("/automation")}
                className="btn-primary mt-6 text-sm py-2.5"
              >
                <Zap className="w-4 h-4" />
                Create Automation
              </button>
              </div>
            </div>

            <div className="card p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-semibold text-ink-900">Latest posts</h3>
                <span className="text-xs text-slate-500">{media.length} synced</span>
              </div>
              {media.length === 0 ? (
                <EmptyState text="No media synced yet. Click Sync to refresh posts." />
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {media.slice(0, 6).map((post) => (
                    <a
                      key={post.id}
                      href={post.permalink}
                      target="_blank"
                      rel="noreferrer"
                      className="group overflow-hidden rounded-lg border border-slate-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-card"
                    >
                      {post.media_url || post.thumbnail_url ? (
                        <img
                          src={post.thumbnail_url || post.media_url}
                          alt=""
                          className="aspect-square w-full object-cover transition group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex aspect-square items-center justify-center text-xs text-slate-400">
                          {post.media_type || "POST"}
                        </div>
                      )}
                      <div className="p-2 text-xs text-slate-500">
                        {post.like_count ?? 0} likes · {post.comments_count ?? 0} comments
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </AppLayout>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="flex items-center gap-1.5 text-slate-500">
        {label === "Last synced" ? (
          <CalendarClock className="h-3.5 w-3.5" />
        ) : (
          <ShieldCheck className="h-3.5 w-3.5" />
        )}
        {label}
      </span>
      <span className="max-w-[180px] truncate text-right font-medium text-slate-800">
        {value || "—"}
      </span>
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
      {text}
    </div>
  );
}

function formatDate(value) {
  if (!value) return "";

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
