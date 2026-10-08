import { useCallback, useEffect, useState } from "react";
import api from "../api/api";

const subscriptionCache = new Map();
const subscriptionRequests = new Map();

export function useSubscription(user) {
  const email = user?.email;
  const [subscription, setSubscription] = useState(
    () => subscriptionCache.get(email) || null
  );
  const [loading, setLoading] = useState(() => !subscriptionCache.has(email));

  const refresh = useCallback(async () => {
    if (!email) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    try {
      let request = subscriptionRequests.get(email);
      if (!request) {
        request = api
          .get("/billing/subscription")
          .then(({ data }) => data.subscription)
          .finally(() => subscriptionRequests.delete(email));
        subscriptionRequests.set(email, request);
      }
      const nextSubscription = await request;
      subscriptionCache.set(email, nextSubscription);
      setSubscription(nextSubscription);
    } catch {
      setSubscription(null);
    } finally {
      setLoading(false);
    }
  }, [email]);

  useEffect(() => {
    const cached = subscriptionCache.get(email);
    if (cached) setSubscription(cached);
    setLoading(!cached);
    refresh();
  }, [refresh]);

  return {
    subscription,
    loading,
    isPro: subscription?.status === "active",
    refresh,
  };
}
