const PRICES = { INR: { monthly: 19900, yearly: 199900 }, USD: { monthly: 499, yearly: 4900 } };
function billingPlan(currency = 'INR', cycle, env = process.env) {
  if (!Object.hasOwn(PRICES, currency) || !Object.hasOwn(PRICES[currency], cycle)) return null;
  const key = `RAZORPAY_${currency === 'USD' ? 'USD_' : ''}${cycle.toUpperCase()}_PLAN_ID`;
  return { currency, amount: PRICES[currency][cycle], planId: env[key], period: cycle, totalCount: cycle === 'monthly' ? 120 : 10, label: `JustDMs Pro ${cycle === 'monthly' ? 'Monthly' : 'Yearly'}` };
}
function planMatches(remote, plan) {
  return remote.id === plan.planId && remote.period === plan.period && remote.interval === 1 && remote.item?.currency === plan.currency && remote.item?.amount === plan.amount;
}
module.exports = { billingPlan, planMatches };
