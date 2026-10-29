import { Check } from "lucide-react";
import { Link } from "react-router-dom";
import logoUrl from "../../assets/justdms-logo.png";
import creatorPortrait from "../../assets/auth-creator.jpg";

export default function AuthLayout({ children, title, subtitle, hideHeader = false, compact = false }) {
  return (
    <div className="auth-shell min-h-screen bg-white text-slate-900 lg:grid lg:grid-cols-[48%_52%]">
      <AuthSidePanel />
      <div className={`auth-card-stage flex min-w-0 items-center justify-center px-4 sm:px-8 lg:px-10 ${compact ? "py-5" : "py-8 sm:py-12"}`}>
      <main className={`auth-floating-card relative w-full max-w-[470px] rounded-3xl border border-white bg-white/95 ${compact ? "auth-compact p-5 sm:px-8 sm:py-6" : "p-6 sm:p-9"}`}>
        <div aria-hidden="true" className="mx-auto mb-4 h-1 w-10 rounded-full bg-gradient-to-r from-cyan-400 via-brand-600 to-violet-600" />
        {!hideHeader && (
          <header className={compact ? "mb-4 text-center" : "mb-7 text-center"}>
            <h1 className="text-[28px] font-semibold tracking-tight sm:text-3xl">{title}</h1>
            {subtitle && <p className="mt-2 text-sm leading-6 text-slate-500">{subtitle}</p>}
          </header>
        )}
        {children}
        {!compact && <footer className="mt-8 border-t border-slate-100 pt-5 text-center">
          <p className="text-xs leading-5 text-slate-400">Your Instagram password is never shared with JustDMs.</p>
          <div className="mt-3 flex justify-center gap-5 text-xs text-slate-500">
            <Link to="/privacy" className="hover:text-slate-900">Privacy</Link>
            <Link to="/terms" className="hover:text-slate-900">Terms</Link>
            <a href="https://wa.me/917799100870" target="_blank" rel="noreferrer" className="hover:text-slate-900">Support</a>
          </div>
        </footer>}
      </main>
      </div>
    </div>
  );
}

function AuthSidePanel() {
  return (
    <aside aria-label="About JustDMs" className="auth-portrait-panel relative hidden overflow-hidden border-r border-slate-100 lg:sticky lg:top-0 lg:block lg:h-screen lg:min-h-[720px]">
      <img src={creatorPortrait} alt="Creator smiling while using her phone" className="absolute inset-x-0 bottom-0 h-[68%] w-full -scale-x-100 object-cover object-[50%_45%]" />
      <div className="absolute inset-x-0 top-0 h-[40%] bg-gradient-to-b from-white/70 via-white/40 to-transparent" />
      <div className="relative z-10 px-9 pt-10 xl:px-12 xl:pt-12">
        <Link to="/" className="inline-flex items-center gap-3"><img src={logoUrl} alt="" className="h-10 w-10 rounded-xl object-contain" /><span className="text-xl font-bold tracking-tight">JustDMs</span></Link>
        <h2 className="mt-9 max-w-sm text-3xl font-bold leading-tight tracking-tight xl:text-[40px]">Less time replying.<br /><span className="auth-gradient-text">More time creating.</span></h2>
        <p className="mt-4 max-w-[320px] text-sm leading-6 text-slate-600">Turn Instagram comments into conversations. Share the right link, without repeating yourself.</p>
        <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-xs font-medium text-slate-600">{["Free automation", "No card required"].map(text => <span className="inline-flex items-center gap-1.5" key={text}><Check className="h-3.5 w-3.5 text-brand-600" />{text}</span>)}</div>
      </div>
      <div className="absolute bottom-10 right-6 z-10 w-[225px] rounded-2xl border border-white/90 bg-white/95 p-4 shadow-lg shadow-slate-900/5 xl:right-10">
        <p className="text-sm text-slate-700">“Can you send me the link?”</p>
        <div className="mt-3 rounded-xl bg-gradient-to-r from-cyan-50 to-violet-50 p-3 text-xs leading-5 text-slate-600">Here’s your resource. Enjoy!<span className="mt-2 block font-semibold text-brand-600">Open resource ↗</span></div>
      </div>
    </aside>
  );
}
