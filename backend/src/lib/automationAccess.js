function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function ownsAutomationEmail(user, requestedEmail) {
  const authenticatedEmail = normalizeEmail(user?.email);
  return Boolean(
    authenticatedEmail &&
      authenticatedEmail === normalizeEmail(requestedEmail)
  );
}

const FREE_ACTIVE_AUTOMATION_LIMIT = 2;

function isActiveProSubscription(subscription, now = Date.now()) {
  if (subscription?.status !== "active") return false;
  const expiresAt = subscription.ends_at || subscription.current_end;
  if (!expiresAt) return true;
  const expiresAtMs = new Date(expiresAt).getTime();
  return Number.isFinite(expiresAtMs) && expiresAtMs > now;
}

function automationEntitlements(subscription, now = Date.now()) {
  const isPro = isActiveProSubscription(subscription, now);
  return {
    plan: isPro ? "pro" : "free",
    isPro,
    activeAutomationLimit: isPro ? null : FREE_ACTIVE_AUTOMATION_LIMIT,
  };
}

function canActivateAutomation({ entitlements, activeCount, alreadyActive = false }) {
  if (entitlements?.isPro || alreadyActive) return true;
  return activeCount < FREE_ACTIVE_AUTOMATION_LIMIT;
}

module.exports = {
  FREE_ACTIVE_AUTOMATION_LIMIT,
  normalizeEmail,
  ownsAutomationEmail,
  isActiveProSubscription,
  automationEntitlements,
  canActivateAutomation,
};
