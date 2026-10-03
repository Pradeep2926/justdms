import { useCallback, useEffect, useState } from "react";
import api from "../api/api";

export function useSubscription(user) {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user?.email) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    try {
      const { data } = await api.get("/billing/subscription");
      setSubscription(data.subscription);
    } catch {
      setSubscription(null);
    } finally {
      setLoading(false);
    }
  }, [user?.email]);

  useEffect(() => {
    setLoading(true);
    refresh();
  }, [refresh]);

  return {
    subscription,
    loading,
    isPro: subscription?.status === "active",
    refresh,
  };
}
