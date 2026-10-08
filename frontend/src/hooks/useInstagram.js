import { useEffect, useState } from "react";
import api from "../api/api";

const cacheKey = (email) => `justdms:instagram-dashboard:${email || "guest"}`;
const memoryCache = new Map();
const inflightRequests = new Map();

function readCachedDashboard(email) {
  if (!email || typeof window === "undefined") return null;
  if (memoryCache.has(email)) return memoryCache.get(email);
  try {
    const cached = JSON.parse(window.sessionStorage.getItem(cacheKey(email))) || null;
    if (cached) memoryCache.set(email, cached);
    return cached;
  } catch {
    return null;
  }
}

export function useInstagram(email) {
  const [dashboard, setDashboard] = useState(() => readCachedDashboard(email));
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");

  const fetchDashboard = async () => {
    if (!email) {
      setLoading(false);
      return;
    }

    try {
      setError("");
      let request = inflightRequests.get(email);
      if (!request) {
        request = api
          .get(`/instagram/dashboard/${encodeURIComponent(email)}`)
          .then(({ data }) => data)
          .finally(() => inflightRequests.delete(email));
        inflightRequests.set(email, request);
      }
      const data = await request;
      setDashboard(data);
      memoryCache.set(email, data);
      window.sessionStorage.setItem(cacheKey(email), JSON.stringify(data));
    } catch (err) {
      setDashboard((current) =>
        current || { connected: false, account: null, media: [], comments: [] }
      );
      setError(err.response?.data?.error || err.message || "Failed to load Instagram");
    } finally {
      setLoading(false);
    }
  };

  const sync = async () => {
    if (!email) return;

    try {
      setSyncing(true);
      setError("");
      const { data } = await api.post(`/instagram/sync/${encodeURIComponent(email)}`);
      setDashboard(data);
      memoryCache.set(email, data);
      window.sessionStorage.setItem(cacheKey(email), JSON.stringify(data));
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Failed to sync Instagram");
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    const cached = readCachedDashboard(email);
    setDashboard(cached);
    setLoading(!cached);
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 30000);

    return () => clearInterval(interval);
  }, [email]);

  return {
    ig: dashboard?.account || null,
    media: dashboard?.media || [],
    comments: dashboard?.comments || [],
    connected: Boolean(dashboard?.connected),
    loading,
    syncing,
    error,
    sync,
  };
}
