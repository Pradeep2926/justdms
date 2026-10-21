import { useEffect, useRef } from "react";
import { AlertCircle, CalendarDays, Instagram, ShieldCheck, X, Zap } from "lucide-react";
import { formatAdminDate as date, initials, Pill, PlanPill, TokenPill, tokenRemaining, userActivity } from "./AdminUI";

function Detail({ label, children }) {
  return <div className="min-w-0"><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-1.5 break-words text-sm font-medium text-slate-900">{children}</dd></div>;
}

export default function AdminUserDetails({ user, onClose }) {
  const ref = useRef(null);
  const activity = userActivity(user);
  useEffect(() => {
    const dialog = ref.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.showModal();
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby="admin-user-title"
      onCancel={event => { event.preventDefault(); onClose(); }}
      onClick={event => { if (event.target === event.currentTarget) onClose(); }}
      className="fixed inset-y-0 left-auto right-0 !m-0 h-[100dvh] max-h-none w-full max-w-2xl border-0 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/35 backdrop:backdrop-blur-sm"
    >
      <div className="flex h-full flex-col">
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 px-5 py-5 sm:px-7">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-sm font-bold text-violet-700">{initials(user)}</span>
            <div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">User overview</p><h2 id="admin-user-title" className="mt-0.5 break-words text-lg font-bold">{user.name}</h2><p className="mt-0.5 break-all text-xs text-slate-500">{user.email}</p></div>
          </div>
          <button autoFocus aria-label="Close user details" onClick={onClose} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-500 transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-500"><X className="h-5 w-5" /></button>
        </header>
        <div className="min-h-0 flex-1 space-y-7 overflow-y-auto overscroll-contain px-5 py-6 sm:px-7">
          <div className="flex flex-wrap items-center gap-2"><PlanPill user={user} /><Pill tone={user.confirmed ? "green" : "amber"}>{user.confirmed ? "Email verified" : "Email unconfirmed"}</Pill>{user.isNew && <Pill tone="purple">New this week</Pill>}</div>
          <section>
            <h3 className="flex items-center gap-2 text-sm font-bold"><CalendarDays className="h-4 w-4 text-violet-500" /> Account & subscription</h3>
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-5 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
              <Detail label="Registered">{user.registered ? date(user.createdAt) : "Legacy data · no login"}</Detail>
              <Detail label="Last sign-in">{date(user.lastSignInAt)}</Detail>
              <Detail label="Saved billing status"><span className="capitalize">{user.subscription?.status || "No subscription"}</span></Detail>
              <Detail label="Billing cycle"><span className="capitalize">{user.subscription?.billingCycle || "—"}</span></Detail>
              <Detail label="Paid access ends">{date(user.subscription?.accessEnd)}</Detail>
              <Detail label="Referral access ends">{date(user.subscription?.referralAccessEnd)}</Detail>
              <Detail label="Renewal">{user.subscription?.cancelAtPeriodEnd ? "Cancels at period end" : user.subscription?.paidPro ? "Not marked for cancellation" : "—"}</Detail>
            </dl>
          </section>
          <section>
            <h3 className="flex items-center gap-2 text-sm font-bold"><Instagram className="h-4 w-4 text-violet-500" /> Instagram connections</h3>
            <div className="mt-4 space-y-3">{user.accounts.map(account => (
              <div key={account.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2"><p className="min-w-0 break-all text-sm font-bold">@{account.username || "Unknown"}</p><TokenPill token={account.token} /></div>
                <p className="mt-2 text-xs text-slate-500">{tokenRemaining(account.token)}</p>
                <dl className="mt-4 grid grid-cols-2 gap-4"><Detail label="Token expires · IST">{date(account.token.expiresAt)}</Detail><Detail label="Last profile sync · IST">{date(account.lastSyncAt)}</Detail></dl>
              </div>
            ))}</div>
            {!user.accounts.length && <p className="mt-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Instagram has not been connected.</p>}
            <p className="mt-3 text-xs leading-5 text-slate-500">Token status uses saved expiry and connection data. It is not a live Meta check. Last profile sync is not a token refresh.</p>
          </section>
          <section>
            <div className="flex items-center justify-between gap-2"><h3 className="flex items-center gap-2 text-sm font-bold"><Zap className="h-4 w-4 text-violet-500" /> Automations</h3><span className="text-xs text-slate-500">{user.automations.length} created</span></div>
            <div className="mt-4 grid grid-cols-3 divide-x divide-slate-200 rounded-xl bg-slate-50 py-4 text-center">{[[activity.sent, "Resource sends"], [activity.waiting, "Waiting"], [user.automations.reduce((n, a) => n + a.activity.failed, 0), "Failed now"]].map(([value, label]) => <div key={label}><p className="text-xl font-bold tabular-nums">{value}</p><p className="mt-1 text-[10px] text-slate-500">{label} · 48h</p></div>)}</div>
            <div className="mt-4 space-y-3">{user.automations.map(automation => (
              <div key={automation.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h4 className="break-words text-sm font-bold">{automation.name}</h4><p className="mt-1 break-words text-xs text-slate-500">Trigger: {automation.trigger || "Any comment"}</p></div><Pill tone={automation.active ? "purple" : "slate"}>{automation.active ? "Active" : "Paused"}</Pill></div>
                <p className="mt-3 text-xs leading-5 text-slate-600">{automation.activity.sentEvents} sends · {automation.activity.waiting} waiting · {automation.activity.failedEvents} failure events in 48h</p>
                <p className="mt-1 text-[11px] text-slate-400">Created {date(automation.createdAt, false)}</p>
                {automation.activity.recentFailures.map((failure, index) => <div key={index} className="mt-3 rounded-lg border border-rose-100 bg-rose-50 p-3 text-xs text-rose-800"><p className="flex items-start gap-1.5 font-semibold"><AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span className="capitalize">{failure.type.replaceAll("_", " ")}</span></p><p className="mt-1 break-words leading-5">{failure.message}</p><p className="mt-2 text-[10px] text-rose-500">{date(failure.at)} IST</p></div>)}
              </div>
            ))}</div>
            {!user.automations.length && <p className="mt-3 text-sm text-slate-500">No automations created yet.</p>}
          </section>
          <p className="flex items-start gap-2 rounded-xl bg-violet-50 p-3 text-xs leading-5 text-violet-700"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />This view is read only. Subscription status reflects the latest saved billing record. All times are in IST.</p>
        </div>
      </div>
    </dialog>
  );
}
