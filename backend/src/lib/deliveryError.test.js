const test = require("node:test");
const assert = require("node:assert/strict");
const { isRetryableMetaError, metaErrorDetails } = require("./deliveryError");

test("extracts useful Meta delivery error details", () => {
  const error = {
    response: {
      status: 400,
      data: { error: { message: "Unsupported request", code: 100, error_subcode: 33 } },
    },
  };

  assert.deepEqual(metaErrorDetails(error), {
    message: "Unsupported request",
    type: null,
    code: 100,
    subcode: 33,
    status: 400,
    transient: false,
  });
  assert.equal(isRetryableMetaError(error), false);
});

test("recognizes rate limits and server failures as retryable", () => {
  assert.equal(isRetryableMetaError({ response: { status: 429, data: {} } }), true);
  assert.equal(isRetryableMetaError({ response: { status: 503, data: {} } }), true);
  assert.equal(
    isRetryableMetaError({ response: { status: 400, data: { error: { code: 613 } } } }),
    true
  );
});
