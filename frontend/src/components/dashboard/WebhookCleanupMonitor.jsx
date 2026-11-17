import { Database } from 'lucide-react';
import { formatAdminDate } from './AdminUI';
const labels={healthy:'Daily job healthy',scheduled:'Daily schedule enabled',disabled:'Disabled',not_scheduled:'Schedule missing',failed:'Needs attention',overdue:'Run overdue',unavailable:'Status unavailable'};
export default function WebhookCleanupMonitor({monitor}) {
 const state=monitor?.status || 'unavailable';
 const run=monitor?.latest;
 return <section aria-label="Webhook log cleanup" className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
  <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="flex items-center gap-2 text-sm font-bold text-slate-900"><Database className="h-4 w-4 text-violet-500"/>Webhook log cleanup</h2><span className={`rounded-full px-3 py-1 text-xs font-semibold ${state==='healthy'?'bg-emerald-50 text-emerald-700':'bg-amber-50 text-amber-800'}`}>{labels[state] || 'Status unavailable'}</span></div>
  <p className="mt-2 text-xs leading-5 text-slate-500">Keeps {monitor?.retentionDays || 14} days of completed logs. Failed and unresolved events are preserved.</p>
  <dl className="mt-4 grid gap-4 text-xs sm:grid-cols-3">
   <div><dt className="text-slate-500">Last cleanup</dt><dd className="mt-1 font-semibold text-slate-800">{run?formatAdminDate(run.finishedAt || run.startedAt)+' IST':'No run recorded'}</dd></div>
   <div><dt className="text-slate-500">Logs removed · last run</dt><dd className="mt-1 font-semibold text-slate-800">{run?.deletedRows?.toLocaleString() ?? '—'}</dd></div>
   <div><dt className="text-slate-500">Older logs remaining · last run</dt><dd className="mt-1 font-semibold text-slate-800">{run?.eligibleAfter?.toLocaleString() ?? '—'}</dd></div>
  </dl>
  {monitor?.lastScheduledRun&&<p className="mt-3 text-[11px] text-slate-500">Last scheduled run: {monitor.lastScheduledRun.status} · {formatAdminDate(monitor.lastScheduledRun.finishedAt || monitor.lastScheduledRun.startedAt)} IST</p>}
  {state==='failed'&&<p role="alert" className="mt-3 text-xs text-amber-800">Cleanup needs review. Check the database job history; the failed cleanup transaction was rolled back.</p>}
  {monitor?.schedule&&<p className="mt-3 text-[11px] text-slate-400">Daily at 3:30 am IST · bounded batches · updated with this overview</p>}
 </section>;
}
