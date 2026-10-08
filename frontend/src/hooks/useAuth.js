import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

let sessionPromise;

function getCurrentUser() {
  if (!sessionPromise) {
    sessionPromise = supabase.auth
      .getSession()
      .then(({ data }) => data?.session?.user || null)
      .catch((error) => {
        sessionPromise = null;
        throw error;
      });
  }
  return sessionPromise;
}

async function syncProfile(user) {
  if (!user?.id) return;

  const fullName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    "";
  const [firstName, ...lastNameParts] = fullName.split(" ").filter(Boolean);

  const { data: profile, error } = await supabase
    .from("ProfileUsers")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (profile || error) return;

  await supabase.from("ProfileUsers").insert({
    id: user.id,
    Email: user.email ?? null,
    FirstName: firstName ?? null,
    LastName: lastNameParts.join(" ") || null,
    Mobile: null,
  });
}

export function useAuth({ redirectOnFail = false } = {}) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadUser() {
      const user = await getCurrentUser();

      if (!mounted) return;

      if (!user) {
        setUser(null);
        setLoading(false);
        if (redirectOnFail) window.location.href = "/login";
        return;
      }

      setUser(user);
      setLoading(false);
      syncProfile(user).catch(() => {});
    }

    loadUser();

    return () => {
      mounted = false;
    };
  }, [redirectOnFail]);

  const logout = async () => {
    await supabase.auth.signOut();
    sessionPromise = null;
    window.location.href = "/";
  };

  return { user, loading, logout };
}
