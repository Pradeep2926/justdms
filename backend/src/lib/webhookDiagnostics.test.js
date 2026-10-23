const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const { createWebhookDiagnostics, messagingRoute } = require("./webhookDiagnostics");
const flush = () => new Promise(resolve => setImmediate(resolve));
const click = { sender: { id: "customer" }, recipient: { id: "business" },
  timestamp: 123, postback: { mid: "click-id", payload: "legacy-payload" } };

function diagnostics(insert = async () => ({})) {
  const rows = [], warnings = [], summaries = [];
  const logger = { log: (_, value) => summaries.push(value), warn: (...args) => warnings.push(args) };
  const db = { from(table) {
    assert.equal(table, "webhook_events");
    return { insert(row) { rows.push(row); return insert(row); } };
  } };
  return { observer: createWebhookDiagnostics({ db, logger }), rows, warnings, summaries };
}

test("receipt retains sender, recipient and unsupported payload before filtering", async () => {
  const h = diagnostics();
  h.observer.received({ entry: [{ id: "entry", messaging: [click] }] });
  await flush();
  assert.equal(h.rows[0].status, "received");
  assert.equal(h.rows[0].raw_payload.event.postback.payload, "legacy-payload");
  assert.equal(h.rows[0].raw_payload.sender_id, "customer");
  assert.equal(h.rows[0].raw_payload.recipient_id, "business");
  assert.equal(h.rows[0].raw_payload.message_id, "click-id");
});

test("standby clicks are recorded without processing them as active messages", () => {
  const h = diagnostics();
  h.observer.received({ entry: [{ id: "entry", standby: [click] }] });
  assert.equal(h.rows[0].status, "skipped");
  assert.equal(h.rows[0].message, "standby_event_not_processed");
});

test("quick replies retain postback routing even when a text caption is present", () => {
  assert.equal(messagingRoute({ message: { text: "Get Details", quick_reply: { payload: "payload" } } }), "postback");
  assert.equal(messagingRoute({ message: { text: "Get Details" } }), "text");
  assert.equal(messagingRoute({ read: { mid: "read-id" } }), "ignored");
});

test("outbound text echoes are not stored as customer activity", () => {
  const h = diagnostics();
  h.observer.received({ entry: [{ messaging: [{ message: { is_echo: true, text: "resource" } }] }] });
  assert.equal(h.rows.length, 0);
});

for (const failure of ["throw", "reject", "response"]) {
  test(`diagnostics ${failure} failure cannot block the webhook handler`, async () => {
    const h = diagnostics(() => {
      if (failure === "throw") throw new Error("offline");
      if (failure === "reject") return Promise.reject(new Error("offline"));
      return Promise.resolve({ error: { message: "offline" } });
    });
    assert.doesNotThrow(() => h.observer.received({ entry: [{ messaging: [click] }] }));
    await flush();
    assert.equal(h.warnings.length, 1);
    assert.equal(h.summaries.length, 1);
  });
}

const source = fs.readFileSync(require.resolve("../routes/webhook.routes"), "utf8");
const processSource = source.slice(source.indexOf("async function processWebhook("),
  source.indexOf("async function fetchCommentsForRetrigger("));

test("processing retains postback and keyword handlers and logs their outcomes", async () => {
  const calls = [], traces = [];
  const process = vm.runInNewContext(`${processSource}\nprocessWebhook`, {
    console: { error() {} }, messagingRoute,
    messagingDiagnostics: { record: row => traces.push(row) },
    processPostback: async () => { calls.push("postback"); return { status: "skipped", reason: "unsupported_postback_payload" }; },
    processInboundMessage: async () => { calls.push("keyword"); },
    saveWebhookEvent: async () => { throw new Error("unexpected error event"); },
  });
  await process({ entry: [{ id: "entry", messaging: [click, { message: { text: "LINK" } }] }] });
  assert.deepEqual(calls, ["postback", "keyword"]);
  assert.equal(traces[0].reason, "unsupported_postback_payload");
  assert.equal(traces[1].reason, "handler_completed");
});

test("existing processing failure is still reported with the original error", async () => {
  const traces = [], errors = [];
  const process = vm.runInNewContext(`${processSource}\nprocessWebhook`, {
    console: { error() {} }, messagingRoute,
    messagingDiagnostics: { record: row => traces.push(row) },
    processPostback: async () => { throw new Error("provider unavailable"); },
    saveWebhookEvent: async row => errors.push(row),
  });
  await process({ entry: [{ id: "entry", messaging: [click] }] });
  assert.equal(traces[0].status, "failed");
  assert.equal(traces[0].reason, "provider unavailable");
  assert.equal(errors[0].message, "provider unavailable");
});

test("HTTP acknowledgement and processing do not wait for diagnostics persistence", async () => {
  const h = diagnostics(() => new Promise(() => {}));
  const calls = [];
  let receive;
  const routeSource = source.slice(source.indexOf('router.post("/instagram",'), source.indexOf("module.exports = router"));
  vm.runInNewContext(routeSource, {
    router: { post: (_, handler) => { receive = handler; } },
    messagingDiagnostics: h.observer,
    processWebhook: async () => { calls.push("processing"); },
    console: { error() {} },
  });
  receive({ body: { entry: [{ messaging: [click] }] } }, { sendStatus: status => calls.push(status) });
  assert.deepEqual(calls, [200, "processing"]);
  assert.equal(h.rows.length, 1);
});

test("connection subscription includes button events alongside comments and messages", async () => {
  const syncSource = fs.readFileSync(require.resolve("../services/instagramSync.service"), "utf8");
  const subscriptionSource = syncSource.slice(syncSource.indexOf("async function subscribeInstagramWebhooks("),
    syncSource.indexOf("async function ensureInstagramWebhookSubscription("));
  const requests = [];
  const subscribe = vm.runInNewContext(`${subscriptionSource}\nsubscribeInstagramWebhooks`, {
    INSTAGRAM_GRAPH_BASE_URL: "https://graph.instagram.com/v19.0",
    axios: { post: async (...args) => { requests.push(args); return { data: { success: true } }; } },
    metaError: error => error.message,
  });
  assert.equal(await subscribe({ instagram_user_id: "account", access_token: "test-only" }), true);
  assert.equal(requests.length, 1);
  assert.equal(requests[0][2].params.subscribed_fields, "comments,messages,messaging_postbacks");
  assert.equal(requests[0][0], "https://graph.instagram.com/v19.0/account/subscribed_apps");
});
