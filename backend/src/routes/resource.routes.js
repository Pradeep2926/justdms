const express = require("express");
const supabase = require("../lib/supabase");
const { validateOutboundUrl } = require("../lib/bioUtils");
const { verifyResourceToken } = require("../lib/resourceLink");

const router = express.Router();

router.get("/:token", async (req, res) => {
  try {
    const reference = verifyResourceToken(req.params.token);
    if (!reference) return res.status(400).json({ error: "This resource link is invalid." });

    const { data: automation, error } = await supabase
      .from("automations")
      .select("id,name,resource_url,resource_buttons,is_active")
      .eq("id", reference.automationId)
      .maybeSingle();
    if (error) throw error;
    if (!automation || automation.is_active === false) {
      return res.status(404).json({ error: "This resource is no longer available." });
    }

    let configuredButtons = automation.resource_buttons;
    if (typeof configuredButtons === "string") {
      try { configuredButtons = JSON.parse(configuredButtons); } catch { configuredButtons = []; }
    }
    const button = Array.isArray(configuredButtons)
      ? configuredButtons.filter((item) => item?.url).slice(0, 3)[reference.buttonIndex]
      : null;
    const destination = validateOutboundUrl(button?.url || (reference.buttonIndex === 0 ? automation.resource_url : null));
    if (!destination) return res.status(404).json({ error: "This resource is unavailable." });

    return res.json({
      destination,
      hostname: new URL(destination).hostname.replace(/^www\./, ""),
      title: button?.label || automation.name || "Your resource",
    });
  } catch (error) {
    console.error("Resource link resolution failed:", error.message);
    return res.status(500).json({ error: "Unable to open this resource." });
  }
});

module.exports = router;
