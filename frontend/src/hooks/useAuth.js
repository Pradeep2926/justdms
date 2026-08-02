import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

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
      const { data } = await supabase.auth.getUser();

      if (!mounted) return;

      if (data?.user) {
        await syncProfile(data.user);
      }

      if (!mounted) return;

      if (!data?.user) {
        setUser(null);
        setLoading(false);
        if (redirectOnFail) window.location.href = "/login";
        return;
      }

      setUser(data.user);
      setLoading(false);
    }

    loadUser();

    return () => {
      mounted = false;
    };
  }, [redirectOnFail]);

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return { user, loading, logout };
}
