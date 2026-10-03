import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../hooks/useAuth";
import AppLayout from "../components/layout/AppLayout";
import AutomationBuilder from "../components/automation/AutomationBuilder";
import AutomationList from "../components/automation/AutomationList";
import api from "../api/api";
import { CalendarDays, Filter, Plus, Search, Workflow, X } from "lucide-react";
import { useInstagram } from "../hooks/useInstagram";

export default function Automation() {
  const { user, loading: authLoading } = useAuth({ redirectOnFail: true });
  const [posts, setPosts] = useState([]);
  const [automations, setAutomations] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [loadingAutomations, setLoadingAutomations] = useState(true);
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingAutomation, setEditingAutomation] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("30");
  const { ig } = useInstagram(user?.email);

  const filteredAutomations = automations.filter((automation) => {
    const query = search.trim().toLowerCase();
    const matchesSearch =
      !query ||
      String(automation.name || "").toLowerCase().includes(query) ||
      String(automation.trigger_value || "").toLowerCase().includes(query);
    const active = automation.is_active !== false;
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" ? active : !active);
    const changedAt = new Date(automation.updated_at || automation.created_at || 0);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - Number(dateFilter));
    const matchesDate = !dateFilter || changedAt >= cutoff;
    return matchesSearch && matchesStatus && matchesDate;
  });

  const fetchPosts = useCallback(async (email) => {
    try {
      const { data } = await api.get(`/instagram/posts/${email}`);
      setPosts(Array.isArray(data) ? data : []);
    } catch {
      setPosts([]);
    } finally {
      setLoadingPosts(false);
    }
  }, []);

  const fetchAutomations = useCallback(async (email) => {
    try {
      const { data } = await api.get(`/automation/${email}`);
      setAutomations(Array.isArray(data) ? data : []);
    } catch {
      setAutomations([]);
    } finally {
      setLoadingAutomations(false);
    }
  }, []);

  useEffect(() => {
    if (user?.email) {
      fetchPosts(user.email);
      fetchAutomations(user.email);
    }
  }, [user, fetchPosts, fetchAutomations]);

  const refreshAutomations = async () => {
    if (user?.email) {
      await fetchAutomations(user.email);
    }
  };

  const closeBuilder = () => {
    setShowBuilder(false);
    setEditingAutomation(null);
  };

  const handleSaved = async () => {
    await refreshAutomations();
    closeBuilder();
  };

  const handleEdit = (automation) => {
    setEditingAutomation(automation);
    setShowBuilder(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (automation) => {
    if (!window.confirm("Delete this automation? This cannot be undone.")) {
      return;
    }

    try {
      await api.delete(`/automation/${automation.id}`);
      await refreshAutomations();
    } catch (err) {
      alert(err.response?.data?.error || err.message || "Failed to delete automation");
    }
  };

  const handleToggleStatus = async (automation) => {
    try {
      await api.patch(`/automation/${automation.id}`, {
        is_active: automation.is_active === false,
      });
      await refreshAutomations();
    } catch (err) {
      alert(err.response?.data?.error || err.message || "Failed to update automation");
    }
  };

  if (authLoading || loadingPosts || loadingAutomations) {
    return (
      <AppLayout title="Automations" subtitle="Loading...">
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Automations"
      subtitle={ig ? `Manage comment-to-DM flows for @${ig.username}` : "Comment → DM workflows powered by Meta APIs"}
    >
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-white text-slate-900 shadow-sm ring-1 ring-slate-200">
              <Workflow className="h-5 w-5" />
            </span>
            <div>
              <p className="font-semibold text-slate-900">{automations.length} workflows</p>
              <p className="text-sm text-slate-500">Search, pause, edit, or create an automation.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              if (showBuilder) {
                closeBuilder();
              } else {
                setEditingAutomation(null);
                setShowBuilder(true);
              }
            }}
            className="btn-primary"
          >
            {showBuilder ? (
              <>
                <X className="h-4 w-4" />
                Close
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Create Automation
              </>
            )}
          </button>
        </div>

        {showBuilder && (
          <div>
            <AutomationBuilder
              key={editingAutomation?.id || "new"}
              user={user}
              posts={posts}
              initialAutomation={editingAutomation}
              onSaved={handleSaved}
              onCancel={closeBuilder}
            />
          </div>
        )}

        {!showBuilder && (
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_160px_180px]">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                className="input h-12 pl-12"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search automations"
              />
            </label>
            <label className="relative block">
              <Filter className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <select
                className="input h-12 appearance-none pl-11"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
              </select>
            </label>
            <label className="relative block">
              <CalendarDays className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <select
                className="input h-12 appearance-none pl-11"
                value={dateFilter}
                onChange={(event) => setDateFilter(event.target.value)}
              >
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
                <option value="365">Last year</option>
                <option value="">All time</option>
              </select>
            </label>
          </div>
        )}

        <AutomationList
          automations={filteredAutomations}
          posts={posts}
          account={ig}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onToggleStatus={handleToggleStatus}
        />
      </div>
    </AppLayout>
  );
}
