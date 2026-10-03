import { Link } from "react-router-dom";
import logoUrl from "../../assets/justdms-logo.png";

export default function LegalDocument({ title, updated = "October 3, 2026", children }) {
  return (
    <div className="min-h-screen bg-[linear-gradient(145deg,#ecfeff_0%,#f8fafc_52%,#f5f0ff_100%)] text-slate-800">
      <header className="border-b border-brand-100/70 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-5">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-brand-100 bg-white p-1 shadow-sm">
              <img src={logoUrl} alt="JustDMs" className="h-full w-full rounded-lg object-contain" />
            </span>
            <span className="text-lg font-bold text-ink-900">JustDMs</span>
          </Link>
          <Link to="/" className="text-sm font-semibold text-brand-700">Home</Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 py-10 sm:py-14">
        <article className="rounded-lg border border-slate-200 bg-white p-6 shadow-card sm:p-10">
          <p className="text-sm font-semibold text-brand-700">Last updated: {updated}</p>
          <h1 className="mt-3 text-3xl font-bold text-ink-900 sm:text-4xl">{title}</h1>
          <div className="legal-content mt-8 space-y-8 leading-7 text-slate-600">{children}</div>
        </article>
      </main>
    </div>
  );
}

export function LegalSection({ title, children }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-bold text-ink-900">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
