const crypto = require("crypto");
const express = require("express");
const axios = require("axios");
const supabase = require("../lib/supabase");
const { getAuthenticatedUser } = require("../lib/authClient");

const router = express.Router();
const RAZORPAY_API = "https://api.razorpay.com/v1";
const PLANS = {
  monthly: {
    amount: 19900,
    label: "JustDMs Pro Monthly",
    totalCount: 120,
    planId: () => process.env.RAZORPAY_MONTHLY_PLAN_ID,
  },
  yearly: {
    amount: 199900,
    label: "JustDMs Pro Yearly",
    totalCount: 10,
    planId: () => process.env.RAZORPAY_YEARLY_PLAN_ID,
  },
};

function razorpayAuth() {
  return {
    username: process.env.RAZORPAY_KEY_ID,
    password: process.env.RAZORPAY_KEY_SECRET,
  };
}

function checkoutConfigured() {
  return Boolean(
    process.env.RAZORPAY_KEY_ID &&
      process.env.RAZORPAY_KEY_SECRET &&
      process.env.RAZORPAY_MONTHLY_PLAN_ID &&
      process.env.RAZORPAY_YEARLY_PLAN_ID
  );
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

  await supabase.from("subscriptions").update(updates).eq("id", existing.id);
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

router.get("/subscription", requireUser, async (req, res) => {
  try {
    const subscription = await findSubscriptionByEmail(req.billingUser.email);
    return res.json({
      subscription: subscription || {
        status: "inactive",
        plan: "pro",
        billing_cycle: null,
      },
      checkoutConfigured: checkoutConfigured(),
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.post("/subscription", requireUser, async (req, res) => {
  try {
    const billingCycle = req.body.billingCycle;
    const plan = PLANS[billingCycle];
    if (!plan) {
      return res.status(400).json({ error: "Choose monthly or yearly billing." });
    }
    if (!checkoutConfigured()) {
      return res.status(503).json({
        error: "Checkout is not configured yet. Add the Razorpay subscription credentials to the backend.",
      });
    }

    const existing = await findSubscriptionByEmail(req.billingUser.email);
    if (["active", "authenticated", "pending", "halted"].includes(existing?.status)) {
      return res.status(409).json({
        error: "A subscription already exists for this account.",
      });
    }

    const { data: razorpaySubscription } = await axios.post(
      `${RAZORPAY_API}/subscriptions`,
      {
        plan_id: plan.planId(),
        total_count: plan.totalCount,
        quantity: 1,
        customer_notify: 1,
        notes: {
          user_email: req.billingUser.email,
          user_id: req.billingUser.id,
          billing_cycle: billingCycle,
          product: "JustDMs Pro",
        },
      },
      { auth: razorpayAuth(), timeout: 15000 }
    );

    const record = {
      ...(existing?.id ? { id: existing.id } : {}),
      user_id: req.billingUser.id,
      user_email: req.billingUser.email,
      plan: "pro",
      billing_cycle: billingCycle,
      amount_paise: plan.amount,
      currency: "INR",
      status: razorpaySubscription.status || "created",
      razorpay_plan_id: plan.planId(),
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
      amount: plan.amount,
      currency: "INR",
      planLabel: plan.label,
      billingCycle,
    });
  } catch (error) {
    console.error("Billing subscription error:", error.response?.data || error);
    return res.status(500).json({
      error:
        error.response?.data?.error?.description ||
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
