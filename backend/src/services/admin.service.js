const {
  normalizeEmail,
  isActiveProSubscription,
  isActivePaidSubscription,
} = require("../lib/automationAccess");

const DAY = 24 * 60 * 60 * 1000;
const PAGE_SIZE = 500;
const tokenNeedsAttention = token => token.status !== "active";

function tokenHealth(account, now = Date.now()) {
  const expiresAt = account.token_expires_at || account.expires_at || null;
  const expiry = Date.parse(expiresAt);
  const stored = String(account.token_status || "").toLowerCase();
  let status = "unknown";
  if (Number.isFinite(expiry) && expiry <= now) status = "expired";
  else if (["expired", "invalid", "revoked", "disconnected", "reconnect_required"].includes(stored)) status = "reconnect_required";
  else if (Number.isFinite(expiry)) status = expiry - now <= 14 * DAY ? "expiring_soon" : "active";
  // A stored 'active' flag alone does not establish that a token is still valid.
  return { status, expiresAt, daysRemaining: Number.isFinite(expiry) ? Math.ceil((expiry - now) / DAY) : null };
}

function emptyActivity() {
  return { interactions: 0, delivered: 0, waiting: 0, failed: 0, other: 0, sentEvents: 0, failedEvents: 0, lastActivity: null, recentFailures: [] };
}

function latest(left, right) {
  return !left || Date.parse(right) > Date.parse(left) ? right || left : left;
}

function activityHealth(activity) {
  if (activity.failed || activity.failedEvents) return "needs_attention";
  if (activity.delivered || activity.sentEvents) return "delivering";
  if (activity.waiting) return "waiting";
  return "no_activity";
}

function buildAdminOverview({ authUsers, profiles, accounts, subscriptions, automations, interactions, events }, now = Date.now()) {
  const usersById = new Map();
  const usersByEmail = new Map();
  const ensureUser = (id, email, createdAt = null, name = null) => {
    email = normalizeEmail(email);
    let user = (id && usersById.get(id)) || (email && usersByEmail.get(email));
    if (!user) {
      user = { id: id || email, email, name: name || email || "Unknown user", createdAt, registered: false, confirmed: false, lastSignInAt: null, accounts: [], subscription: null, automations: [] };
    }
    if (id) usersById.set(id, user);
    if (email) { user.email = email; usersByEmail.set(email, user); }
    return user;
  };
  for (const auth of authUsers) {
    const name = [auth.user_metadata?.first_name, auth.user_metadata?.last_name].filter(Boolean).join(" ") || auth.user_metadata?.full_name;
    const user = ensureUser(auth.id, auth.email, auth.created_at, name);
    user.registered = true;
    user.confirmed = Boolean(auth.email_confirmed_at);
    user.lastSignInAt = auth.last_sign_in_at || null;
  }
  for (const profile of profiles) {
    const user = ensureUser(profile.id, profile.Email);
    const name = [profile.FirstName, profile.LastName].filter(Boolean).join(" ");
    if (name) user.name = name;
  }
  for (const account of accounts) {
    const user = ensureUser(account.user_id, account.user_email);
    // Explicit response fields: credentials and raw provider payloads never leave the server.
    user.accounts.push({ id: account.id, username: account.username || account.instagram_username, provider: account.auth_provider, token: tokenHealth(account, now), storedTokenStatus: account.token_status, connectedAt: account.connected_at, lastSyncAt: account.last_sync });
  }
  for (const subscription of subscriptions) {
    const user = ensureUser(subscription.user_id, subscription.user_email);
    const paidPro = isActivePaidSubscription(subscription, now);
    user.subscription = { status: subscription.status || "inactive", billingCycle: subscription.billing_cycle, accessEnd: subscription.ends_at || subscription.current_end || null, referralAccessEnd: subscription.referral_access_end || null, cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end), updatedAt: subscription.updated_at || null, isPro: isActiveProSubscription(subscription, now), paidPro, source: paidPro ? "paid" : isActiveProSubscription(subscription, now) ? "referral" : "free" };
  }
  const automationById = new Map();
  for (const automation of automations) {
    const user = ensureUser(automation.user_id, automation.user_email);
    const item = { id: automation.id, name: automation.name || "Untitled automation", active: Boolean(automation.is_active), createdAt: automation.created_at, trigger: automation.trigger_value, followRequired: Boolean(automation.follow_required), activity: emptyActivity() };
    automationById.set(item.id, item);
    user.automations.push(item);
  }
  const activity = emptyActivity();
  for (const row of interactions) {
    const target = automationById.get(row.automation_id)?.activity;
    const step = String(row.current_step || "");
    // Some old rows retain failed delivery status after progressing. Use the actual step.
    const state = step.includes("failed") ? "failed" : step === "resource_delivered" || row.resource_delivery_status === "delivered" ? "delivered" : ["waiting_for_get_details", "waiting_for_follow_confirmation", "still_not_following"].includes(step) ? "waiting" : "other";
    for (const bucket of [activity, target].filter(Boolean)) {
      bucket.interactions++;
      bucket[state]++;
      bucket.lastActivity = latest(bucket.lastActivity, row.updated_at || row.created_at);
    }
  }
  for (const event of events) {
    const target = automationById.get(event.automation_id)?.activity;
    const failed = event.status === "failed" || String(event.event_type).endsWith("_failed");
    for (const bucket of [activity, target].filter(Boolean)) {
      if (event.event_type === "resource_sent") bucket.sentEvents++;
      if (failed) {
        bucket.failedEvents++;
        bucket.recentFailures.push({ type: event.event_type, at: event.created_at, message: String(event.error_message || "Delivery failed; inspect provider logs for details.").slice(0, 500) });
      }
      bucket.lastActivity = latest(bucket.lastActivity, event.created_at);
    }
  }
  for (const automation of automationById.values()) {
    automation.activity.recentFailures.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
    automation.activity.recentFailures = automation.activity.recentFailures.slice(0, 5);
    automation.health = activityHealth(automation.activity);
  }
  activity.recentFailures = []; // Details are grouped by automation below.
  const users = [...new Set([...usersById.values(), ...usersByEmail.values()])].map(user => ({
    ...user,
    isPro: user.subscription?.isPro || false,
    isNew: Number.isFinite(Date.parse(user.createdAt)) && Date.parse(user.createdAt) >= now - 7 * DAY,
    needsAttention: user.accounts.some(a => tokenNeedsAttention(a.token)) || user.automations.some(a => a.health === "needs_attention"),
  })).sort((a, b) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0) || a.email.localeCompare(b.email));
  return {
    generatedAt: new Date(now).toISOString(), activitySince: new Date(now - 2 * DAY).toISOString(),
    summary: { users: authUsers.length, legacyUsers: users.filter(u => !u.registered).length, newUsers: users.filter(u => u.isNew).length, proUsers: users.filter(u => u.isPro).length, paidProUsers: users.filter(u => u.subscription?.paidPro).length, activeAutomations: automations.filter(a => a.is_active).length, totalAutomations: automations.length, tokenWarnings: users.flatMap(u => u.accounts).filter(a => tokenNeedsAttention(a.token)).length, failedInteractions: activity.failed, failedEvents: activity.failedEvents, activity },
    users,
  };
}

