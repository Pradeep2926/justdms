const express = require("express");
const {
  connectInstagramDirectAccount,
} = require("../services/instagramSync.service");

const router = express.Router();

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

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
  const { userEmail } = req.query;
  if (!userEmail) return res.status(400).send("Missing userEmail");
  const config = getInstagramConfig();
  if (config.missing.length) {
    return res.status(500).send(`Missing Instagram environment variables: ${config.missing.join(", ")}`);
  }
  const params = new URLSearchParams({
    enable_fb_login: "0",
    force_reauth: "true",
    client_id: config.appId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    state: userEmail,
    scope: [
      "instagram_business_basic",
      "instagram_business_manage_messages",
      "instagram_business_manage_comments",
    ].join(","),
  });
  return res.redirect(`https://www.instagram.com/oauth/authorize?${params.toString()}`);
});

router.get("/instagram/callback", async (req, res) => {
  try {
    const { code, state: userEmail, error_description: oauthError } = req.query;
    if (oauthError) throw new Error(oauthError);
    if (!code || !userEmail) throw new Error("Missing Instagram code or state.");
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
  return err.response?.data?.error_message || err.response?.data?.error?.message || err.message || "Instagram connection failed";
}

module.exports = router;
