function metaErrorDetails(error) {
  const meta = error?.response?.data?.error || {};
  return {
    message: meta.message || error?.message || "Instagram delivery failed",
    type: meta.type || null,
    code: meta.code ?? null,
    subcode: meta.error_subcode ?? null,
    status: error?.response?.status ?? null,
    transient: Boolean(meta.is_transient),
  };
}

function isRetryableMetaError(error) {
  const details = metaErrorDetails(error);
  return (
    details.transient ||
    details.status === 429 ||
    details.status >= 500 ||
    [1, 2, 4, 17, 32, 341, 613].includes(details.code)
  );
}

module.exports = { isRetryableMetaError, metaErrorDetails };
