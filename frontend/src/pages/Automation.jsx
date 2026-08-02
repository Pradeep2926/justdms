import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../hooks/useAuth";
import AppLayout from "../components/layout/AppLayout";
import AutomationBuilder from "../components/automation/AutomationBuilder";
import AutomationList from "../components/automation/AutomationList";
import api from "../api/api";
import { Plus, X } from "lucide-react";

export default function Automation() {
  const { user, loading: authLoading } = useAuth({ redirectOnFail: true });
  const [posts, setPosts] = useState([]);
  const [automations, setAutomations] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [loadingAutomations, setLoadingAutomations] = useState(true);
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingAutomation, setEditingAutomation] = useState(null);

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
      subtitle="Comment → DM workflows powered by Meta APIs"
    >
      <div className="space-y-6">
        <div className="flex items-center justify-end">
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

        <AutomationList
          automations={automations}
          posts={posts}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onToggleStatus={handleToggleStatus}
        />
      </div>
    </AppLayout>
  );
}
