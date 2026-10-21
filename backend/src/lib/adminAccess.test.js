const test = require("node:test");
const assert = require("node:assert/strict");
const { isAdminUser, createRequireAdmin } = require("./adminAccess");
const confirmed = { id: "owner-id", email: "OWNER@example.com", email_confirmed_at: "2026-01-01" };

test("admin access requires an explicitly allowed, confirmed identity", () => {
  assert.equal(isAdminUser(confirmed, "owner@example.com"), true);
  assert.equal(isAdminUser(confirmed, ""), false);
  assert.equal(isAdminUser(confirmed, "other@example.com"), false);
  assert.equal(isAdminUser({ ...confirmed, email_confirmed_at: null }, "owner@example.com"), false);
  assert.equal(isAdminUser({ ...confirmed, user_metadata: { role: "admin" } }, "other@example.com"), false);
});

test("admin middleware denies spoofed headers and ordinary signed-in users", async () => {
  for (const [user, expectedStatus] of [[null, 401], [{ ...confirmed, email: "customer@example.com" }, 403], [confirmed, null]]) {
    let status = null;
    let passed = false;
    let cache;
    const res = { set: (_name, value) => { cache = value; }, status: value => { status = value; return res; }, json: () => res };
    const req = { headers: { "x-user-email": "owner@example.com", "x-user-id": "owner-id" } };
    await createRequireAdmin({ getUser: async () => user, emails: () => "owner@example.com" })(req, res, () => { passed = true; });
    assert.equal(status, expectedStatus);
    assert.equal(passed, expectedStatus === null);
    assert.equal(cache, "no-store");
  }
});
