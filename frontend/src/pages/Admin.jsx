import { useEffect, useMemo, useState } from "react";
import { Activity, AlertCircle, ArrowRight, ArrowUpRight, CheckCircle2, ChevronLeft, ChevronRight, Clock3, Crown, Instagram, RefreshCw, Search, ShieldCheck, Users, X, Zap } from "lucide-react";
import AppLayout from "../components/layout/AppLayout";
import AdminUserDetails from "../components/dashboard/AdminUserDetails";
import { formatAdminDate as date, HealthPill, initials, PlanPill, subscriptionLabel, TokenPill, tokenRemaining, userActivity } from "../components/dashboard/AdminUI";
import { useAuth } from "../hooks/useAuth";
import api from "../api/api";

const FILTERS = [
  ["all", "All users"], ["new", "New this week"], ["pro", "Pro users"],
  ["paid", "Paid Pro"], ["free", "Free users"], ["active", "Active automations"],
  ["tokens", "Token warnings"], ["failures", "Automation failures"], ["attention", "Needs attention"],
];

function Avatar({ user }) {
  return <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-violet-100 bg-violet-50 text-xs font-bold text-violet-700">{initials(user)}</span>;
}

function Stat({ icon: Icon, label, value, detail, warning = false, onClick, className = "" }) {
  return <button onClick={onClick} className={`group min-w-0 rounded-2xl border p-4 text-left shadow-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-500 sm:p-5 ${warning ? "border-amber-200/80 bg-amber-50/70 hover:border-amber-300" : "border-slate-200/80 bg-white hover:border-violet-200"} ${className}`}>
    <div className="flex items-center justify-between gap-2"><span className={`flex h-8 w-8 items-center justify-center rounded-lg ${warning ? "bg-amber-100 text-amber-700" : "bg-violet-50 text-violet-600"}`}><Icon className="h-4 w-4" /></span><ArrowUpRight className="h-3.5 w-3.5 text-slate-300 transition group-hover:text-violet-500" /></div>
    <p className="mt-3 text-[30px] font-bold leading-none tracking-tight text-slate-900 tabular-nums sm:text-3xl">{value}</p>
    <p className="mt-2 text-xs font-semibold text-slate-700">{label}</p>
    <p className="mt-1 text-[11px] leading-4 text-slate-500">{detail}</p>
  </button>;
}

function AccountInfo({ user }) {
  if (!user.accounts.length) return <span className="text-xs text-slate-400">Not connected</span>;
  return <div className="space-y-2">{user.accounts.map(account => <div key={account.id} className="min-w-0"><p className="mb-1 truncate text-xs font-medium text-slate-700" title={account.username}>@{account.username || "Unknown"}</p><TokenPill token={account.token} /></div>)}</div>;
}

function UserCard({ user, onSelect }) {
  const activity = userActivity(user);
  return <button aria-label={`View ${user.email}`} onClick={onSelect} className="group min-w-0 rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-violet-300 hover:shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-500">
    <div className="flex items-start gap-3"><Avatar user={user} /><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="truncate text-sm font-bold text-slate-900">{user.name}</p>{user.isNew && <span className="text-[9px] font-bold uppercase tracking-wide text-violet-500">New</span>}</div><p className="mt-1 break-all text-xs text-slate-500">{user.email}</p></div><ChevronRight className="mt-2 h-4 w-4 shrink-0 text-slate-300 group-hover:text-violet-600" /></div>
    <div className="mt-4 grid grid-cols-2 gap-4 border-t border-slate-100 pt-4"><div className="min-w-0"><p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-slate-400">Subscription</p><PlanPill user={user} /><p className="mt-1.5 text-[11px] capitalize text-slate-500">{subscriptionLabel(user)}</p></div><div className="min-w-0"><p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-slate-400">Instagram</p><AccountInfo user={user} /></div></div>
    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3"><span className="flex items-center gap-1 text-xs text-slate-600"><Zap className="h-3.5 w-3.5 text-violet-400" />{user.automations.length} automations · {activity.sent} sends</span><HealthPill user={user} /></div>
    <p className="mt-3 text-[10px] text-slate-400">{user.registered ? `Joined ${date(user.createdAt, false)}` : "Legacy data · no registered login"}</p>
  </button>;
}

