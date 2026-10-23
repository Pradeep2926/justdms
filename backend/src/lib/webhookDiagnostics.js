function messagingRoute(event) {
  if (event?.postback?.payload || event?.message?.quick_reply?.payload) return "postback";
  if (event?.message?.text) return "text";
  return "ignored";
}

function createWebhookDiagnostics({ db, logger = console }) {
  function record({ entryId, channel = "messaging", event, status, reason }) {
    if (event?.message?.is_echo && !event?.postback && !event?.message?.quick_reply) return;
    const route = messagingRoute(event);
    const summary = {
      entry_id: entryId || null,
      channel,
      sender_id: event?.sender?.id || null,
      recipient_id: event?.recipient?.id || null,
      message_id: event?.postback?.mid || event?.message?.mid || null,
      timestamp: event?.timestamp || null,
      route,
      status,
      reason,
    };
    // Logging is observational: never delay acknowledgements or make delivery
    // depend on the diagnostics database being available.
    try {
      logger.log("Instagram messaging trace:", summary);
      Promise.resolve(db.from("webhook_events").insert({
        event_type: "messaging_trace",
        status,
        message: reason,
        raw_payload: { ...summary, event },
        processed_at: new Date().toISOString(),
      })).then(result => {
        if (result?.error) logger.warn("Messaging trace insert failed:", result.error.message);
      }).catch(error => logger.warn("Messaging trace insert failed:", error.message));
    } catch (error) {
      logger.warn("Messaging trace unavailable:", error.message);
    }
  }

  function received(body) {
    for (const entry of Array.isArray(body?.entry) ? body.entry : []) {
      for (const channel of ["messaging", "standby"]) {
        for (const event of Array.isArray(entry?.[channel]) ? entry[channel] : []) {
          // Echoes are outbound copies, not customer clicks.
          if (event?.message?.is_echo && !event?.postback && !event?.message?.quick_reply) continue;
          record({ entryId: entry.id, channel, event,
            status: channel === "standby" ? "skipped" : "received",
            reason: channel === "standby" ? "standby_event_not_processed" : "webhook_received" });
        }
      }
    }
  }

  return { received, record };
}

module.exports = { createWebhookDiagnostics, messagingRoute };
