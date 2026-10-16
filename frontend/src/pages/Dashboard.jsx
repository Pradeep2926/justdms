import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useInstagram } from "../hooks/useInstagram";
import AppLayout from "../components/layout/AppLayout";
import { DashboardLoader } from "../components/common/PageLoader";
import api from "../api/api";
import {
  AlertCircle, ArrowRight, BarChart3, CalendarCheck, CalendarDays,
  CheckCircle2, ExternalLink, Image, Instagram, Link2, MessageCircle,
  MousePointerClick, Play, Send, Settings, UserCheck, Users, Zap,
} from "lucide-react";

const EMPTY_METRICS = {
  messages_sent: 0,
  total_clicks: 0,
  comments_engaged: 0,
  followers_verified: 0,
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth({ redirectOnFail: true });
  const [metricDays, setMetricDays] = useState("7");
  const [metrics, setMetrics] = useState(EMPTY_METRICS);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [automations, setAutomations] = useState([]);
  const { ig, media, connected, loading: igLoading, error } = useInstagram(user?.email);
  const loading = authLoading || igLoading;

  useEffect(() => {
    if (!user?.email || !connected) return;
    let active = true;

    const loadDashboardData = async () => {
      setMetricsLoading(true);
      const [metricsResult, automationsResult] = await Promise.allSettled([
        api.get(`/automation/metrics/${encodeURIComponent(user.email)}`, {
          params: metricDays ? { days: metricDays } : {},
        }),
        api.get(`/automation/${encodeURIComponent(user.email)}`),
      ]);

      if (!active) return;
      setMetrics(metricsResult.status === "fulfilled" ? metricsResult.value.data : EMPTY_METRICS);
      setAutomations(
        automationsResult.status === "fulfilled" && Array.isArray(automationsResult.value.data)
          ? automationsResult.value.data
          : []
      );
      setMetricsLoading(false);
    };

    loadDashboardData();
    return () => { active = false; };
  }, [user?.email, connected, metricDays]);

  const activeAutomations = useMemo(
    () => automations.filter((item) => item.is_active !== false).slice(0, 4),
    [automations]
  );

  return (
    <AppLayout
      title={connected && ig ? `Welcome back, @${ig.username}` : "Welcome to JustDMs"}
      subtitle={connected ? "Grow your audience with simple, powerful automations." : "Connect Instagram to get started."}
      action={connected ? <HeaderActions ig={ig} metricDays={metricDays} setMetricDays={setMetricDays} /> : null}
    >
      {loading && <DashboardLoader />}

      {!loading && error && (
        <div className="mb-5 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!loading && !connected && <ConnectInstagram onConnect={() => navigate("/connect-meta")} />}

      {!loading && connected && ig && (
        <div className="space-y-6">
          <Hero onCreate={() => navigate("/automation")} />

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <QuickAction icon={Zap} title="Create Automation" description="Set up comment and DM replies" tone="blue" onClick={() => navigate("/automation")} />
            <QuickAction icon={Link2} title="Link in Bio" description="Build your public link page" tone="violet" onClick={() => navigate("/link-in-bio")} />
            <QuickAction icon={CalendarCheck} title="Appointment Booking" description="Manage services and bookings" tone="emerald" onClick={() => navigate("/appointment-booking")} />
            <QuickAction icon={Settings} title="Account Settings" description="Update profile and support details" tone="slate" onClick={() => navigate("/settings")} />
          </section>

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric icon={Send} label="Messages sent" value={metrics.messages_sent} loading={metricsLoading} />
            <Metric icon={MousePointerClick} label="Button clicks" value={metrics.total_clicks} loading={metricsLoading} />
            <Metric icon={MessageCircle} label="Comments engaged" value={metrics.comments_engaged} loading={metricsLoading} />
            <Metric icon={UserCheck} label="Followers verified" value={metrics.followers_verified} loading={metricsLoading} />
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <DashboardPanel icon={Image} title="Recent posts" onAction={() => navigate("/automation")}>
              {media.length
                ? media.slice(0, 4).map((post) => <PostRow key={post.id} post={post} />)
                : <EmptyState text="Your latest Instagram posts will appear here." />}
            </DashboardPanel>
            <DashboardPanel icon={Zap} title="Active automations" onAction={() => navigate("/automation")}>
              {activeAutomations.length
                ? activeAutomations.map((automation) => <AutomationRow key={automation.id} automation={automation} onClick={() => navigate("/automation")} />)
                : <EmptyState text="Create your first automation to see it here." />}
            </DashboardPanel>
          </section>

          <section className="grid gap-3 sm:grid-cols-3">
            <AccountStat icon={Users} label="Followers" value={ig.followers ?? ig.followers_count} />
            <AccountStat icon={BarChart3} label="Following" value={ig.following ?? ig.follows_count} />
            <AccountStat icon={Image} label="Published posts" value={ig.media_count ?? media.length} />
          </section>
        </div>
      )}
    </AppLayout>
  );
}

function HeaderActions({ ig, metricDays, setMetricDays }) {
  return (
    <div className="flex items-center gap-3">
      <label className="relative hidden sm:block">
        <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <select
          className="h-11 appearance-none rounded-lg border border-slate-200 bg-white pl-9 pr-9 text-sm font-semibold text-slate-700 shadow-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          value={metricDays}
          onChange={(event) => setMetricDays(event.target.value)}
          aria-label="Dashboard date range"
        >
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
          <option value="">All time</option>
        </select>
      </label>
      {ig?.profile_picture_url ? (
        <img src={ig.profile_picture_url} alt="" className="h-11 w-11 rounded-lg object-cover ring-2 ring-white shadow-sm" />
      ) : (
        <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-to-br from-pink-500 via-purple-500 to-orange-400 text-white shadow-sm">
          <Instagram className="h-5 w-5" />
        </span>
      )}
    </div>
  );
}

function Hero({ onCreate }) {
  return (
    <section className="relative overflow-hidden rounded-lg bg-gradient-to-r from-blue-700 via-blue-600 to-violet-600 px-6 py-8 text-white shadow-lg sm:px-9 lg:min-h-[270px] lg:py-10">
      <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[48%] lg:block">
        <div className="absolute right-10 top-8 w-72 rotate-[-4deg] rounded-lg bg-white p-4 text-slate-900 shadow-2xl">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-pink-500 via-purple-500 to-orange-400 text-white"><Instagram className="h-5 w-5" /></span>
            <div><p className="text-xs text-slate-500">Someone commented</p><p className="font-bold">“SEND”</p></div>
          </div>
        </div>
        <div className="absolute bottom-8 right-20 w-80 rotate-2 rounded-lg bg-white p-4 text-slate-900 shadow-2xl">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><Send className="h-5 w-5" /></span>
            <div><p className="text-xs font-bold text-slate-500">JustDMs Auto Reply</p><p className="mt-1 text-sm font-semibold">Thanks for your interest. Here are the details.</p><p className="mt-2 text-xs font-bold text-blue-600">yourlink.com</p></div>
          </div>
        </div>
      </div>
      <div className="relative z-[1] max-w-2xl lg:max-w-[52%]">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-200">Turn comments into customers</p>
        <h2 className="mt-4 text-3xl font-extrabold leading-tight sm:text-4xl">Automate your <span className="text-cyan-300">Instagram DMs</span></h2>
        <p className="mt-4 max-w-xl text-sm leading-6 text-blue-100 sm:text-base">Set up smart replies, deliver resources, capture leads, and grow faster with workflows that run around the clock.</p>
        <div className="mt-7 flex flex-wrap gap-3">
          <button type="button" onClick={onCreate} className="inline-flex h-11 items-center gap-2 rounded-lg bg-white px-5 text-sm font-bold text-blue-700 shadow-lg transition hover:-translate-y-0.5"><Zap className="h-4 w-4" /> Create Automation</button>
          <button type="button" onClick={onCreate} className="inline-flex h-11 items-center gap-2 rounded-lg border border-white/60 bg-white/10 px-5 text-sm font-bold text-white transition hover:bg-white/20"><Play className="h-4 w-4" /> View workflows</button>
        </div>
      </div>
    </section>
  );
}

function ConnectInstagram({ onConnect }) {
  return (
    <section className="mx-auto max-w-xl rounded-lg border border-slate-200 bg-white p-10 text-center shadow-sm">
      <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-lg bg-gradient-to-br from-pink-500 via-purple-500 to-orange-400 text-white shadow-lg"><Instagram className="h-8 w-8" /></span>
      <h2 className="mt-5 text-2xl font-bold text-slate-950">Connect your Instagram</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">Link your professional account to load your dashboard and create automations.</p>
      <button type="button" onClick={onConnect} className="btn-primary mt-6">Connect Instagram <ArrowRight className="h-4 w-4" /></button>
    </section>
  );
}

const ACTION_TONES = {
  blue: "bg-blue-50 text-blue-600",
  violet: "bg-violet-50 text-violet-600",
  emerald: "bg-emerald-50 text-emerald-600",
  slate: "bg-slate-100 text-slate-600",
};

function QuickAction({ icon: Icon, title, description, tone, onClick }) {
  return (
    <button type="button" onClick={onClick} className="group flex min-h-32 items-start gap-4 rounded-lg border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md">
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${ACTION_TONES[tone]}`}><Icon className="h-5 w-5" /></span>
      <span className="min-w-0 flex-1"><span className="block font-bold text-slate-950">{title}</span><span className="mt-1 block text-sm leading-5 text-slate-500">{description}</span></span>
      <ArrowRight className="mt-3 h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-brand-600" />
    </button>
  );
}

function Metric({ icon: Icon, label, value, loading }) {
  return (
    <div className="flex items-center gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600"><Icon className="h-5 w-5" /></span>
      <div><p className="text-xs font-semibold uppercase text-slate-500">{label}</p><p className="mt-1 text-2xl font-extrabold text-slate-950">{loading ? "—" : Number(value || 0).toLocaleString()}</p></div>
    </div>
  );
}

function DashboardPanel({ icon: Icon, title, onAction, children }) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600"><Icon className="h-4 w-4" /></span><h3 className="font-bold text-slate-950">{title}</h3></div>
        <button type="button" onClick={onAction} className="text-sm font-bold text-brand-600 hover:text-brand-700">View all</button>
      </div>
      <div className="divide-y divide-slate-100 px-5">{children}</div>
    </div>
  );
}

function PostRow({ post }) {
  const image = post.thumbnail_url || post.media_url;
  const label = String(post.caption || "Instagram post").trim().split("\n")[0] || "Instagram post";
  return (
    <a href={post.permalink} target="_blank" rel="noreferrer" className="group flex items-center gap-3 py-3">
      {image ? <img src={image} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" /> : <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400"><Image className="h-5 w-5" /></span>}
      <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-slate-900">{label}</p><p className="mt-1 text-xs text-slate-500">{post.comments_count ?? 0} comments · {post.like_count ?? 0} likes</p></div>
      <ExternalLink className="h-4 w-4 text-slate-400 transition group-hover:text-brand-600" />
    </a>
  );
}

function AutomationRow({ automation, onClick }) {
  return (
    <button type="button" onClick={onClick} className="group flex w-full items-center gap-3 py-3 text-left">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><Zap className="h-5 w-5" /></span>
      <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-slate-900">{automation.name || "Instagram automation"}</span><span className="mt-1 block truncate text-xs text-slate-500">{automation.trigger_type === "dm_keyword" ? "DM keyword" : "Comment to DM"}{automation.trigger_value && automation.trigger_value !== "*" ? ` · ${automation.trigger_value}` : ""}</span></span>
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700"><CheckCircle2 className="h-3 w-3" /> Active</span>
      <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-0.5" />
    </button>
  );
}

function AccountStat({ icon: Icon, label, value }) {
  return <div className="flex items-center gap-3 rounded-lg border border-slate-200/80 bg-white/70 px-4 py-3"><Icon className="h-4 w-4 text-slate-500" /><span className="text-sm text-slate-500">{label}</span><strong className="ml-auto text-sm text-slate-900">{Number(value || 0).toLocaleString()}</strong></div>;
}

function EmptyState({ text }) {
  return <div className="py-10 text-center text-sm text-slate-500">{text}</div>;
}
