const test = require('node:test');
const assert = require('node:assert/strict');
const { foundingOffer, eligibleForFoundingOffer, validateFoundingClaim } = require('./foundingOffer');
const env = { FOUNDING_OFFER_ENABLED: 'true', RAZORPAY_FOUNDING_UPI_OFFER_ID: 'offer_upi123', RAZORPAY_FOUNDING_CARD_OFFER_ID: 'offer_card123', FOUNDING_OFFER_EXPIRES_AT: '2030-01-01T00:00:00Z' };
const claim = { code: 'founding-first-month', currency: 'INR', cycle: 'monthly', subscription: null, paymentMethod: 'upi', env };
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

test('separate method offers and expiry are required', () => {
 assert.equal(validateFoundingClaim(claim).offerId, 'offer_upi123');
 assert.equal(validateFoundingClaim({...claim,paymentMethod:'card'}).offerId, 'offer_card123');
 for(const method of [undefined,'wallet','__proto__']) assert.throws(()=>validateFoundingClaim({...claim,paymentMethod:method}), {status:400});
 assert.equal(foundingOffer({...env,FOUNDING_OFFER_EXPIRES_AT:'2020-01-01'}).enabled,false);
 assert.equal(foundingOffer({...env,RAZORPAY_FOUNDING_CARD_OFFER_ID:'offer_upi123'}).enabled,false);
});
