const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const { parseAutomationPostback, withMessagingSender } = require("../lib/webhookPayload");

// Exercise the real handler with isolated dependencies; never load the live DB
// client or make Meta requests in a routing regression test.
const source = fs.readFileSync(require.resolve("./webhook.routes"), "utf8");
const handlerSource = source.slice(
  source.indexOf("async function processPostback("),
  source.indexOf("function dmAutomationMatches(")
);
const automationId = "1398b1ce-0965-41b1-8af8-0630cc364560";
const interactionId = "b0c6ceec-09c5-4946-9841-b67c20e4152f";
const ownerId = "17841467390473624";
const otherOwnerId = "17841467007864520";

function harness({ followRequired = true, follow = "following", boundOwner, delivered = false } = {}) {
  const account = { id: "owner", messaging_owner_id: ownerId };
  const interaction = {
    id: interactionId,
    automation_id: automationId,
    connected_account_id: account.id,
    current_step: delivered ? "resource_delivered" : "waiting_for_get_details",
    resource_delivery_status: delivered ? "delivered" : "not_delivered",
    instagram_sender_id: "correct-sender",
    opening_dm_sent_at: "2026-10-24T04:01:16.456Z",
    raw_context: boundOwner ? { messaging_owner_id: boundOwner } : {},
  };
  const events = [], writes = [], sends = [];
  const context = {
    console: { log() {}, warn() {}, error() {} },
    parseAutomationPostback, withMessagingSender,
    stableId: require("../lib/clickRecovery").stableId,
    supabase: {
      from(table) {
        const query = {
          select() { return query; }, eq() { return query; },
          async insert() { return {}; },
          async maybeSingle() {
            return { data: structuredClone(table === "automations"
              ? { id: automationId, is_active: true, follow_required: followRequired }
              : interaction) };
          },
        };
        return query;
      },
    },
    getAccountById: async () => ({ ...account }),
    getAccountForMessagingOwner: async id => id === ownerId
      ? { ...account } : id === otherOwnerId ? { id: "other" } : null,
    bindMessagingOwnerId: async (row, id) => {
      writes.push("account");
      account.messaging_owner_id = id;
      return { ...row, messaging_owner_id: id };
    },
    saveAutomationEvent: async event => events.push(event),
    upsertInteraction: async (row, updates) => {
      writes.push("interaction");
      Object.assign(interaction, structuredClone(updates));
      return { ...row, ...updates };
    },
    checkFollowStatus: async () => { sends.push("follow_check"); return { status: follow }; },
    hasSentResource: async () => interaction.resource_delivery_status === "delivered",
    sendResource: async args => {
      sends.push({ type: "resource", recipient: args.interaction.instagram_sender_id });
      interaction.current_step = "resource_delivered";
      interaction.resource_delivery_status = "delivered";
    },
    sendFollowPrompt: async () => sends.push("follow_prompt"),
    sendAlreadyDeliveredNotice: async () => sends.push("duplicate_notice"),
    sendInstagramMessage: async () => sends.push("still_not_following"),
  };
  const processPostback = vm.runInNewContext(`${handlerSource}\nprocessPostback`, context);
  async function click(recipient = ownerId, action = "GET_DETAILS", quickReply = false, recovery) {
    const payload = `${action}:${automationId}:${interactionId}`;
    return processPostback({ recovery, messaging: {
      sender: { id: recipient === otherOwnerId ? "other-scoped-sender" : "correct-sender" },
      recipient: { id: recipient },
      ...(quickReply ? { message: { quick_reply: { payload } } } : { postback: { payload } }),
    } });
  }
  return { click, account, interaction, events, writes, sends };
}

for (const action of ["GET_DETAILS", "CONFIRM_FOLLOW"]) {
  test(`${action}: wrong account is skipped before any state change or Meta call`, async () => {
    const h = harness();
    await h.click(otherOwnerId, action);
    assert.deepEqual(h.writes, []);
    assert.deepEqual(h.sends, []);
    assert.equal(h.account.messaging_owner_id, ownerId);
    assert.equal(h.interaction.current_step, "waiting_for_get_details");
    assert.equal(h.events.at(-1).status, "skipped");
  });
}

for (const order of ["wrong-first", "valid-first", "concurrent"]) {
  test(`paired account events (${order}) send the resource only through the valid account`, async () => {
    const h = harness();
    if (order === "concurrent") await Promise.all([h.click(otherOwnerId), h.click()]);
    else for (const id of order === "wrong-first" ? [otherOwnerId, ownerId] : [ownerId, otherOwnerId]) await h.click(id);
    assert.deepEqual(h.sends, ["follow_check", { type: "resource", recipient: "correct-sender" }]);
    assert.equal(h.account.messaging_owner_id, ownerId);
    assert.equal(h.interaction.raw_context.messaging_owner_id, ownerId);
    assert.equal(h.interaction.current_step, "resource_delivered");
  });
}

test("valid quick reply without a follow gate still sends the resource", async () => {
  const h = harness({ followRequired: false });
  await h.click(ownerId, "GET_DETAILS", true);
  assert.deepEqual(h.sends, [{ type: "resource", recipient: "correct-sender" }]);
});

test("valid non-follower still receives the existing follow prompt", async () => {
  const h = harness({ follow: "not_following" });
  await h.click();
  assert.deepEqual(h.sends, ["follow_check", "follow_prompt"]);
});

test("valid follow confirmation still sends the resource", async () => {
  const h = harness();
  await h.click(ownerId, "CONFIRM_FOLLOW");
  assert.deepEqual(h.sends, ["follow_check", { type: "resource", recipient: "correct-sender" }]);
});

test("known correct account can recover an interaction bound by the old wrong event", async () => {
  const h = harness({ boundOwner: otherOwnerId });
  await h.click();
  assert.equal(h.interaction.raw_context.messaging_owner_id, ownerId);
  assert.equal(h.interaction.current_step, "resource_delivered");
});

test("unrecognized recipient cannot overwrite an existing interaction binding", async () => {
  const h = harness({ boundOwner: ownerId });
  await h.click("unknown-recipient");
  assert.deepEqual(h.writes, []);
  assert.deepEqual(h.sends, []);
});

test("first-time messaging ID learning retains existing behavior", async () => {
  const h = harness();
  await h.click("new-messaging-id");
  assert.equal(h.account.messaging_owner_id, "new-messaging-id");
  assert.equal(h.interaction.current_step, "resource_delivered");
});

test("missing recipient cannot mutate an interaction", async () => {
  const h = harness();
  await h.click(null);
  assert.deepEqual(h.writes, []);
  assert.deepEqual(h.sends, []);
});

for (const follow of ['following', 'not_following', 'unknown']) {
  test(`recovered click preserves the existing ${follow} follow gate`, async () => {
    const h = harness({ follow });
    await h.click(ownerId, 'GET_DETAILS', false, {messageId:'evidence',openingAt:h.interaction.opening_dm_sent_at});
    assert.equal(h.sends[0], 'follow_check');
    if(follow==='following')assert.equal(h.sends[1].type,'resource');
    else assert.equal(h.sends[1],'follow_prompt');
  });
}
test('recovery cannot resend after a webhook already delivered or after a new opening', async () => {
  for(const delivered of [true,false]){
    const h=harness({delivered});
    const outcome=await h.click(ownerId,'GET_DETAILS',false,{messageId:'evidence',openingAt:delivered?h.interaction.opening_dm_sent_at:'stale-opening'});
    assert.equal(outcome.reason,'recovery_no_longer_pending');assert.deepEqual(h.sends,[]);
  }
});
