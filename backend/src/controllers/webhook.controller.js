exports.verifyWebhook = (req, res) => {
  const VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN;

  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ Webhook verified");
    return res.status(200).send(challenge);
  }

  console.error("❌ Webhook verification failed");
  return res.sendStatus(403);
};

exports.handleInstagramWebhook = async (req, res) => {
  console.log("📩 Webhook Event Received");
  console.dir(req.body, { depth: null });

  // Always respond 200 fast
  res.sendStatus(200);

  try {
    const entry = req.body.entry?.[0];
    if (!entry) return;

    const change = entry.changes?.[0];
    if (!change) return;

    const value = change.value;

    // COMMENT EVENT
    if (value.comment_id && value.text) {
      console.log("💬 New Comment:", value.text);

      // TODO (next step):
      // 1. Match automation rule
      // 2. Reply via Instagram Graph API
    }

  } catch (err) {
    console.error("Webhook error:", err);
  }
};
