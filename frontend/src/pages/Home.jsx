import { useState } from "react";
import { Link } from "react-router-dom";
import {
  MessageCircle,
  Zap,
  MessageSquare,
  BarChart3,
  ArrowRight,
  CheckCircle2,
  Crown,
  Sparkles,
  Link2,
  CalendarCheck,
  UserCheck,
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
  {
    icon: Sparkles,
    title: "AI Replies",
    desc: "Use context-aware AI to answer common customer questions in your brand voice.",
  },
  {
    icon: UserCheck,
    title: "Follow Before Delivery",
    desc: "Ask visitors to follow your profile before sharing the requested resource.",
  },
  {
    icon: Link2,
    title: "Link in Bio",
    desc: "Build a branded public page for your links, offers, resources, and services.",
  },
  {
    icon: CalendarCheck,
    title: "Appointment Booking",
    desc: "Publish services, availability, and a shareable booking page for your audience.",
  },
];

const STEPS = [
  { num: "01", title: "Choose Trigger", desc: "Pick keywords that activate your automation" },
  { num: "02", title: "Automate Response", desc: "Setup custom responses with links and offers" },
  { num: "03", title: "Go Viral", desc: "Let automations work while you focus on creating" },
];

export default function Home() {
  const [currency, setCurrency] = useState("INR");
  const [billingCycle, setBillingCycle] = useState("monthly");
  const yearly = billingCycle === "yearly";
  const proPrice = currency === "INR" ? (yearly ? "₹1,999" : "₹199") : (yearly ? "$49" : "$4.99");
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
            <Link to="/register" className="btn-primary text-base px-8 py-4">
              Start for free
              <ArrowRight className="w-5 h-5" />
            </Link>
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

      {/* Pricing */}
      <section id="pricing" className="pricing-section scroll-mt-20 border-y border-slate-100 px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <p className="inline-flex rounded-full border border-brand-100 bg-white px-4 py-1.5 text-xs font-bold uppercase tracking-[0.15em] text-brand-600">
              Simple pricing
            </p>
            <h2 className="mx-auto mt-5 max-w-2xl text-3xl font-extrabold leading-tight tracking-tight text-slate-950 sm:text-5xl">Your next chapter.<br /><span className="text-brand-600">At your own pace.</span></h2>
            <p className="mx-auto mt-4 max-w-lg text-sm leading-6 text-slate-500 sm:text-base">
              Launch your first automations at no cost, then unlock unlimited workflows with Pro.
            </p>
          </div>

          <div className="mt-8 flex justify-center" role="group" aria-label="Pricing currency">
            <div className="inline-flex rounded-full border border-slate-200 bg-white p-1 shadow-sm">
              {["INR", "USD"].map(value => <button key={value} type="button" aria-pressed={currency === value} onClick={() => setCurrency(value)} className={`min-h-10 rounded-full px-6 text-sm font-semibold transition ${currency === value ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:bg-slate-50"}`}>{value === "INR" ? "₹ INR" : "$ USD"}</button>)}
            </div>
          </div>
          <div className="mx-auto mt-10 grid max-w-4xl items-stretch gap-5 md:grid-cols-2 sm:gap-6">
            <div className="pricing-card flex min-w-0 flex-col rounded-3xl border border-slate-200 bg-white p-6 sm:p-8">
              <span className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-600"><Sparkles className="h-4 w-4" />JustDMs Free</span>
              <p className="mt-3 text-sm leading-6 text-slate-500 md:min-h-[60px]">A little help for your next big idea.<br />Your first automations are on us.</p>
              <p className="mt-6 text-5xl font-extrabold tracking-tight text-slate-950">{currency === "INR" ? "₹0" : "$0"}<span className="text-sm font-medium tracking-normal text-slate-500"> /forever</span></p>
              <p className="mt-3 text-sm text-slate-500">Start creating. No card required.</p>
              <div className="my-7 h-px bg-slate-100" />
              <div className="flex-1 space-y-4">
                {["2 active DM automations", "Limited DMs", "Comment and keyword triggers", "Ask for a follow before delivery", "Link in Bio", "Appointment booking", "WhatsApp quick support"].map(feature => <span key={feature} className="flex items-start gap-3 text-sm leading-6 text-slate-600"><CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />{feature}</span>)}
              </div>
              <Link to="/register" className="mt-8 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-800 transition hover:border-brand-300 hover:bg-brand-50">Start for free <ArrowRight className="h-4 w-4" /></Link>
            </div>
            <div className="pricing-card pricing-pro relative flex min-w-0 flex-col rounded-3xl border border-brand-200 bg-white p-6 sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-3"><span className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-brand-700"><Crown className="h-4 w-4" />JustDMs Pro</span><span className="rounded-full bg-brand-600 px-3 py-1 text-xs font-semibold text-white">For your next stage</span></div>
              <div className="mt-5 inline-flex w-full self-start rounded-xl border border-slate-200/70 bg-white/80 p-1" role="group" aria-label="Pro billing period">
                {["monthly", "yearly"].map(value => <button key={value} type="button" aria-pressed={billingCycle === value} onClick={() => setBillingCycle(value)} className={`min-h-11 flex-1 rounded-lg px-4 text-sm font-semibold capitalize transition ${billingCycle === value ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:bg-slate-50"}`}>{value}</button>)}
              </div>
              <p className="mt-5 text-5xl font-extrabold tracking-tight text-slate-950" aria-live="polite">{proPrice}<span className="text-sm font-medium tracking-normal text-slate-500"> /{yearly ? "year" : "month"}</span></p>
              <p className="mt-3 text-sm font-medium text-brand-700">{yearly ? (currency === "INR" ? "Save ₹389 with annual billing" : "Save $10.88 with annual billing") : "Flexible monthly billing"}</p>
              <div className="my-7 h-px bg-slate-100" />
              <div className="flex-1 space-y-4">
                {["Unlimited automations", "Unlimited DMs*", "Comment and keyword triggers", "Ask for a follow before delivery", "Link in Bio and appointment booking", "Analytics and lead collection", "WhatsApp quick support"].map(feature => <span key={feature} className="flex items-start gap-3 text-sm leading-6 text-slate-600"><CheckCircle2 className="h-5 w-5 shrink-0 text-brand-500" />{feature}</span>)}
              </div>
              <Link to="/register" className="btn-primary mt-8 min-h-12 w-full rounded-xl py-3 shadow-lg shadow-brand-500/15">Get started with Pro <ArrowRight className="h-4 w-4" /></Link>
              {currency === "USD" && <p className="mt-3 text-center text-xs text-slate-500">Billed in US dollars. Choose USD in Billing when you upgrade.</p>}
            </div>
          </div>
          <p className="mx-auto mt-7 max-w-xl text-center text-xs leading-5 text-slate-400">
            *Unlimited DMs are subject to Instagram/Meta API limits and fair usage. Prices include applicable taxes only where stated at checkout.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <div className="brand-gradient max-w-3xl mx-auto text-center card p-12 border-0 text-white">
          <h2 className="text-3xl font-bold">
            Ready to stop missing DMs?
          </h2>
          <p className="text-white/80 mt-3 mb-8">
            Create your free account and launch your first Instagram automations
            in minutes. Upgrade only when you need more.
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
      <footer className="border-t border-slate-200 bg-slate-950 px-6 pb-8 pt-16 text-slate-300">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-12 border-b border-white/10 pb-12 md:grid-cols-[1.5fr_1fr_1fr_1.35fr]">
            <div>
              <Link to="/" className="inline-flex items-center gap-3 text-white">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white p-1.5 shadow-lg">
                  <img src={logoUrl} alt="JustDMs" className="h-full w-full rounded-lg object-contain" />
                </span>
                <span className="text-2xl font-bold">JustDMs</span>
              </Link>
              <p className="mt-5 max-w-sm text-sm leading-6 text-slate-400">
                Instagram comment and DM automation for businesses and creators, powered through official Meta APIs.
              </p>
              <p className="mt-4 inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-xs font-semibold text-cyan-300">
                Official Meta API integration
              </p>
            </div>

            <FooterColumn title="Product" links={[
              ["Features", "/#features"],
              ["How It Works", "/#how-it-works"],
              ["Pricing", "/#pricing"],
              ["Login", "/login"],
            ]} />

            <div>
              <h3 className="text-sm font-bold uppercase tracking-wide text-white">Support</h3>
              <div className="mt-5 flex flex-col gap-3 text-sm">
                <a href="mailto:support@justdms.in" className="hover:text-cyan-300">Email Support</a>
                <a href="https://wa.me/917799100870" target="_blank" rel="noreferrer" className="hover:text-cyan-300">WhatsApp Support</a>
                <Link to="/refund-policy" className="hover:text-cyan-300">Billing & Refunds</Link>
                <Link to="/data-deletion" className="hover:text-cyan-300">Delete My Data</Link>
              </div>
            </div>

            <FooterColumn title="Legal" links={[
              ["Privacy & Data Policy", "/privacy"],
              ["Terms of Service", "/terms"],
              ["Acceptable Use Policy", "/acceptable-use"],
              ["Refund & Cancellation", "/refund-policy"],
              ["Data Retention", "/data-retention"],
              ["Data Deletion", "/data-deletion"],
              ["GDPR & CCPA Rights", "/privacy-rights"],
            ]} />
          </div>

          <div className="flex flex-col gap-3 pt-7 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} JustDMs. All rights reserved.</p>
            <p>Instagram and Meta are trademarks of Meta Platforms, Inc. JustDMs is not affiliated with or endorsed by Meta.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FooterColumn({ title, links }) {
  return (
    <div>
      <h3 className="text-sm font-bold uppercase tracking-wide text-white">{title}</h3>
      <div className="mt-5 flex flex-col gap-3 text-sm">
        {links.map(([label, to]) => (
          to.startsWith("/#") ? (
            <a key={to} href={to} className="transition hover:text-cyan-300">{label}</a>
          ) : (
            <Link key={to} to={to} className="transition hover:text-cyan-300">{label}</Link>
          )
        ))}
      </div>
    </div>
  );
}
