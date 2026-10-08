const test = require("node:test");
const assert = require("node:assert/strict");
const {
  buildUpiUrl, canTransition, generateSlots, hashLookupToken,
  validateBookingUsername, validateRazorpayLink, validateUpiId,
} = require("./bookingUtils");

test("validates booking usernames and reserved routes", () => {
  assert.equal(validateBookingUsername("Career.Coach").username, "career.coach");
  assert.equal(validateBookingUsername("dashboard").valid, false);
});

test("validates UPI IDs without claiming ownership", () => {
  assert.equal(validateUpiId("creator@okaxis"), "creator@okaxis");
  assert.equal(validateUpiId("not-an-id"), null);
  assert.match(buildUpiUrl({ upiId: "creator@okaxis", payeeName: "Creator", amount: 499 }), /^upi:\/\/pay\?/);
});

test("restricts Razorpay links to approved HTTPS domains", () => {
  assert.equal(validateRazorpayLink("https://rzp.io/l/example"), "https://rzp.io/l/example");
  assert.equal(validateRazorpayLink("https://evil.example/pay"), null);
  assert.equal(validateRazorpayLink("http://rzp.io/l/example"), null);
});

test("generates timezone-aware slots and removes overlaps", () => {
  const slots = generateSlots({
    date: "2030-01-07", timeZone: "Asia/Kolkata",
    windows: [{ start_time: "10:00", end_time: "11:30" }],
    durationMinutes: 30, bufferMinutes: 0, now: new Date("2029-01-01T00:00:00Z"),
    bookings: [{ status: "confirmed", starts_at: "2030-01-07T05:00:00.000Z", ends_at: "2030-01-07T05:30:00.000Z" }],
  });
  assert.deepEqual(slots.map((slot) => slot.label), ["10:00", "11:00"]);
});

test("enforces manual booking status transitions", () => {
  assert.equal(canTransition("payment_review", "confirmed"), true);
  assert.equal(canTransition("pending_payment", "confirmed"), false);
  assert.equal(canTransition("cancelled", "confirmed"), false);
});

test("lookup tokens are stored as hashes", () => {
  assert.equal(hashLookupToken("secret"), hashLookupToken("secret"));
  assert.notEqual(hashLookupToken("secret"), "secret");
});
