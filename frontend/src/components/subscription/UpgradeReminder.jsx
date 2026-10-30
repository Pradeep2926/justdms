import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useSubscription } from "../../hooks/useSubscription";
import { useUpgrade } from "./UpgradeContext";

// Reset on a full page refresh, but do not repeat during navigation in this page load.
const shownThisPageLoad = new Set();
export default function UpgradeReminder({ user }) {
  const { isPro, loading, verified } = useSubscription(user);
  const upgrade = useUpgrade();
  const { pathname } = useLocation();
  useEffect(() => {
    if (pathname !== "/dashboard" || !user?.id || loading || !verified || isPro || !upgrade || shownThisPageLoad.has(user.id)) return;
    const timer = setTimeout(() => {
      if (shownThisPageLoad.has(user.id)) return;
      shownThisPageLoad.add(user.id);
      upgrade.openUpgrade("reminder");
    }, 800);
    return () => clearTimeout(timer);
  }, [user?.id, isPro, loading, verified, pathname, upgrade]);
  return null;
}
