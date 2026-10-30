import { useState } from "react";
import { Menu } from "lucide-react";
import UpgradeReminder from "../subscription/UpgradeReminder";
import Sidebar from "./Sidebar";
import { useAuth } from "../../hooks/useAuth";
import { useInstagram } from "../../hooks/useInstagram";
import { Link } from "react-router-dom";

export default function AppLayout({ children, title, subtitle, action, compactHeader = false }) {
  const { user } = useAuth();
  const { reconnectRequired } = useInstagram(user?.email);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#ecfeff_0%,#f5f9ff_42%,#f7f2ff_100%)]">
      <UpgradeReminder user={user} />
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-20 bg-ink-900/45 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <Sidebar
        mobileOpen={sidebarOpen}
        onNavigate={() => setSidebarOpen(false)}
      />

      <div className="flex min-h-screen flex-col min-w-0 md:ml-64">
        <header className="sticky top-0 z-10 border-b border-brand-100/70 bg-white/85 px-4 py-4 backdrop-blur-xl sm:px-6 md:px-8">
          <div className={compactHeader ? "flex items-center justify-between gap-3" : "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"}>
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                aria-label="Open navigation"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm md:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="min-w-0">
                <h1 className="truncate text-xl font-bold text-ink-900 sm:text-2xl">
                  {title}
                </h1>
                {subtitle && (
                  <p className={`mt-1 truncate text-sm text-slate-500 ${compactHeader ? "hidden sm:block" : ""}`}>
                    {subtitle}
                  </p>
                )}
              </div>
            </div>
            {action && <div className="shrink-0">{action}</div>}
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 sm:p-6 md:p-8">
          {reconnectRequired && <div role="alert" className="mb-5 flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-950 sm:flex-row sm:items-center sm:justify-between">
            <div><p className="font-semibold">Reconnect Instagram</p><p className="mt-1 text-sm">Your Instagram connection has expired or needs renewal. Your automations are saved. Reconnect to resume sending DMs and load new reels.</p></div>
            <Link to="/connect-meta?switch=1" className="btn-primary shrink-0">Reconnect Instagram</Link>
          </div>}
          {children}
        </main>
      </div>
    </div>
  );
}
