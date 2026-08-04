import { useState } from "react";
import { Menu } from "lucide-react";
import Sidebar from "./Sidebar";

export default function AppLayout({ children, title, subtitle, action }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#eef7f8_0%,#f8fafc_42%,#fff7ed_100%)]">
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
        <header className="sticky top-0 z-10 border-b border-white/70 bg-white/80 px-4 py-4 backdrop-blur-xl sm:px-6 md:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
                  <p className="mt-1 truncate text-sm text-slate-500">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>
            {action && <div className="shrink-0">{action}</div>}
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 sm:p-6 md:p-8">{children}</main>
      </div>
    </div>
  );
}
