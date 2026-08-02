import { useEffect, useState } from "react";
import api from "../api/api";

export function useInstagram(email) {
  const [dashboard, setDashboard] = useState(null);
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
      const { data } = await api.get(`/instagram/dashboard/${email}`);
      setDashboard(data);
    } catch (err) {
      setDashboard({ connected: false, account: null, media: [], comments: [] });
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
      const { data } = await api.post(`/instagram/sync/${email}`);
      setDashboard(data);
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Failed to sync Instagram");
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    setLoading(true);
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
