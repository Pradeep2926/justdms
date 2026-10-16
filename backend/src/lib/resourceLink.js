const crypto = require("crypto");

function signingSecret() {
  return (
    process.env.RESOURCE_LINK_SECRET ||
    process.env.JWT_SECRET ||
    process.env.INSTAGRAM_APP_SECRET ||
    ""
  );
}

function sign(value) {
  const secret = signingSecret();
  if (!secret) throw new Error("Resource link signing secret is not configured");
  return crypto.createHmac("sha256", secret).update(value).digest("base64url");
}

function createResourceToken({ automationId, buttonIndex = 0 }) {
  const payload = Buffer.from(
    JSON.stringify({ automationId, buttonIndex: Number(buttonIndex) || 0 })
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function verifyResourceToken(token) {
  const [payload, suppliedSignature] = String(token || "").split(".");
  if (!payload || !suppliedSignature) return null;

  const expectedSignature = sign(payload);
  const supplied = Buffer.from(suppliedSignature);
  const expected = Buffer.from(expectedSignature);
  if (supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected)) {
    return null;
  }

  try {
    const value = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!value.automationId || !Number.isInteger(value.buttonIndex) || value.buttonIndex < 0 || value.buttonIndex > 2) {
      return null;
    }
    return value;
  } catch {
    return null;
  }
}

function publicResourceUrl(automationId, buttonIndex = 0) {
  const frontendUrl = (process.env.FRONTEND_URL || "https://justdms.in").replace(/\/$/, "");
  return `${frontendUrl}/go/${createResourceToken({ automationId, buttonIndex })}`;
}

module.exports = { createResourceToken, publicResourceUrl, verifyResourceToken };
