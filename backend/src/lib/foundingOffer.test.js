const test = require('node:test');
const assert = require('node:assert/strict');
const { foundingOffer, eligibleForFoundingOffer, validateFoundingClaim } = require('./foundingOffer');
const env = { FOUNDING_OFFER_ENABLED: 'true', RAZORPAY_FOUNDING_OFFER_ID: 'offer_test123' };
const claim = { code: 'founding-first-month', currency: 'INR', cycle: 'monthly', subscription: null, env };
test('offer is off until explicitly enabled with a configured offer', () => {
  assert.equal(foundingOffer({}).enabled, false);
  assert.equal(foundingOffer({ FOUNDING_OFFER_ENABLED: 'true' }).enabled, false);
  assert.equal(foundingOffer(env).enabled, true);
});
test('normal pricing paths never add a discount', () => {
  assert.equal(validateFoundingClaim({ currency: 'USD', cycle: 'yearly' }), null);
});
test('first-month offer keeps recurring price and restricts currency and cycle', () => {
  assert.equal(validateFoundingClaim(claim).firstAmount, 9900);
  assert.equal(validateFoundingClaim(claim).recurringAmount, 19900);
  for (const override of [{ currency: 'USD' }, { cycle: 'yearly' }, { code: 'arbitrary' }]) {
    assert.throws(() => validateFoundingClaim({ ...claim, ...override }), { status: 400 });
  }
  assert.throws(() => validateFoundingClaim({ ...claim, env: {} }), { status: 503 });
});
test('previous paid subscribers cannot claim again, complimentary users can', () => {
  assert.equal(eligibleForFoundingOffer({status:'inactive',referral_access_end:'2030-01-01'}), true);
  for (const subscription of [{status:'active'}, {status:'cancelled'}, {status:'created',razorpay_payment_id:'pay_old'}, {status:'inactive',current_start:'2026-01-01'}]) {
    assert.throws(() => validateFoundingClaim({...claim, subscription}), {status:409});
  }
});
