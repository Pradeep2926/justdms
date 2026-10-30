import { useEffect, useState } from "react";
import { FileText, ArrowUpRight, RefreshCw } from "lucide-react";
import api from "../../api/api";
import { useUpgrade } from "../subscription/UpgradeContext";

export default function InvoiceHistory() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const { openUpgrade } = useUpgrade();
  useEffect(() => {
    let active = true;
    setLoading(true); setError("");
    api.get("/billing/invoices").then(({ data }) => { if (active) setInvoices(data.invoices || []); })
      .catch(err => { if (active) setError(err.response?.data?.error || "Unable to load invoices."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [attempt]);
  return <InvoiceHistoryView {...{ invoices, loading, error }} onRetry={() => setAttempt(n => n + 1)} onManage={() => openUpgrade("manual")} />;
}
export function InvoiceHistoryView({ invoices = [], loading = false, error = "", onRetry, onManage }) {
  return <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 p-5 sm:p-7"><div><h2 className="text-xl font-bold text-slate-900">Invoice history</h2><p className="mt-1 text-sm text-slate-500">View invoices for your current subscription.</p></div><button type="button" onClick={onManage} className="min-h-11 rounded-lg bg-brand-50 px-4 text-sm font-semibold text-brand-700">Manage subscription</button></header>
    {loading ? <p role="status" className="p-8 text-sm text-slate-500">Loading invoices…</p> : error ? <div role="alert" className="p-7"><p className="text-sm text-red-700">{error}</p><button type="button" onClick={onRetry} className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand-700"><RefreshCw className="h-4 w-4"/>Try again</button></div> : invoices.length === 0 ? <div className="px-6 py-12 text-center"><FileText className="mx-auto mb-4 h-9 w-9 text-brand-400"/><h3 className="font-semibold text-slate-800">No invoices yet</h3><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">Invoices appear here when issued for your subscription. Free and complimentary Pro access do not generate invoices.</p></div> : <ul className="divide-y divide-slate-100">{invoices.map(invoice => <li key={invoice.id} className="flex flex-wrap items-center justify-between gap-4 p-5 sm:px-7"><div className="min-w-0"><p className="break-all text-sm font-semibold text-slate-900">{invoice.number}</p><p className="mt-1 text-xs text-slate-500">{invoice.timestamp ? new Date(invoice.timestamp * 1000).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "Date unavailable"}</p></div><div className="flex flex-wrap items-center gap-4"><div className="text-right"><p className="text-sm font-bold">{formatAmount(invoice)}</p><span className={`text-xs capitalize ${invoice.status === "paid" ? "text-emerald-700" : "text-slate-500"}`}>{invoice.status}</span></div>{invoice.url && <a href={invoice.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-brand-100 px-3 text-sm font-semibold text-brand-700">View invoice<ArrowUpRight className="h-4 w-4"/></a>}</div></li>)}</ul>}
  </section>;
}
function formatAmount(invoice) {
  try { return new Intl.NumberFormat(undefined, { style: "currency", currency: invoice.currency }).format(invoice.amount / 100); }
  catch { return "Amount unavailable"; }
}
