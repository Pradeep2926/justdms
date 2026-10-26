// Only explicit authentication failures invalidate a connection, not delivery-window
// errors, rate limits, or temporary network failures.
function needsReconnect(account, now = Date.now()) {
  const expiry = Date.parse(account?.token_expires_at || account?.expires_at);
  return ["expired", "invalid", "revoked", "disconnected", "reconnect_required"].includes(account?.token_status)
    || (Number.isFinite(expiry) && expiry <= now);
}

async function recordInvalidToken(db, error, accessToken, accountId = null) {
  if (![190, 102].includes(Number(error.response?.data?.error?.code)) || !accessToken) return;
  try {
    // A late error from an old token must not invalidate a newly reconnected one.
    for (const column of ["access_token", "page_access_token"]) {
      let query = db.from("instagram_accounts").update({ token_status: "reconnect_required" }).eq(column, accessToken);
      if (accountId) query = query.eq("id", accountId);
      const { error: saveError } = await query;
      if (saveError) console.error("Unable to record Instagram connection status:", saveError.message);
    }
  } catch {
    // Health reporting must never replace the original API error or change retries.
    console.error("Unable to record Instagram connection status.");
  }
}
module.exports = { needsReconnect, recordInvalidToken };
