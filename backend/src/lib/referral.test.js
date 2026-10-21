const test = require("node:test");
const assert = require("node:assert/strict");
const {
  normalizeReferralCode,
  isRecentSignup,
  rewardAccessEnd,
} = require("./referral");

test("normalizes referral codes", () => {
  assert.equal(normalizeReferralCode(" jd-prad_23 "), "JDPRAD23");
});

test("only treats accounts created within seven days as new signups", () => {
  const now = Date.parse("2030-01-10T00:00:00Z");
  assert.equal(isRecentSignup({ created_at: "2030-01-05T00:00:00Z" }, now), true);
  assert.equal(isRecentSignup({ created_at: "2029-12-01T00:00:00Z" }, now), false);
});

test("stacks a fourteen-day reward after an existing reward", () => {
  const now = Date.parse("2030-01-10T00:00:00Z");
  assert.equal(rewardAccessEnd(null, now), "2030-01-24T00:00:00.000Z");
  assert.equal(
    rewardAccessEnd("2030-02-01T00:00:00Z", now),
    "2030-02-15T00:00:00.000Z"
  );
});
