const express = require("express");
const crypto = require("crypto");
const supabase = require("../lib/supabase");
const { getAuthenticatedUser } = require("../lib/authClient");
const { bookingEmailHtml, sendBookingEmail } = require("../services/bookingEmail.service");
const {
  buildUpiUrl, canTransition, createLookupToken, generateSlots, hashLookupToken,
  isValidTimeZone, normalizeBookingUsername, validateBookingUsername,
  validateRazorpayLink, validateUpiId, weekdayForDate,
} = require("../lib/bookingUtils");

const router = express.Router();
const requestBuckets = new Map();
const DURATIONS = new Set([15, 30, 45, 60]);

function allowRequest(key, limit = 30, windowMs = 60000) {
  const now = Date.now();
  const bucket = requestBuckets.get(key);
  if (!bucket || bucket.reset <= now) {
    requestBuckets.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  bucket.count += 1;
  return bucket.count <= limit;
}

async function requestUser(req) {
  const user = await getAuthenticatedUser(req);
  if (user) return user;
  if (process.env.NODE_ENV !== "production" && req.headers["x-user-email"]) {
    return { id: req.headers["x-user-id"] || "00000000-0000-0000-0000-000000000001", email: req.headers["x-user-email"] };
  }
  return null;
}

async function requireUser(req, res, next) {
  const user = await requestUser(req);
  if (!user?.id) return res.status(401).json({ error: "Please sign in to manage appointments." });
  req.bookingUser = user;
  return next();
}

async function ownerProfile(ownerId) {
  const { data, error } = await supabase.from("booking_profiles").select("*").eq("owner_id", ownerId).maybeSingle();
  if (error) throw error;
  return data;
}

async function ownerEmail(ownerId) {
  if (!supabase.auth?.admin?.getUserById) return null;
  const { data, error } = await supabase.auth.admin.getUserById(ownerId);
  if (error) return null;
  return data?.user?.email || null;
}

async function profileBundle(profile) {
  if (!profile) return { profile: null, services: [], availability: [], blocked_dates: [], payment_settings: null };
  const [services, availability, blocked, payments] = await Promise.all([
    supabase.from("booking_services").select("*").eq("profile_id", profile.id).order("created_at", { ascending: true }),
    supabase.from("booking_availability").select("*").eq("profile_id", profile.id).order("weekday", { ascending: true }),
    supabase.from("booking_blocked_dates").select("*").eq("profile_id", profile.id).order("blocked_date", { ascending: true }),
    supabase.from("booking_payment_settings").select("*").eq("profile_id", profile.id).maybeSingle(),
  ]);
  for (const result of [services, availability, blocked, payments]) if (result.error) throw result.error;
  return { profile, services: services.data || [], availability: availability.data || [], blocked_dates: blocked.data || [], payment_settings: payments.data };
}

router.get("/me", requireUser, async (req, res) => {
  try { return res.json(await profileBundle(await ownerProfile(req.bookingUser.id))); }
  catch (error) { return res.status(500).json({ error: error.message }); }
});

router.get("/username-availability/:username", requireUser, async (req, res) => {
  try {
    const checked = validateBookingUsername(req.params.username);
    if (!checked.valid) return res.json({ available: false, error: checked.error });
    const { data, error } = await supabase.from("booking_profiles").select("owner_id").ilike("username", checked.username).maybeSingle();
    if (error) throw error;
    return res.json({ username: checked.username, available: !data || data.owner_id === req.bookingUser.id });
  } catch (error) { return res.status(500).json({ error: error.message }); }
});

router.put("/profile", requireUser, async (req, res) => {
  try {
    const checked = validateBookingUsername(req.body.username);
    if (!checked.valid) return res.status(400).json({ error: checked.error });
    const timezone = isValidTimeZone(req.body.timezone) ? req.body.timezone : "Asia/Kolkata";
    const existing = await ownerProfile(req.bookingUser.id);
    const payload = {
      owner_id: req.bookingUser.id, username: checked.username,
      display_name: String(req.body.display_name || "").trim().slice(0, 80) || null,
      professional_title: String(req.body.professional_title || "").trim().slice(0, 100) || null,
      bio: String(req.body.bio || "").trim().slice(0, 500) || null,
      profile_picture_url: String(req.body.profile_picture_url || "").slice(0, 3000000) || null,
      timezone, buffer_minutes: Math.min(Math.max(Number(req.body.buffer_minutes) || 0, 0), 120),
      hold_minutes: Math.min(Math.max(Number(req.body.hold_minutes) || 15, 5), 60),
      updated_at: new Date().toISOString(),
    };
    const query = existing ? supabase.from("booking_profiles").update(payload).eq("id", existing.id) : supabase.from("booking_profiles").insert(payload);
    const { data, error } = await query.select().single();
    if (error?.code === "23505") return res.status(409).json({ error: "That booking username is already taken." });
    if (error) throw error;
    return res.json({ profile: data });
  } catch (error) { return res.status(500).json({ error: error.message }); }
});

router.patch("/publish", requireUser, async (req, res) => {
  try {
    const profile = await ownerProfile(req.bookingUser.id);
    if (!profile) return res.status(400).json({ error: "Save your booking profile first." });
    if (req.body.is_published) {
      const { data: services } = await supabase.from("booking_services").select("id").eq("profile_id", profile.id).eq("is_active", true);
      if (!services?.length) return res.status(400).json({ error: "Add at least one active service before publishing." });
    }
    const { data, error } = await supabase.from("booking_profiles").update({ is_published: Boolean(req.body.is_published), updated_at: new Date().toISOString() }).eq("id", profile.id).select().single();
    if (error) throw error;
    return res.json({ profile: data });
  } catch (error) { return res.status(500).json({ error: error.message }); }
});

router.post("/services", requireUser, async (req, res) => {
  try {
    const profile = await ownerProfile(req.bookingUser.id);
    if (!profile) return res.status(400).json({ error: "Save your booking profile first." });
    const duration = Number(req.body.duration_minutes);
    if (!DURATIONS.has(duration)) return res.status(400).json({ error: "Choose a valid duration." });
    const name = String(req.body.name || "").trim().slice(0, 100);
    if (!name) return res.status(400).json({ error: "Service name is required." });
    const { data, error } = await supabase.from("booking_services").insert({ profile_id: profile.id, name, description: String(req.body.description || "").trim().slice(0, 500) || null, duration_minutes: duration, price_paise: Math.max(0, Math.round(Number(req.body.price || 0) * 100)), appointment_type: req.body.appointment_type === "offline" ? "offline" : "online", is_active: req.body.is_active !== false }).select().single();
    if (error) throw error;
    return res.status(201).json({ service: data });
  } catch (error) { return res.status(500).json({ error: error.message }); }
});

router.patch("/services/:id", requireUser, async (req, res) => {
  try {
    const profile = await ownerProfile(req.bookingUser.id);
    const updates = { updated_at: new Date().toISOString() };
    if (req.body.name !== undefined) updates.name = String(req.body.name).trim().slice(0, 100);
    if (req.body.description !== undefined) updates.description = String(req.body.description).trim().slice(0, 500) || null;
    if (req.body.duration_minutes !== undefined && DURATIONS.has(Number(req.body.duration_minutes))) updates.duration_minutes = Number(req.body.duration_minutes);
    if (req.body.price !== undefined) updates.price_paise = Math.max(0, Math.round(Number(req.body.price) * 100));
    if (req.body.appointment_type !== undefined) updates.appointment_type = req.body.appointment_type === "offline" ? "offline" : "online";
    if (req.body.is_active !== undefined) updates.is_active = Boolean(req.body.is_active);
    const { data, error } = await supabase.from("booking_services").update(updates).eq("id", req.params.id).eq("profile_id", profile?.id || "").select().single();
    if (error) throw error;
    return res.json({ service: data });
  } catch (error) { return res.status(500).json({ error: error.message }); }
});

router.delete("/services/:id", requireUser, async (req, res) => {
  try {
    const profile = await ownerProfile(req.bookingUser.id);
    const { error } = await supabase.from("booking_services").delete().eq("id", req.params.id).eq("profile_id", profile?.id || "");
    if (error) throw error;
    return res.sendStatus(204);
  } catch (error) { return res.status(500).json({ error: error.message }); }
});

router.put("/availability", requireUser, async (req, res) => {
  try {
    const profile = await ownerProfile(req.bookingUser.id);
    if (!profile) return res.status(400).json({ error: "Save your booking profile first." });
    const windows = Array.isArray(req.body.windows) ? req.body.windows : [];
    if (windows.some((w) => !Number.isInteger(Number(w.weekday)) || !/^\d{2}:\d{2}$/.test(w.start_time) || !/^\d{2}:\d{2}$/.test(w.end_time) || w.start_time >= w.end_time)) return res.status(400).json({ error: "Enter valid availability windows." });
    await supabase.from("booking_availability").delete().eq("profile_id", profile.id);
    const payload = windows.map((w) => ({ profile_id: profile.id, weekday: Number(w.weekday), start_time: w.start_time, end_time: w.end_time, is_enabled: w.is_enabled !== false }));
    const result = payload.length ? await supabase.from("booking_availability").insert(payload).select() : { data: [], error: null };
    if (result.error) throw result.error;
    return res.json({ availability: result.data || [] });
  } catch (error) { return res.status(500).json({ error: error.message }); }
});

router.post("/blocked-dates", requireUser, async (req, res) => {
  try {
    const profile = await ownerProfile(req.bookingUser.id);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(req.body.blocked_date)) return res.status(400).json({ error: "Choose a valid date." });
    const { data, error } = await supabase.from("booking_blocked_dates").insert({ profile_id: profile.id, blocked_date: req.body.blocked_date, reason: String(req.body.reason || "").slice(0, 200) || null }).select().single();
    if (error) throw error;
    return res.status(201).json({ blocked_date: data });
  } catch (error) { return res.status(500).json({ error: error.message }); }
});

