const test = require("node:test");
const assert = require("node:assert/strict");
const {
  normalizeEmail,
  ownsAutomationEmail,
  isActiveProSubscription,
  automationEntitlements,
  canActivateAutomation,
} = require("./automationAccess");

test("normalizes automation owner emails", () => {
  assert.equal(normalizeEmail("  User@Example.COM "), "user@example.com");
});

test("only allows the authenticated automation owner", () => {
  assert.equal(
    ownsAutomationEmail({ email: "owner@example.com" }, "OWNER@example.com"),
    true
  );
  assert.equal(
    ownsAutomationEmail({ email: "owner@example.com" }, "other@example.com"),
    false
  );
  assert.equal(ownsAutomationEmail(null, "owner@example.com"), false);
});

test("treats missing, inactive, and expired subscriptions as free", () => {
  const now = Date.parse("2030-01-15T00:00:00Z");
  assert.equal(isActiveProSubscription(null, now), false);
  assert.equal(isActiveProSubscription({ status: "inactive" }, now), false);
  assert.equal(
    isActiveProSubscription({ status: "active", ends_at: "2030-01-14T23:59:59Z" }, now),
    false
  );
  assert.deepEqual(automationEntitlements(null, now), {
    plan: "free",
    isPro: false,
    activeAutomationLimit: 2,
  });
});

test("keeps active unexpired Pro subscriptions unlimited", () => {
  const now = Date.parse("2030-01-15T00:00:00Z");
  assert.deepEqual(
    automationEntitlements(
      { status: "active", ends_at: "2030-02-15T00:00:00Z" },
      now
    ),
    { plan: "pro", isPro: true, activeAutomationLimit: null }
  );
});

test("limits free users to two active automations without blocking edits", () => {
  const free = automationEntitlements(null);
  assert.equal(canActivateAutomation({ entitlements: free, activeCount: 1 }), true);
  assert.equal(canActivateAutomation({ entitlements: free, activeCount: 2 }), false);
  assert.equal(
    canActivateAutomation({ entitlements: free, activeCount: 3, alreadyActive: true }),
    true
  );
  assert.equal(
    canActivateAutomation({ entitlements: { isPro: true }, activeCount: 20 }),
    true
  );
});
