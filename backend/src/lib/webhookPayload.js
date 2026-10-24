const POSTBACK_ACTIONS = new Set(["GET_DETAILS", "CONFIRM_FOLLOW"]);
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseAutomationPostback(payload) {
  const parts = String(payload || "").split(":");
  if (parts.length !== 3) return null;

  const [action, automationId, interactionId] = parts;
  if (
    !POSTBACK_ACTIONS.has(action) ||
    !UUID_PATTERN.test(automationId) ||
    !UUID_PATTERN.test(interactionId)
  ) {
    return null;
  }

  return { action, automationId, interactionId };
}

function withMessagingSender(interaction, senderId) {
  if (!interaction || !senderId) return interaction;
  return { ...interaction, instagram_sender_id: String(senderId) };
}

const MESSAGING_FIELDS = new Set([
  "messages", "messaging_postbacks", "messaging_seen", "message_reactions",
  "message_edit", "messaging_referral", "messaging_handover", "messaging_optins", "standby",
]);

function isMessagingChange(change) {
  return MESSAGING_FIELDS.has(change?.field);
}

function messagingEvents(entry) {
  const events = [];
  for (const channel of ["messaging", "standby"]) {
    for (const event of Array.isArray(entry?.[channel]) ? entry[channel] : []) {
      events.push({ channel, event });
    }
  }
  for (const change of Array.isArray(entry?.changes) ? entry.changes : []) {
    if (isMessagingChange(change) && change.value) {
      events.push({ channel: change.field === "standby" ? "standby" : `changes.${change.field}`, event: change.value });
    }
  }
  // An envelope may expose the same message in both supported representations.
  const seen = new Set();
  return events.filter(({ channel, event }) => {
    const mid = event?.postback?.mid || event?.message?.mid;
    if (!mid || channel === "standby") return true;
    const key = JSON.stringify([event.sender?.id, event.recipient?.id, mid,
      event.postback?.payload || event.message?.quick_reply?.payload || null]);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

module.exports = { parseAutomationPostback, withMessagingSender, isMessagingChange, messagingEvents };
