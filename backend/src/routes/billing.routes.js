const crypto = require("crypto");
const express = require("express");
const axios = require("axios");
const supabase = require("../lib/supabase");
const { getAuthenticatedUser } = require("../lib/authClient");
const { isActivePaidSubscription } = require("../lib/automationAccess");
const { qualifyReferralForSubscription } = require("../lib/referral");

const { foundingOffer, eligibleForFoundingOffer, validateFoundingClaim } = require("../lib/foundingOffer");

const router = express.Router();
const RAZORPAY_API = "https://api.razorpay.com/v1";
const { billingPlan, planMatches } = require("../lib/billingPlans");

function razorpayAuth() {
  return {
    username: process.env.RAZORPAY_KEY_ID,
    password: process.env.RAZORPAY_KEY_SECRET,
  };
}

function checkoutConfigured(currency = "INR") {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
    && billingPlan(currency, "monthly")?.planId && billingPlan(currency, "yearly")?.planId);
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left || ""));
  const rightBuffer = Buffer.from(String(right || ""));
  return (
    leftBuffer.length === rightBuffer.length &&
    crypto.timingSafeEqual(leftBuffer, rightBuffer)
  );
}

async function getRequestUser(req) {
  const user = await getAuthenticatedUser(req);
  if (user) return user;

  if (process.env.NODE_ENV !== "production" && req.headers["x-user-email"]) {
    return {
      id: req.headers["x-user-id"] || "local-user",
      email: req.headers["x-user-email"],
    };
  }

  return null;
}

async function requireUser(req, res, next) {
  try {
    const user = await getRequestUser(req);
    if (!user?.email) {
      return res.status(401).json({ error: "Please sign in to manage billing." });
    }
    req.billingUser = user;
    return next();
  } catch {
    return res.status(401).json({ error: "Unable to verify your session." });
  }
}

async function findSubscriptionByEmail(userEmail) {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_email", userEmail)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function findSubscriptionByRazorpayId(subscriptionId) {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("razorpay_subscription_id", subscriptionId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function updateFromWebhook(event) {
  const entity = event.payload?.subscription?.entity;
  if (!entity?.id) return;

  const existing = await findSubscriptionByRazorpayId(entity.id);
  if (!existing) return;

  const statusMap = {
    "subscription.authenticated": "active",
    "subscription.activated": "active",
    "subscription.charged": "active",
    "subscription.pending": "pending",
    "subscription.halted": "halted",
    "subscription.paused": "paused",
    "subscription.resumed": "active",
    "subscription.cancelled": "cancelled",
    "subscription.completed": "completed",
  };
  const updates = {
    status: statusMap[event.event] || entity.status || existing.status,
    razorpay_customer_id: entity.customer_id || existing.razorpay_customer_id,
    current_start: entity.current_start
      ? new Date(entity.current_start * 1000).toISOString()
      : existing.current_start,
    current_end: entity.current_end
      ? new Date(entity.current_end * 1000).toISOString()
      : existing.current_end,
    starts_at: entity.current_start
      ? new Date(entity.current_start * 1000).toISOString()
      : existing.starts_at,
    ends_at: entity.current_end
      ? new Date(entity.current_end * 1000).toISOString()
      : existing.ends_at,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("subscriptions").update(updates).eq("id", existing.id);
  if (error) throw error;

  const paymentId = event.payload?.payment?.entity?.id;
  if (event.event === "subscription.charged" && paymentId) {
    await qualifyReferralForSubscription({
      userId: existing.user_id,
      userEmail: existing.user_email,
      paymentId,
    });
  }
}

router.post("/webhook", async (req, res) => {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return res.status(503).json({ error: "Billing webhook is not configured." });
  }

  const expected = crypto
    .createHmac("sha256", webhookSecret)
    .update(req.rawBody || Buffer.from(JSON.stringify(req.body)))
    .digest("hex");
  if (!safeEqual(expected, req.headers["x-razorpay-signature"])) {
    return res.status(400).json({ error: "Invalid webhook signature." });
  }

  try {
    await updateFromWebhook(req.body);
    return res.sendStatus(200);
  } catch (error) {
    console.error("Razorpay webhook error:", error);
    return res.status(500).json({ error: "Webhook processing failed." });
  }
});

