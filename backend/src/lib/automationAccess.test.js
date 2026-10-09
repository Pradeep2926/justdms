const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeEmail, ownsAutomationEmail } = require("./automationAccess");

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
