const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const { createCommentQueue, commentWasHandled, recoveredOpeningState } = require("./commentProcessing");
const source = fs.readFileSync(require.resolve("../routes/webhook.routes"), "utf8");

function commentHarness({ failOnce = false, successBeforeError = false, state: initial = null } = {}) {
  let state = initial;
  let sends = 0;
  const automation = { id: "auto", media_id: "post", opening_dm_enabled: true };
  const events = [];
  const clone = value => value ? structuredClone(value) : value;
  const context = {
    console: { log() {}, warn() {}, error() {} },
    serializeComment: createCommentQueue(), commentWasHandled, recoveredOpeningState,
    automationMatchesComment: () => true,
    findMatchingAutomation: async () => ({ automation }),
    getAccountForMedia: async () => ({ id: "account", username: "owner" }),
    bindMessagingOwnerId: async () => {},
    saveWebhookEvent: async () => ({ id: "webhook" }),
    saveWebhookComment: async () => {}, updateWebhookEvent: async () => {},
    findInteraction: async () => clone(state),
    upsertInteraction: async (_, updates) => { state = { id: "interaction", ...state, ...clone(updates) }; return clone(state); },
    saveAutomationEvent: async event => events.push(event),
    pickTextVariant: () => "Check your DM", DEFAULT_PUBLIC_REPLY: "Check your DM",
    sendPublicReply: async () => {}, buildOpeningMessageText: () => "Get Details",
    sendOpeningDirectMessage: async () => {
      sends++;
      await new Promise(resolve => setImmediate(resolve));
      if (successBeforeError) {
        state.opening_dm_sent_at = "2026-10-24T02:47:00Z";
        state.current_step = "waiting_for_get_details";
        throw new Error("extra private reply rejected");
      }
      if (failOnce && sends === 1) throw new Error("temporary provider failure");
      return { method: "test" };
    },
    supabase: { from() { const q = { select() { return q; }, eq() { return q; },
      maybeSingle: async () => ({ data: clone(state) }) }; return q; } },
  };
  const process = vm.runInNewContext(source.slice(source.indexOf("async function processComment("),
    source.indexOf("async function processPostback(")) + "\nprocessComment", context);
  return { run: (manual = false) => process({
    body: manual ? { source: "manual_retrigger" } : {}, entry: { id: "owner" },
    value: { id: "comment", media: { id: "post" }, from: { id: "sender", username: "reader" }, text: "LINK" },
    automationOverride: manual ? automation : null,
  }), get sends() { return sends; }, get state() { return state; }, events };
}

test("live webhook and two re-trigger requests send only one opening DM", async () => {
  const h = commentHarness();
  const results = await Promise.all([h.run(), h.run(true), h.run(true)]);
  assert.equal(h.sends, 1);
  assert.equal(results.filter(r => r.status === "processed").length, 1);
  assert.equal(results.filter(r => r.reason === "already_handled").length, 2);
  assert.equal(h.state.current_step, "waiting_for_get_details");
  assert.equal(h.events.filter(e => e.event_type === "opening_dm_failed").length, 0);
});

test("a failed send remains retryable and successful retry clears failed delivery state", async () => {
  const h = commentHarness({ failOnce: true });
  assert.equal((await h.run()).status, "failed");
  assert.equal(h.state.current_step, "opening_dm_failed");
  assert.equal((await h.run(true)).status, "processed");
  assert.equal(h.state.resource_delivery_status, "not_delivered");
  assert.equal(h.sends, 2);
});

test("existing false failure is recovered without another DM", async () => {
  const h = commentHarness({ state: { id: "interaction", comment_id: "comment",
    opening_dm_sent_at: "2026-10-24T02:47:00Z", current_step: "opening_dm_failed", resource_delivery_status: "failed" } });
  assert.equal((await h.run(true)).reason, "already_handled");
  assert.equal(h.sends, 0);
  assert.equal(h.state.current_step, "waiting_for_get_details");
});

test("a late rejected attempt cannot overwrite a persisted successful opening", async () => {
  const h = commentHarness({ successBeforeError: true });
  assert.equal((await h.run()).reason, "already_handled");
  assert.equal(h.state.current_step, "waiting_for_get_details");
  assert.equal(h.events.filter(e => e.event_type === "opening_dm_failed").length, 0);
});

test("public reply alone does not count as a successful DM", () => {
  assert.equal(commentWasHandled({ public_reply_sent_at: "sent" }, true), false);
  assert.equal(commentWasHandled({ opening_dm_sent_at: "sent" }, true), true);
  assert.equal(commentWasHandled({ current_step: "waiting_for_follow_confirmation" }, false), true);
});

test("queue releases errors and lets different users proceed independently", async () => {
  const serialize = createCommentQueue();
  let release;
  const first = serialize("user-a", () => new Promise(resolve => { release = resolve; }));
  await serialize("user-b", async () => "independent");
  release(); await first;
  await assert.rejects(serialize("user-a", async () => { throw new Error("failed"); }));
  assert.equal(await serialize("user-a", async () => "recovered"), "recovered");
});

test("six previously sent comments are reported as handled, including older comments from the same user", async () => {
  const automation = { id: "auto", user_email: "owner@example.com", media_id: "post", opening_dm_enabled: true };
  const comments = Array.from({ length: 6 }, (_, n) => ({ id: `c${n}`, text: "LINK", from: { id: `u${n}` } }));
  const states = comments.slice(1).map(c => ({ id: c.id, comment_id: c.id,
    opening_dm_sent_at: "2026-10-24T02:47:00Z", current_step: "opening_dm_failed" }));
  let handler, result, repaired = 0;
  vm.runInNewContext(source.slice(source.indexOf('router.post("/retrigger/'), source.indexOf('router.get("/instagram"')), {
    console: { error() {} }, commentWasHandled, recoveredOpeningState,
    router: { post: (_, fn) => { handler = fn; } },
    supabase: { from(table) { const q = {
      select() { return q; }, eq() { return q; }, in() { return q; },
      maybeSingle: async () => ({ data: automation }),
      then(resolve) { resolve({ data: table === "automation_interactions" ? states : comments.map(c => ({ comment_id: c.id })) }); },
    }; return q; } },
    getAccountForMedia: async () => ({ access_token: "test-only" }), tokenFor: () => "test-only",
    fetchCommentsForRetrigger: async () => comments, automationMatchesComment: () => true,
    upsertInteraction: async () => { repaired++; },
    processComment: async () => { throw new Error("Already handled comments must not be retried"); },
  });
  await handler({ params: { automationId: "auto" }, body: { userEmail: "owner@example.com" } }, {
    json(value) { result = value; }, status() { return this; },
  });
  assert.equal(result.checked, 6);
  assert.equal(result.already_handled, 6);
  assert.equal(result.failed, 0);
  assert.equal(result.processed, 0);
  assert.equal(repaired, 5);
});
