const express = require("express");
const supabase = require("../lib/supabase");
const { getAuthenticatedUser } = require("../lib/authClient");

const router = express.Router();

const AUTOMATION_UPDATE_FIELDS = [
  "name",
  "media_id",
  "trigger_type",
  "trigger_match_type",
  "retrigger_enabled",
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
  "resource_buttons",
  "is_active",
];

function isMissingColumnError(error, column) {
  return String(error?.message || error || "")
    .toLowerCase()
    .includes(`'${column}'`);
}

async function runWithLegacyColumnFallback(record, write) {
  const nextRecord = { ...record };
  const optionalColumns = [
    "name",
    "opening_dm_enabled",
    "retrigger_enabled",
    "resource_buttons",
  ];

  for (let attempt = 0; attempt <= optionalColumns.length; attempt += 1) {
    const result = await write(nextRecord);
    if (!result.error) return result;

    const missingColumn = optionalColumns.find(
      (column) =>
        Object.prototype.hasOwnProperty.call(nextRecord, column) &&
        isMissingColumnError(result.error, column)
    );
    if (!missingColumn) return result;
    delete nextRecord[missingColumn];
  }

  return write(nextRecord);
}

async function requirePro(req, res, next) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user?.email) {
      return res.status(401).json({ error: "Your session could not be verified." });
    }

    const { data: subscription, error: subscriptionError } = await supabase
      .from("subscriptions")
      .select("status")
      .eq("user_email", user.email)
      .maybeSingle();
    if (subscriptionError) throw subscriptionError;
    if (subscription?.status !== "active") {
      return res.status(403).json({ error: "JustDMs Pro is required to manage automations." });
    }

    req.automationUser = user;
    return next();
  } catch (error) {
    console.error("Automation subscription check failed:", error);
    return res.status(500).json({ error: "Unable to verify your subscription." });
  }
}

