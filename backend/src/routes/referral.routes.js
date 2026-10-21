const crypto = require("crypto");
const express = require("express");
const supabase = require("../lib/supabase");
const { getAuthenticatedUser } = require("../lib/authClient");
const {
  REFERRAL_REWARD_DAYS,
  normalizeReferralCode,
  isRecentSignup,
  hashVisitor,
} = require("../lib/referral");

const router = express.Router();

async function requireUser(req, res, next) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user?.id || !user?.email) return res.status(401).json({ error: "Please sign in." });
    req.referralUser = user;
    return next();
  } catch {
    return res.status(401).json({ error: "Unable to verify your session." });
  }
}

async function getOrCreateCode(user) {
  const { data: existing, error } = await supabase
    .from("referral_codes")
    .select("*")
    .eq("owner_user_id", user.id)
    .maybeSingle();
  if (error) throw error;
  if (existing) return existing;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const prefix = String(user.email).split("@")[0].replace(/[^a-z0-9]/gi, "").slice(0, 6).toUpperCase() || "JUSTDM";
    const code = `${prefix}${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
    const { data, error: insertError } = await supabase
      .from("referral_codes")
      .insert({ owner_user_id: user.id, owner_email: user.email.toLowerCase(), code })
      .select("*")
      .single();
    if (!insertError) return data;
    if (insertError.code !== "23505") throw insertError;
    const { data: concurrentCode } = await supabase
      .from("referral_codes")
      .select("*")
      .eq("owner_user_id", user.id)
      .maybeSingle();
    if (concurrentCode) return concurrentCode;
  }
  throw new Error("Unable to create a unique referral code.");
}

router.get("/me", requireUser, async (req, res) => {
  try {
    const referralCode = await getOrCreateCode(req.referralUser);
    const [{ data: referrals = [], error }, { data: visits = [], error: visitsError }] = await Promise.all([
      supabase
        .from("referrals")
        .select("id,status,created_at,qualified_at,rewarded_at,referred_email")
        .eq("referrer_user_id", req.referralUser.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("referral_events")
        .select("id")
        .eq("referral_code_id", referralCode.id),
    ]);
    if (error) throw error;
    if (visitsError) throw visitsError;

    const rewarded = referrals.filter((item) => item.status === "rewarded").length;
    return res.json({
      code: referralCode.code,
      rewardDays: REFERRAL_REWARD_DAYS,
      stats: {
        visits: visits.length,
        signups: referrals.length,
        pending: referrals.filter((item) => item.status === "signed_up").length,
        successful: rewarded,
        daysEarned: rewarded * REFERRAL_REWARD_DAYS,
      },
      referrals,
    });
  } catch (error) {
    console.error("Referral dashboard error:", error);
    return res.status(500).json({ error: "Unable to load referral details." });
  }
});

router.post("/claim", requireUser, async (req, res) => {
  try {
    const code = normalizeReferralCode(req.body.code);
    if (!code) return res.status(400).json({ error: "Referral code is required." });
    if (!isRecentSignup(req.referralUser)) {
      return res.status(409).json({ error: "Referral codes are only available during new account signup." });
    }

    const { data: ownerCode, error: codeError } = await supabase
      .from("referral_codes")
      .select("*")
      .eq("code", code)
      .maybeSingle();
    if (codeError) throw codeError;
    if (!ownerCode || ownerCode.is_active === false) return res.status(404).json({ error: "Referral code is invalid." });
    if (ownerCode.owner_user_id === req.referralUser.id || ownerCode.owner_email === req.referralUser.email.toLowerCase()) {
      return res.status(409).json({ error: "You cannot use your own referral link." });
    }

    const { data: existing, error: existingError } = await supabase
      .from("referrals")
      .select("id")
      .eq("referred_user_id", req.referralUser.id)
      .maybeSingle();
    if (existingError) throw existingError;
    if (existing) return res.json({ claimed: true });

    const { error } = await supabase.from("referrals").insert({
      referral_code_id: ownerCode.id,
      referrer_user_id: ownerCode.owner_user_id,
      referrer_email: ownerCode.owner_email,
      referred_user_id: req.referralUser.id,
      referred_email: req.referralUser.email.toLowerCase(),
      status: "signed_up",
    });
    if (error) throw error;
    return res.status(201).json({ claimed: true });
  } catch (error) {
    if (error.code === "23505") return res.json({ claimed: true });
    console.error("Referral claim error:", error);
    return res.status(500).json({ error: "Unable to save this referral." });
  }
});

router.post("/visit/:code", async (req, res) => {
  const code = normalizeReferralCode(req.params.code);
  if (!code) return res.status(204).end();
  try {
    const { data: ownerCode } = await supabase
      .from("referral_codes")
      .select("id")
      .eq("code", code)
      .maybeSingle();
    if (ownerCode) {
      const visitor = `${req.ip}|${req.headers["user-agent"] || ""}`;
      await supabase.from("referral_events").insert({
        referral_code_id: ownerCode.id,
        event_type: "visit",
        visitor_hash: hashVisitor(visitor),
      });
    }
  } catch (error) {
    console.error("Referral visit tracking error:", error.message);
  }
  return res.status(204).end();
});

module.exports = router;
