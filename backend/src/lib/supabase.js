const { createClient } = require("@supabase/supabase-js");

const forceLocalStorage =
  process.env.BACKEND_STORAGE === "local" &&
  process.env.NODE_ENV !== "production";

const hasSupabaseConfig =
  !forceLocalStorage &&
  Boolean(process.env.SUPABASE_URL) &&
  Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

const supabase = hasSupabaseConfig
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : require("./localStore");

if (!hasSupabaseConfig) {
  console.warn(
    "Using local JSON storage at backend/data/local-db.json."
  );
} else {
  console.log("Using Supabase storage.");
}

module.exports = supabase;
