const crypto = require("crypto");

const RESERVED_USERNAMES = new Set([
  "api", "admin", "app", "auth", "automation", "billing", "connect-meta",
  "dashboard", "data-deletion", "data-retention", "forgot-password", "help",
  "home", "link-in-bio", "login", "privacy", "privacy-rights", "register",
  "refund-policy", "reset-password", "settings", "support", "terms", "verify",
  "webhook", "www",
]);

function normalizeUsername(value) {
  return String(value || "").trim().toLowerCase().replace(/^@/, "");
}

function validateUsername(value) {
  const username = normalizeUsername(value);
  if (!/^[a-z0-9][a-z0-9._-]{2,29}$/.test(username)) {
    return { valid: false, error: "Use 3-30 lowercase letters, numbers, dots, dashes, or underscores." };
  }
  if (RESERVED_USERNAMES.has(username)) {
    return { valid: false, error: "This username is reserved by JustDMs." };
  }
  return { valid: true, username };
}

function validateOutboundUrl(value) {
  try {
    const url = new URL(String(value || "").trim());
    if (!["http:", "https:"].includes(url.protocol)) return null;
    if (url.username || url.password) return null;
    const hostname = url.hostname.toLowerCase();
    if (
      hostname === "localhost" || hostname === "0.0.0.0" || hostname === "::1" ||
      hostname.endsWith(".local") || /^127\./.test(hostname) || /^10\./.test(hostname) ||
      /^192\.168\./.test(hostname) || /^169\.254\./.test(hostname)
    ) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function isLikelyBot(userAgent = "") {
  return /bot|crawler|spider|preview|facebookexternalhit|whatsapp|slackbot|headless/i.test(userAgent);
}

function visitorHash(req) {
  const forwarded = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  const ip = forwarded || req.ip || "unknown";
  return crypto.createHash("sha256").update(`${process.env.BIO_ANALYTICS_SALT || "justdms-bio"}:${ip}`).digest("hex");
}

function compactPositions(links) {
  return links.map((link, position) => ({ ...link, position }));
}

function ownsProfile(userId, profile) {
  return Boolean(userId && profile && String(profile.owner_id) === String(userId));
}

function isPublicProfile(profile) {
  return Boolean(profile?.is_published);
}

function isCompleteOrder(ids, links) {
  return Array.isArray(ids) && ids.length === links.length && new Set(ids).size === links.length && ids.every((id) => links.some((link) => link.id === id));
}

module.exports = {
  RESERVED_USERNAMES,
  compactPositions,
  isLikelyBot,
  isCompleteOrder,
  isPublicProfile,
  normalizeUsername,
  ownsProfile,
  validateOutboundUrl,
  validateUsername,
  visitorHash,
};
