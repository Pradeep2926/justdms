const express = require("express");
const axios = require("axios");
const {
  getDashboard,
  syncAccount,
} = require("../services/instagramSync.service");
const supabase = require("../lib/supabase");

const router = express.Router();

router.get("/me/:email", async (req, res) => {
  try {
    const dashboard = await getDashboard(req.params.email);

    if (!dashboard.connected) {
      return res.status(404).json({ error: "Instagram not connected" });
    }

    return res.json({
      ...dashboard.account,
      media: dashboard.media,
      comments: dashboard.comments,
    });
  } catch (err) {
    console.error("INSTAGRAM PROFILE ERROR:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

router.get("/dashboard/:email", async (req, res) => {
  try {
    const dashboard = await getDashboard(req.params.email);
    return res.json(dashboard);
  } catch (err) {
    console.error("INSTAGRAM DASHBOARD ERROR:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

router.post("/sync/:email", async (req, res) => {
  try {
    if (
      process.env.BACKEND_STORAGE === "local" &&
      process.env.NODE_ENV !== "production"
    ) {
      const dashboard = await getDashboard(req.params.email);
      return res.json({
        success: true,
        skipped_live_sync: true,
        message: "Local mode uses cached Instagram data.",
        ...dashboard,
      });
    }

    const result = await syncAccount(req.params.email);

    if (!result) {
      return res.status(404).json({ error: "Instagram not connected" });
    }

    const dashboard = await getDashboard(req.params.email);
    return res.json({ success: true, ...dashboard });
  } catch (err) {
    console.error("INSTAGRAM SYNC ERROR:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

router.get("/posts/:email", async (req, res) => {
  try {
    const dashboard = await getDashboard(req.params.email);
    return res.json(dashboard.media || []);
  } catch (err) {
    console.error("POST FETCH ERROR:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

router.get("/comments/:email", async (req, res) => {
  try {
    const dashboard = await getDashboard(req.params.email);
    return res.json(dashboard.comments || []);
  } catch (err) {
    console.error("COMMENT FETCH ERROR:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

router.get("/messaging-status/:email", async (req, res) => {
  try {
    const { data: account, error } = await supabase
      .from("instagram_accounts")
      .select("id,user_email,username,instagram_user_id,access_token,page_access_token,updated_at")
      .eq("user_email", req.params.email)
      .maybeSingle();

    if (error) throw error;
    if (!account) {
      return res.status(404).json({ error: "Instagram not connected" });
    }

    const checks = [];

    for (const [label, token] of [
      ["page_access_token", account.page_access_token],
      ["access_token", account.access_token],
    ]) {
      if (!token) {
        checks.push({ token: label, present: false });
        continue;
      }

      try {
        const { data } = await axios.get(
          `https://graph.facebook.com/v19.0/${account.instagram_user_id}`,
          {
            params: {
              fields: "id,username",
              access_token: token,
            },
            timeout: 15000,
          }
        );

        checks.push({
          token: label,
          present: true,
          can_read_instagram_profile: true,
          profile: data,
        });
      } catch (err) {
        checks.push({
          token: label,
          present: true,
          can_read_instagram_profile: false,
          error:
            err.response?.data?.error?.message ||
            err.message ||
            "Token check failed",
        });
      }
    }

    return res.json({
      account: {
        id: account.id,
        user_email: account.user_email,
        username: account.username,
        instagram_user_id: account.instagram_user_id,
        updated_at: account.updated_at,
      },
      checks,
      note:
        "DM sending still requires Meta app capability. If messages fail with code 3, reconnect after enabling instagram_manage_messages/pages_messaging and verify App Review/advanced access.",
    });
  } catch (err) {
    console.error("MESSAGING STATUS ERROR:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
