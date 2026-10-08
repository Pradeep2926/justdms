const crypto = require("crypto");

const BOOKING_STATUSES = new Set([
  "pending_payment", "payment_review", "pending_confirmation", "confirmed",
  "completed", "cancelled", "rejected", "expired", "no_show",
]);
const OCCUPYING_STATUSES = new Set([
  "pending_payment", "payment_review", "pending_confirmation", "confirmed",
]);
const STATUS_TRANSITIONS = {
  pending_payment: new Set(["payment_review", "cancelled", "expired"]),
  payment_review: new Set(["confirmed", "rejected", "cancelled"]),
  pending_confirmation: new Set(["confirmed", "rejected", "cancelled"]),
  confirmed: new Set(["completed", "cancelled", "no_show"]),
  completed: new Set(), cancelled: new Set(), rejected: new Set(),
  expired: new Set(), no_show: new Set(),
};
const RESERVED_BOOKING_USERNAMES = new Set([
  "api", "admin", "app", "auth", "automation", "billing", "book", "booking",
  "dashboard", "help", "link-in-bio", "login", "register", "settings", "support",
  "terms", "webhook", "www",
]);

function normalizeBookingUsername(value) {
  return String(value || "").trim().toLowerCase().replace(/^@/, "");
}

function validateBookingUsername(value) {
  const username = normalizeBookingUsername(value);
  if (!/^[a-z0-9][a-z0-9._-]{2,29}$/.test(username)) {
    return { valid: false, error: "Use 3-30 lowercase letters, numbers, dots, dashes, or underscores." };
  }
  if (RESERVED_BOOKING_USERNAMES.has(username)) {
    return { valid: false, error: "This booking username is reserved." };
  }
  return { valid: true, username };
}

function validateUpiId(value) {
  const upiId = String(value || "").trim();
  return /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z][a-zA-Z0-9.-]{1,63}$/.test(upiId)
    ? upiId
    : null;
}

function validateRazorpayLink(value) {
  try {
    const url = new URL(String(value || "").trim());
    const host = url.hostname.toLowerCase();
    if (url.protocol !== "https:" || url.username || url.password) return null;
    if (host !== "rzp.io" && host !== "razorpay.com" && !host.endsWith(".razorpay.com")) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function isValidTimeZone(value) {
  try {
    Intl.DateTimeFormat("en-US", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

function minutesOfDay(value) {
  const match = /^(\d{2}):(\d{2})$/.exec(String(value || ""));
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours < 24 && minutes < 60 ? hours * 60 + minutes : null;
}

function zonedParts(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  }).formatToParts(date).reduce((all, part) => ({ ...all, [part.type]: part.value }), {});
  return parts;
}

function zonedDateTimeToUtc(date, time, timeZone) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  let guess = Date.UTC(year, month - 1, day, hour, minute);
  for (let i = 0; i < 3; i += 1) {
    const parts = zonedParts(new Date(guess), timeZone);
    const represented = Date.UTC(
      Number(parts.year), Number(parts.month) - 1, Number(parts.day),
      Number(parts.hour), Number(parts.minute), Number(parts.second)
    );
    guess += Date.UTC(year, month - 1, day, hour, minute) - represented;
  }
  return new Date(guess);
}

function weekdayForDate(date, timeZone) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || "")) || !isValidTimeZone(timeZone)) return null;
  const noon = zonedDateTimeToUtc(date, "12:00", timeZone);
  const name = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(noon);
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(name);
}

function overlaps(startA, endA, startB, endB) {
  return new Date(startA) < new Date(endB) && new Date(endA) > new Date(startB);
}

function generateSlots({ date, timeZone, windows, durationMinutes, bufferMinutes = 0, bookings = [], blocked = false, now = new Date() }) {
  if (blocked || !isValidTimeZone(timeZone) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return [];
  const duration = Number(durationMinutes);
  const step = duration + Number(bufferMinutes || 0);
  if (![15, 30, 45, 60].includes(duration) || step <= 0) return [];
  const slots = [];
  for (const window of windows || []) {
    const from = minutesOfDay(window.start_time);
    const to = minutesOfDay(window.end_time);
    if (from === null || to === null || from >= to) continue;
    for (let cursor = from; cursor + duration <= to; cursor += step) {
      const hh = String(Math.floor(cursor / 60)).padStart(2, "0");
      const mm = String(cursor % 60).padStart(2, "0");
      const start = zonedDateTimeToUtc(date, `${hh}:${mm}`, timeZone);
      const end = new Date(start.getTime() + duration * 60000);
      if (start <= now) continue;
      if (bookings.some((booking) => OCCUPYING_STATUSES.has(booking.status) && overlaps(start, end, booking.starts_at, booking.ends_at))) continue;
      slots.push({ starts_at: start.toISOString(), ends_at: end.toISOString(), label: `${hh}:${mm}` });
    }
  }
  return slots;
}

function canTransition(from, to) {
  return BOOKING_STATUSES.has(to) && Boolean(STATUS_TRANSITIONS[from]?.has(to));
}

function createLookupToken() {
  return crypto.randomBytes(24).toString("base64url");
}

function hashLookupToken(token) {
  return crypto.createHash("sha256").update(String(token || "")).digest("hex");
}

function buildUpiUrl({ upiId, payeeName, amount, note }) {
  const id = validateUpiId(upiId);
  if (!id) return null;
  const params = new URLSearchParams({ pa: id, pn: payeeName || "Creator", cu: "INR" });
  if (Number(amount) > 0) params.set("am", Number(amount).toFixed(2));
  if (note) params.set("tn", String(note).slice(0, 80));
  return `upi://pay?${params.toString()}`;
}

module.exports = {
  BOOKING_STATUSES, OCCUPYING_STATUSES, buildUpiUrl, canTransition,
  createLookupToken, generateSlots, hashLookupToken, isValidTimeZone,
  normalizeBookingUsername, overlaps, validateBookingUsername,
  validateRazorpayLink, validateUpiId, weekdayForDate, zonedDateTimeToUtc,
};
