const express = require("express");
const supabase = require("../lib/supabase");
const { getAuthenticatedUser } = require("../lib/authClient");
const { createRequireAdmin } = require("../lib/adminAccess");
const { loadAdminOverview } = require("../services/admin.service");

const { grantProMonth } = require("../services/adminGrant.service");

const router = express.Router();
router.use(createRequireAdmin({ getUser: getAuthenticatedUser }));

router.get("/access", (req, res) => res.json({ isAdmin: true }));

// Coalesce concurrent refreshes; never cache data in a publicly cacheable response.
let snapshot = null;
let snapshotAt = 0;
let pending = null;
router.get("/overview", async (req, res) => {
  try {
    if (!snapshot || Date.now() - snapshotAt >= 30000) {
      if (!pending) pending = loadAdminOverview(supabase).then(data => {
        snapshot = data;
        snapshotAt = Date.now();
        return data;
      }).finally(() => { pending = null; });
      await pending;
    }
    return res.json(snapshot);
  } catch (error) {
    console.error("Admin overview failed:", error.message);
    return res.status(503).json({ error: "Unable to load the admin overview. Check backend storage and server logs." });
  }
});

router.post("/users/:userId/pro-grant", async (req, res) => {
  try {
    const result = await grantProMonth(supabase, {
      userId: req.params.userId, requestId: req.body?.requestId, admin: req.adminUser,
    });
    // Invalidate pending overview reads too, so a stale snapshot cannot hide the grant.
    const inFlight = pending;
    snapshot = null;
    snapshotAt = 0;
    if (inFlight) inFlight.finally(() => { snapshot = null; snapshotAt = 0; }).catch(() => {});
    return res.json(result);
  } catch (error) {
    return res.status(error.status || 503).json({ error: error.message });
  }
});

module.exports = router;
