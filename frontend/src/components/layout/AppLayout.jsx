import Sidebar from "./Sidebar";

export default function AppLayout({ children, title, subtitle, action }) {
  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#eef7f8_0%,#f8fafc_42%,#fff7ed_100%)]">
      <Sidebar />

      <div className="ml-64 flex min-h-screen flex-col min-w-0">
        <header className="sticky top-0 z-20 border-b border-white/70 bg-white/75 px-8 py-5 backdrop-blur-xl flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-ink-900">{title}</h1>
            {subtitle && (
              <p className="text-sm text-slate-500 mt-1">{subtitle}</p>
            )}
          </div>
          {action}
        </header>

        <main className="flex-1 p-8 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
