import { NavLink, useNavigate } from "react-router-dom";
import {
  Activity,
  Zap,
  Users,
  Settings,
  ChevronDown,
  LogOut,
  Plus,
  X,
  CreditCard,
  Crown,
  MessageCircle,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useInstagram } from "../../hooks/useInstagram";
import logoUrl from "../../assets/justdms-logo.png";
import { useSubscription } from "../../hooks/useSubscription";

const NAV_ITEMS = [
  { to: "/dashboard", icon: Activity, label: "Dashboard" },
  { to: "/automation", icon: Zap, label: "Automations" },
  { to: "/dashboard", icon: Users, label: "Analytics", disabled: true },
  { to: "/settings", icon: Settings, label: "Settings" },
  { to: "/billing", icon: CreditCard, label: "Billing" },
];

export default function Sidebar({ mobileOpen = false, onNavigate }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { ig } = useInstagram(user?.email);
  const { isPro } = useSubscription(user);

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-30 flex w-64 shrink-0 flex-col bg-ink-900 text-white shadow-2xl transition-transform duration-200 md:translate-x-0 ${
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <div className="p-5 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <img
            src={logoUrl}
            alt="JustDMs"
            className="h-9 w-9 rounded-lg object-cover shadow-glow"
          />
          <span className="text-lg font-bold tracking-tight">JustDMs</span>
          <button
            type="button"
            aria-label="Close navigation"
            className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white md:hidden"
            onClick={onNavigate}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="p-4">
        <button
          onClick={() => {
            onNavigate?.();
            navigate(isPro ? "/automation" : "/billing");
          }}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-ink-900 transition hover:bg-brand-50"
        >
          <Plus className="w-4 h-4" />
          Create Automation
        </button>
      </div>

      <nav className="flex-1 px-3 space-y-0.5">
        {NAV_ITEMS.map(({ to, icon: Icon, label, disabled }) =>
          disabled ? (
            <div
              key={label}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/35 cursor-not-allowed"
            >
              <Icon className="w-[18px] h-[18px]" />
              {label}
              <span className="ml-auto text-[10px] uppercase tracking-wide bg-white/10 text-white/45 px-1.5 py-0.5 rounded">
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
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${
                  isActive
                    ? "bg-white text-ink-900 font-semibold shadow-sm"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                }`
              }
            >
              <Icon className="w-[18px] h-[18px]" />
              {label}
            </NavLink>
          )
        )}
      </nav>

      {ig && (
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 p-2 rounded-lg bg-white/8 hover:bg-white/12 transition cursor-pointer">
            <img
              src={ig.profile_picture_url}
              alt=""
              className="w-9 h-9 rounded-full ring-2 ring-brand-300/70"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">@{ig.username}</p>
              {isPro && (
                <p className="mt-0.5 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-amber-300">
                  <Crown className="h-3 w-3" /> Pro plan
                </p>
              )}
            </div>
            <ChevronDown className="w-4 h-4 text-white/45 shrink-0" />
          </div>
        </div>
      )}

      <div className="p-4 border-t border-white/10">
        <a
          href="https://wa.me/917799100870"
          target="_blank"
          rel="noreferrer"
          className="mb-2 flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 px-3 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-400"
        >
          <MessageCircle className="h-4 w-4" />
          WhatsApp Support
        </a>
        <button
          onClick={() => {
            onNavigate?.();
            logout();
          }}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-white/55 hover:text-coral-100 hover:bg-coral-500/10 rounded-lg transition"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
