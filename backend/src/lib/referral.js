const crypto = require("crypto");
const supabase = require("./supabase");

const REFERRAL_REWARD_DAYS = 14;

function normalizeReferralCode(value) {
  return String(value || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function isRecentSignup(user, now = Date.now()) {
  const createdAt = new Date(user?.created_at || 0).getTime();
  return Number.isFinite(createdAt) && now - createdAt <= 7 * 24 * 60 * 60 * 1000;
}

function rewardAccessEnd(currentEnd, now = Date.now()) {
  const existingEnd = new Date(currentEnd || 0).getTime();
  const base = Number.isFinite(existingEnd) && existingEnd > now ? existingEnd : now;
  return new Date(base + REFERRAL_REWARD_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

async function qualifyReferralForSubscription({ userId, userEmail, paymentId }) {
  if (!userId || !paymentId) return null;

  if (typeof supabase.rpc === "function") {
    const { data, error } = await supabase.rpc("grant_referral_reward", {
      p_referred_user_id: userId,
      p_payment_id: paymentId,
    });
    if (error) throw error;
    return data;
  }

  const { data: referral } = await supabase
    .from("referrals")
    .select("*")
    .eq("referred_user_id", userId)
    .maybeSingle();
  if (!referral || referral.status === "rewarded") return null;

  const { data: existingReward } = await supabase
    .from("referral_rewards")
    .select("id")
    .eq("payment_id", paymentId)
    .maybeSingle();
  if (existingReward) return null;

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_email", referral.referrer_email)
    .maybeSingle();
  const referralAccessEnd = rewardAccessEnd(subscription?.referral_access_end);

  await supabase.from("subscriptions").upsert({
    ...(subscription?.id ? { id: subscription.id } : {}),
    user_id: referral.referrer_user_id,
    user_email: referral.referrer_email,
    plan: "pro",
    status: subscription?.status || "inactive",
    referral_access_end: referralAccessEnd,
    updated_at: new Date().toISOString(),
  });
  await supabase.from("referral_rewards").insert({
    referral_id: referral.id,
    recipient_user_id: referral.referrer_user_id,
    recipient_email: referral.referrer_email,
    payment_id: paymentId,
    reward_days: REFERRAL_REWARD_DAYS,
    access_ends_at: referralAccessEnd,
  });
  await supabase.from("referrals").update({
    status: "rewarded",
    qualified_at: new Date().toISOString(),
    rewarded_at: new Date().toISOString(),
    qualifying_payment_id: paymentId,
  }).eq("id", referral.id);
  return { rewarded: true, userEmail, referralAccessEnd };
}

function hashVisitor(value) {
  return crypto.createHash("sha256").update(String(value || "unknown")).digest("hex");
}

module.exports = {
  REFERRAL_REWARD_DAYS,
  normalizeReferralCode,
  isRecentSignup,
  rewardAccessEnd,
  qualifyReferralForSubscription,
  hashVisitor,
};
