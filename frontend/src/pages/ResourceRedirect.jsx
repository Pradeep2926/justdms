import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ArrowUpRight, CheckCircle2, LoaderCircle, Send } from "lucide-react";
import api from "../api/api";
import logo from "../assets/justdms-logo.png";

export default function ResourceRedirect() {
  const { token } = useParams();
  const [resource, setResource] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let timer;
    api.get(`/resource/${encodeURIComponent(token)}`)
      .then(({ data }) => {
        setResource(data);
        timer = window.setTimeout(() => window.location.assign(data.destination), 1800);
      })
      .catch((requestError) => setError(requestError.response?.data?.error || "Unable to open this resource."));
    return () => window.clearTimeout(timer);
  }, [token]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(135deg,#ecfeff_0%,#f5f9ff_45%,#f7f2ff_100%)] px-5 py-10">
      <section className="w-full max-w-md rounded-lg border border-white/80 bg-white p-7 text-center shadow-xl sm:p-9">
        <div className="mx-auto flex items-center justify-center gap-3">
          <img src={logo} alt="JustDMs" className="h-12 w-12 rounded-lg object-cover" />
          <span className="text-xl font-extrabold text-slate-950">JustDMs</span>
        </div>
        {error ? (
          <>
            <h1 className="mt-7 text-2xl font-bold text-slate-950">Resource unavailable</h1>
            <p className="mt-3 text-sm leading-6 text-slate-500">{error}</p>
            <a href="https://justdms.in" className="btn-primary mt-7">Visit JustDMs</a>
          </>
        ) : resource ? (
          <>
            <span className="mx-auto mt-7 flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600"><CheckCircle2 className="h-6 w-6" /></span>
            <p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-brand-600">Automation made with JustDMs</p>
            <h1 className="mt-2 text-2xl font-bold text-slate-950">Your resource is ready</h1>
            <p className="mt-3 text-sm text-slate-500">Opening <strong className="text-slate-700">{resource.hostname}</strong> securely.</p>
            <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full w-full origin-left animate-pulse rounded-full bg-gradient-to-r from-cyan-500 via-blue-600 to-violet-600" /></div>
            <a href={resource.destination} className="btn-primary mt-7 w-full justify-center">Open resource <ArrowUpRight className="h-4 w-4" /></a>
            <p className="mt-5 flex items-center justify-center gap-1.5 text-xs text-slate-400"><Send className="h-3.5 w-3.5" /> Powered by JustDMs automation</p>
          </>
        ) : (
          <>
            <LoaderCircle className="mx-auto mt-8 h-8 w-8 animate-spin text-brand-600" />
            <h1 className="mt-5 text-xl font-bold text-slate-950">Preparing your resource</h1>
            <p className="mt-2 text-sm text-slate-500">Verified delivery powered by JustDMs.</p>
          </>
        )}
      </section>
    </main>
  );
}
