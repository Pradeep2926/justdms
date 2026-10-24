const { createHash } = require('node:crypto');
const { parseAutomationPostback } = require('./webhookPayload');

function stableId(value) {
  const h = createHash('sha256').update(value).digest('hex');
  return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;
}

function findConfirmedClick({ messages, interaction, automation, ownerIds, now = Date.now() }) {
  const opening = Date.parse(interaction.opening_dm_sent_at);
  if (!Number.isFinite(opening)) return null;
  const owners = new Set(ownerIds.filter(Boolean).map(String));
  const sender = String(interaction.instagram_sender_id);
  const caption = String(automation.opening_dm_button_text || 'Get Details').trim();
  const sorted = [...messages].sort((a,b) => Date.parse(a.created_time)-Date.parse(b.created_time));
  for (let i = sorted.length - 1; i > 0; i--) {
    const click = sorted[i], preceding = sorted[i-1];
    const clickedAt = Date.parse(click.created_time);
    // Require the immediately preceding message to be our opening template.
    // Ambiguous conversations are left for manual review, never guessed.
    if (!click.id || String(click.from?.id) !== sender || click.message?.trim() !== caption ||
        clickedAt < opening || clickedAt > now || now-clickedAt > 23*60*60*1000 ||
        !click.to?.data?.some(x => owners.has(String(x.id))) ||
        !owners.has(String(preceding.from?.id)) || preceding.message !== '' ||
        !preceding.to?.data?.some(x => String(x.id) === sender) ||
        Math.abs(Date.parse(preceding.created_time)-opening) > 3000) continue;
    return click;
  }
  return null;
}

function createPostbackRunner({ db, processPostback, accountId, logger = console }) {
  return async function runPostback(args) {
    const event = args.messaging;
    const parsed = parseAutomationPostback(event?.postback?.payload || event?.message?.quick_reply?.payload);
    if (!parsed) return processPostback(args);
    if (accountId) {
      const { data, error } = await db.from('automation_interactions')
        .select('connected_account_id').eq('id', parsed.interactionId).maybeSingle();
      if (error) throw error;
      if (data?.connected_account_id !== accountId) return processPostback(args);
    }
    const id = stableId(`postback-lock:${parsed.interactionId}`);
    const { error } = await db.from('webhook_events').insert({ id,
      event_type: 'postback_lock', status: 'processing',
      message: 'Do not automatically reclaim: a previous send may have succeeded',
      raw_payload: { interaction_id: parsed.interactionId },
    });
    if (error?.code === '23505') return { status: 'skipped', reason: 'postback_in_progress_or_requires_review' };
    if (error) throw new Error(`Cannot acquire postback lock: ${error.message}`);
    let completed = false;
    try {
      const result = await processPostback(args);
      completed = true;
      return result;
    } finally {
      // A thrown/ambiguous attempt keeps its lock for review. A process crash
      // likewise cannot cause an automatic duplicate send on restart.
      if (completed) {
        const result = await db.from('webhook_events').delete().eq('id', id);
        if (result.error) logger.error('Postback lock release failed:', result.error.message);
      }
    }
  };
}

function createClickRecovery({ db, getAccount, getMessages, runPostback, accountId, logger = console, now = Date.now }) {
  let running = false;
  const checked = new Map();
  return async function recover() {
    if (running || !accountId) return;
    running = true;
    try {
      const cutoff = new Date(now()-24*60*60*1000).toISOString();
      const { data: rows, error } = await db.from('automation_interactions').select('*')
        .eq('connected_account_id', accountId).eq('current_step', 'waiting_for_get_details')
        .gte('opening_dm_sent_at', cutoff).order('opening_dm_sent_at', { ascending: false }).limit(200);
      if (error) throw error;
      const pending = (rows || []).filter(x => !x.resource_delivered_at && x.resource_delivery_status !== 'delivered');
      const candidates = pending.filter(x => now()-(checked.get(x.id)||0) >= 5*60*1000)
        .sort((a,b)=>(checked.get(a.id)||0)-(checked.get(b.id)||0)).slice(0,10);
      if (!candidates.length) return;
      const account = await getAccount(accountId);
      if (!account || account.auth_provider !== 'instagram') return;
      for (const row of candidates) {
        checked.set(row.id, now());
        // Same sender with several waiting automations is ambiguous.
        if (pending.filter(x => x.instagram_sender_id === row.instagram_sender_id).length !== 1) continue;
        try {
          const { data: automation, error } = await db.from('automations').select('*').eq('id', row.automation_id).maybeSingle();
          if (error) throw error;
          if (!automation?.is_active || automation.opening_dm_enabled === false) continue;
          const messages = await getMessages(account, row.instagram_sender_id);
          const click = findConfirmedClick({ messages, interaction: row, automation,
            ownerIds: [account.messaging_owner_id, account.instagram_user_id, account.instagram_account_id], now: now() });
          if (!click) continue;
          const recipientId = click.to.data.find(x => [account.messaging_owner_id, account.instagram_user_id, account.instagram_account_id].filter(Boolean).map(String).includes(String(x.id))).id;
          await runPostback({ recovery: { messageId: click.id, openingAt: row.opening_dm_sent_at }, messaging: {
            sender: { id: row.instagram_sender_id }, recipient: { id: recipientId },
            timestamp: Date.parse(click.created_time),
            postback: { mid: click.id, payload: `GET_DETAILS:${automation.id}:${row.id}` },
          } });
        } catch (error) {
          logger.error('Click recovery check failed:', { interaction_id: row.id, error: error.message });
          // Stop the batch on provider/network failures to avoid a request burst.
          if (error.response || error.code) break;
        }
      }
      const ids = new Set(pending.map(x => x.id));
      for (const id of checked.keys()) if (!ids.has(id)) checked.delete(id);
    } finally { running = false; }
  };
}

module.exports = { stableId, findConfirmedClick, createPostbackRunner, createClickRecovery };
