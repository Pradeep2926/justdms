import { useEffect, useMemo, useState } from "react";
import { Check, CheckCircle2, Clock3, Copy, Gift, Link2, LoaderCircle, MessageCircle, Share2, Sparkles, Users } from "lucide-react";
import AppLayout from "../components/layout/AppLayout";
import { useAuth } from "../hooks/useAuth";
import api from "../api/api";

const EMPTY_STATS = { visits: 0, signups: 0, pending: 0, successful: 0, daysEarned: 0 };

function publicAppUrl() {
  const configured = String(import.meta.env.VITE_PUBLIC_APP_URL || "").replace(/\/$/, "");
  if (configured) return configured;
  if (["justdms.in", "www.justdms.in"].includes(window.location.hostname)) return "https://justdms.in";
  return window.location.origin;
}

function maskEmail(email) {
  const [name = "", domain = ""] = String(email || "").split("@");
  if (!domain) return "New JustDMs user";
  const visible = name.slice(0, Math.min(3, name.length));
  return `${visible}${"*".repeat(Math.max(3, name.length - visible.length))}@${domain}`;
}

function formatDate(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(value));
}

export default function ReferEarn() {
  const { user, loading: authLoading } = useAuth({ redirectOnFail: true });
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    api.get("/referrals/me")
      .then(({ data }) => setDetails(data))
      .catch((requestError) => setError(requestError.response?.data?.error || "Unable to load referrals."))
      .finally(() => setLoading(false));
  }, [user]);

  const referralLink = useMemo(() => details?.code ? `${publicAppUrl()}/ref/${details.code}` : "", [details?.code]);
  const shareText = "Automate Instagram comments and DMs with JustDMs. Create your free account using my link:";

  async function copyLink() {
    await navigator.clipboard.writeText(referralLink);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  async function share() {
    if (navigator.share) {
      await navigator.share({ title: "Try JustDMs", text: shareText, url: referralLink });
      return;
    }
    await copyLink();
  }

  if (authLoading || loading) {
    return <AppLayout title="Refer & Earn" subtitle="Invite creators and earn Pro access"><div className="flex justify-center py-24"><LoaderCircle className="h-9 w-9 animate-spin text-brand-600" /></div></AppLayout>;
  }

  const stats = details?.stats || EMPTY_STATS;
  const history = details?.referrals || [];

  return (
    <AppLayout title="Refer & Earn" subtitle="Invite creators. Earn more time on JustDMs Pro.">
      <div className="mx-auto max-w-6xl space-y-5">
        <section
          className="relative overflow-hidden rounded-2xl border border-slate-800 px-5 py-6 text-white shadow-[0_20px_55px_-30px_rgba(15,23,42,0.9)] sm:px-7 sm:py-7"
          style={{ backgroundColor: "#071426" }}
        >
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-cyan-400 via-blue-500 to-violet-500" />
          <div className="absolute -right-16 -top-24 h-56 w-56 rounded-full bg-violet-500/15 blur-3xl" />
          <div className="absolute -bottom-24 left-1/3 h-52 w-52 rounded-full bg-cyan-400/10 blur-3xl" />
          <div className="referral-hero-grid relative grid gap-6">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-cyan-200"><Sparkles className="h-3.5 w-3.5" /> Referral rewards</span>
              <h2 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">Invite friends. Unlock free Pro.</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">Share JustDMs with creators you know. When a new customer completes their first paid subscription, your reward unlocks automatically.</p>
            </div>
            <div className="min-w-[210px] rounded-xl border border-white/10 bg-white/[0.07] p-5 backdrop-blur-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Your reward</p>
              <p className="mt-2 text-3xl font-black text-white">Earn 14 Days</p>
              <p className="mt-1 font-semibold text-cyan-300">of JustDMs Pro</p>
            </div>
          </div>
        </section>

        {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div> : null}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div><h3 className="text-lg font-bold text-slate-950">Your referral link</h3><p className="mt-1 text-sm text-slate-500">Each signup through this link is attributed to your account.</p></div>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Active</span>
              <p className="text-xs font-semibold text-slate-400">Code: {details?.code || "—"}</p>
            </div>
          </div>
          <div className="mt-4 rounded-xl border border-brand-100 bg-gradient-to-r from-cyan-50/70 via-blue-50/70 to-violet-50/70 p-3 sm:p-4">
            <div className="flex min-w-0 items-center gap-3 rounded-lg border border-white bg-white px-4 py-3 shadow-sm">
              <Link2 className="h-5 w-5 shrink-0 text-brand-600" /><span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-700 sm:text-base">{referralLink}</span>
              <button type="button" onClick={copyLink} disabled={!referralLink} className="icon-button" aria-label="Copy referral link" title="Copy referral link">{copied ? <Check className="h-5 w-5 text-emerald-600" /> : <Copy className="h-5 w-5" />}</button>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <button type="button" onClick={copyLink} disabled={!referralLink} className="btn-primary min-h-[46px]">{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copied ? "Link copied" : "Copy link"}</button>
              <a className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-lg bg-emerald-500 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-600" target="_blank" rel="noreferrer" href={`https://wa.me/?text=${encodeURIComponent(`${shareText} ${referralLink}`)}`}><MessageCircle className="h-4 w-4" /> WhatsApp</a>
              <button type="button" onClick={share} disabled={!referralLink} className="btn-secondary min-h-[46px]"><Share2 className="h-4 w-4" /> Share</button>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6"><div><h3 className="text-lg font-bold text-slate-950">Referral history</h3><p className="mt-0.5 text-sm text-slate-500">People who joined using your link.</p></div>{stats.pending > 0 ? <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">{stats.pending} awaiting payment</span> : null}</div>
          {history.length === 0 ? (
            <div className="px-5 py-12 text-center sm:px-6"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50 text-slate-400"><Users className="h-6 w-6" /></span><h4 className="mt-4 font-bold text-slate-900">No referrals yet</h4><p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-slate-500">Share your link to start building your referral history. New signups will appear here automatically.</p></div>
          ) : (
            <div className="divide-y divide-slate-100">
              {history.map((item) => {
                const rewarded = item.status === "rewarded";
                return <div key={item.id} className="flex flex-col gap-3 px-5 py-4 transition hover:bg-slate-50/70 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                  <div className="flex items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 font-bold text-brand-700">{String(item.referred_email || "J").charAt(0).toUpperCase()}</span><div><p className="font-semibold text-slate-900">{maskEmail(item.referred_email)}</p><p className="text-xs text-slate-400">Joined {formatDate(item.created_at)}</p></div></div>
                  <div className="flex items-center justify-between gap-4 sm:justify-end">{rewarded ? <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700"><CheckCircle2 className="h-3.5 w-3.5" /> Completed</span> : <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700"><Clock3 className="h-3.5 w-3.5" /> Pending</span>}<span className="text-sm font-bold text-slate-700">{rewarded ? "+14 Pro days" : "First payment required"}</span></div>
                </div>;
              })}
            </div>
          )}
        </section>

        <p className="px-2 text-center text-xs leading-5 text-slate-400">One reward per new customer. Renewals, self-referrals, duplicate accounts, refunded payments, and disputed payments do not qualify.</p>
      </div>
    </AppLayout>
  );
}
