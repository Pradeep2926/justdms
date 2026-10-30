const test = require('node:test');
const assert = require('node:assert/strict');
const { customerInvoices } = require('./customerInvoices');
test('invoice history never includes another subscription or customer fields', () => {
  const result = customerInvoices([
    { id: 'mine', subscription_id: 'sub_mine', status: 'paid', amount: 19900, currency: 'INR', short_url: 'https://rzp.io/i/mine', customer_details: { email: 'private@example.com' } },
    { id: 'other', subscription_id: 'sub_other', short_url: 'https://rzp.io/i/other' },
  ], 'sub_mine');
  assert.equal(result.length, 1);
  assert.equal(result[0].id, 'mine');
  assert.equal(result[0].url, 'https://rzp.io/i/mine');
  assert.equal(result[0].customer_details, undefined);
});
test('invoice links reject non-provider domains and unsafe protocols', () => {
  for (const short_url of ['javascript:alert(1)', 'http://rzp.io/i/a', 'https://rzp.io.evil.test/i/a', undefined]) {
    assert.equal(customerInvoices([{ subscription_id: 'mine', short_url }], 'mine')[0].url, null);
  }
  assert.deepEqual(customerInvoices(null, 'mine'), []);
});
