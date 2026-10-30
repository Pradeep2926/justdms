const CODE = 'founding-first-month';
function foundingOffer(env = process.env) {
  const validOfferId = value => /^offer_[A-Za-z0-9]+$/.test(value || '');
  const expiresAt = Date.parse(env.FOUNDING_OFFER_EXPIRES_AT || '');
  const enabled = env.FOUNDING_OFFER_ENABLED === 'true' && Number.isFinite(expiresAt) && expiresAt > Date.now() &&
    validOfferId(env.RAZORPAY_FOUNDING_UPI_OFFER_ID) && validOfferId(env.RAZORPAY_FOUNDING_CARD_OFFER_ID) &&
    env.RAZORPAY_FOUNDING_UPI_OFFER_ID !== env.RAZORPAY_FOUNDING_CARD_OFFER_ID;
  return { enabled, expiresAt: Number.isFinite(expiresAt) ? new Date(expiresAt).toISOString() : null, paymentMethods: ['upi', 'card'], code: CODE, firstAmount: 9900, recurringAmount: 19900, currency: 'INR', billingCycle: 'monthly' };
}
function eligibleForFoundingOffer(subscription) {
  if (!subscription) return true;
  // A prior payment or subscription lifecycle makes this a returning subscriber.
  return !subscription.razorpay_payment_id && !subscription.current_start &&
    !subscription.starts_at && !subscription.current_end && !subscription.ends_at &&
    ['inactive', 'created'].includes(subscription.status || 'inactive');
}
function validateFoundingClaim({ code, currency, cycle, subscription, paymentMethod, env = process.env }) {
  if (code === undefined || code === null || code === '') return null;
  const offer = foundingOffer(env);
  if (code !== CODE || currency !== 'INR' || cycle !== 'monthly') {
    throw Object.assign(new Error('The founding offer applies only to INR monthly subscriptions.'), { status: 400 });
  }
  if (!offer.enabled) throw Object.assign(new Error('The founding offer is not available. No payment has been started.'), { status: 503 });
  if (!eligibleForFoundingOffer(subscription)) throw Object.assign(new Error('This offer is available only for a first paid subscription.'), { status: 409 });
  if (!offer.paymentMethods.includes(paymentMethod)) throw Object.assign(new Error('Choose UPI AutoPay or card for the introductory offer.'), { status: 400 });
  return { ...offer, paymentMethod, offerId: paymentMethod === 'upi' ? env.RAZORPAY_FOUNDING_UPI_OFFER_ID : env.RAZORPAY_FOUNDING_CARD_OFFER_ID };
}
module.exports = { foundingOffer, eligibleForFoundingOffer, validateFoundingClaim };
