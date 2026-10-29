const test = require('node:test');
const assert = require('node:assert/strict');
const {billingPlan,planMatches} = require('./billingPlans');
test('INR defaults are preserved and USD amounts use cents',()=>{
 assert.equal(billingPlan(undefined,'monthly').amount,19900);
 assert.equal(billingPlan('INR','yearly').amount,199900);
 assert.equal(billingPlan('USD','monthly').amount,499);
 assert.equal(billingPlan('USD','yearly').amount,4900);
 assert.equal(billingPlan('EUR','monthly'),null);
 assert.equal(billingPlan('USD','__proto__'),null);
});
test('wrong currency, amount, or frequency cannot be charged',()=>{
 const p=billingPlan('USD','monthly',{RAZORPAY_USD_MONTHLY_PLAN_ID:'plan_usd'});
 const remote={id:'plan_usd',period:'monthly',interval:1,item:{currency:'USD',amount:499}};
 assert.equal(planMatches(remote,p),true);
 for(const bad of [{...remote,period:'yearly'},{...remote,item:{currency:'INR',amount:499}},{...remote,item:{currency:'USD',amount:4900}}]) assert.equal(planMatches(bad,p),false);
 assert.equal(billingPlan('USD','monthly',{}).planId,undefined);
});