router.delete("/blocked-dates/:id", requireUser, async (req, res) => {
  try { const profile = await ownerProfile(req.bookingUser.id); await supabase.from("booking_blocked_dates").delete().eq("id", req.params.id).eq("profile_id", profile?.id || ""); return res.sendStatus(204); }
  catch (error) { return res.status(500).json({ error: error.message }); }
});

router.put("/payment-settings", requireUser, async (req, res) => {
  try {
    const profile = await ownerProfile(req.bookingUser.id);
    if (!profile) return res.status(400).json({ error: "Save your booking profile first." });
    const upiEnabled = Boolean(req.body.upi_enabled);
    const razorpayEnabled = Boolean(req.body.razorpay_enabled);
    const upiId = req.body.upi_id ? validateUpiId(req.body.upi_id) : null;
    const razorpayLink = req.body.razorpay_payment_link ? validateRazorpayLink(req.body.razorpay_payment_link) : null;
    if (upiEnabled && !upiId) return res.status(400).json({ error: "Enter a valid UPI ID." });
    if (razorpayEnabled && !razorpayLink) return res.status(400).json({ error: "Use an approved Razorpay HTTPS payment link." });
    const payload = { profile_id: profile.id, upi_enabled: upiEnabled, upi_id: upiId, upi_display_name: String(req.body.upi_display_name || "").trim().slice(0, 100) || null, upi_qr_path: String(req.body.upi_qr_path || "").slice(0, 3000000) || null, razorpay_enabled: razorpayEnabled, razorpay_payment_link: razorpayLink, updated_at: new Date().toISOString() };
    const { data, error } = await supabase.from("booking_payment_settings").upsert(payload, { onConflict: "profile_id" }).select().single();
    if (error) throw error;
    return res.json({ payment_settings: data });
  } catch (error) { return res.status(500).json({ error: error.message }); }
});

