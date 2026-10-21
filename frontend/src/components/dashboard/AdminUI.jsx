export function formatAdminDate(value, includeTime = true) {
  if (!value || !Number.isFinite(Date.parse(value))) return "Not available";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    ...(includeTime ? { timeStyle: "short" } : {}),
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));
}

export function initials(user) {
  return String(user.name || user.email || "?").split(/[\s@._-]+/).filter(Boolean).slice(0, 2).map(s => s[0]).join("").toUpperCase();
}

export function Pill({ tone = "slate", children }) {
  const colors = {
    slate: "bg-slate-100 text-slate-600 ring-slate-200",
    green: "bg-emerald-50 text-emerald-700 ring-emerald-200/70",
    amber: "bg-amber-50 text-amber-800 ring-amber-200/80",
    red: "bg-rose-50 text-rose-700 ring-rose-200/70",
    purple: "bg-violet-50 text-violet-700 ring-violet-200/70",
  };
  return <span className={`inline-flex max-w-full items-center rounded-md px-2 py-1 text-[11px] font-semibold leading-4 ring-1 ring-inset ${colors[tone]}`}>{children}</span>;
}

export function PlanPill({ user }) {
  return <Pill tone={user.isPro ? "purple" : "slate"}>{user.isPro ? user.subscription?.source === "referral" ? "Pro · Referral" : "Pro · Paid" : "Free"}</Pill>;
}

export function TokenPill({ token }) {
  const labels = { active: "Not expired", expired: "Expired", reconnect_required: "Reconnect needed", expiring_soon: "Expiring soon", unknown: "Expiry unknown" };
  const tone = token.status === "active" ? "green" : token.status === "expiring_soon" ? "amber" : ["expired", "reconnect_required"].includes(token.status) ? "red" : "slate";
  return <Pill tone={tone}>{labels[token.status] || "Unknown"}</Pill>;
}

export function tokenRemaining(token) {
  if (token.daysRemaining == null) return "Expiry not recorded";
  if (token.daysRemaining < 0) return `Expired ${Math.abs(token.daysRemaining)} days ago`;
  if (token.daysRemaining === 0) return "Expires today";
  return `${token.daysRemaining} days remaining`;
}

export function userActivity(user) {
  return {
    failed: user.automations.some(a => a.health === "needs_attention"),
    sent: user.automations.reduce((n, a) => n + a.activity.sentEvents, 0),
    waiting: user.automations.reduce((n, a) => n + a.activity.waiting, 0),
  };
}

export function HealthPill({ user }) {
  const { failed, sent, waiting } = userActivity(user);
  return <Pill tone={failed ? "red" : sent ? "green" : waiting ? "amber" : "slate"}>{failed ? "Failures recorded" : sent ? "Delivering" : waiting ? "Waiting for user" : "No recent sends"}</Pill>;
}

export function subscriptionLabel(user) {
  const subscription = user.subscription;
  if (!subscription) return "No subscription";
  if (subscription.cancelAtPeriodEnd) return "Cancels at period end";
  if (subscription.status === "active" && !subscription.paidPro) return "Paid access ended";
  return String(subscription.status || "inactive").replaceAll("_", " ");
}
