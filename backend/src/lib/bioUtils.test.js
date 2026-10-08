const test = require("node:test");
const assert = require("node:assert/strict");
const {
  compactPositions,
  isLikelyBot,
  isCompleteOrder,
  isPublicProfile,
  ownsProfile,
  validateOutboundUrl,
  validateUsername,
} = require("./bioUtils");

test("accepts normalized unique-style usernames", () => {
  assert.deepEqual(validateUsername("@Creator.Name"), { valid: true, username: "creator.name" });
});

test("rejects reserved and malformed usernames", () => {
  assert.equal(validateUsername("dashboard").valid, false);
  assert.equal(validateUsername("ab").valid, false);
  assert.equal(validateUsername("bad/name").valid, false);
});

test("allows public http links and blocks unsafe redirects", () => {
  assert.equal(validateOutboundUrl("https://example.com/resource"), "https://example.com/resource");
  assert.equal(validateOutboundUrl("javascript:alert(1)"), null);
  assert.equal(validateOutboundUrl("http://localhost:5001/private"), null);
  assert.equal(validateOutboundUrl("https://user:pass@example.com"), null);
});

test("compacts link ordering after deletion", () => {
  assert.deepEqual(compactPositions([{ id: "b", position: 4 }, { id: "a", position: 9 }]), [
    { id: "b", position: 0 }, { id: "a", position: 1 },
  ]);
});

test("filters common analytics bots", () => {
  assert.equal(isLikelyBot("Googlebot/2.1"), true);
  assert.equal(isLikelyBot("Mozilla/5.0 Chrome/140"), false);
});

test("enforces profile ownership", () => {
  assert.equal(ownsProfile("owner-a", { owner_id: "owner-a" }), true);
  assert.equal(ownsProfile("owner-b", { owner_id: "owner-a" }), false);
});

test("only published profiles are publicly visible", () => {
  assert.equal(isPublicProfile({ is_published: true }), true);
  assert.equal(isPublicProfile({ is_published: false }), false);
});

test("link ordering includes every owned link exactly once", () => {
  const links = [{ id: "a" }, { id: "b" }];
  assert.equal(isCompleteOrder(["b", "a"], links), true);
  assert.equal(isCompleteOrder(["a", "a"], links), false);
  assert.equal(isCompleteOrder(["a"], links), false);
});
