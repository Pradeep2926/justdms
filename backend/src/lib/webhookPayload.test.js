const test = require("node:test");
const assert = require("node:assert/strict");
const {
  parseAutomationPostback,
  withMessagingSender,
} = require("./webhookPayload");

const automationId = "5e4eabb3-5eee-4b3f-9154-49d977f51ef8";
const interactionId = "1686054c-e65d-4a4a-9934-8637d6897f94";

test("accepts a supported automation postback", () => {
  assert.deepEqual(
    parseAutomationPostback(`GET_DETAILS:${automationId}:${interactionId}`),
    { action: "GET_DETAILS", automationId, interactionId }
  );
});

test("ignores legacy and malformed postback payloads", () => {
  assert.equal(parseAutomationPostback("OpeningMessage#123"), null);
  assert.equal(parseAutomationPostback("PB:undefined:undefined"), null);
  assert.equal(parseAutomationPostback("UNKNOWN:a:b"), null);
  assert.equal(parseAutomationPostback(null), null);
});

test("uses the current messaging sender without mutating stored identity", () => {
  const interaction = { id: interactionId, instagram_sender_id: "comment-id" };
  const current = withMessagingSender(interaction, "messaging-id");

  assert.equal(current.instagram_sender_id, "messaging-id");
  assert.equal(interaction.instagram_sender_id, "comment-id");
});
