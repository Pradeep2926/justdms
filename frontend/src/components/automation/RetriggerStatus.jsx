import { AlertCircle, CheckCircle2, Info, RotateCcw } from "lucide-react";

export default function RetriggerStatus({ loading, result }) {
  if (!loading && !result) return null;
  const data = result?.summary;
  const warning = Boolean(data?.failed);
  const error = result?.tone === "error";
  const Icon = loading ? RotateCcw : error || warning ? AlertCircle : data ? CheckCircle2 : Info;
  const title = loading ? "Checking missed comments"
    : error ? "We couldn’t complete this check"
    : warning ? "Some comments need attention"
    : data?.processed ? "Missed comments handled"
    : data ? "You’re all caught up" : "Create your automation first";
  const color = error || warning ? "border-amber-200 text-amber-700 bg-amber-50"
    : loading || !data ? "border-sky-200 text-sky-700 bg-sky-50"
    : "border-emerald-200 text-emerald-700 bg-emerald-50";

  return <section role="status" aria-live="polite" aria-busy={loading}
    className="mx-4 mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm sm:mx-6">
    <div className="flex items-start gap-3 px-4 py-4 sm:px-5">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border ${color}`}>
        <Icon aria-hidden="true" className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        <p className="mt-1 text-xs leading-5 text-slate-500">{loading
          ? "Checking this post against your saved trigger and previous responses."
          : data ? `${data.checked} comments checked · ${data.eligible} matched your trigger`
          : result.message}</p>
      </div>
    </div>
    {!loading && data && <>
      <div className="mx-4 mb-4 grid grid-cols-3 divide-x divide-slate-200 rounded-lg border border-slate-200 bg-slate-50/60 sm:mx-5">
        {[[data.processed, "DMs started", "text-emerald-700"],
          [data.already_handled, "Already handled", "text-slate-900"],
          [data.failed, "Needs retry", data.failed ? "text-amber-700" : "text-slate-900"]].map(([value, label, color]) =>
          <div key={label} className="min-w-0 px-2 py-3 text-center sm:py-4">
            <p className={`text-xl font-bold tabular-nums sm:text-2xl ${color}`}>{value ?? 0}</p>
            <p className="mt-1 text-[10px] font-medium leading-4 text-slate-500 sm:text-xs">{label}</p>
          </div>)}
      </div>
      <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-3 text-xs leading-5 text-slate-500 sm:px-5">
        {warning ? "Some DM flows couldn’t start. Already handled comments will be skipped if you check again."
          : data.processed ? "DM flows have started. Resources are sent after any required button click or follow confirmation."
          : "No additional DMs were needed. Comments with a previous successful response were skipped."}
        {Boolean(data.not_matching) && <span className="mt-1 block">{data.not_matching} comments didn’t match your trigger.</span>}
      </div>
    </>}
  </section>;
}
