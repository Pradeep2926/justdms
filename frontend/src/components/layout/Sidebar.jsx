import { NavLink } from "react-router-dom";
import {
  Activity,
  Zap,
  Users,
  Settings,
  ChevronDown,
  LogOut,
  X,
  CreditCard,
  Crown,
  Instagram,
  MessageCircle,
  Package,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useInstagram } from "../../hooks/useInstagram";
import logoUrl from "../../assets/justdms-logo.png";
import { useSubscription } from "../../hooks/useSubscription";

const NAV_ITEMS = [
  { to: "/dashboard", icon: Activity, label: "Dashboard" },
  { to: "/automation", icon: Zap, label: "Automations" },
  { to: "/dashboard", icon: Users, label: "Analytics", disabled: true },
  { to: "/dashboard", icon: Package, label: "Products", disabled: true },
  { to: "/settings", icon: Settings, label: "Settings" },
  { to: "/billing", icon: CreditCard, label: "Billing" },
];

export default function Sidebar({ mobileOpen = false, onNavigate }) {
  const { user, logout } = useAuth();
  const { ig } = useInstagram(user?.email);
  const { isPro } = useSubscription(user);

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-30 flex w-64 shrink-0 flex-col border-r border-slate-200 bg-white text-ink-900 shadow-[12px_0_40px_-30px_rgba(15,23,42,0.28)] transition-transform duration-200 md:translate-x-0 ${
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <div className="relative border-b border-slate-100 p-5 before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-gradient-to-r before:from-cyan-400 before:via-brand-600 before:to-violet-600">
        <div className="flex items-center gap-2.5">
          <span className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl border border-white bg-white p-1 shadow-sm ring-1 ring-brand-100">
            <img
              src={logoUrl}
              alt="JustDMs"
              className="h-full w-full rounded-lg object-contain"
            />
          </span>
          <span className="text-xl font-bold tracking-tight">JustDMs</span>
          <button
            type="button"
            aria-label="Close navigation"
            className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-white hover:text-brand-700 md:hidden"
            onClick={onNavigate}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-5">
        {NAV_ITEMS.map(({ to, icon: Icon, label, disabled }) =>
          disabled ? (
            <div
              key={label}
              className="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-3 text-base font-medium text-slate-400"
            >
              <Icon className="h-5 w-5" />
              {label}
              <span className="ml-auto rounded-full border border-violet-100 bg-white/75 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-500">
                Soon
              </span>
            </div>
          ) : (
            <NavLink
              key={to + label}
              to={to}
              end={to === "/dashboard"}
              onClick={onNavigate}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-3 text-base font-semibold transition ${
                  isActive
                    ? "bg-gradient-to-r from-cyan-50 via-blue-50 to-violet-50 text-brand-700 shadow-sm ring-1 ring-brand-100"
                    : "text-slate-600 hover:bg-slate-50 hover:text-brand-700"
                }`
              }
            >
              <Icon className="h-5 w-5" />
              {label}
            </NavLink>
          )
        )}
      </nav>

      <div className="border-t border-slate-100 p-4">
        {ig ? (
          <div className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-2.5 transition hover:border-brand-200 hover:bg-brand-50/50">
            <img
              src={ig.profile_picture_url}
              alt=""
              className="h-9 w-9 rounded-full ring-2 ring-brand-200"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">@{ig.username}</p>
              {isPro && (
                <p className="mt-0.5 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-violet-600">
                  <Crown className="h-3 w-3" /> Pro plan
                </p>
              )}
            </div>
            <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
          </div>
        ) : (
          <NavLink
            to="/connect-meta"
            onClick={onNavigate}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-3 py-3 text-sm font-bold text-brand-700 transition hover:border-brand-300 hover:bg-brand-100"
          >
            <Instagram className="h-4 w-4" />
            Connect Instagram
          </NavLink>
        )}
      </div>

      <div className="border-t border-slate-100 p-4">
        <a
          href="https://wa.me/917799100870"
          target="_blank"
          rel="noreferrer"
          className="mb-2 flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 px-3 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-600"
        >
          <MessageCircle className="h-4 w-4" />
          WhatsApp Support
        </a>
        <button
          onClick={() => {
            onNavigate?.();
            logout();
          }}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
