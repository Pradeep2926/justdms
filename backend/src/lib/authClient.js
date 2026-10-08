const { createClient } = require("@supabase/supabase-js");

const authClient = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function getAuthenticatedUser(req) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!token) return null;

  const { data, error } = await authClient.auth.getUser(token);
  return error ? null : data?.user || null;
}

module.exports = { authClient, getAuthenticatedUser };