router.get("/founding-offer", (_req, res) => {
  res.set("Cache-Control", "no-store");
  return res.json({ ...foundingOffer(), enabled: foundingOffer().enabled && checkoutConfigured("INR") });
});

router.get("/subscription", requireUser, async (req, res) => {
  try {
    const subscription = await findSubscriptionByEmail(req.billingUser.email);
    return res.json({
      subscription: subscription || {
        status: "inactive",
        plan: "pro",
        billing_cycle: null,
      },
      foundingOffer: { ...foundingOffer(), enabled: foundingOffer().enabled && checkoutConfigured("INR"), eligible: eligibleForFoundingOffer(subscription) },
      checkoutConfigured: checkoutConfigured(),
      checkoutCurrencies: { INR: checkoutConfigured("INR"), USD: checkoutConfigured("USD") },
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.post("/subscription", requireUser, async (req, res) => {
  try {
    const billingCycle = req.body.billingCycle;
    const currency = req.body.currency === undefined ? "INR" : req.body.currency;
    const plan = billingPlan(currency, billingCycle);
    if (!plan) {
      return res.status(400).json({ error: "Choose INR or USD and monthly or yearly billing." });
    }
    if (!checkoutConfigured(currency)) {
      return res.status(503).json({
        error: "Checkout is not configured yet. Add the Razorpay subscription credentials to the backend.",
      });
    }

    const existing = await findSubscriptionByEmail(req.billingUser.email);
    if (
      isActivePaidSubscription(existing) ||
      ["authenticated", "pending", "halted"].includes(existing?.status)
    ) {
      return res.status(409).json({
        error: "A subscription already exists for this account.",
      });
    }

    const claimedOffer = validateFoundingClaim({ code: req.body.offerCode, currency, cycle: billingCycle, subscription: existing });

    // A wrong environment plan ID must never result in the wrong charge.
    const { data: remotePlan } = await axios.get(`${RAZORPAY_API}/plans/${plan.planId}`, { auth: razorpayAuth(), timeout: 15000 });
    if (!planMatches(remotePlan, plan)) return res.status(503).json({ error: "The selected payment plan is not configured correctly. Please contact support." });
    const { data: razorpaySubscription } = await axios.post(
      `${RAZORPAY_API}/subscriptions`,
      {
        plan_id: plan.planId,
        ...(claimedOffer ? { offer_id: claimedOffer.offerId } : {}),
        total_count: plan.totalCount,
        quantity: 1,
        customer_notify: 1,
        notes: {
          user_email: req.billingUser.email,
          user_id: req.billingUser.id,
          billing_cycle: billingCycle,
          product: "JustDMs Pro",
          ...(claimedOffer ? { offer_code: claimedOffer.code, first_month_paise: "9900", renewal_paise: "19900" } : {}),
        },
      },
      { auth: razorpayAuth(), timeout: 15000 }
    );

    if (claimedOffer && razorpaySubscription.offer_id !== claimedOffer.offerId) {
      throw Object.assign(new Error("The introductory discount could not be confirmed. No checkout has been opened."), { status: 503 });
    }

    const record = {
      ...(existing?.id ? { id: existing.id } : {}),
      user_id: req.billingUser.id,
      user_email: req.billingUser.email,
      plan: "pro",
      billing_cycle: billingCycle,
      amount_paise: plan.amount,
      currency: plan.currency,
      status: razorpaySubscription.status || "created",
      razorpay_plan_id: plan.planId,
      razorpay_subscription_id: razorpaySubscription.id,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from("subscriptions").upsert(record, {
      onConflict: "user_email",
    });
    if (error) throw error;

    return res.json({
      keyId: process.env.RAZORPAY_KEY_ID,
      subscriptionId: razorpaySubscription.id,
      amount: claimedOffer ? claimedOffer.firstAmount : plan.amount,
      currency: plan.currency,
      planLabel: claimedOffer ? "JustDMs Pro: ₹99 first month, then ₹199/month" : plan.label,
      billingCycle,
    });
  } catch (error) {
    console.error("Billing subscription error:", error.response?.data || error);
    return res.status(error.status || 500).json({
      error:
        error.status ? error.message : error.response?.data?.error?.description ||
        "Unable to start subscription checkout.",
    });
  }
});

router.post("/verify", requireUser, async (req, res) => {
  try {
    const paymentId = req.body.razorpay_payment_id;
    const subscriptionId = req.body.razorpay_subscription_id;
    const signature = req.body.razorpay_signature;
    if (!paymentId || !subscriptionId || !signature) {
      return res.status(400).json({ error: "Incomplete subscription confirmation." });
    }

    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "")
      .update(`${paymentId}|${subscriptionId}`)
      .digest("hex");
    if (!safeEqual(expected, signature)) {
      return res.status(400).json({ error: "Subscription verification failed." });
    }

    const subscription = await findSubscriptionByEmail(req.billingUser.email);
    if (!subscription || subscription.razorpay_subscription_id !== subscriptionId) {
      return res.status(404).json({ error: "Subscription was not found." });
    }

    const { data: remote } = await axios.get(
      `${RAZORPAY_API}/subscriptions/${subscriptionId}`,
      { auth: razorpayAuth(), timeout: 15000 }
    );
    const startsAt = remote.current_start
      ? new Date(remote.current_start * 1000).toISOString()
      : new Date().toISOString();
    const endsAt = remote.current_end
      ? new Date(remote.current_end * 1000).toISOString()
      : null;
    const { data, error } = await supabase
      .from("subscriptions")
      .update({
        status: ["active", "authenticated"].includes(remote.status)
          ? "active"
          : remote.status,
        razorpay_payment_id: paymentId,
        razorpay_customer_id: remote.customer_id || null,
        current_start: startsAt,
        current_end: endsAt,
        starts_at: startsAt,
        ends_at: endsAt,
        updated_at: new Date().toISOString(),
      })
      .eq("id", subscription.id)
      .select("*")
      .single();
    if (error) throw error;

    try {
      await qualifyReferralForSubscription({
        userId: subscription.user_id,
        userEmail: subscription.user_email,
        paymentId,
      });
    } catch (referralError) {
      // Payment remains successful. The signed webhook will retry reward processing.
      console.error("Referral reward after checkout verification failed:", referralError);
    }

    return res.json({ subscription: data });
  } catch (error) {
    console.error("Billing verification error:", error.response?.data || error);
    return res.status(500).json({ error: "Unable to verify subscription." });
  }
});

router.post("/cancel", requireUser, async (req, res) => {
  try {
    const subscription = await findSubscriptionByEmail(req.billingUser.email);
    if (!subscription?.razorpay_subscription_id) {
      return res.status(404).json({ error: "No subscription was found." });
    }

    const { data: remote } = await axios.post(
      `${RAZORPAY_API}/subscriptions/${subscription.razorpay_subscription_id}/cancel`,
      { cancel_at_cycle_end: 1 },
      { auth: razorpayAuth(), timeout: 15000 }
    );
    const { data, error } = await supabase
      .from("subscriptions")
      .update({
        status: remote.status || subscription.status,
        cancel_at_period_end: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", subscription.id)
      .select("*")
      .single();
    if (error) throw error;

    return res.json({ subscription: data });
  } catch (error) {
    console.error("Billing cancellation error:", error.response?.data || error);
    return res.status(500).json({
      error:
        error.response?.data?.error?.description ||
        "Unable to cancel the subscription.",
    });
  }
});

module.exports = router;
