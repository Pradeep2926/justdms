// Render runs one Node process. Share this queue between live webhooks and
// manual re-trigger requests so they re-read state after the previous attempt.
function createCommentQueue() {
  const pending = new Map();
  return async function serialize(key, work) {
    const previous = pending.get(key) || Promise.resolve();
    const current = previous.catch(() => {}).then(work);
    pending.set(key, current);
    try {
      return await current;
    } finally {
      if (pending.get(key) === current) pending.delete(key);
    }
  };
}

function commentWasHandled(row, openingEnabled) {
  if (row.resource_delivered_at || row.resource_delivery_status === "delivered") return true;
  return openingEnabled
    ? Boolean(row.opening_dm_sent_at)
    : row.current_step === "waiting_for_follow_confirmation";
}

function recoveredOpeningState(row) {
  if (row.current_step !== "opening_dm_failed" || !row.opening_dm_sent_at) return null;
  return row.resource_delivered_at || row.resource_delivery_status === "delivered"
    ? { current_step: "resource_delivered", resource_delivery_status: "delivered" }
    : { current_step: "waiting_for_get_details", resource_delivery_status: "not_delivered" };
}

module.exports = { createCommentQueue, commentWasHandled, recoveredOpeningState };
