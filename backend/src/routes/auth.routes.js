const express = require("express");
const crypto = require("crypto");
const { getAuthenticatedUser } = require("../lib/authClient");
const {
  connectInstagramDirectAccount,
} = require("../services/instagramSync.service");

const router = express.Router();

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const oauthStateSecret = process.env.JWT_SECRET || process.env.INSTAGRAM_APP_SECRET;

function signOAuthState(userEmail) {
  const payload = Buffer.from(JSON.stringify({
    email: userEmail,
    issuedAt: Date.now(),
    nonce: crypto.randomBytes(12).toString("hex"),
  })).toString("base64url");
  const signature = crypto
    .createHmac("sha256", oauthStateSecret)
    .update(payload)
    .digest("base64url");
  return `${payload}.${signature}`;
}

function verifyOAuthState(state) {
  const [payload, signature] = String(state || "").split(".");
  if (!payload || !signature) throw new Error("Invalid Instagram login state. Please try again.");

  const expected = crypto
    .createHmac("sha256", oauthStateSecret)
    .update(payload)
    .digest("base64url");
  const suppliedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (
    suppliedBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(suppliedBuffer, expectedBuffer)
  ) {
    throw new Error("Invalid Instagram login state. Please try again.");
  }

  const value = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  if (!value.email || Date.now() - value.issuedAt > 10 * 60 * 1000) {
    throw new Error("Instagram login expired. Please try again.");
  }
  return value;
}

function getInstagramConfig() {
  const missing = [];

  if (!process.env.INSTAGRAM_APP_ID) missing.push("INSTAGRAM_APP_ID");
  if (!process.env.INSTAGRAM_APP_SECRET) missing.push("INSTAGRAM_APP_SECRET");
  if (!process.env.INSTAGRAM_REDIRECT_URI) missing.push("INSTAGRAM_REDIRECT_URI");

  return {
    missing,
    appId: process.env.INSTAGRAM_APP_ID,
    appSecret: process.env.INSTAGRAM_APP_SECRET,
    redirectUri: process.env.INSTAGRAM_REDIRECT_URI,
  };
}

function redirectWithError(res, message) {
  const params = new URLSearchParams({ instagramError: message });
  res.redirect(`${FRONTEND_URL}/connect-meta?${params.toString()}`);
}

router.get("/instagram", (req, res) => {
  return res.status(401).send("Please sign in to JustDMs and connect Instagram from your dashboard.");
});

router.post("/instagram/start", async (req, res) => {
  const user = await getAuthenticatedUser(req);
  if (!user?.email) {
    return res.status(401).json({ error: "Please sign in to JustDMs before connecting Instagram." });
  }
  const config = getInstagramConfig();
  if (config.missing.length) {
    return res.status(500).json({ error: `Missing Instagram environment variables: ${config.missing.join(", ")}` });
  }
  const params = new URLSearchParams({
    enable_fb_login: "0",
    force_reauth: "true",
    client_id: config.appId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    state: signOAuthState(user.email),
    scope: [
      "instagram_business_basic",
      "instagram_business_manage_messages",
      "instagram_business_manage_comments",
    ].join(","),
  });
  return res.json({ url: `https://www.instagram.com/oauth/authorize?${params.toString()}` });
});

router.get("/instagram/callback", async (req, res) => {
  try {
    const { code, state, error_description: oauthError } = req.query;
    if (oauthError) throw new Error(oauthError);
    if (!code || !state) throw new Error("Missing Instagram code or state.");
    const { email: userEmail } = verifyOAuthState(state);
    const config = getInstagramConfig();
    if (config.missing.length) throw new Error(`Missing Instagram environment variables: ${config.missing.join(", ")}`);
    await connectInstagramDirectAccount({ userEmail, code, instagramConfig: config });
    return res.redirect(`${FRONTEND_URL}/dashboard`);
  } catch (err) {
    console.error("INSTAGRAM LOGIN CALLBACK ERROR:", err.response?.data || err.message);
    return redirectWithError(res, metaErrorMessage(err));
  }
});

function metaErrorMessage(err) {
  if (err.code === "23505" || err.code === "INSTAGRAM_ACCOUNT_ALREADY_CONNECTED") {
    return "This Instagram account is already connected to another JustDMs login. Sign in with that login or connect a different Instagram account.";
  }
  return err.response?.data?.error_message || err.response?.data?.error?.message || err.message || "Instagram connection failed";
}

module.exports = router;