router.get("/bookings", requireUser, async (req, res) => {
  try {
    const profile = await ownerProfile(req.bookingUser.id);
    if (!profile) return res.json([]);
    const { data, error } = await supabase.from("bookings").select("*").eq("profile_id", profile.id).order("starts_at", { ascending: false });
    if (error) throw error;
    const [{ data: services = [] }, { data: submissions = [] }] = await Promise.all([
      supabase.from("booking_services").select("id,name").eq("profile_id", profile.id),
      supabase.from("booking_payment_submissions").select("*").order("submitted_at", { ascending: false }),
    ]);
    const names = new Map(services.map((s) => [s.id, s.name]));
    const ownedIds = new Set((data || []).map((b) => b.id));
    const latest = new Map();
    for (const submission of submissions.filter((item) => ownedIds.has(item.booking_id))) {
      if (!latest.has(submission.booking_id)) {
        let screenshot_url = null;
        if (submission.screenshot_path && !submission.screenshot_path.startsWith("local:") && supabase.storage) {
          const signed = await supabase.storage.from("booking-payment-proofs").createSignedUrl(submission.screenshot_path, 900);
          screenshot_url = signed.data?.signedUrl || null;
        }
        latest.set(submission.booking_id, { ...submission, screenshot_url });
      }
    }
    return res.json((data || []).map((b) => ({ ...b, service_name: names.get(b.service_id) || "Appointment", payment_submission: latest.get(b.id) || null })));
  } catch (error) { return res.status(500).json({ error: error.message }); }
});

