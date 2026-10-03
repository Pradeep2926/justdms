import { Link } from "react-router-dom";
import {
  MessageCircle,
  Zap,
  MessageSquare,
  BarChart3,
  ArrowRight,
  CheckCircle2,
  Crown,
} from "lucide-react";
import logoUrl from "../assets/justdms-logo.png";

const FEATURES = [
  {
    icon: MessageSquare,
    title: "Comment Automation",
    desc: "Reply to comments and send a DM to engage your followers instantly.",
  },
  {
    icon: Zap,
    title: "Keyword Triggers",
    desc: "Set custom keywords like 'link' or 'price' to activate automations.",
  },
  {
    icon: MessageCircle,
    title: "DM Automation",
    desc: "Automatically reply to followers who message you with smart flows.",
  },
  {
    icon: BarChart3,
    title: "Analytics Dashboard",
    desc: "Track reply rates, popular keywords, and campaign performance.",
  },
];

const STEPS = [
  { num: "01", title: "Choose Trigger", desc: "Pick keywords that activate your automation" },
  { num: "02", title: "Automate Response", desc: "Setup custom responses with links and offers" },
  { num: "03", title: "Go Viral", desc: "Let automations work while you focus on creating" },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <img
              src={logoUrl}
              alt="JustDMs"
              className="h-9 w-9 object-contain"
            />
            <span className="font-bold text-lg">JustDMs</span>
          </Link>
          <div className="hidden items-center gap-1 md:flex">
            <a href="#how-it-works" className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-brand-700">
              How It Works
            </a>
            <a href="#features" className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-brand-700">
              Features
            </a>
            <a href="#pricing" className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-brand-700">
              Pricing
            </a>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/login"
              className="text-sm font-medium text-slate-600 hover:text-slate-900 px-4 py-2"
            >
              Login
            </Link>
            <Link to="/register" className="btn-primary text-sm py-2.5">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6 hero-gradient">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-brand-50 text-brand-700 rounded-full text-sm font-medium mb-8">
            <Zap className="w-4 h-4" />
            Instagram DM Automation for Creators
          </div>

          <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight leading-[1.1]">
            Go Viral on IG
            <br />
            <span className="gradient-text">with DM Automation</span>
          </h1>

          <p className="text-lg text-slate-600 mt-6 max-w-2xl mx-auto leading-relaxed">
            Keep your audience and the IG algorithm happy by auto-responding to
            every comment in a DM. Turn engagement into leads and sales.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
            <a href="#pricing" className="btn-primary text-base px-8 py-4">
              View Pro Plan
              <ArrowRight className="w-5 h-5" />
            </a>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-6 text-sm text-slate-500">
            {["Meta Verified", "Secure Billing", "Instant Setup"].map((t) => (
              <span key={t} className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="scroll-mt-20 border-y border-slate-100 bg-slate-50 px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">
              Simple pricing
            </p>
            <h2 className="mt-3 text-3xl font-bold sm:text-4xl">One plan. Every automation tool.</h2>
            <p className="mx-auto mt-4 max-w-2xl text-slate-600">
              Choose monthly flexibility or save with annual billing. Cancel future renewals at any time.
            </p>
          </div>

          <div className="mx-auto mt-12 grid max-w-3xl gap-6 md:grid-cols-2">
            {[
              { name: "Monthly", price: "₹199", period: "/month", note: "Flexible monthly billing" },
              { name: "Yearly", price: "₹1,999", period: "/year", note: "Save ₹389 every year", featured: true },
            ].map((plan) => (
              <div key={plan.name} className={`relative flex flex-col rounded-lg border bg-white p-7 shadow-card ${plan.featured ? "border-violet-300 ring-2 ring-violet-100" : "border-brand-200"}`}>
                {plan.featured && (
                  <span className="absolute right-5 top-5 rounded-full bg-violet-50 px-3 py-1 text-xs font-bold uppercase text-violet-700">
                    Best value
                  </span>
                )}
                <span className="inline-flex items-center gap-2 text-sm font-bold uppercase text-brand-700">
                  <Crown className="h-4 w-4" /> JustDMs Pro · {plan.name}
                </span>
                <p className="mt-5 text-4xl font-extrabold text-slate-950">
                  {plan.price}<span className="text-sm font-medium text-slate-500">{plan.period}</span>
                </p>
                <p className="mt-2 text-sm font-semibold text-emerald-700">{plan.note}</p>
                <div className="mt-6 space-y-3">
                  {["All automation features", "Unlimited automations", "Unlimited DMs*", "Analytics and lead collection"].map((feature) => (
                    <span key={feature} className="flex items-start gap-2 text-sm text-slate-700">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                      {feature}
                    </span>
                  ))}
                </div>
                <Link to="/register" className="btn-primary mt-8 w-full py-3.5">
                  Choose {plan.name} <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ))}
          </div>
          <p className="mt-5 text-center text-xs leading-5 text-slate-500">
            *Unlimited DMs are subject to Instagram/Meta API limits and fair usage. Prices include applicable taxes only where stated at checkout.
          </p>
        </div>
      </section>

      {/* Stats bar */}
      <section className="py-12 bg-slate-900 text-white">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: "30M+", label: "DMs Sent" },
            { value: "5M+", label: "Followers Gained" },
            { value: "10M+", label: "Comments Replied" },
            { value: "12+", label: "Countries" },
          ].map(({ value, label }) => (
            <div key={label}>
              <p className="text-3xl font-bold">{value}</p>
              <p className="text-sm text-slate-400 mt-1">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="scroll-mt-20 py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-brand-600 font-semibold text-sm uppercase tracking-wide">
              All The Features You Need
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold mt-3">
              Unlock the full power of Instagram
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="card p-7 hover:shadow-soft transition group"
              >
                <div className="w-12 h-12 bg-brand-50 rounded-xl flex items-center justify-center mb-5 group-hover:bg-brand-100 transition">
                  <Icon className="w-6 h-6 text-brand-600" />
                </div>
                <h3 className="font-semibold text-lg">{title}</h3>
                <p className="text-slate-500 text-sm mt-2 leading-relaxed">
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="scroll-mt-20 py-24 px-6 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-brand-600 font-semibold text-sm uppercase tracking-wide">
              How it works
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold mt-3">
              3 Easy Steps, Unlimited Possibilities
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {STEPS.map(({ num, title, desc }) => (
              <div key={num} className="text-center">
                <div className="brand-gradient w-14 h-14 text-white rounded-2xl flex items-center justify-center text-lg font-bold mx-auto mb-5 shadow-glow">
                  {num}
                </div>
                <h3 className="font-semibold text-lg">{title}</h3>
                <p className="text-slate-500 text-sm mt-2">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <div className="brand-gradient max-w-3xl mx-auto text-center card p-12 border-0 text-white">
          <h2 className="text-3xl font-bold">
            Ready to stop missing DMs?
          </h2>
          <p className="text-white/80 mt-3 mb-8">
            Create your account, choose a Pro billing cycle, and start building
            Instagram automations in minutes.
          </p>
          <Link
            to="/register"
            className="inline-flex items-center gap-2 bg-white text-brand-700 font-semibold px-8 py-4 rounded-xl hover:bg-slate-50 transition"
          >
            Create Account
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 px-6 py-8 text-center text-sm text-slate-500">
        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:flex-wrap sm:gap-5">
          <span>
            © {new Date().getFullYear()} JustDMs — Instagram DM Automation
          </span>
          <Link to="/privacy" className="font-medium hover:text-brand-700">
            Privacy & Data Policy
          </Link>
          <Link to="/refund-policy" className="font-medium hover:text-brand-700">
            Refund Policy
          </Link>
          <Link to="/data-deletion" className="font-medium hover:text-brand-700">
            Data Deletion
          </Link>
        </div>
      </footer>
    </div>
  );
}
