import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useInstagram } from "../hooks/useInstagram";
import AppLayout from "../components/layout/AppLayout";
import StatsCard from "../components/dashboard/StatsCard";
import api from "../api/api";
import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  Instagram,
  MessageCircle,
  MousePointerClick,
  RefreshCw,
  Send,
  UserCheck,
  Zap,
} from "lucide-react";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth({ redirectOnFail: true });
  const [metricDays, setMetricDays] = useState("7");
  const [metrics, setMetrics] = useState(null);
  const [metricsLoading, setMetricsLoading] = useState(false);
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

  useEffect(() => {
    if (!user?.email || !connected) return;

    let active = true;
    const loadMetrics = async () => {
      try {
        setMetricsLoading(true);
        const params = metricDays ? { days: metricDays } : {};
        const { data } = await api.get(`/automation/metrics/${user.email}`, {
          params,
        });
        if (active) setMetrics(data);
      } catch {
        if (active) setMetrics(null);
      } finally {
        if (active) setMetricsLoading(false);
      }
    };

    loadMetrics();
    return () => {
      active = false;
    };
  }, [user?.email, connected, metricDays]);

  return (
    <AppLayout
      title="Dashboard"
      subtitle={
        connected && ig
          ? `Welcome back, @${ig.username}`
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
          <div className="mb-8 flex flex-col gap-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="flex min-w-0 items-center gap-4">
              {ig.profile_picture_url ? (
                <img
                  src={ig.profile_picture_url}
                  alt=""
                  className="h-16 w-16 shrink-0 rounded-lg object-cover"
                />
              ) : (
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-pink-500 via-amber-400 to-purple-600 text-white">
                  <Instagram className="h-8 w-8" />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-500">Instagram account</p>
                <h2 className="truncate text-xl font-bold text-ink-900">@{ig.username}</h2>
                <p className="text-sm text-slate-500">
                  {ig.account_type || "Professional account"}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={sync}
                disabled={syncing}
                className="btn-secondary py-2.5 text-sm"
              >
                <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
                {syncing ? "Refreshing..." : "Refresh"}
              </button>
              <button
                type="button"
                onClick={() => navigate("/connect-meta?switch=1")}
                className="btn-secondary py-2.5 text-sm"
              >
                Switch account
              </button>
              <button
                type="button"
                onClick={() => navigate("/automation")}
                className="btn-primary py-2.5 text-sm"
              >
                <Zap className="h-4 w-4" />
                Create Automation
              </button>
            </div>
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

          <section className="mb-8 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div>
                <h3 className="text-lg font-bold text-ink-900">Automation metrics</h3>
                <p className="mt-1 text-sm text-slate-500">Performance across all your automations.</p>
              </div>
              <label className="relative block w-full sm:w-44">
                <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <select
                  className="input h-11 appearance-none pl-10"
                  value={metricDays}
                  onChange={(event) => setMetricDays(event.target.value)}
                  aria-label="Metrics date range"
                >
                  <option value="7">Last 7 days</option>
                  <option value="30">Last 30 days</option>
                  <option value="90">Last 90 days</option>
                  <option value="">All time</option>
                </select>
              </label>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4">
              <DashboardMetric
                label="Messages sent"
                value={metrics?.messages_sent}
                loading={metricsLoading}
                icon={Send}
              />
              <DashboardMetric
                label="Button clicks"
                value={metrics?.total_clicks}
                loading={metricsLoading}
                icon={MousePointerClick}
              />
              <DashboardMetric
                label="Comments engaged"
                value={metrics?.comments_engaged}
                loading={metricsLoading}
                icon={MessageCircle}
              />
              <DashboardMetric
                label="Followers verified"
                value={metrics?.followers_verified}
                loading={metricsLoading}
                icon={UserCheck}
              />
            </div>
          </section>

          <div className="mb-8 rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-ink-900">Latest posts</h3>
                  <p className="mt-1 text-sm text-slate-500">Choose any post when creating an automation.</p>
                </div>
                <span className="text-xs font-semibold text-slate-500">{media.length} posts</span>
              </div>
              {media.length === 0 ? (
                <EmptyState text="No media synced yet. Click Sync to refresh posts." />
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
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
        </>
      )}
    </AppLayout>
  );
}

function DashboardMetric({ label, value, loading, icon: Icon }) {
  return (
    <div className="border-b border-slate-100 p-5 last:border-b-0 sm:border-r sm:[&:nth-child(2n)]:border-r-0 lg:border-b-0 lg:[&:nth-child(2n)]:border-r lg:last:border-r-0 lg:p-6">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-bold text-ink-900">
        {loading ? "—" : value ?? 0}
      </p>
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
