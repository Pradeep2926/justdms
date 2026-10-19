import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../hooks/useAuth";
import AppLayout from "../components/layout/AppLayout";
import AutomationBuilder from "../components/automation/AutomationBuilder";
import AutomationList from "../components/automation/AutomationList";
import { AutomationLoader } from "../components/common/PageLoader";
import api from "../api/api";
import { ArrowRight, CalendarDays, Crown, Filter, Instagram, Plus, Search, Sparkles, Workflow, X } from "lucide-react";
import { useInstagram } from "../hooks/useInstagram";
import { useSubscription } from "../hooks/useSubscription";
import { useNavigate } from "react-router-dom";

export default function Automation() {
  const { user, loading: authLoading } = useAuth({ redirectOnFail: true });
  const navigate = useNavigate();
  const { isPro, activeAutomationLimit, loading: subscriptionLoading } = useSubscription(user);
  const [automations, setAutomations] = useState([]);
  const [loadingAutomations, setLoadingAutomations] = useState(true);
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingAutomation, setEditingAutomation] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("30");
  const { ig, media: posts, connected, loading: instagramLoading } = useInstagram(user?.email);

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
    if (user?.email && connected) {
      fetchAutomations(user.email);
    } else if (user?.email && !subscriptionLoading && !instagramLoading) {
      setLoadingAutomations(false);
    }
  }, [user?.email, connected, instagramLoading, subscriptionLoading, fetchAutomations]);

  const activeAutomationCount = automations.filter(
    (automation) => automation.is_active !== false
  ).length;
  const freeLimitReached = !isPro && activeAutomationCount >= activeAutomationLimit;

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

  if (authLoading || subscriptionLoading || instagramLoading) {
    return (
      <AppLayout title="Automations" subtitle="Preparing your workspace">
        <AutomationLoader />
      </AppLayout>
    );
  }

  if (!connected) {
    return (
      <AppLayout title="Automations" subtitle="Build and manage Instagram workflows">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
          <div className="rounded-lg border border-dashed border-brand-200 bg-gradient-to-br from-brand-50/70 via-white to-violet-50/70 px-6 py-12 text-center sm:py-16">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-lg bg-gradient-to-br from-pink-500 via-purple-500 to-orange-400 text-white shadow-md">
              <Instagram className="h-7 w-7" />
            </span>
            <h2 className="mt-5 text-2xl font-bold text-slate-950">Connect Instagram to view automations</h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              Connect a professional Instagram account to load posts, create comment replies, and build DM automations.
            </p>
            <button type="button" onClick={() => navigate("/connect-meta")} className="btn-primary mt-7">
              Connect Instagram <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </section>
      </AppLayout>
    );
  }

  if (loadingAutomations) {
    return (
      <AppLayout
        title="Automations"
        subtitle={ig ? `Loading workflows for @${ig.username}` : "Loading your workflows"}
      >
        <AutomationLoader />
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Automations"
      subtitle={ig ? `Manage comment-to-DM flows for @${ig.username}` : "Comment → DM workflows powered by Meta APIs"}
    >
      <div className="space-y-6">
        {!isPro && (
          <section className={`flex flex-col gap-4 rounded-lg border px-5 py-4 sm:flex-row sm:items-center sm:justify-between ${freeLimitReached ? "border-amber-200 bg-amber-50" : "border-brand-200 bg-brand-50/60"}`}>
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-brand-700 shadow-sm">
                <Sparkles className="h-5 w-5" />
              </span>
              <div>
                <p className="font-bold text-slate-950">JustDMs Free</p>
                <p className="mt-0.5 text-sm text-slate-600">
                  {activeAutomationCount} of {activeAutomationLimit} active automations used
                  {freeLimitReached ? ". Pause one to activate another, or upgrade for unlimited automations." : ". Comment-to-DM, follow gates, Link in Bio, and booking are included."}
                </p>
              </div>
            </div>
            <button type="button" onClick={() => navigate("/billing")} className="btn-secondary shrink-0 bg-white">
              <Crown className="h-4 w-4" /> Upgrade to Pro
            </button>
          </section>
        )}

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
