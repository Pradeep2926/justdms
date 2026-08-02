import { createClient } from "@supabase/supabase-js";
import { localSupabase } from "./localSupabase";

const hasSupabaseConfig =
  Boolean(import.meta.env.VITE_SUPABASE_URL) &&
  Boolean(import.meta.env.VITE_SUPABASE_ANON_KEY);
const useLocalAuth = import.meta.env.VITE_USE_LOCAL_AUTH === "true";

export const supabase = hasSupabaseConfig
  && !useLocalAuth
  ? createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY
    )
  : localSupabase;

if (!hasSupabaseConfig || useLocalAuth) {
  console.warn(
    "Using localStorage auth/profile fallback instead of Supabase auth."
  );
}
