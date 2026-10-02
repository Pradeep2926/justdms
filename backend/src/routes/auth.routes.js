const express = require("express");
const { randomUUID } = require("crypto");
const supabase = require("../lib/supabase");
const {
  connectInstagramAccountWithToken,
  exchangeCodeForToken,
  listInstagramBusinessAccounts,
  connectInstagramDirectAccount,
} = require("../services/instagramSync.service");

const router = express.Router();

const META_GRAPH_VERSION = "v19.0";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

function getMetaConfig() {
  const missing = [];

  if (!process.env.META_APP_ID) missing.push("META_APP_ID");
  if (!process.env.META_APP_SECRET) missing.push("META_APP_SECRET");
  if (!process.env.META_REDIRECT_URI) missing.push("META_REDIRECT_URI");

  return {
    missing,
    appId: process.env.META_APP_ID,
    appSecret: process.env.META_APP_SECRET,
    redirectUri: process.env.META_REDIRECT_URI,
  };
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

/**
 * STEP 1 — Redirect to Facebook Login
 */
router.get("/meta", (req, res) => {
  const { userEmail } = req.query;
  if (!userEmail) return res.status(400).send("Missing userEmail");

  const metaConfig = getMetaConfig();

  if (metaConfig.missing.length) {
    return res.status(500).send(
      `Missing Meta environment variables: ${metaConfig.missing.join(", ")}`
    );
  }

  const params = new URLSearchParams({
    client_id: metaConfig.appId,
    redirect_uri: metaConfig.redirectUri,
    response_type: "code",
    state: userEmail,
    auth_type: "rerequest",
    scope: [
      "instagram_basic",
      "instagram_manage_messages",
      "instagram_manage_comments",
      "pages_show_list",
      "pages_read_engagement",
    ].join(","),
  });

  res.redirect(
    `https://www.facebook.com/${META_GRAPH_VERSION}/dialog/oauth?${params.toString()}`
  );
});

router.get("/instagram", (req, res) => {
  const { userEmail } = req.query;
  if (!userEmail) return res.status(400).send("Missing userEmail");
  const config = getInstagramConfig();
  if (config.missing.length) {
    return res.status(500).send(`Missing Instagram environment variables: ${config.missing.join(", ")}`);
  }
  const params = new URLSearchParams({
    enable_fb_login: "0",
    force_authentication: "1",
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

/**
 * STEP 2 — Callback
 */
router.get("/meta/callback", async (req, res) => {
  try {
    const { code, state: userEmail } = req.query;
    if (!code || !userEmail) throw new Error("Missing code or userEmail");

    const metaConfig = getMetaConfig();

    if (metaConfig.missing.length) {
      throw new Error(
        `Missing Meta environment variables: ${metaConfig.missing.join(", ")}`
      );
    }

    const token = await exchangeCodeForToken({
      code,
      appId: metaConfig.appId,
      appSecret: metaConfig.appSecret,
      redirectUri: metaConfig.redirectUri,
    });

    const pages = await listInstagramBusinessAccounts(token.accessToken);
    if (!pages.length) {
      throw new Error("No Instagram Business or Creator account found. Connect it to a Facebook Page and grant JustDMs access to that Page.");
    }

    if (pages.length === 1) {
      await connectInstagramAccountWithToken({
        userEmail,
        accessToken: token.accessToken,
        expiresIn: token.expiresIn,
        pageId: pages[0].id,
      });
      return res.redirect(`${FRONTEND_URL}/dashboard`);
    }

    const connectionId = randomUUID();
    const { error } = await supabase.from("pending_meta_connections").insert({
      id: connectionId,
      user_email: userEmail,
      access_token: token.accessToken,
      token_expires_in: token.expiresIn,
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    });
    if (error) throw error;

    return res.redirect(`${FRONTEND_URL}/connect-meta?connectionId=${connectionId}`);

  }  catch (err) {
  console.error("========== META CALLBACK ERROR ==========");
  console.error("Error Message:", err.message);
  console.error("Stack:", err.stack);

  if (err.response) {
    console.error("Response Status:", err.response.status);
    console.error(
      "Response Data:",
      JSON.stringify(err.response.data, null, 2)
    );
  }

  if (err.config) {
    console.error("Request URL:", err.config.url);
    console.error("Request Method:", err.config.method);
    console.error("Request Params:", err.config.params);
  }

  console.error("========================================");

  const message =
    err.response?.data?.error?.message ||
    err.message ||
    "Instagram connection failed";

  redirectWithError(res, message);
}
});

router.get("/meta/options/:connectionId", async (req, res) => {
  try {
    const { userEmail } = req.query;
    const { data: pending, error } = await supabase
      .from("pending_meta_connections")
      .select("*")
      .eq("id", req.params.connectionId)
      .eq("user_email", userEmail)
      .maybeSingle();

    if (error) throw error;
    if (!pending || new Date(pending.expires_at) <= new Date()) {
      return res.status(404).json({ error: "This account-selection session expired. Connect Instagram again." });
    }

    const pages = await listInstagramBusinessAccounts(pending.access_token);
    return res.json(pages.map((page) => ({
      page_id: page.id,
      page_name: page.name,
      instagram_id: page.instagram_business_account.id,
      instagram_username: page.instagram_business_account.username,
      profile_picture_url: page.instagram_business_account.profile_picture_url,
    })));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post("/meta/select", async (req, res) => {
  try {
    const { connectionId, userEmail, pageId } = req.body;
    if (!connectionId || !userEmail || !pageId) {
      return res.status(400).json({ error: "connectionId, userEmail and pageId are required." });
    }

    const { data: pending, error } = await supabase
      .from("pending_meta_connections")
      .select("*")
      .eq("id", connectionId)
      .eq("user_email", userEmail)
      .maybeSingle();
    if (error) throw error;
    if (!pending || new Date(pending.expires_at) <= new Date()) {
      return res.status(404).json({ error: "This account-selection session expired. Connect Instagram again." });
    }

    const account = await connectInstagramAccountWithToken({
      userEmail,
      accessToken: pending.access_token,
      expiresIn: pending.token_expires_in,
      pageId,
    });

    await supabase.from("pending_meta_connections").delete().eq("id", connectionId);
    return res.json({ success: true, account });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
