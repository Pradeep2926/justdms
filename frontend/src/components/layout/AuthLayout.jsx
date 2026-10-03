import { Link } from "react-router-dom";
import logoUrl from "../../assets/justdms-logo.png";

export default function AuthLayout({ children, title, subtitle, hideHeader = false }) {
  return (
    <div className="min-h-screen flex">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-cyan-400 via-brand-600 to-violet-600 p-12 text-white lg:flex lg:w-1/2 lg:flex-col lg:justify-between">

        <div className="relative">
          <Link to="/" className="flex items-center gap-2.5">
            <img
              src={logoUrl}
              alt="JustDMs"
              className="h-10 w-10 object-contain"
            />
            <span className="text-xl font-bold">JustDMs</span>
          </Link>
        </div>

        <div className="relative space-y-6">
          <h2 className="text-4xl font-bold leading-tight">
            Turn every comment
            <br />
            into a conversation
          </h2>
          <p className="text-lg text-white/80 max-w-md">
            Auto-respond to Instagram comments with personalized DMs. Keep your
            audience engaged and grow faster.
          </p>
          <div className="flex flex-wrap gap-3 text-sm">
            {["Meta Verified", "Secure Billing", "Instant Setup"].map((badge) => (
              <span
                key={badge}
                className="px-3 py-1.5 bg-white/15 backdrop-blur rounded-full"
              >
                ✓ {badge}
              </span>
            ))}
          </div>
        </div>

        <p className="relative text-sm text-white/60">
          Trusted by creators worldwide
        </p>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 items-center justify-center bg-[linear-gradient(145deg,#ecfeff_0%,#f8fafc_52%,#f5f0ff_100%)] px-6 py-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8 text-center">
            <Link to="/" className="inline-flex items-center gap-2">
              <img
                src={logoUrl}
                alt="JustDMs"
                className="h-8 w-8 object-contain"
              />
              <span className="text-lg font-bold">JustDMs</span>
            </Link>
          </div>

          <div className="card p-8">
            {!hideHeader && (
              <>
                <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
                {subtitle && (
                  <p className="text-slate-500 text-sm mt-1 mb-6">{subtitle}</p>
                )}
                {!subtitle && <div className="mb-6" />}
              </>
            )}
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
