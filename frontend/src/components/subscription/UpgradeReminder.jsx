import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useSubscription } from "../../hooks/useSubscription";
import { useUpgrade } from "./UpgradeContext";
const seenInMemory = new Set();
export default function UpgradeReminder({ user }) {
  const { isPro, loading, verified } = useSubscription(user);
  const upgrade = useUpgrade();
  const { pathname, search } = useLocation();
  useEffect(() => {
    if (!user?.id || loading || !verified || isPro || !upgrade) return;
    if (["/admin", "/billing", "/connect-meta"].includes(pathname) || (pathname === "/settings" && new URLSearchParams(search).get("tab") === "billing")) return;
    const key = `justdms:pro-reminder:${user.id}:${user.last_sign_in_at || "session"}`;
    let seen = seenInMemory.has(key);
    try { seen ||= (user.last_sign_in_at ? localStorage : sessionStorage).getItem(key) === "shown"; } catch { /* Use memory if storage is blocked. */ }
    if (seen) return;
    const timer = setTimeout(() => {
      if (seenInMemory.has(key)) return;
      seenInMemory.add(key);
      try { (user.last_sign_in_at ? localStorage : sessionStorage).setItem(key, "shown"); } catch { /* Memory still prevents repeat prompts. */ }
      upgrade.openUpgrade("reminder");
    }, 800);
    return () => clearTimeout(timer);
  }, [user?.id, user?.last_sign_in_at, isPro, loading, verified, pathname, search, upgrade]);
  return null;
}
