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

module.exports = { parseAutomationPostback, withMessagingSender };
