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

module.exports = { normalizeEmail, ownsAutomationEmail };
