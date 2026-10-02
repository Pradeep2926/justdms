const express = require("express");
const supabase = require("../lib/supabase");

const router = express.Router();

const AUTOMATION_UPDATE_FIELDS = [
  "name",
  "media_id",
  "trigger_value",
  "message",
  "public_reply",
  "opening_dm_enabled",
  "opening_dm_message",
  "opening_dm_button_text",
  "follow_required",
  "not_following_message",
  "visit_profile_button_text",
  "confirm_follow_button_text",
  "still_not_following_message",
  "success_message",
  "resource_type",
  "resource_url",
  "resource_button_label",
  "is_active",
];

function isMissingColumnError(error, column) {
  return String(error?.message || error || "")
    .toLowerCase()
    .includes(`'${column}'`);
}

router.get("/:userEmail", async (req, res) => {
  try {
    const { userEmail } = req.params;

    if (!userEmail) {
      return res.status(400).json({ error: "Missing userEmail" });
    }

    const { data: account, error: accountError } = await supabase
      .from("instagram_accounts")
      .select("id")
      .eq("user_email", userEmail)
      .maybeSingle();

    if (accountError) {
      throw accountError;
    }

    const { data: media = [], error: mediaError } = await supabase
      .from("instagram_media")
      .select("id")
      .eq("account_id", account?.id || "");

    if (mediaError) {
      throw mediaError;
    }

    const mediaIds = new Set(media.map((item) => item.id));

    const { data = [], error } = await supabase
      .from("automations")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("❌ Automation fetch error:", error);
      return res.status(500).json({ error: error.message });
    }

    return res.json(
      data.filter(
        (automation) =>
          automation.user_email === userEmail ||
          mediaIds.has(automation.media_id)
      )
    );
  } catch (err) {
    console.error("❌ Automation fetch error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

/**
 * CREATE AUTOMATION
 * POST /automation
 */
router.post("/", async (req, res) => {
  try {
    console.log("👉 Automation payload:", req.body);

    const {
      user_id,
      user_email,
      name,
      media_id,
      trigger_value,
      message,
      public_reply,
      opening_dm_enabled,
      opening_dm_message,
      opening_dm_button_text,
      follow_required,
      not_following_message,
      visit_profile_button_text,
      confirm_follow_button_text,
      still_not_following_message,
      success_message,
      resource_type,
      resource_url,
      resource_button_label,
    } = req.body;

    if (!user_id || !user_email || !media_id || !trigger_value || !message) {
      return res.status(400).json({
        error: "Missing required fields",
      });
    }

    const automationRecord = {
      user_id,
      user_email,
      name: name || null,
      media_id,
      trigger_type: "keyword",
      trigger_value,
      message,
      public_reply:
        public_reply ||
        "Sent check the DM",
      opening_dm_enabled: opening_dm_enabled !== false,
      opening_dm_message:
        opening_dm_message ||
        "Hey {{first_name}} 👋\nThanks for commenting!\nPlease tap the button below to get the details.",
      opening_dm_button_text:
        opening_dm_button_text || "Get Details",
      follow_required: Boolean(follow_required),
      not_following_message:
        not_following_message ||
        "Oops! It looks like you’re not following us yet 👀\n\nThis resource is available only to our followers.\n\nPlease visit our profile, follow us, and then tap ‘I’m Following’ below.",
      visit_profile_button_text:
        visit_profile_button_text || "Visit Profile",
      confirm_follow_button_text:
        confirm_follow_button_text || "I’m Following ✓",
      still_not_following_message:
        still_not_following_message ||
        "It still looks like you haven’t followed yet 😊\nPlease follow the profile first, then tap ‘I’m Following’ again.",
      success_message:
        success_message ||
        "Awesome 🎉 Thanks for following!\nHere are the details you requested:",
      resource_type: resource_type || "link",
      resource_url: resource_url || null,
      resource_button_label:
        resource_button_label || "Open Details",
      is_active: true,
    };

    let { data, error } = await supabase
      .from("automations")
      .insert([automationRecord])
      .select()
      .single();

    if (
      error &&
      (isMissingColumnError(error, "name") ||
        isMissingColumnError(error, "opening_dm_enabled"))
    ) {
      const fallbackRecord = { ...automationRecord };
      delete fallbackRecord.name;
      delete fallbackRecord.opening_dm_enabled;
      const fallback = await supabase
        .from("automations")
        .insert([fallbackRecord])
        .select()
        .single();
      data = fallback.data;
      error = fallback.error;
    }

    if (error) {
      console.error("❌ Supabase insert error:", error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(201).json({
      success: true,
      automation: data,
    });
  } catch (err) {
    console.error("❌ Automation error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updates = {};

    AUTOMATION_UPDATE_FIELDS.forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        updates[field] = req.body[field];
      }
    });

    if (!id) {
      return res.status(400).json({ error: "Missing automation id" });
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "No supported fields to update" });
    }

    updates.updated_at = new Date().toISOString();

    let { data, error } = await supabase
      .from("automations")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (
      error &&
      (isMissingColumnError(error, "name") ||
        isMissingColumnError(error, "opening_dm_enabled"))
    ) {
      const fallbackUpdates = { ...updates };
      delete fallbackUpdates.name;
      delete fallbackUpdates.opening_dm_enabled;
      const fallback = await supabase
        .from("automations")
        .update(fallbackUpdates)
        .eq("id", id)
        .select()
        .single();
      data = fallback.data;
      error = fallback.error;
    }

    if (error) {
      console.error("❌ Automation update error:", error);
      return res.status(500).json({ error: error.message });
    }

    return res.json({ success: true, automation: data });
  } catch (err) {
    console.error("❌ Automation update error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "Missing automation id" });
    }

    const { error } = await supabase.from("automations").delete().eq("id", id);

    if (error) {
      console.error("❌ Automation delete error:", error);
      return res.status(500).json({ error: error.message });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error("❌ Automation delete error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
