const CODE = 'founding-first-month';
function foundingOffer(env = process.env) {
  const enabled = env.FOUNDING_OFFER_ENABLED === 'true' && /^offer_[A-Za-z0-9]+$/.test(env.RAZORPAY_FOUNDING_OFFER_ID || '');
  return { enabled, code: CODE, firstAmount: 9900, recurringAmount: 19900, currency: 'INR', billingCycle: 'monthly' };
}
function eligibleForFoundingOffer(subscription) {
  if (!subscription) return true;
  // A prior payment or subscription lifecycle makes this a returning subscriber.
  return !subscription.razorpay_payment_id && !subscription.current_start &&
    !subscription.starts_at && !subscription.current_end && !subscription.ends_at &&
    ['inactive', 'created'].includes(subscription.status || 'inactive');
}
function validateFoundingClaim({ code, currency, cycle, subscription, env = process.env }) {
  if (code === undefined || code === null || code === '') return null;
  const offer = foundingOffer(env);
  if (code !== CODE || currency !== 'INR' || cycle !== 'monthly') {
    throw Object.assign(new Error('The founding offer applies only to INR monthly subscriptions.'), { status: 400 });
  }
  if (!offer.enabled) throw Object.assign(new Error('The founding offer is not available. No payment has been started.'), { status: 503 });
  if (!eligibleForFoundingOffer(subscription)) throw Object.assign(new Error('This offer is available only for a first paid subscription.'), { status: 409 });
  return { ...offer, offerId: env.RAZORPAY_FOUNDING_OFFER_ID };
}
module.exports = { foundingOffer, eligibleForFoundingOffer, validateFoundingClaim };
