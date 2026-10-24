import { AlertCircle, CheckCircle2, Info, RotateCcw } from "lucide-react";

export default function RetriggerStatus({ loading, result, noticeKey }) {
  if (!loading && !result) return null;
  const tone = loading ? "info" : result?.tone;
  const Icon = loading ? RotateCcw : tone === "success" ? CheckCircle2
    : tone === "error" || tone === "warning" ? AlertCircle : Info;
  const message = loading
    ? result?.message || "Re-triggering automation…"
    : result?.message;
  const color = tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : tone === "error" || tone === "warning" ? "border-amber-200 bg-amber-50 text-amber-800"
    : "border-sky-200 bg-sky-50 text-sky-700";

  return <div role="status" aria-live="polite" className={`mx-4 mt-5 flex items-center gap-2.5 rounded-lg border px-4 py-3 text-sm font-medium sm:mx-6 ${color}`}>
    <Icon aria-hidden="true" className={`h-4 w-4 shrink-0 ${loading ? "animate-spin" : ""}`} />
    <span key={`${noticeKey}:${message}`} className="retrigger-notice-shake">{message}</span>
  </div>;
}
