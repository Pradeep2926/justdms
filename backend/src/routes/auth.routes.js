const express = require("express");
const { connectInstagramAccount } = require("../services/instagramSync.service");

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
      "instagram_content_publish",
      "pages_show_list",
      "pages_read_engagement",
      "business_management",
    ].join(","),
  });

  res.redirect(
    `https://www.facebook.com/${META_GRAPH_VERSION}/dialog/oauth?${params.toString()}`
  );
});

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

    await connectInstagramAccount({
      userEmail,
      code,
      metaConfig,
    });

    console.log("✅ Instagram connected for:", userEmail);
    res.redirect(`${FRONTEND_URL}/dashboard`);

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

module.exports = router;