export default function Admin() {
  const { user, loading: authLoading } = useAuth({ redirectOnFail: true });
  const [snapshot, setOverview] = useState(null);
  const overview = snapshot?.viewerId === user?.id ? snapshot : null;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [selectedId, setSelectedId] = useState(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    let current = true;
    if (!user?.id) return;
    setLoading(true);
    setOverview(null);
    api.get("/admin/overview").then(({ data }) => {
      if (current) { setOverview({ ...data, viewerId: user.id }); setError(null); }
    }).catch(e => {
      if (current) setError(e.response?.data?.error || "Unable to load the admin page.");
    }).finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [user?.id]);

  async function refresh() {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/overview");
      setOverview({ ...data, viewerId: user.id });
      setError(null);
    } catch (e) {
      setError(e.response?.data?.error || "Refresh failed. Please try again.");
      if ([401, 403].includes(e.response?.status)) setOverview(null);
    } finally { setLoading(false); }
  }

  function changeFilter(value) { setFilter(value); setPage(1); }
  function jumpToUsers(value) {
    changeFilter(value);
    document.getElementById("admin-users-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  const filtered = useMemo(() => (overview?.users || []).filter(item => {
    const matchesText = `${item.name} ${item.email} ${item.accounts.map(a => a.username).join(" ")}`.toLowerCase().includes(query.trim().toLowerCase());
    const matchesFilter = {
      all: true, new: item.isNew, pro: item.isPro, paid: item.subscription?.paidPro,
      free: !item.isPro, attention: item.needsAttention,
      active: item.automations.some(automation => automation.active),
      tokens: item.accounts.some(account => account.token.status !== "active"),
      failures: item.automations.some(automation => automation.health === "needs_attention"),
    };
    return matchesText && matchesFilter[filter];
  }), [overview, query, filter]);
  const selected = overview?.users.find(item => item.id === selectedId);
  const pageCount = Math.max(1, Math.ceil(filtered.length / 12));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice((currentPage - 1) * 12, currentPage * 12);
  const summary = overview?.summary;
  const attention = overview?.users.filter(item => item.needsAttention) || [];

  return <AppLayout compactHeader title="Admin overview" subtitle="Users, subscriptions & delivery" action={
    <button aria-label="Refresh admin overview" className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 sm:px-4" disabled={loading || authLoading || !user} onClick={refresh}><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /><span className="hidden sm:inline">Refresh</span></button>
  }>
    <div className="mx-auto min-w-0 max-w-[1500px] space-y-5 sm:space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-[11px] text-slate-500"><span className="inline-flex items-center gap-1.5 font-semibold text-violet-700"><ShieldCheck className="h-3.5 w-3.5" /> Admin workspace <span className="mx-1 text-slate-300">/</span><span className="font-normal text-slate-500">Access management</span></span><span>{overview ? `Updated ${date(overview.generatedAt)} IST` : "Authorized administrators only"}</span></div>
      {error && <div role="alert" className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"><AlertCircle className="h-5 w-5 shrink-0" /><div><p className="font-semibold">{overview ? "Unable to refresh" : "Admin overview unavailable"}</p><p className="mt-1">{error}</p>{overview && <p className="mt-1">The previous snapshot is shown below.</p>}</div></div>}
      {(authLoading || loading && !overview) && <div role="status" className="grid grid-cols-2 gap-3 lg:grid-cols-3 2xl:grid-cols-5">{Array.from({ length: 5 }, (_, i) => <div key={i} className="h-36 animate-pulse rounded-2xl border border-slate-200 bg-white" />)}<span className="sr-only">Loading admin overview</span></div>}
      {summary && <>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-5 sm:gap-4">
          <Stat icon={Users} label="Registered users" value={summary.users} detail={`${summary.newUsers} new this week`} onClick={() => jumpToUsers("all")} />
          <Stat icon={Crown} label="Pro users" value={summary.proUsers} detail={`${summary.paidProUsers} paid · ${summary.proUsers - summary.paidProUsers} referral`} onClick={() => jumpToUsers("pro")} />
          <Stat icon={Zap} label="Active automations" value={summary.activeAutomations} detail={`${summary.totalAutomations} created in total`} onClick={() => jumpToUsers("active")} />
          <Stat icon={Instagram} label="Token warnings" value={summary.tokenWarnings} detail="Expiry or connection needs review" warning={summary.tokenWarnings > 0} onClick={() => jumpToUsers("tokens")} />
          <Stat icon={AlertCircle} label="Failed interactions · 48h" value={summary.failedInteractions} detail={`${summary.failedEvents} failure events, including retries`} warning={summary.failedInteractions > 0} onClick={() => jumpToUsers("failures")} className="col-span-2 lg:col-span-1" />
        </div>
        <div className="grid min-w-0 gap-4 xl:grid-cols-[1.1fr_1fr]">
          <section className="min-w-0 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="flex items-center gap-2 text-sm font-bold text-slate-900"><Activity className="h-4 w-4 text-violet-500" /> Delivery activity</h2><span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-500">LAST 48 HOURS</span></div>
            <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-4">{[[CheckCircle2, summary.activity.sentEvents, "Resource sends", "text-emerald-600"], [Clock3, summary.activity.waiting, "Waiting for user", "text-amber-600"], [AlertCircle, summary.failedInteractions, "Currently failed", "text-rose-500"]].map(([Icon, value, label, color]) => <div key={label} className="min-w-0 rounded-xl bg-slate-50 p-3 sm:p-4"><Icon className={`h-4 w-4 ${color}`} /><p className="mt-3 text-2xl font-bold tabular-nums text-slate-900">{value}</p><p className="mt-1 text-[10px] leading-4 text-slate-500 sm:text-xs">{label}</p></div>)}</div>
            <p className="mt-4 text-[11px] leading-5 text-slate-500">Waiting for a click or follow confirmation is expected. Repeat failures count as separate events. Interaction states cover records updated since {date(overview.activitySince)} IST.</p>
          </section>
          <section className="min-w-0 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex items-center justify-between gap-3"><h2 className="flex items-center gap-2 text-sm font-bold text-slate-900"><ShieldCheck className="h-4 w-4 text-violet-500" /> Needs your attention</h2><span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-500">{attention.length} USERS</span></div>
            {attention.length ? <div className="mt-2 divide-y divide-slate-100">{attention.slice(0, 3).map(item => {
              const tokenWarning = item.accounts.find(a => a.token.status !== "active");
              return <button key={item.id} onClick={() => setSelectedId(item.id)} className="group flex w-full min-w-0 items-center gap-3 py-3 text-left"><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${tokenWarning ? "bg-amber-50 text-amber-600" : "bg-rose-50 text-rose-500"}`}><AlertCircle className="h-4 w-4" /></span><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-slate-800">{item.name}</p><p className="mt-0.5 truncate text-[11px] text-slate-500">{tokenWarning ? `@${tokenWarning.username || "Unknown"} · ${tokenWarning.token.status === "reconnect_required" ? "Reconnect needed" : tokenRemaining(tokenWarning.token)}` : "Automation failure events recorded in 48h"}</p></div><ArrowUpRight className="h-4 w-4 shrink-0 text-slate-300 group-hover:text-violet-600" /></button>;
            })}</div> : <div className="mt-6 flex items-start gap-3 rounded-xl bg-emerald-50 p-4"><CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" /><div><p className="text-sm font-semibold text-emerald-800">No warnings in this snapshot</p><p className="mt-1 text-xs leading-5 text-emerald-700">No token expiry warnings or automation failures were recorded in the monitored window.</p></div></div>}
            {attention.length > 3 && <button onClick={() => jumpToUsers("attention")} className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-violet-600">View all {attention.length} users <ArrowRight className="h-3 w-3" /></button>}
          </section>
        </div>
        <section id="admin-users-section" aria-labelledby="admin-users-title" className="min-w-0 scroll-mt-28 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="space-y-4 border-b border-slate-100 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><h2 id="admin-users-title" className="text-base font-bold text-slate-900">Users & accounts</h2><span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">{overview.users.length}</span></div><span className="text-[11px] text-slate-400">Newest registrations first</span></div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center"><div className="relative min-w-0 flex-1"><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" /><input aria-label="Search users" className="input !h-10 !rounded-xl !py-2 !pl-9 !pr-9" placeholder="Search name, email or Instagram…" value={query} onChange={e => { setQuery(e.target.value); setPage(1); }} />{query && <button aria-label="Clear search" onClick={() => { setQuery(""); setPage(1); }} className="absolute right-1 top-1 flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-50"><X className="h-3.5 w-3.5" /></button>}</div><select aria-label="Filter users" className="input !h-10 !w-full !rounded-xl !py-2 sm:!w-48" value={filter} onChange={e => changeFilter(e.target.value)}>{FILTERS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
          </div>
          <div className="grid min-w-0 gap-3 bg-slate-50/50 p-3 sm:grid-cols-2 sm:p-4 xl:hidden">{visible.map(item => <UserCard key={item.id} user={item} onSelect={() => setSelectedId(item.id)} />)}</div>
          <div className="hidden xl:block"><table className="w-full table-fixed text-left text-sm"><colgroup><col className="w-[29%]" /><col className="w-[19%]" /><col className="w-[22%]" /><col className="w-[24%]" /><col className="w-[6%]" /></colgroup><thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400"><tr>{["User", "Subscription", "Instagram / token", "Automations · 48h", ""].map((label, i) => <th key={i} className="px-4 py-3 font-semibold">{label}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{visible.map(item => {
            const activity = userActivity(item);
            return <tr key={item.id} className="transition hover:bg-violet-50/30"><td className="px-4 py-4"><div className="flex min-w-0 items-start gap-3"><Avatar user={item} /><div className="min-w-0"><button onClick={() => setSelectedId(item.id)} className="block max-w-full truncate text-left text-sm font-semibold text-slate-900 hover:text-violet-700" title={item.name}>{item.name}</button><p className="mt-1 truncate text-[11px] text-slate-500" title={item.email}>{item.email}</p><p className="mt-1 text-[10px] text-slate-400">{item.registered ? date(item.createdAt, false) : "Legacy record"}{item.isNew && <span className="ml-1.5 font-bold text-violet-500">NEW</span>}</p></div></div></td><td className="px-4 py-4"><PlanPill user={item} /><p className="mt-1.5 text-[11px] capitalize leading-5 text-slate-500">{subscriptionLabel(item)}</p></td><td className="px-4 py-4"><AccountInfo user={item} /></td><td className="px-4 py-4"><p className="mb-1.5 text-[11px] text-slate-600"><span className="font-semibold">{item.automations.length}</span> created · {item.automations.filter(a => a.active).length} active</p><HealthPill user={item} /><p className="mt-1 text-[10px] text-slate-400">{activity.sent} resource sends</p></td><td className="py-4 pr-3"><button aria-label={`View ${item.email}`} onClick={() => setSelectedId(item.id)} className="icon-button"><ChevronRight className="h-4 w-4" /></button></td></tr>;
          })}</tbody></table></div>
          {!visible.length && <div className="px-5 py-12 text-center"><Search className="mx-auto h-6 w-6 text-slate-300" /><p className="mt-3 text-sm font-semibold text-slate-700">No matching users</p><p className="mt-1 text-xs text-slate-500">Try a different name, email or filter.</p><button onClick={() => { setQuery(""); changeFilter("all"); }} className="mt-4 text-xs font-semibold text-violet-600">Clear filters</button></div>}
          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 sm:px-5"><p className="text-[11px] text-slate-500">{filtered.length ? `${(currentPage - 1) * 12 + 1}–${Math.min(currentPage * 12, filtered.length)} of ${filtered.length} records` : "0 records"}{summary.legacyUsers ? ` · ${summary.legacyUsers} legacy` : ""}</p><div className="flex items-center gap-1"><button aria-label="Previous page" disabled={currentPage <= 1} className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30" onClick={() => setPage(currentPage - 1)}><ChevronLeft className="h-4 w-4" /></button><span className="px-2 text-xs text-slate-500">{currentPage} / {pageCount}</span><button aria-label="Next page" disabled={currentPage >= pageCount} className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30" onClick={() => setPage(currentPage + 1)}><ChevronRight className="h-4 w-4" /></button></div></footer>
        </section>
        <p className="pb-2 text-center text-[10px] leading-5 text-slate-400">All times in IST. Saved token and billing status; no live provider checks. Snapshots may be reused for up to 30 seconds.</p>
      </>}
      {selected && <AdminUserDetails key={selected.id} user={selected} onGranted={refresh} onClose={() => setSelectedId(null)} />}
    </div>
  </AppLayout>;
}