router.patch("/bookings/:id/status", requireUser, async (req, res) => {
  try {
    const profile = await ownerProfile(req.bookingUser.id);
    const { data: booking } = await supabase.from("bookings").select("*").eq("id", req.params.id).eq("profile_id", profile?.id || "").maybeSingle();
    if (!booking) return res.status(404).json({ error: "Booking not found." });
    const status = String(req.body.status || "");
    if (!canTransition(booking.status, status)) return res.status(400).json({ error: `Cannot change ${booking.status} to ${status}.` });
    const updates = { status, updated_at: new Date().toISOString() };
    if (status === "confirmed") updates.payment_status = booking.amount_paise > 0 ? "verified" : "not_required";
    if (["cancelled", "rejected"].includes(status)) {
      updates.cancelled_at = new Date().toISOString();
      if (status === "rejected" && booking.amount_paise > 0) updates.payment_status = "not_received";
    }
    const { data, error } = await supabase.from("bookings").update(updates).eq("id", booking.id).select().single();
    if (error) throw error;
    if (["confirmed", "rejected", "cancelled"].includes(status)) sendBookingEmail({ to: booking.customer_email, subject: `Booking ${status.replaceAll("_", " ")}`, html: bookingEmailHtml(`Booking ${status.replaceAll("_", " ")}`, data) }).catch(console.warn);
    return res.json({ booking: data });
  } catch (error) { return res.status(500).json({ error: error.message }); }
});

router.get("/public/:username", async (req, res) => {
  try {
    const username = normalizeBookingUsername(req.params.username);
    const { data: profile, error } = await supabase.from("booking_profiles").select("id,username,display_name,professional_title,bio,profile_picture_url,timezone,buffer_minutes,is_published").ilike("username", username).eq("is_published", true).maybeSingle();
    if (error) throw error;
    if (!profile) return res.status(404).json({ error: "This booking page is not published." });
    const { data: services = [] } = await supabase.from("booking_services").select("id,name,description,duration_minutes,price_paise,appointment_type").eq("profile_id", profile.id).eq("is_active", true).order("created_at", { ascending: true });
    return res.json({ profile, services });
  } catch (error) { return res.status(500).json({ error: error.message }); }
});

router.get("/public/:username/slots", async (req, res) => {
  try {
    if (!allowRequest(`slots:${req.ip}`, 60)) return res.status(429).json({ error: "Please try again shortly." });
    const { data: profile } = await supabase.from("booking_profiles").select("*").ilike("username", normalizeBookingUsername(req.params.username)).eq("is_published", true).maybeSingle();
    const { data: service } = await supabase.from("booking_services").select("*").eq("id", req.query.service_id).eq("profile_id", profile?.id || "").eq("is_active", true).maybeSingle();
    if (!profile || !service) return res.status(404).json({ error: "Service not available." });
    const weekday = weekdayForDate(req.query.date, profile.timezone);
    if (weekday === null) return res.status(400).json({ error: "Choose a valid date." });
    const [{ data: windows = [] }, { data: blocks = [] }, { data: bookings = [] }] = await Promise.all([
      supabase.from("booking_availability").select("*").eq("profile_id", profile.id).eq("weekday", weekday).eq("is_enabled", true),
      supabase.from("booking_blocked_dates").select("id").eq("profile_id", profile.id).eq("blocked_date", req.query.date),
      supabase.from("bookings").select("starts_at,ends_at,status").eq("profile_id", profile.id),
    ]);
    return res.json({ slots: generateSlots({ date: req.query.date, timeZone: profile.timezone, windows, durationMinutes: service.duration_minutes, bufferMinutes: profile.buffer_minutes, bookings, blocked: blocks.length > 0 }) });
  } catch (error) { return res.status(400).json({ error: error.message || "Unable to load slots." }); }
});

