const { normalizeEmail } = require("./automationAccess");

function isAdminUser(user, configuredEmails = process.env.ADMIN_EMAILS || "") {
  const email = normalizeEmail(user?.email);
  // Only server-verified, confirmed identities can administer customer data.
  if (!user?.id || !email || !user.email_confirmed_at) return false;
  return configuredEmails.split(",").map(normalizeEmail).filter(Boolean).includes(email);
}

function createRequireAdmin({ getUser, emails = () => process.env.ADMIN_EMAILS || "" }) {
  return async (req, res, next) => {
    res.set("Cache-Control", "no-store");
    try {
      const user = await getUser(req);
      if (!user) return res.status(401).json({ error: "Please sign in to continue." });
      if (!isAdminUser(user, emails())) {
        return res.status(403).json({ error: "This page is available to administrators only." });
      }
      req.adminUser = user;
      return next();
    } catch {
      return res.status(401).json({ error: "Unable to verify your session." });
    }
  };
}

module.exports = { isAdminUser, createRequireAdmin };
