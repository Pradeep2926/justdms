const test = require("node:test");
const assert = require("node:assert/strict");
const { tokenHealth, buildAdminOverview, loadAdminOverview } = require("./admin.service");
const now = Date.parse("2026-10-22T12:00:00Z");

test("token dates override a stale active flag, unknown dates never imply healthy access", () => {
  assert.equal(tokenHealth({ token_status: "active", expires_at: "2026-10-20" }, now).status, "expired");
  assert.equal(tokenHealth({ token_status: "active" }, now).status, "unknown");
  assert.equal(tokenHealth({ expires_at: "2026-11-01" }, now).status, "expiring_soon");
  assert.equal(tokenHealth({ expires_at: "2026-12-01" }, now).status, "active");
  assert.equal(tokenHealth({ token_status: "revoked", expires_at: "2026-12-01" }, now).status, "reconnect_required");
});

test("overview joins new users without Instagram and distinguishes referral, waiting, recovered, and failed events", () => {
  const data = buildAdminOverview({
    authUsers: [{ id: "u1", email: "owner@example.com", created_at: "2026-10-21", email_confirmed_at: "2026-10-21", user_metadata: { secret: "PRIVATE_AUTH_METADATA" } }, { id: "u2", email: "new@example.com", created_at: "2026-10-22" }],
    profiles: [{ id: "u1", Email: "owner@example.com", FirstName: "Owner" }],
    accounts: [{ id: "ig1", user_email: "OWNER@example.com", access_token: "PRIVATE_INSTAGRAM_TOKEN", expires_at: "2026-10-20" }],
    subscriptions: [{ user_id: "u1", user_email: "owner@example.com", status: "cancelled", referral_access_end: "2026-11-01", razorpay_customer_id: "PRIVATE_BILLING_ID" }],
    automations: [{ id: "a1", user_email: "owner@example.com", is_active: true, message: "PRIVATE_MESSAGE" }],
    interactions: [{ automation_id: "a1", current_step: "waiting_for_follow_confirmation", resource_delivery_status: "failed" }, { automation_id: "a1", current_step: "resource_delivery_failed", resource_delivery_status: "failed" }],
    events: [{ automation_id: "a1", event_type: "resource_sent", status: "sent", created_at: "2026-10-22T10:00:00Z" }, { automation_id: "a1", event_type: "resource_delivery_failed", status: "failed", created_at: "2026-10-22T09:00:00Z", error_message: "Window rejected" }],
  }, now);
  assert.equal(data.users.length, 2);
  assert.equal(data.summary.newUsers, 2);
  assert.equal(data.summary.proUsers, 1);
  assert.equal(data.summary.paidProUsers, 0);
  assert.equal(data.summary.tokenWarnings, 1);
  assert.equal(data.summary.failedInteractions, 1);
  assert.equal(data.summary.activity.waiting, 1);
  assert.equal(data.summary.activity.sentEvents, 1);
  assert.equal(data.users.find(u => u.id === "u1").automations[0].health, "needs_attention");
  assert.equal(data.users.find(u => u.id === "u2").accounts.length, 0);
  assert.equal(JSON.stringify(data).includes("PRIVATE_"), false);
});

test("paid subscriptions with a past end date do not count as paid Pro", () => {
  const data = buildAdminOverview({ authUsers: [], profiles: [], accounts: [], automations: [], interactions: [], events: [], subscriptions: [{ user_id: "u", user_email: "expired@example.com", status: "active", ends_at: "2026-10-01" }] }, now);
  assert.equal(data.users[0].isPro, false);
  assert.equal(data.summary.paidProUsers, 0);
});

test("admin shows a successful opening DM as waiting despite an old duplicate failure", () => {
  const data = buildAdminOverview({ authUsers: [], profiles: [], accounts: [], subscriptions: [], events: [],
    automations: [{ id: "a", user_email: "owner@example.com" }],
    interactions: [{ automation_id: "a", current_step: "opening_dm_failed", resource_delivery_status: "failed", opening_dm_sent_at: "2026-10-24T02:47:00Z" }],
  }, now);
  assert.equal(data.users[0].automations[0].activity.failed, 0);
  assert.equal(data.users[0].automations[0].activity.waiting, 1);
});

test("loader paginates auth and table records and selects no credential columns", async () => {
  const tables = [];
  const users = Array.from({ length: 501 }, (_, i) => ({ id: `u${i}`, email: `u${i}@example.com` }));
  const db = {
    auth: { admin: { listUsers: async ({ page, perPage }) => ({ data: { users: users.slice((page - 1) * perPage, page * perPage) }, error: null }) } },
    from(table) {
      const query = { select(columns) { assert.equal(/access_token|page_access_token|raw_context|payload/.test(columns), false); return query; }, order() { return query; }, gte() { return query; }, async range(start, end) { tables.push({ table, start }); return { data: table === "automations" ? users.slice(start, end + 1).map(u => ({ id: `a-${u.id}`, user_id: u.id, user_email: u.email })) : [], error: null }; } };
      return query;
    },
  };
  const result = await loadAdminOverview(db, now);
  assert.equal(result.summary.users, 501);
  assert.equal(result.summary.totalAutomations, 501);
  assert.ok(tables.some(t => t.table === "automations" && t.start === 500));
});

test("data load failures are not silently presented as a healthy empty dashboard", async () => {
  await assert.rejects(loadAdminOverview({}, now), /requires Supabase/);
  await assert.rejects(loadAdminOverview({ auth: { admin: { listUsers: async () => ({ error: { message: "unavailable" } }) } } }, now), /Unable to load registered users/);
});
