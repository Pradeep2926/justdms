export default function Badge({ children, variant = "default" }) {
  const styles = {
    default: "bg-brand-50 text-brand-800 border-brand-100",
    success: "bg-emerald-50 text-emerald-700 border-emerald-100",
    muted: "bg-white/80 text-slate-600 border-slate-200",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full border ${styles[variant]}`}
    >
      {children}
    </span>
  );
}
