const express = require("express");
const supabase = require("../lib/supabase");
const { getAuthenticatedUser } = require("../lib/authClient");
const {
  compactPositions,
  isLikelyBot,
  isCompleteOrder,
  normalizeUsername,
  validateOutboundUrl,
  validateUsername,
  visitorHash,
} = require("../lib/bioUtils");

const router = express.Router();
const requestBuckets = new Map();
const THEMES = new Set(["justdms", "midnight", "sunrise", "minimal", "forest"]);

function rateLimit(key, limit, windowMs) {
  const now = Date.now();
  const current = requestBuckets.get(key);
  if (!current || current.resetAt <= now) {
    requestBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  current.count += 1;
  if (requestBuckets.size > 5000) {
    for (const [bucketKey, bucket] of requestBuckets) {
      if (bucket.resetAt <= now) requestBuckets.delete(bucketKey);
    }
  }
  return current.count <= limit;
}

async function getRequestUser(req) {
  const user = await getAuthenticatedUser(req);
  if (user) return user;
  if (process.env.NODE_ENV !== "production" && req.headers["x-user-email"]) {
    return { id: req.headers["x-user-id"] || "00000000-0000-0000-0000-000000000001", email: req.headers["x-user-email"] };
  }
  return null;
}

async function requireUser(req, res, next) {
  try {
    const user = await getRequestUser(req);
    if (!user?.id) return res.status(401).json({ error: "Please sign in to manage your bio page." });
    req.bioUser = user;
    return next();
  } catch {
    return res.status(401).json({ error: "Unable to verify your session." });
  }
}

async function ownerProfile(ownerId) {
  const { data, error } = await supabase.from("bio_profiles").select("*").eq("owner_id", ownerId).maybeSingle();
  if (error) throw error;
  return data;
}

async function profileLinks(profileId, activeOnly = false) {
  let query = supabase.from("bio_links").select("*").eq("profile_id", profileId).order("position", { ascending: true });
  if (activeOnly) query = query.eq("is_active", true);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

router.get("/me", requireUser, async (req, res) => {
  try {
    const profile = await ownerProfile(req.bioUser.id);
    return res.json({ profile, links: profile ? await profileLinks(profile.id) : [] });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.get("/username-availability/:username", requireUser, async (req, res) => {
  try {
    const checked = validateUsername(req.params.username);
    if (!checked.valid) return res.json({ available: false, error: checked.error });
    const { data, error } = await supabase
      .from("bio_profiles")
      .select("owner_id")
      .ilike("username", checked.username)
      .maybeSingle();
    if (error) throw error;
    return res.json({
      available: !data || String(data.owner_id) === String(req.bioUser.id),
      username: checked.username,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.put("/profile", requireUser, async (req, res) => {
  try {
    const checked = validateUsername(req.body.username);
    if (!checked.valid) return res.status(400).json({ error: checked.error });
    const theme = THEMES.has(req.body.theme) ? req.body.theme : "justdms";
    const existing = await ownerProfile(req.bioUser.id);
    const payload = {
      owner_id: req.bioUser.id,
      username: checked.username,
      display_name: String(req.body.display_name || "").trim().slice(0, 80) || null,
      description: String(req.body.description || "").trim().slice(0, 300) || null,
      profile_picture_url: String(req.body.profile_picture_url || "").slice(0, 3000000) || null,
      theme,
      updated_at: new Date().toISOString(),
    };
    const query = existing
      ? supabase.from("bio_profiles").update(payload).eq("id", existing.id)
      : supabase.from("bio_profiles").insert(payload);
    const { data, error } = await query.select().single();
    if (error?.code === "23505") return res.status(409).json({ error: "That username is already taken." });
    if (error) throw error;
    return res.json({ profile: data });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.patch("/publish", requireUser, async (req, res) => {
  try {
    const profile = await ownerProfile(req.bioUser.id);
    if (!profile) return res.status(400).json({ error: "Save your profile before publishing." });
    const publishing = Boolean(req.body.is_published);
    const links = await profileLinks(profile.id, true);
    if (publishing && links.length === 0) return res.status(400).json({ error: "Add at least one active link before publishing." });
    const { data, error } = await supabase.from("bio_profiles").update({
      is_published: publishing,
      published_at: publishing ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    }).eq("id", profile.id).select().single();
    if (error) throw error;
    return res.json({ profile: data });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.post("/links", requireUser, async (req, res) => {
  try {
    const profile = await ownerProfile(req.bioUser.id);
    if (!profile) return res.status(400).json({ error: "Save your profile first." });
    const url = validateOutboundUrl(req.body.url);
    const title = String(req.body.title || "").trim().slice(0, 100);
    if (!title) return res.status(400).json({ error: "Link title is required." });
    if (!url) return res.status(400).json({ error: "Enter a safe http or https URL." });
    const links = await profileLinks(profile.id);
    const { data, error } = await supabase.from("bio_links").insert({
      profile_id: profile.id, title, url, position: links.length, is_active: req.body.is_active !== false,
    }).select().single();
    if (error) throw error;
    return res.status(201).json({ link: data });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.patch("/links/:id", requireUser, async (req, res) => {
  try {
    const profile = await ownerProfile(req.bioUser.id);
    if (!profile) return res.status(404).json({ error: "Profile not found." });
    const { data: link } = await supabase.from("bio_links").select("*").eq("id", req.params.id).eq("profile_id", profile.id).maybeSingle();
    if (!link) return res.status(404).json({ error: "Link not found." });
    const updates = { updated_at: new Date().toISOString() };
    if (req.body.title !== undefined) {
      updates.title = String(req.body.title).trim().slice(0, 100);
      if (!updates.title) return res.status(400).json({ error: "Link title is required." });
    }
    if (req.body.url !== undefined) {
      updates.url = validateOutboundUrl(req.body.url);
      if (!updates.url) return res.status(400).json({ error: "Enter a safe http or https URL." });
    }
    if (req.body.is_active !== undefined) updates.is_active = Boolean(req.body.is_active);
    const { data, error } = await supabase.from("bio_links").update(updates).eq("id", link.id).select().single();
    if (error) throw error;
    return res.json({ link: data });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.delete("/links/:id", requireUser, async (req, res) => {
  try {
    const profile = await ownerProfile(req.bioUser.id);
    if (!profile) return res.status(404).json({ error: "Profile not found." });
    const { data: link } = await supabase.from("bio_links").select("id").eq("id", req.params.id).eq("profile_id", profile.id).maybeSingle();
    if (!link) return res.status(404).json({ error: "Link not found." });
    await supabase.from("bio_links").delete().eq("id", link.id);
    const remaining = compactPositions(await profileLinks(profile.id));
    for (const item of remaining) await supabase.from("bio_links").update({ position: item.position }).eq("id", item.id);
    return res.sendStatus(204);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.put("/links/reorder", requireUser, async (req, res) => {
  try {
    const profile = await ownerProfile(req.bioUser.id);
    if (!profile) return res.status(404).json({ error: "Profile not found." });
    const links = await profileLinks(profile.id);
    const ids = Array.isArray(req.body.ids) ? req.body.ids : [];
    if (!isCompleteOrder(ids, links)) {
      return res.status(400).json({ error: "Link order must include every profile link exactly once." });
    }
    // Temporary high positions avoid collisions while preserving the non-negative constraint.
    for (let index = 0; index < ids.length; index += 1) await supabase.from("bio_links").update({ position: 1000000 + index }).eq("id", ids[index]);
    for (let index = 0; index < ids.length; index += 1) await supabase.from("bio_links").update({ position: index }).eq("id", ids[index]);
    return res.json({ links: await profileLinks(profile.id) });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.get("/analytics", requireUser, async (req, res) => {
  try {
    const profile = await ownerProfile(req.bioUser.id);
    if (!profile) return res.json({ total_views: 0, total_clicks: 0, top_links: [], daily: [] });
    const days = Math.min(Math.max(Number(req.query.days) || 30, 7), 90);
    const since = new Date(Date.now() - (days - 1) * 86400000); since.setUTCHours(0, 0, 0, 0);
    const [{ data: visits = [] }, { data: clicks = [] }, links] = await Promise.all([
      supabase.from("bio_visits").select("visited_at").eq("profile_id", profile.id).gte("visited_at", since.toISOString()),
      supabase.from("bio_clicks").select("link_id,clicked_at").eq("profile_id", profile.id).gte("clicked_at", since.toISOString()),
      profileLinks(profile.id),
    ]);
    const dailyMap = new Map();
    for (let offset = 0; offset < days; offset += 1) {
      const date = new Date(since.getTime() + offset * 86400000).toISOString().slice(0, 10);
      dailyMap.set(date, { date, views: 0, clicks: 0 });
    }
    visits.forEach((item) => { const day = dailyMap.get(item.visited_at.slice(0, 10)); if (day) day.views += 1; });
    const counts = new Map();
    clicks.forEach((item) => { const day = dailyMap.get(item.clicked_at.slice(0, 10)); if (day) day.clicks += 1; counts.set(item.link_id, (counts.get(item.link_id) || 0) + 1); });
    const topLinks = links.map((link) => ({ id: link.id, title: link.title, clicks: counts.get(link.id) || 0 })).sort((a, b) => b.clicks - a.clicks).slice(0, 5);
    return res.json({ total_views: visits.length, total_clicks: clicks.length, top_links: topLinks, daily: [...dailyMap.values()] });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.get("/public/:username", async (req, res) => {
  try {
    const username = normalizeUsername(req.params.username);
    const { data: profile, error } = await supabase.from("bio_profiles").select("id,username,display_name,description,profile_picture_url,theme,is_published").ilike("username", username).eq("is_published", true).maybeSingle();
    if (error) throw error;
    if (!profile) return res.status(404).json({ error: "This bio page is not published." });
    const userAgent = req.headers["user-agent"] || "";
    const hash = visitorHash(req);
    if (!isLikelyBot(userAgent) && rateLimit(`view:${hash}:${profile.id}`, 20, 60000)) {
      supabase.from("bio_visits").insert({ profile_id: profile.id, visitor_hash: hash, user_agent: userAgent.slice(0, 500), referrer: String(req.headers.referer || "").slice(0, 1000), visited_at: new Date().toISOString() }).then(() => {});
    }
    return res.json({ profile, links: await profileLinks(profile.id, true) });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.get("/r/:linkId", async (req, res) => {
  try {
    const { data: link, error } = await supabase.from("bio_links").select("id,profile_id,url,is_active").eq("id", req.params.linkId).maybeSingle();
    if (error) throw error;
    if (!link?.is_active) return res.status(404).send("Link not available");
    const { data: profile } = await supabase.from("bio_profiles").select("is_published").eq("id", link.profile_id).maybeSingle();
    const destination = validateOutboundUrl(link.url);
    if (!profile?.is_published || !destination) return res.status(404).send("Link not available");
    const userAgent = req.headers["user-agent"] || "";
    const hash = visitorHash(req);
    if (!isLikelyBot(userAgent) && rateLimit(`click:${hash}:${link.id}`, 10, 60000)) {
      await supabase.from("bio_clicks").insert({ profile_id: link.profile_id, link_id: link.id, visitor_hash: hash, user_agent: userAgent.slice(0, 500), referrer: String(req.headers.referer || "").slice(0, 1000), clicked_at: new Date().toISOString() });
    }
    res.set("Cache-Control", "no-store");
    return res.redirect(302, destination);
  } catch {
    return res.status(404).send("Link not available");
  }
});

module.exports = router;
