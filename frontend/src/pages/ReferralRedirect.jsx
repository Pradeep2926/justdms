import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api/api";
import logoUrl from "../assets/justdms-logo.png";

export default function ReferralRedirect() {
  const { code = "" } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const normalized = code.trim().toUpperCase();
    if (normalized) {
      localStorage.setItem("justdmsReferralCode", normalized);
      api.post(`/referrals/visit/${encodeURIComponent(normalized)}`).catch(() => {});
    }
    const timer = window.setTimeout(() => navigate("/register", { replace: true }), 500);
    return () => window.clearTimeout(timer);
  }, [code, navigate]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(135deg,#ecfeff_0%,#f5f9ff_45%,#f7f2ff_100%)] p-6">
      <div className="text-center">
        <img src={logoUrl} alt="JustDMs" className="mx-auto h-16 w-16 rounded-2xl bg-white p-1 shadow-lg" />
        <h1 className="mt-5 text-2xl font-bold text-slate-950">Opening JustDMs</h1>
        <p className="mt-2 text-slate-500">Preparing your free account...</p>
      </div>
    </main>
  );
}
