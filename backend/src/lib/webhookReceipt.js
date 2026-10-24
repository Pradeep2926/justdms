const { randomUUID } = require("node:crypto");

// Store the complete envelope before acknowledging it. Diagnostics are useful
// for searching individual events, but are not the durable receipt.
function createWebhookReceiver({ db, processWebhook, diagnostics, logger = console, timeoutMs = 4000 }) {
  return async function receive(req, res) {
    const id = randomUUID();
    const controller = new AbortController();
    let timer;
    logger.log("Instagram webhook receipt:", { receipt_id: id, status: "receiving" });
    try {
      let query = db.from("webhook_events").insert({
        id, event_type: "webhook_receipt", status: "received",
        raw_payload: req.body, message: "persisted_before_acknowledgement",
      });
      if (typeof query.abortSignal === "function") query = query.abortSignal(controller.signal);
      const result = await Promise.race([
        Promise.resolve(query),
        new Promise((_, reject) => {
          timer = setTimeout(() => {
            controller.abort();
            reject(new Error("Webhook receipt persistence timed out"));
          }, timeoutMs);
        }),
      ]);
      if (result?.error) throw new Error(result.error.message);
    } catch (error) {
      logger.error("Instagram webhook receipt failed:", { receipt_id: id, error: error.message });
      // Do not process an unacknowledged envelope: Meta can redeliver it.
      return res.sendStatus(503);
    } finally {
      clearTimeout(timer);
    }

    res.sendStatus(200);
    logger.log("Instagram webhook receipt:", { receipt_id: id, status: "acknowledged" });
    let status = "processed";
    let message = "handler_completed";
    try {
      diagnostics.received(req.body);
    } catch (error) {
      logger.warn("Webhook diagnostics failed:", error.message);
    }
    try {
      const outcome = await processWebhook(req.body);
      if (outcome?.status === "failed") {
        status = "failed";
        message = outcome.message || "handler_failed";
      }
    } catch (error) {
      status = "failed";
      message = error.message;
    }
    try {
      const result = await db.from("webhook_events").update({
        status, message, processed_at: new Date().toISOString(),
      }).eq("id", id);
      if (result?.error) throw new Error(result.error.message);
    } catch (error) {
      // The envelope remains available as 'received' for investigation. Do not
      // blindly replay it: a send may have succeeded before the status failed.
      logger.error("Webhook receipt outcome update failed:", { receipt_id: id, error: error.message });
    }
    logger.log("Instagram webhook receipt:", { receipt_id: id, status });
  };
}

module.exports = { createWebhookReceiver };