router.post("/public/:username/book", async (req, res) => {
  try {
    if (!allowRequest(`book:${req.ip}`, 8, 600000)) return res.status(429).json({ error: "Too many booking attempts. Please try later." });
    if (req.body.website) return res.status(400).json({ error: "Unable to create booking." });
    const { data: profile } = await supabase.from("booking_profiles").select("*").ilike("username", normalizeBookingUsername(req.params.username)).eq("is_published", true).maybeSingle();
    const { data: service } = await supabase.from("booking_services").select("*").eq("id", req.body.service_id).eq("profile_id", profile?.id || "").eq("is_active", true).maybeSingle();
    const customerName = String(req.body.customer_name || "").trim();
    const customerEmail = String(req.body.customer_email || "").trim().toLowerCase();
    if (!profile || !service) return res.status(404).json({ error: "Service not available." });
    if (!customerName || !/^\S+@\S+\.\S+$/.test(customerEmail)) return res.status(400).json({ error: "Enter your name and a valid email." });
    const startsAt = new Date(req.body.starts_at);
    const endsAt = new Date(startsAt.getTime() + service.duration_minutes * 60000);
    if (!Number.isFinite(startsAt.getTime()) || startsAt <= new Date()) return res.status(400).json({ error: "Choose a future appointment time." });
    const localDate = new Intl.DateTimeFormat("en-CA", { timeZone: profile.timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(startsAt);
    const weekday = weekdayForDate(localDate, profile.timezone);
    const [{ data: windows = [] }, { data: blocks = [] }, { data: existingBookings = [] }, { data: paymentSettings }] = await Promise.all([
      supabase.from("booking_availability").select("*").eq("profile_id", profile.id).eq("weekday", weekday).eq("is_enabled", true),
      supabase.from("booking_blocked_dates").select("id").eq("profile_id", profile.id).eq("blocked_date", localDate),
      supabase.from("bookings").select("starts_at,ends_at,status").eq("profile_id", profile.id),
      supabase.from("booking_payment_settings").select("upi_enabled,upi_id,upi_display_name,upi_qr_path,razorpay_enabled,razorpay_payment_link").eq("profile_id", profile.id).maybeSingle(),
    ]);
    const validSlots = generateSlots({ date: localDate, timeZone: profile.timezone, windows, durationMinutes: service.duration_minutes, bufferMinutes: profile.buffer_minutes, bookings: existingBookings, blocked: blocks.length > 0 });
    if (!validSlots.some((item) => item.starts_at === startsAt.toISOString())) return res.status(409).json({ error: "This time slot is no longer available." });
    const lookupToken = createLookupToken();
    const paid = service.price_paise > 0;
    if (paid && !paymentSettings?.upi_enabled && !paymentSettings?.razorpay_enabled) return res.status(400).json({ error: "This creator has not enabled a payment method yet." });
    const holdExpiresAt = paid ? new Date(Date.now() + profile.hold_minutes * 60000).toISOString() : null;
    const record = { profile_id: profile.id, service_id: service.id, customer_name: customerName.slice(0, 120), customer_email: customerEmail, customer_phone: String(req.body.customer_phone || "").trim().slice(0, 30) || null, starts_at: startsAt.toISOString(), ends_at: endsAt.toISOString(), amount_paise: service.price_paise, status: paid ? "pending_payment" : "pending_confirmation", payment_status: paid ? "awaiting" : "not_required", hold_expires_at: holdExpiresAt, lookup_token_hash: hashLookupToken(lookupToken) };
    let result;
    if (typeof supabase.rpc === "function") result = await supabase.rpc("create_booking_hold", { p_profile_id: record.profile_id, p_service_id: record.service_id, p_customer_name: record.customer_name, p_customer_email: record.customer_email, p_customer_phone: record.customer_phone, p_starts_at: record.starts_at, p_ends_at: record.ends_at, p_amount_paise: record.amount_paise, p_status: record.status, p_payment_status: record.payment_status, p_hold_expires_at: record.hold_expires_at, p_lookup_token_hash: record.lookup_token_hash });
    else {
      const { data: existing = [] } = await supabase.from("bookings").select("*").eq("profile_id", profile.id);
      if (existing.some((b) => ["pending_payment","payment_review","pending_confirmation","confirmed"].includes(b.status) && new Date(b.starts_at) < endsAt && new Date(b.ends_at) > startsAt)) return res.status(409).json({ error: "This time slot is no longer available." });
      result = await supabase.from("bookings").insert(record).select().single();
    }
    if (result.error) return res.status(result.error.code === "23P01" ? 409 : 500).json({ error: result.error.message });
    const booking = Array.isArray(result.data) ? result.data[0] : result.data;
    sendBookingEmail({ to: await ownerEmail(profile.owner_id), subject: "New booking request", html: bookingEmailHtml("New booking request", { ...booking, service_name: service.name }) }).catch(() => {});
    sendBookingEmail({ to: customerEmail, subject: "Appointment request received", html: bookingEmailHtml("Appointment request received", { ...booking, service_name: service.name }) }).catch(() => {});
    return res.status(201).json({ booking: { id: booking.id, status: booking.status, starts_at: booking.starts_at, amount_paise: booking.amount_paise }, lookup_token: lookupToken, payment_settings: paid ? { ...paymentSettings, upi_url: paymentSettings?.upi_enabled ? buildUpiUrl({ upiId: paymentSettings.upi_id, payeeName: paymentSettings.upi_display_name, amount: service.price_paise / 100, note: service.name }) : null } : null });
  } catch (error) { return res.status(500).json({ error: error.message || "Unable to create booking." }); }
});

router.post("/public/booking/:token/payment", async (req, res) => {
  try {
    if (!allowRequest(`payment:${req.ip}`, 10, 600000)) return res.status(429).json({ error: "Please try again later." });
    const tokenHash = hashLookupToken(req.params.token);
    const { data: booking } = await supabase.from("bookings").select("*").eq("lookup_token_hash", tokenHash).maybeSingle();
    if (!booking) return res.status(404).json({ error: "Booking not found." });
    const late = booking.status === "expired" || (booking.hold_expires_at && new Date(booking.hold_expires_at) < new Date());
    const method = req.body.payment_method === "razorpay" ? "razorpay" : "upi";
    const { data: paymentSettings } = await supabase.from("booking_payment_settings").select("upi_enabled,razorpay_enabled").eq("profile_id", booking.profile_id).maybeSingle();
    if ((method === "upi" && !paymentSettings?.upi_enabled) || (method === "razorpay" && !paymentSettings?.razorpay_enabled)) {
      return res.status(400).json({ error: "That payment method is not enabled for this creator." });
    }
    let screenshotPath = null;
    const screenshot = String(req.body.screenshot || "");
    if (screenshot) {
      const match = /^data:(image\/(?:png|jpeg|webp));base64,(.+)$/.exec(screenshot);
      if (!match || Buffer.byteLength(match[2], "base64") > 3 * 1024 * 1024) return res.status(400).json({ error: "Upload a PNG, JPG, or WebP image under 3 MB." });
      screenshotPath = `${booking.profile_id}/${booking.id}/${crypto.randomUUID()}.${match[1].split("/")[1].replace("jpeg", "jpg")}`;
      if (supabase.storage) {
        const upload = await supabase.storage.from("booking-payment-proofs").upload(screenshotPath, Buffer.from(match[2], "base64"), { contentType: match[1], upsert: false });
        if (upload.error) throw upload.error;
      } else screenshotPath = `local:${screenshotPath}`;
    }
    const { data, error } = await supabase.from("booking_payment_submissions").insert({ booking_id: booking.id, payment_method: method, payment_reference: String(req.body.payment_reference || "").trim().slice(0, 120) || null, screenshot_path: screenshotPath, review_status: late ? "late" : "pending" }).select().single();
    if (error) throw error;
    if (!late) await supabase.from("bookings").update({ status: "payment_review", payment_status: "submitted", updated_at: new Date().toISOString() }).eq("id", booking.id);
    else await supabase.from("bookings").update({ payment_status: "late_payment", updated_at: new Date().toISOString() }).eq("id", booking.id);
    return res.json({ submission: { id: data.id, review_status: data.review_status }, status: late ? "late_payment" : "payment_review", message: late ? "Your payment was submitted after the slot expired and requires manual resolution." : "Payment details submitted for creator review. This is not automatic verification." });
  } catch (error) { return res.status(500).json({ error: error.message }); }
});

router.get("/public/booking/:token", async (req, res) => {
  try {
    const { data: booking } = await supabase.from("bookings").select("id,status,payment_status,starts_at,ends_at,amount_paise").eq("lookup_token_hash", hashLookupToken(req.params.token)).maybeSingle();
    if (!booking) return res.status(404).json({ error: "Booking not found." });
    return res.json({ booking });
  } catch (error) { return res.status(500).json({ error: error.message }); }
});

async function expireBookingHolds() {
  const now = new Date().toISOString();
  const { data = [] } = await supabase.from("bookings").select("id,status,hold_expires_at");
  const expired = data.filter((b) => b.status === "pending_payment" && b.hold_expires_at && b.hold_expires_at < now);
  for (const booking of expired) await supabase.from("bookings").update({ status: "expired", updated_at: now }).eq("id", booking.id);
  return expired.length;
}

module.exports = router;
module.exports.expireBookingHolds = expireBookingHolds;
