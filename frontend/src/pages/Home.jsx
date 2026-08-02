import { Link } from "react-router-dom";
import {
  MessageCircle,
  Zap,
  MessageSquare,
  BarChart3,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

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
            <div className="w-8 h-8 bg-gradient-to-br from-brand-600 to-purple-500 rounded-lg flex items-center justify-center">
              <MessageCircle className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg">JustDMs</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="text-sm font-medium text-slate-600 hover:text-slate-900 px-4 py-2"
            >
              Login
            </Link>
            <Link to="/register" className="btn-primary text-sm py-2.5">
              Start For Free
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
              Start For Free
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-6 text-sm text-slate-500">
            {["Meta Verified", "No Credit Card", "Instant Setup"].map((t) => (
              <span key={t} className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                {t}
              </span>
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

      {/* Features */}
      <section className="py-24 px-6">
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
      <section className="py-24 px-6 bg-slate-50">
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
                <div className="w-14 h-14 bg-brand-600 text-white rounded-2xl flex items-center justify-center text-lg font-bold mx-auto mb-5">
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
        <div className="max-w-3xl mx-auto text-center card p-12 bg-gradient-to-br from-brand-600 to-purple-600 border-0 text-white">
          <h2 className="text-3xl font-bold">
            Ready to stop missing DMs?
          </h2>
          <p className="text-white/80 mt-3 mb-8">
            Join creators who automate Instagram conversations with JustDMs.
            Free to start, no card needed.
          </p>
          <Link
            to="/register"
            className="inline-flex items-center gap-2 bg-white text-brand-700 font-semibold px-8 py-4 rounded-xl hover:bg-slate-50 transition"
          >
            Start For Free
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-slate-100 text-center text-sm text-slate-500">
        © {new Date().getFullYear()} JustDMs — Instagram DM Automation
      </footer>
    </div>
  );
}
