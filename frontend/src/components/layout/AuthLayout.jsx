import { Link } from "react-router-dom";
import logoUrl from "../../assets/justdms-logo.png";

export default function AuthLayout({ children, title, subtitle }) {
  return (
    <div className="min-h-screen flex">
      {/* Brand panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-brand-700 via-brand-600 to-purple-500 p-12 flex-col justify-between text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-pink-300 rounded-full blur-3xl" />
        </div>

        <div className="relative">
          <Link to="/" className="flex items-center gap-2.5">
            <img
              src={logoUrl}
              alt="JustDMs"
              className="h-10 w-10 rounded-xl object-cover shadow-glow"
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
            {["Meta Verified", "No Credit Card", "Instant Setup"].map((badge) => (
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
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-slate-50">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8 text-center">
            <Link to="/" className="inline-flex items-center gap-2">
              <img
                src={logoUrl}
                alt="JustDMs"
                className="h-8 w-8 rounded-lg object-cover shadow-sm"
              />
              <span className="text-lg font-bold">JustDMs</span>
            </Link>
          </div>

          <div className="card p-8">
            <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
            {subtitle && (
              <p className="text-slate-500 text-sm mt-1 mb-6">{subtitle}</p>
            )}
            {!subtitle && <div className="mb-6" />}
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
