import { confirmAction } from "../components/common/AppDialog";
import { useEffect, useMemo, useState } from "react";
import BillingPanel from "../components/billing/BillingPanel";
import AppLayout from "../components/layout/AppLayout";
import api from "../api/api";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../lib/supabase";

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

export default function Billing({ embedded = false }) {
  const Layout = embedded ? EmbeddedBilling : AppLayout;
  const { user, loading: authLoading } = useAuth({ redirectOnFail: true });
  const [currency, setCurrency] = useState("INR");
  const [checkoutCurrencies, setCheckoutCurrencies] = useState({ INR: false, USD: false });
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [offerPaymentMethod, setOfferPaymentMethod] = useState("upi");
  const [foundingOffer, setFoundingOffer] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [checkoutConfigured, setCheckoutConfigured] = useState(true);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);
  const [message, setMessage] = useState("");

  const introductory = foundingOffer?.enabled && foundingOffer?.eligible && currency === "INR" && billingCycle === "monthly";

  const plan = useMemo(() => currency === "USD"
    ? billingCycle === "yearly" ? { amount: "$49", suffix: "/year", monthly: "$4.08/month", savings: "Save $10.88" } : { amount: "$4.99", suffix: "/month" }
    : billingCycle === "yearly" ? { amount: "₹1,999", suffix: "/year", monthly: "₹167/month", savings: "Save ₹389" } : introductory ? { amount: "₹99", suffix: "first month" } : { amount: "₹199", suffix: "/month" }, [currency, billingCycle, introductory]);

  const loadSubscription = async () => {
    if (!user?.email) return;
    try {
      const headers = await billingHeaders(user);
      const { data } = await api.get("/billing/subscription", { headers });
      setSubscription(data.subscription);
      setFoundingOffer(data.foundingOffer || null);
      setCheckoutConfigured(data.checkoutConfigured);
      setCheckoutCurrencies(data.checkoutCurrencies || { INR: data.checkoutConfigured, USD: false });
      if (["monthly", "yearly"].includes(data.subscription?.billing_cycle)) setBillingCycle(data.subscription.billing_cycle);
      if (data.subscription?.currency) setCurrency(data.subscription.currency);
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
        { billingCycle, currency, ...(introductory ? { offerCode: foundingOffer.code, offerPaymentMethod } : {}) },
        { headers }
      );

      const checkout = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: "JustDMs",
        description: order.planLabel,
        subscription_id: order.subscriptionId,
        ...(order.offerPaymentMethod ? { config: { display: {
          blocks: { introductory: { name: order.offerPaymentMethod === "upi" ? "Pay with UPI AutoPay" : "Pay with card", instruments: [{ method: order.offerPaymentMethod }] } },
          sequence: ["block.introductory"], preferences: { show_default_blocks: false },
        } } } : {}),
        prefill: { email: user.email },
        theme: { color: "#0567dd" },
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
    if (!await confirmAction("Cancel renewal at the end of the current billing period?")) {
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

  const accessEnd = subscription?.ends_at || subscription?.current_end;
  const paidActive = subscription?.status === "active" &&
    (!accessEnd || new Date(accessEnd).getTime() > Date.now());
  const referralActive = new Date(subscription?.referral_access_end || 0).getTime() > Date.now();
  const active = paidActive || referralActive;
  const effectiveAccessEnd = paidActive ? accessEnd : subscription?.referral_access_end;
  const renewalDate = effectiveAccessEnd
    ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(
        new Date(effectiveAccessEnd)
      )
    : null;

  return <Layout title="Billing" subtitle="Your plan, payments, and what’s next.">
    <BillingPanel {...{ currency, setCurrency, billingCycle, setBillingCycle, plan, introductory,
      offerPaymentMethod, setOfferPaymentMethod, active, paidActive, subscription, renewalDate,
      loading, checkingOut, authLoading, startCheckout, cancelSubscription, message }}
      checkoutAvailable={currency === "INR" ? checkoutConfigured : checkoutCurrencies.USD} />
  </Layout>;
}

function EmbeddedBilling({ children }) { return <div>{children}</div>; }
