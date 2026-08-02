import { Users, Image, Zap, MessageCircle } from "lucide-react";

const ICONS = {
  followers: Users,
  posts: Image,
  automations: Zap,
  dms: MessageCircle,
};

const COLORS = {
  followers: "text-brand-700 bg-brand-50 ring-brand-100",
  posts: "text-indigo-700 bg-indigo-50 ring-indigo-100",
  automations: "text-emerald-700 bg-emerald-50 ring-emerald-100",
  dms: "text-coral-600 bg-coral-50 ring-coral-100",
};

export default function StatsCard({ label, value, icon = "followers" }) {
  const Icon = ICONS[icon] || Users;
  const color = COLORS[icon] || COLORS.followers;

  return (
    <div className="card p-6 transition hover:-translate-y-0.5 hover:shadow-soft">
      <div
        className={`w-11 h-11 rounded-lg flex items-center justify-center mb-4 ring-1 ${color}`}
      >
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="text-3xl font-bold text-ink-900 mt-1">
        {value !== null && value !== undefined
          ? value.toLocaleString()
          : "—"}
      </p>
    </div>
  );
}
