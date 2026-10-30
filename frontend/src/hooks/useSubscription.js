import { useCallback, useEffect, useState } from "react";
import api from "../api/api";

const subscriptionCache = new Map();
const subscriptionRequests = new Map();

export function useSubscription(user) {
  const email = user?.email;
  const [verified, setVerified] = useState(false);
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
      setVerified(true);
    } catch {
      setVerified(false);
      setSubscription(null);
    } finally {
      setLoading(false);
    }
  }, [email]);

  useEffect(() => {
    setVerified(false);
    const cached = subscriptionCache.get(email);
    if (cached) setSubscription(cached);
    setLoading(!cached);
    refresh();
  }, [refresh]);

  useEffect(() => {
    const reload = () => refresh();
    window.addEventListener("justdms:subscription-updated", reload);
    return () => window.removeEventListener("justdms:subscription-updated", reload);
  }, [refresh]);

  const expiresAt = subscription?.ends_at || subscription?.current_end;
  const paidPro = subscription?.status === "active" &&
    (!expiresAt || new Date(expiresAt).getTime() > Date.now());
  const referralPro = new Date(subscription?.referral_access_end || 0).getTime() > Date.now();
  const isPro = paidPro || referralPro;

  return {
    subscription,
    loading,
    verified,
    isPro,
    plan: isPro ? "pro" : "free",
    activeAutomationLimit: isPro ? null : 2,
    refresh,
  };
}