async function readAll(db, table, columns, sinceColumn = null, since = null) {
  const result = [];
  for (let offset = 0; offset < 100000; offset += PAGE_SIZE) {
    let query = db.from(table).select(columns).order("id", { ascending: true });
    if (sinceColumn) query = query.gte(sinceColumn, since);
    query = query.range(offset, offset + PAGE_SIZE - 1);
    const { data, error } = await query;
    if (error) throw new Error(`Unable to read ${table}: ${error.message}`);
    result.push(...(data || []));
    if ((data || []).length < PAGE_SIZE) return result;
  }
  throw new Error(`Too many ${table} records to safely summarize.`);
}

async function loadAdminOverview(db, now = Date.now()) {
  if (!db.auth?.admin?.listUsers) throw new Error("The admin dashboard requires Supabase backend storage.");
  const authUsers = [];
  for (let page = 1; ; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: PAGE_SIZE });
    if (error) throw new Error("Unable to load registered users.");
    authUsers.push(...data.users);
    if (data.users.length < PAGE_SIZE) break;
    if (page >= 200) throw new Error("Too many registered users to safely summarize.");
  }
  const since = new Date(now - 2 * DAY).toISOString();
  const [profiles, accounts, subscriptions, automations, interactions, events] = await Promise.all([
    readAll(db, "ProfileUsers", "id,Email,FirstName,LastName"),
    readAll(db, "instagram_accounts", "id,user_id,user_email,username,instagram_username,auth_provider,token_status,token_expires_at,expires_at,connected_at,last_sync"),
    readAll(db, "subscriptions", "id,user_id,user_email,status,billing_cycle,ends_at,current_end,referral_access_end,cancel_at_period_end,updated_at"),
    readAll(db, "automations", "id,user_id,user_email,name,is_active,created_at,trigger_value,follow_required"),
    readAll(db, "automation_interactions", "id,automation_id,current_step,resource_delivery_status,created_at,updated_at", "updated_at", since),
    readAll(db, "automation_events", "id,automation_id,event_type,status,error_message,created_at", "created_at", since),
  ]);
  return buildAdminOverview({ authUsers, profiles, accounts, subscriptions, automations, interactions, events }, now);
}

module.exports = { tokenHealth, buildAdminOverview, loadAdminOverview };
