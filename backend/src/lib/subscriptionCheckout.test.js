const test = require('node:test');
const assert = require('node:assert/strict');
async function harness({ verifyFails = false, loadFails = false } = {}) {
  const { createSubscriptionCheckout } = await import('../../../frontend/src/lib/subscriptionCheckout.mjs');
  const calls = []; let options; let gateway;
  class Gateway {
    constructor(config) { options = config; gateway = this; }
    on(name, handler) { this[name] = handler; }
    open() { calls.push('gateway-open'); }
  }
  const api = { async post(path, body) {
    calls.push({ path, body });
    if (path === '/billing/verify') {
      if (verifyFails) throw new Error('Verification rejected');
      return { data: { subscription: { status: 'active' } } };
    }
    return { data: { keyId: 'key_fixture', amount: 9900, currency: 'INR', subscriptionId: 'sub_fixture', offerPaymentMethod: body.offerPaymentMethod } };
  } };
  const open = createSubscriptionCheckout({ api, loadGateway: async () => loadFails ? null : Gateway });
  await open({ user: { email: 'fixture@example.invalid' }, currency: 'INR', billingCycle: 'monthly', introductory: true,
    foundingOffer: { code: 'founding-first-month' }, offerPaymentMethod: 'card',
    onVisibility: visible => calls.push(`visible:${visible}`), onVerified: data => calls.push(`verified:${data.status}`),
    onError: err => calls.push(`error:${err.message}`), onDismiss: () => calls.push('dismissed'),
  });
  return { calls, options, gateway };
}
test('direct checkout uses server pricing, selected method and releases dialog before opening gateway', async () => {
  const h = await harness();
  assert.deepEqual(h.calls[0].body, { currency: 'INR', billingCycle: 'monthly', offerCode: 'founding-first-month', offerPaymentMethod: 'card' });
  assert.equal(h.options.amount, 9900);
  assert.equal(h.options.subscription_id, 'sub_fixture');
  assert.equal(h.options.config.display.blocks.introductory.instruments[0].method, 'card');
  assert.deepEqual(h.calls.slice(1), ['visible:true', 'gateway-open']);
  assert.equal(h.calls.some(value => typeof value === 'string' && value.startsWith('verified:')), false);
  await h.options.handler({ razorpay_payment_id: 'pay_fixture' });
  assert.equal(h.calls.at(-1), 'verified:active');
});
test('verification rejection never grants access and restores the popup', async () => {
  const h = await harness({ verifyFails: true });
  await h.options.handler({ razorpay_payment_id: 'invalid_fixture' });
  assert.deepEqual(h.calls.slice(-3), ['visible:false', 'error:Verification rejected', 'dismissed']);
  assert.equal(h.calls.includes('verified:active'), false);
});
test('closing checkout restores the popup without verifying or upgrading', async () => {
  const h = await harness(); h.options.modal.ondismiss();
  assert.deepEqual(h.calls.slice(-2), ['visible:false', 'dismissed']);
  assert.equal(h.calls.some(call => call.path === '/billing/verify'), false);
});
test('unavailable gateway fails before creating a subscription', async () => {
  await assert.rejects(harness({ loadFails: true }), /could not be loaded/);
});
