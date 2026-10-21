const express = require("express");
const supabase = require("../lib/supabase");
const { getAuthenticatedUser } = require("../lib/authClient");
const { createRequireAdmin } = require("../lib/adminAccess");
const { loadAdminOverview } = require("../services/admin.service");

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

module.exports = router;
