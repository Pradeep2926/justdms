import { ArrowUpRight, Check, CreditCard, Crown, Infinity, ShieldCheck, Sparkles } from "lucide-react";

const FEATURES = [
  ["Unlimited automations", "Build a flow for every post."],
  ["Comment & keyword triggers", "Start conversations from your content."],
  ["Follow prompts & link delivery", "Share your next step in the DM."],
  ["Lead collection & analytics", "Keep track of your conversations."],
  ["Link in Bio & appointments", "Bring your links and bookings together."],
  ["WhatsApp support", "Get help when you need it."],
];

export default function BillingPanel({ currency, setCurrency, billingCycle, setBillingCycle, plan, introductory, offerPaymentMethod, setOfferPaymentMethod, active, paidActive, subscription, renewalDate, loading, checkingOut, authLoading, checkoutAvailable, startCheckout, cancelSubscription, message }) {
  const currentName = active ? "JustDMs Pro" : "JustDMs Free";
  const disabled = authLoading || loading || checkingOut || active || !checkoutAvailable;
  return <div className="billing-panel relative isolate mx-auto max-w-5xl space-y-4 pb-2">
    <section aria-label="Current subscription" className="billing-current relative overflow-hidden rounded-2xl border border-white/90 px-5 py-4 shadow-sm">
      <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-cyan-400 via-brand-500 to-violet-500" />
      <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-3">
        <div className="flex items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/70 text-brand-600"><Crown className="h-5 w-5" /></span><div><p className="text-[10px] font-medium uppercase tracking-[.12em] text-slate-500">Your subscription</p><h2 className="mt-0.5 text-base font-semibold text-slate-900">{loading ? "Loading your plan…" : currentName}</h2></div></div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2"><p className="text-xs leading-5 text-slate-500">{active ? <>{paidActive ? `${subscription?.billing_cycle === "yearly" ? "Yearly" : "Monthly"} · ${subscription?.currency || "INR"}` : "Complimentary access"}{renewalDate && <span className="block">Access through <span className="font-medium text-slate-700">{renewalDate}</span></span>}</> : "Upgrade whenever you’re ready."}</p>{paidActive && !subscription?.cancel_at_period_end && <button type="button" onClick={cancelSubscription} disabled={checkingOut} className="min-h-10 text-xs font-medium text-slate-500 underline decoration-slate-300 underline-offset-4 hover:text-rose-600 disabled:opacity-50">Cancel renewal</button>}{!loading && <span className="inline-flex items-center gap-1.5 rounded-full border border-white bg-white/75 px-3 py-1.5 text-[10px] font-semibold text-slate-600"><span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-brand-500" : "bg-slate-400"}`} />{active ? subscription?.cancel_at_period_end ? "Renewal cancelled" : "Pro active" : "Free"}</span>}</div>
      </div>
    </section>

    <div className="grid items-start gap-4 lg:grid-cols-[1fr_1.05fr]">
      <section aria-labelledby="billing-pro-title" className="billing-pro-card overflow-hidden rounded-[24px] border border-white/90 bg-white">
        <div className="billing-price-header relative overflow-hidden p-5">
          <div className="flex flex-wrap items-center justify-between gap-3"><h2 id="billing-pro-title" className="flex items-center gap-2 text-xl font-semibold tracking-tight text-slate-950"><Crown className="h-5 w-5 text-brand-600" />JustDMs Pro</h2><div role="group" aria-label="Billing currency" className="inline-flex rounded-lg border border-white/90 bg-white/75 p-1 backdrop-blur">{["INR", "USD"].map(value => <button key={value} type="button" disabled={checkingOut || paidActive} aria-pressed={currency === value} onClick={() => setCurrency(value)} className={`min-h-9 rounded-md px-3 text-xs font-semibold transition disabled:cursor-not-allowed ${currency === value ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>{value === "INR" ? "₹ INR" : "$ USD"}</button>)}</div></div>
          <p className="mt-2 text-xs leading-5 text-slate-500">More room to create. Less time spent replying.</p>
          <div className="mt-4 flex items-baseline gap-2" aria-live="polite"><span className="text-[46px] font-semibold leading-none tracking-[-.045em] text-slate-950">{plan.amount}</span><span className="text-sm text-slate-500">{plan.suffix}</span>{introductory && <span className="ml-1 text-sm text-slate-400 line-through">₹199</span>}</div>
          <p className="mt-2 min-h-5 text-xs leading-5 text-slate-500">{introductory ? "Then ₹199/month until cancelled." : plan.monthly ? <>{plan.monthly} equivalent <span className="ml-1.5 font-medium text-brand-600">· {plan.savings}</span></> : "Billed monthly. Cancel renewal anytime."}</p>
        </div>
        <div className="space-y-3 border-t border-violet-100/70 bg-gradient-to-b from-violet-50/70 to-white p-5">
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100/80 p-1" role="group" aria-label="Billing period">{[["monthly", "Monthly"], ["yearly", "Yearly"]].map(([value,label]) => <button key={value} type="button" disabled={checkingOut} aria-pressed={billingCycle === value} onClick={() => setBillingCycle(value)} className={`flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium transition disabled:opacity-50 ${billingCycle === value ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>{label}{value === "yearly" && <span className="rounded bg-brand-50 px-1.5 py-0.5 text-[9px] font-semibold text-brand-600">Save</span>}</button>)}</div>
          {introductory && <fieldset><legend className="mb-2 text-xs font-medium text-slate-700">Pay with</legend><div className="grid grid-cols-2 gap-2">{[["upi", "UPI AutoPay"], ["card", "Debit / credit card"]].map(([value,label]) => <label key={value} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-xs transition ${offerPaymentMethod === value ? "border-brand-300 bg-brand-50/50 text-brand-800" : "border-slate-200 text-slate-500 hover:border-slate-300"}`}><input className="accent-violet-600" type="radio" name="introductory-payment-method" value={value} checked={offerPaymentMethod === value} onChange={() => setOfferPaymentMethod(value)} disabled={checkingOut} />{label}</label>)}</div></fieldset>}
          <div><button type="button" onClick={startCheckout} disabled={disabled} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 via-brand-600 to-violet-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"><CreditCard className="h-4 w-4" />{active ? "Your Pro plan is active" : checkingOut ? "Opening checkout…" : introductory ? "Start Pro · ₹99 first month" : `Get Pro · ${plan.amount}${plan.suffix}`}{!active && !checkingOut && <ArrowUpRight className="h-4 w-4" />}</button><p className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-slate-400"><ShieldCheck className="h-3.5 w-3.5" />Payments processed by Razorpay</p>{introductory && <p className="mt-2 text-center text-[10px] leading-4 text-slate-500">Founding offer · First paid INR monthly subscription only.</p>}</div>
          {!checkoutAvailable && !loading && <p className="text-xs leading-5 text-slate-500">{currency} checkout is not available yet.</p>}
          {message && <p role="status" className="break-words rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs leading-6 text-slate-700">{message}</p>}
        </div>
      </section>

      <section aria-labelledby="billing-features-title" className="billing-features rounded-[24px] border border-white/90 p-5 shadow-sm sm:p-7">
        <p className="text-[11px] font-medium uppercase tracking-[.12em] text-slate-400">All in one place</p><h3 id="billing-features-title" className="mt-2 text-lg font-semibold tracking-tight text-slate-900">Everything you need to keep growing</h3>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">{FEATURES.map(([title,description]) => <div key={title} className="flex items-start gap-2 rounded-xl border border-white/90 bg-white/70 px-3 py-2.5"><span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-200/80 to-cyan-100 text-brand-700"><Check className="h-3 w-3" /></span><div><p className="text-xs font-semibold leading-5 text-slate-800">{title}</p><p className="mt-1 text-xs leading-5 text-slate-500">{description}</p></div></div>)}</div>
        <div className="mt-3 rounded-xl bg-white/50 p-3"><div className="flex items-center gap-2 text-sm font-semibold text-slate-800"><Infinity className="h-4 w-4 text-brand-600" />Unlimited DMs*</div><p className="mt-2 text-xs leading-5 text-slate-500">Subject to Instagram/Meta API limits and fair usage.</p></div>

      </section>
    </div>
    <p className="px-3 text-center text-[11px] leading-5 text-slate-400">Prices cover the listed Pro features. Instagram functionality depends on Meta platform availability and policies.</p>
  </div>;
}