router.get("/metrics/:userEmail", async (req, res) => {
  try {
    const { userEmail } = req.params;
    const days = Number(req.query.days);

    if (!userEmail) {
      return res.status(400).json({ error: "Missing userEmail" });
    }

    const { data: automations = [], error: automationsError } = await supabase
      .from("automations")
      .select("id,is_active")
      .eq("user_email", userEmail);

    if (automationsError) throw automationsError;

    const automationIds = automations.map((automation) => automation.id);
    const emptyMetrics = {
      messages_sent: 0,
      total_clicks: 0,
      comments_engaged: 0,
      followers_verified: 0,
      active_automations: automations.filter(
        (automation) => automation.is_active !== false
      ).length,
    };

    if (automationIds.length === 0) {
      return res.json(emptyMetrics);
    }

    const { data: allEvents = [], error: eventsError } = await supabase
      .from("automation_events")
      .select("automation_id,event_type,status,instagram_sender_id,comment_id,created_at");
    if (eventsError) throw eventsError;

    const automationIdSet = new Set(automationIds);
    const since = Number.isFinite(days) && days > 0
      ? new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      : null;
    const events = allEvents.filter((event) => {
      if (!automationIdSet.has(event.automation_id)) return false;
      if (!since) return true;
      return new Date(event.created_at) >= since;
    });

    const messageTypes = new Set([
      "opening_dm_sent",
      "follow_prompt_sent",
      "resource_sent",
    ]);
    const engagedComments = new Set();
    const verifiedFollowers = new Set();
    const metrics = { ...emptyMetrics };

    events.forEach((event) => {
      if (event.status === "sent" && messageTypes.has(event.event_type)) {
        metrics.messages_sent += 1;
      }
      if (event.event_type === "button_clicked") {
        metrics.total_clicks += 1;
      }
      if (event.event_type === "comment_received" && event.comment_id) {
        engagedComments.add(event.comment_id);
      }
      if (
        event.event_type === "follow_check_result" &&
        event.status === "sent" &&
        event.instagram_sender_id
      ) {
        verifiedFollowers.add(event.instagram_sender_id);
      }
    });

    metrics.comments_engaged = engagedComments.size;
    metrics.followers_verified = verifiedFollowers.size;

    return res.json(metrics);
  } catch (err) {
    console.error("Automation metrics fetch error:", err);
    return res.status(500).json({ error: "Failed to load metrics" });
  }
});

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

    const ownedAutomations = data.filter(
      (automation) =>
        automation.user_email === userEmail ||
        mediaIds.has(automation.media_id)
    );

    if (ownedAutomations.length === 0) {
      return res.json([]);
    }

    const automationIds = new Set(ownedAutomations.map((automation) => automation.id));
    const [{ data: events = [], error: eventsError }, { data: interactions = [], error: interactionsError }] =
      await Promise.all([
        supabase.from("automation_events").select("automation_id,event_type,status"),
        supabase.from("automation_interactions").select("automation_id,follow_status"),
      ]);

    if (eventsError || interactionsError) {
      console.warn(
        "Automation metrics unavailable:",
        eventsError?.message || interactionsError?.message
      );
    }

    const metrics = new Map(
      ownedAutomations.map((automation) => [
        automation.id,
        { messages_sent: 0, total_clicks: 0, followers_gained: 0 },
      ])
    );

    if (!eventsError) {
      events.forEach((event) => {
        if (!automationIds.has(event.automation_id)) return;
        const metric = metrics.get(event.automation_id);
        if (event.event_type === "button_clicked") metric.total_clicks += 1;
        if (
          event.status === "sent" &&
          ["opening_dm_sent", "follow_prompt_sent", "resource_sent"].includes(event.event_type)
        ) {
          metric.messages_sent += 1;
        }
      });
    }

    if (!interactionsError) {
      interactions.forEach((interaction) => {
        if (!automationIds.has(interaction.automation_id)) return;
        if (interaction.follow_status === "following") {
          metrics.get(interaction.automation_id).followers_gained += 1;
        }
      });
    }

    return res.json(
      ownedAutomations.map((automation) => ({
        ...automation,
        ...metrics.get(automation.id),
      }))
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
router.post("/", requirePro, async (req, res) => {
  try {
    console.log("👉 Automation payload:", req.body);

    const {
      user_id,
      user_email,
      name,
      media_id,
      trigger_type,
      trigger_match_type,
      trigger_value,
      retrigger_enabled,
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
      resource_buttons,
      is_active,
    } = req.body;

    const normalizedTriggerType =
      trigger_type === "dm_keyword" ? "dm_keyword" : "comment";

    if (
      !user_id ||
      !user_email ||
      !trigger_value ||
      !message ||
      (normalizedTriggerType === "comment" && !media_id)
    ) {
      return res.status(400).json({
        error: "Missing required fields",
      });
    }

    const automationRecord = {
      user_id: req.automationUser.id,
      user_email: req.automationUser.email,
      name: name || null,
      media_id: normalizedTriggerType === "comment" ? media_id : null,
      trigger_type: normalizedTriggerType,
      trigger_match_type:
        trigger_match_type === "contains" ? "contains" : "exact",
      trigger_value,
      retrigger_enabled: Boolean(retrigger_enabled),
      message,
      public_reply:
        normalizedTriggerType === "comment"
          ? public_reply || "Sent check the DM"
          : "",
      opening_dm_enabled:
        normalizedTriggerType === "comment" && opening_dm_enabled !== false,
      opening_dm_message:
        normalizedTriggerType === "comment"
          ? opening_dm_message ||
            "Hey {{first_name}} 👋\nThanks for commenting!\nPlease tap the button below to get the details."
          : "",
      opening_dm_button_text:
        opening_dm_button_text || "Get Details",
      follow_required:
        normalizedTriggerType === "comment" && Boolean(follow_required),
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
      resource_buttons: Array.isArray(resource_buttons)
        ? resource_buttons
            .filter((button) => button?.url && button?.label)
            .slice(0, 3)
            .map((button) => ({
              label: String(button.label).slice(0, 20),
              url: String(button.url),
            }))
        : [],
      is_active: is_active !== false,
    };

    const { data, error } = await runWithLegacyColumnFallback(
      automationRecord,
      (record) => supabase
        .from("automations")
        .insert([record])
        .select()
        .single()
    );

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

router.patch("/:id", requirePro, async (req, res) => {
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

    const { data: ownedAutomation, error: ownershipError } = await supabase
      .from("automations")
      .select("id")
      .eq("id", id)
      .eq("user_email", req.automationUser.email)
      .maybeSingle();
    if (ownershipError) throw ownershipError;
    if (!ownedAutomation) return res.status(404).json({ error: "Automation not found." });

    const { data, error } = await runWithLegacyColumnFallback(
      updates,
      (record) => supabase
        .from("automations")
        .update(record)
        .eq("id", id)
        .select()
        .single()
    );

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
