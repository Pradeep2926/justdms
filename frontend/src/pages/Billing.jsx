import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Check,
  CreditCard,
  Crown,
  Infinity,
  MessageCircleReply,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import AppLayout from "../components/layout/AppLayout";
import api from "../api/api";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../lib/supabase";

const FEATURES = [
  "Comment-to-DM automation",
  "Keyword triggers",
  "Automatic comment replies",
  "DM automation",
  "Follow-gate flows",
  "Link delivery",
  "Lead collection",
  "Analytics",
  "Unlimited automations",
];

async function billingHeaders(user) {
  const { data } = await supabase.auth.getSession();
  const accessToken = data?.session?.access_token;
  return {
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    "X-User-Email": user.email,
    "X-User-Id": user.id,
  };
}

function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve(true);

  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function Billing() {
  const { user, loading: authLoading } = useAuth({ redirectOnFail: true });
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [subscription, setSubscription] = useState(null);
  const [checkoutConfigured, setCheckoutConfigured] = useState(true);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);
  const [message, setMessage] = useState("");

  const plan = useMemo(
    () =>
      billingCycle === "yearly"
        ? { amount: "₹1,999", suffix: "/year", monthly: "₹167/month", savings: "Save ₹389" }
        : { amount: "₹199", suffix: "/month", monthly: null, savings: null },
    [billingCycle]
  );

  const loadSubscription = async () => {
    if (!user?.email) return;
    try {
      const headers = await billingHeaders(user);
      const { data } = await api.get("/billing/subscription", { headers });
      setSubscription(data.subscription);
      setCheckoutConfigured(data.checkoutConfigured);
    } catch (error) {
      setMessage(error.response?.data?.error || "Unable to load billing details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubscription();
  }, [user?.email]);

  const startCheckout = async () => {
    if (!user) return;
    setCheckingOut(true);
    setMessage("");

    try {
      const loaded = await loadRazorpay();
      if (!loaded) throw new Error("Payment checkout could not be loaded. Please try again.");

      const headers = await billingHeaders(user);
      const { data: order } = await api.post(
        "/billing/subscription",
        { billingCycle },
        { headers }
      );

      const checkout = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: "JustDMs",
        description: order.planLabel,
        subscription_id: order.subscriptionId,
        prefill: { email: user.email },
        theme: { color: "#0891b2" },
        handler: async (payment) => {
          try {
            const verifyHeaders = await billingHeaders(user);
            const { data } = await api.post("/billing/verify", payment, {
              headers: verifyHeaders,
            });
            setSubscription(data.subscription);
            setMessage("Welcome to JustDMs Pro. Your subscription is active.");
          } catch (error) {
            setMessage(error.response?.data?.error || "Payment verification failed.");
          }
        },
        modal: { ondismiss: () => setCheckingOut(false) },
      });
      checkout.on("payment.failed", (response) => {
        setMessage(response.error?.description || "Payment failed. Please try again.");
        setCheckingOut(false);
      });
      checkout.open();
    } catch (error) {
      setMessage(error.response?.data?.error || error.message || "Unable to start checkout.");
    } finally {
      setCheckingOut(false);
    }
  };

  const cancelSubscription = async () => {
    if (!window.confirm("Cancel renewal at the end of the current billing period?")) {
      return;
    }

    try {
      setCheckingOut(true);
      setMessage("");
      const headers = await billingHeaders(user);
      const { data } = await api.post("/billing/cancel", {}, { headers });
      setSubscription(data.subscription);
      setMessage("Renewal cancelled. Pro remains active through the current billing period.");
    } catch (error) {
      setMessage(error.response?.data?.error || "Unable to cancel subscription.");
    } finally {
      setCheckingOut(false);
    }
  };

  const active = subscription?.status === "active";
  const renewalDate = subscription?.ends_at
    ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(
        new Date(subscription.ends_at)
      )
    : null;

  return (
    <AppLayout title="Billing" subtitle="Manage your JustDMs Pro subscription">
      <div className="mx-auto max-w-5xl space-y-6">
        {active && (
          <section className="flex flex-col gap-4 rounded-lg border border-emerald-200 bg-emerald-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600 text-white">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <div>
                <p className="font-bold text-emerald-950">JustDMs Pro is active</p>
                <p className="text-sm text-emerald-800">
                  {subscription.billing_cycle === "yearly" ? "Yearly" : "Monthly"} billing
                  {renewalDate ? ` · Access through ${renewalDate}` : ""}
                </p>
              </div>
            </div>
            <span className="self-start rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold uppercase text-white sm:self-auto">
              {subscription.cancel_at_period_end ? "Ends this period" : "Active"}
            </span>
          </section>
        )}

        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="grid lg:grid-cols-[0.9fr_1.1fr]">
            <div className="border-b border-slate-100 bg-slate-950 p-6 text-white sm:p-8 lg:border-b-0 lg:border-r">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-cyan-400 text-slate-950">
                  <Crown className="h-6 w-6" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-cyan-300">One plan. Everything included.</p>
                  <h2 className="text-2xl font-bold">JustDMs Pro</h2>
                </div>
              </div>

              <p className="mt-6 max-w-md text-slate-300">
                Everything you need to automate Instagram DMs, capture leads, and respond while interest is high.
              </p>

              <div className="mt-7 flex items-end gap-2">
                <span className="text-4xl font-bold sm:text-5xl">{plan.amount}</span>
                <span className="pb-1 text-slate-400">{plan.suffix}</span>
              </div>
              {plan.monthly && (
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                  <span className="text-slate-300">Equivalent to {plan.monthly}</span>
                  <span className="rounded-full bg-emerald-400 px-2.5 py-1 font-bold text-emerald-950">
                    {plan.savings}
                  </span>
                </div>
              )}

              <div className="mt-8 rounded-lg border border-white/15 bg-white/5 p-1">
                <div className="grid grid-cols-2 gap-1" aria-label="Billing period">
                  {[
                    ["monthly", "Monthly"],
                    ["yearly", "Yearly · Best Value"],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setBillingCycle(value)}
                      className={`min-h-11 rounded-md px-3 text-sm font-bold transition ${
                        billingCycle === value
                          ? "bg-white text-slate-950 shadow-sm"
                          : "text-slate-300 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={startCheckout}
                disabled={authLoading || loading || checkingOut || active || !checkoutConfigured}
                className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-cyan-400 px-5 font-bold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-55"
              >
                <CreditCard className="h-5 w-5" />
                {active
                  ? "Current plan"
                  : checkingOut
                    ? "Opening checkout..."
                    : `Choose ${billingCycle}`}
              </button>
              {!checkoutConfigured && !loading && (
                <p className="mt-3 text-center text-xs text-amber-300">
                  Checkout will be available after payment setup is completed.
                </p>
              )}
            </div>

            <div className="p-6 sm:p-8">
              <div className="flex items-center gap-2 text-slate-950">
                <Sparkles className="h-5 w-5 text-cyan-600" />
                <h3 className="text-lg font-bold">Everything in Pro</h3>
              </div>
              <div className="mt-6 grid gap-x-8 gap-y-4 sm:grid-cols-2">
                {FEATURES.map((feature) => (
                  <div key={feature} className="flex items-start gap-3 text-sm font-medium text-slate-700">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    {feature}
                  </div>
                ))}
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                <Benefit icon={MessageCircleReply} label="Automate replies" />
                <Benefit icon={Zap} label="Deliver instantly" />
                <Benefit icon={BarChart3} label="Measure results" />
              </div>

              <div className="mt-8 border-t border-slate-100 pt-6">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <Infinity className="h-5 w-5 text-cyan-600" />
                  Unlimited DMs*
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  *Subject to Instagram/Meta API limits and fair usage.
                </p>
              </div>

              {message && (
                <div className={`mt-6 rounded-lg border px-4 py-3 text-sm ${
                  message.includes("active")
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-amber-200 bg-amber-50 text-amber-900"
                }`}>
                  {message}
                </div>
              )}
            </div>
          </div>
        </section>

        {active && !subscription.cancel_at_period_end && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={cancelSubscription}
              disabled={checkingOut}
              className="text-sm font-semibold text-slate-500 underline decoration-slate-300 underline-offset-4 hover:text-red-600 disabled:opacity-50"
            >
              Cancel renewal
            </button>
          </div>
        )}

        <p className="text-center text-xs leading-5 text-slate-500">
          Prices include access to all currently listed Pro features. Instagram functionality depends on Meta platform availability and policies.
        </p>
      </div>
    </AppLayout>
  );
}

function Benefit({ icon: Icon, label }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-700">
      <Icon className="h-4 w-4 text-cyan-600" />
      {label}
    </div>
  );
}
