const test = require("node:test");
const assert = require("node:assert/strict");
const { createResourceToken, verifyResourceToken } = require("./resourceLink");

test("creates and verifies a signed resource reference", () => {
  process.env.RESOURCE_LINK_SECRET = "test-resource-secret";
  const token = createResourceToken({ automationId: "automation-1", buttonIndex: 2 });
  assert.deepEqual(verifyResourceToken(token), { automationId: "automation-1", buttonIndex: 2 });
});

test("rejects tampered resource references", () => {
  process.env.RESOURCE_LINK_SECRET = "test-resource-secret";
  const token = createResourceToken({ automationId: "automation-1", buttonIndex: 0 });
  assert.equal(verifyResourceToken(`${token}changed`), null);
});
