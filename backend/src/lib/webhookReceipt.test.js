const test = require('node:test');
const assert = require('node:assert/strict');
const { createWebhookReceiver } = require('./webhookReceipt');

function harness({ persist, process, diagnosticsThrows = false, updateError = false, timeoutMs = 1000 } = {}) {
  const calls = [], rows = [], outcomes = [];
  const db = { from(table) {
    assert.equal(table, 'webhook_events');
    return {
      insert(row) { rows.push(row); calls.push('persist'); return persist ? persist() : Promise.resolve({ error: null }); },
      update(row) { outcomes.push(row); return { eq: async (key, id) => {
        assert.equal(key, 'id'); assert.equal(id, rows[0].id);
        calls.push('outcome'); return { error: updateError ? { message: 'DB unavailable' } : null };
      } }; },
    };
  } };
  const receive = createWebhookReceiver({ db, timeoutMs,
    processWebhook: async body => { calls.push('process'); return process?.(body); },
    diagnostics: { received() { calls.push('diagnostics'); if (diagnosticsThrows) throw new Error('trace failed'); } },
    logger: { log() {}, warn() {}, error() {} },
  });
  const body = { object: 'instagram', entry: [{ id: 'account', messaging: [{ sender: { id: 'sender' }, postback: { payload: 'button' } }] }] };
  const run = () => receive({ body }, { sendStatus(code) { calls.push(code); } });
  return { run, calls, rows, outcomes, body };
}

test('does not acknowledge or process until the full envelope is durably saved', async () => {
  let resolve;
  const h = harness({ persist: () => new Promise(r => { resolve = r; }) });
  const pending = h.run();
  await Promise.resolve();
  assert.deepEqual(h.calls, ['persist']);
  resolve({ error: null }); await pending;
  assert.deepEqual(h.calls, ['persist', 200, 'diagnostics', 'process', 'outcome']);
  assert.deepEqual(h.rows[0].raw_payload, h.body);
  assert.equal(h.rows[0].status, 'received');
  assert.equal(h.outcomes[0].status, 'processed');
});

for (const persist of [() => Promise.resolve({ error: { message: 'DB unavailable' } }), () => Promise.reject(new Error('network failure'))]) {
  test('persistence failure returns 503 without processing or sending', async () => {
    const h = harness({ persist }); await h.run();
    assert.deepEqual(h.calls, ['persist', 503]);
  });
}

test('late database success after timeout cannot start delivery', async () => {
  let resolve;
  const h = harness({ timeoutMs: 5, persist: () => new Promise(r => { resolve = r; }) });
  await h.run(); resolve({ error: null }); await Promise.resolve();
  assert.deepEqual(h.calls, ['persist', 503]);
});

for (const process of [async () => { throw new Error('handler failure'); }, async () => ({ status: 'failed', message: 'handler failure' })]) {
  test('processing failure remains recorded after acknowledgement', async () => {
    const h = harness({ process }); await h.run();
    assert.equal(h.outcomes[0].status, 'failed');
    assert.equal(h.outcomes[0].message, 'handler failure');
    assert.equal(h.calls.filter(x => x === 200).length, 1);
  });
}

test('optional diagnostics failure does not prevent processing a saved envelope', async () => {
  const h = harness({ diagnosticsThrows: true }); await h.run();
  assert.ok(h.calls.includes('process'));
  assert.equal(h.outcomes[0].status, 'processed');
});

test('outcome write failure never automatically repeats a possibly successful send', async () => {
  const h = harness({ updateError: true }); await h.run();
  assert.equal(h.calls.filter(x => x === 'process').length, 1);
  assert.equal(h.calls.filter(x => x === 200).length, 1);
});
