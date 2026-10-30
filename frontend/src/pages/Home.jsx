import { useEffect, useState } from "react";
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
import api from "../api/api";
import logoUrl from "../assets/justdms-logo.png";
import creatorPortrait from "../assets/auth-creator.jpg";
import creatorLinks from "../assets/landing-creator-links.jpg";
import creatorReaction from "../assets/landing-creator-reaction.jpg";

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

export default function Home() {
  const previewOffer = import.meta.env.DEV && new URLSearchParams(window.location.search).get("previewOffer") === "1";
  const [showFoundingOffer, setShowFoundingOffer] = useState(previewOffer);
  useEffect(() => {
    let current = true;
    api.get("/billing/founding-offer").then(({ data }) => {
      if (current) setShowFoundingOffer(previewOffer || data.enabled === true);
    }).catch(() => {});
    return () => { current = false; };
  }, [previewOffer]);
  const [currency, setCurrency] = useState("INR");
  const [billingCycle, setBillingCycle] = useState("monthly");
  const yearly = billingCycle === "yearly";
  const introductory = showFoundingOffer && currency === "INR" && !yearly;
  const proPrice = currency === "INR" ? (yearly ? "₹1,999" : introductory ? "₹99" : "₹199") : (yearly ? "$49" : "$4.99");
  return (
    <div className={`landing-page min-h-screen overflow-x-clip bg-white ${showFoundingOffer ? "landing-has-offer" : ""}`}>
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-100">
        {showFoundingOffer && <div className="founding-offer-banner bg-slate-950 text-white"><div className="mx-auto flex h-full max-w-6xl items-center justify-center gap-3 px-4 sm:gap-5"><Sparkles aria-hidden="true" className="hidden h-4 w-4 shrink-0 text-violet-300 sm:block" /><div className="min-w-0"><p className="text-[9px] font-semibold uppercase tracking-[.16em] text-violet-300 sm:inline sm:text-[10px]">Founding offer<span className="hidden sm:inline"> · </span></p><p className="text-xs leading-5 text-slate-200 sm:inline sm:text-sm">Pro <strong className="text-white">₹99 for your first month</strong><span className="block text-[10px] text-slate-400 sm:inline sm:text-sm"> · then ₹199/month</span></p></div><Link to="/register" className="inline-flex min-h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-full border border-white/20 bg-white/10 px-3 text-xs font-semibold transition hover:bg-white/20 sm:px-4">Claim offer <ArrowRight className="h-3.5 w-3.5" /></Link></div></div>}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-2">
          <Link to="/" className="flex shrink-0 items-center gap-2 sm:gap-2.5">
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
              className="text-sm font-medium text-slate-600 hover:text-slate-900 px-2 sm:px-4 py-2"
            >
              Login
            </Link>
            <Link to="/register" className="btn-primary shrink-0 whitespace-nowrap text-sm px-3 sm:px-5 py-2.5">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="landing-hero overflow-hidden px-5 pb-14 pt-28 sm:px-8 sm:pt-36 lg:pb-24">
        <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[1.05fr_.95fr] lg:gap-14">
          <div className="text-center lg:text-left">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-white/80 px-3 py-1.5 text-xs font-semibold text-brand-600"><Zap className="h-3.5 w-3.5" />Instagram automation, made simple</span>
            <h1 className="mt-6 text-[44px] font-extrabold leading-[1.05] tracking-[-.045em] text-slate-950 sm:text-6xl xl:text-[72px]">You create.<br /><span className="gradient-text">We keep the<br className="hidden lg:block" /> conversation going.</span></h1>
            <p className="mx-auto mt-6 max-w-md text-base leading-7 text-slate-500 lg:mx-0">Turn “send me the link” into your next connection. Automate Instagram replies, share resources, and get back to what you love.</p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4 lg:justify-start"><Link to="/register" className="btn-primary min-h-12 rounded-xl px-7 text-sm">Start for free <ArrowRight className="h-4 w-4" /></Link><a href="#how-it-works" className="inline-flex min-h-12 items-center gap-2 px-2 text-sm font-semibold text-slate-600 hover:text-brand-600">See how it works <span aria-hidden="true">↘</span></a></div>
            <div className="mt-5 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-slate-500 lg:justify-start">{["Free automation", "No credit card required"].map(text => <span className="inline-flex items-center gap-1.5" key={text}><CheckCircle2 className="h-3.5 w-3.5 text-brand-500" />{text}</span>)}</div>
          </div>
          <div className="landing-portrait relative mx-auto w-full max-w-[460px]">
            <div className="relative aspect-[4/4.7] overflow-hidden rounded-[32px] border border-white bg-violet-50"><img src={creatorPortrait} alt="Creator smiling while checking her phone" fetchPriority="high" width="1122" height="1402" className="h-full w-full object-cover" /><div className="absolute left-5 top-5 inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/85 px-3 py-2 text-[11px] font-semibold text-slate-600 backdrop-blur"><span className="h-1.5 w-1.5 rounded-full bg-brand-500" />A little less busy. A lot more you.</div></div>
            <MessagePreview className="absolute -bottom-5 left-3 right-3 sm:-left-5 sm:right-8" keyword="LINK" message="Here’s the resource you asked for ✨" />
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="scroll-mt-24 px-5 py-16 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <SectionHeading label="Made for the way you create" title={<>Less busywork.<br /><span className="gradient-text">More possibilities.</span></>} description="Your audience is ready to connect. Make the next step feel effortless." />
          <div className="mt-14 space-y-16 sm:mt-20 sm:space-y-24">
            <VisualFeature mirror image={creatorReaction} alt="Creator reacting excitedly to a message on her phone" eyebrow="Comment to DM" title="Every comment can start something." description="When someone asks for a link, let your automation take it from there. Send your guide, product page, or latest opportunity directly to their DMs." keyword="LINK" message="Of course! Here’s the link." bullets={["Choose a reel or post", "Match a keyword or any comment", "Add your personal touch to the reply"]} />
            <VisualFeature reverse floatingMessage image={creatorLinks} alt="Creator checking a smartphone" eyebrow="Ask for a follow" title="Make the connection before the next click." description="Invite people to follow your Instagram before delivering a resource. Your follow prompt and link stay together in one simple conversation." keyword="GUIDE" message="Follow along, then tap to get your guide." bullets={["Customize your opening message", "Add a follow prompt when you need it", "Keep delivery in the conversation"]} />
          </div>
          <div className="mt-20 grid gap-x-8 gap-y-7 border-t border-slate-100 pt-10 sm:grid-cols-2 lg:grid-cols-4">{FEATURES.filter((_, index) => [0,1,2,3].includes(index)).map(({icon: Icon,title,desc})=><div key={title}><Icon className="mb-3 h-5 w-5 text-brand-600" /><h3 className="text-sm font-semibold text-slate-900">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{desc}</p></div>)}</div>
        </div>
      </section>

      {/* Product benefits */}
      <section className="border-y border-slate-100 bg-slate-50/70 px-5 py-10 sm:px-8"><div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 lg:grid-cols-4">{[["Your voice", "Customize your replies"],["Your audience", "Connect through Instagram"],["Your pace", "Start free, grow when ready"],["Your control", "Manage your automations"]].map(([title,text])=><div key={title} className="text-center"><p className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">{title}</p><p className="mt-2 text-xs text-slate-500 sm:text-sm">{text}</p></div>)}</div></section>

      {/* How it works */}
      <section id="how-it-works" className="scroll-mt-24 px-5 py-16 sm:px-8 sm:py-24"><div className="mx-auto max-w-6xl"><SectionHeading label="From post to conversation" title={<>Three steps.<br /><span className="gradient-text">One less thing to do.</span></>} description="Connect your professional Instagram account, then build your first automation." /><div className="mt-12 grid gap-5 md:grid-cols-3">{[{num:"01",title:"Pick your post",desc:"Choose the post or reel you want your automation to respond to.",icon:MessageSquare},{num:"02",title:"Make it yours",desc:"Set your trigger, write your reply, and add the resource you want to share.",icon:Link2},{num:"03",title:"Let the conversation begin",desc:"Activate your automation and track activity from your dashboard.",icon:Zap}].map(({num,title,desc,icon:Icon})=><div key={num} className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-7"><div className="mb-7 flex items-center justify-between"><span className="text-xs font-semibold text-slate-400">STEP {num}</span><Icon className="h-5 w-5 text-brand-500" /></div><h3 className="text-lg font-semibold tracking-tight">{title}</h3><p className="mt-3 text-sm leading-6 text-slate-500">{desc}</p></div>)}</div></div></section>

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
              <p className="mt-5 text-5xl font-extrabold tracking-tight text-slate-950" aria-live="polite">{proPrice}<span className="text-sm font-medium tracking-normal text-slate-500"> /{yearly ? "year" : introductory ? "first month" : "month"}</span></p>
              <p className="mt-3 text-sm font-medium text-brand-700">{yearly ? (currency === "INR" ? "Save ₹389 with annual billing" : "Save $10.88 with annual billing") : introductory ? "Then ₹199/month · First paid subscription only" : "Flexible monthly billing"}</p>
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
      <section className="px-5 py-16 sm:px-8 sm:py-24"><div className="landing-final mx-auto max-w-6xl overflow-hidden rounded-[28px] px-6 py-14 text-center sm:px-12 sm:py-20"><span className="text-xs font-semibold uppercase tracking-[.15em] text-brand-600">More creating. Less repeating.</span><h2 className="mx-auto mt-4 max-w-xl text-3xl font-bold leading-tight tracking-tight sm:text-5xl">Your next conversation<br />starts here.</h2><p className="mx-auto mt-5 max-w-md text-sm leading-6 text-slate-500">Start with free automation. Make it yours. Upgrade when your content is ready for more.</p><Link to="/register" className="btn-primary mt-7 min-h-12 rounded-xl px-7 text-sm">Start for free <ArrowRight className="h-4 w-4" /></Link></div></section>

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

function SectionHeading({label,title,description}) {
  return <div className="mx-auto max-w-2xl text-center"><p className="text-xs font-semibold uppercase tracking-[.15em] text-brand-600">{label}</p><h2 className="mt-4 text-3xl font-bold leading-[1.1] tracking-tight text-slate-950 sm:text-5xl">{title}</h2><p className="mx-auto mt-5 max-w-md text-sm leading-6 text-slate-500 sm:text-base">{description}</p></div>;
}
function MessagePreview({keyword,message,className=""}) {
 return <div className={`rounded-2xl border border-white bg-white/95 p-4 shadow-xl shadow-slate-900/10 backdrop-blur ${className}`}><div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400"><MessageCircle className="h-3.5 w-3.5 text-brand-500" />Automation preview</div><div className="mt-3 flex items-center justify-between gap-3"><span className="rounded-full bg-slate-100 px-3 py-2 text-xs text-slate-600">{keyword}</span><ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-300" /><span className="rounded-xl bg-gradient-to-r from-cyan-50 to-violet-50 px-3 py-2 text-xs leading-5 text-slate-700">{message}</span></div></div>;
}
function VisualFeature({image,alt,eyebrow,title,description,keyword,message,bullets,reverse=false,mirror=false,floatingMessage=false}) {
 return <div className="grid items-center gap-9 lg:grid-cols-2 lg:gap-20"><div className={`relative mx-auto w-full max-w-[470px] pb-6 ${reverse ? "lg:order-2" : ""}`}><div className={mirror || floatingMessage ? `landing-feature-organic relative aspect-[1/1] ${mirror ? "landing-feature-soft" : ""}` : "aspect-[1/1] overflow-hidden rounded-[28px] bg-slate-50"}><img src={image} alt={alt} loading="lazy" decoding="async" width="1024" height="1024" className={`h-full w-full object-cover ${mirror || floatingMessage ? "landing-feature-organic-image" : ""} ${mirror ? "-scale-x-100" : ""}`} /></div>{floatingMessage ? <div className="landing-phone-message absolute left-0 top-[26%] z-10 w-[58%] sm:-left-3"><div className="relative rounded-2xl border border-white bg-white/95 p-3 shadow-xl shadow-brand-900/10 backdrop-blur sm:p-4"><div className="mb-2 flex items-center gap-2 text-[10px] font-semibold text-brand-600"><MessageCircle className="h-3.5 w-3.5" />JustDMs</div><p className="text-xs leading-5 text-slate-700 sm:text-sm">Follow along to get your guide ✨</p><div className="mt-3 rounded-xl bg-gradient-to-r from-cyan-50 to-violet-50 px-3 py-2 text-center text-xs font-semibold text-brand-700">I’m following ✓</div><span aria-hidden="true" className="absolute -bottom-2 right-6 h-4 w-4 rotate-45 rounded-sm bg-white" /></div><div className="ml-5 mt-5 inline-flex items-center gap-2 rounded-full border border-white bg-white/95 px-3 py-2 text-[11px] font-medium text-slate-600 shadow-lg shadow-brand-900/5"><CheckCircle2 className="h-3.5 w-3.5 text-brand-500" />Your guide is on its way</div></div> : <MessagePreview keyword={keyword} message={message} className="absolute bottom-0 left-3 right-3 sm:left-6 sm:right-6" />}</div><div className={`mx-auto w-full max-w-md ${reverse ? "lg:order-1" : ""}`}><p className="text-xs font-semibold uppercase tracking-[.13em] text-brand-600">{eyebrow}</p><h3 className="mt-4 text-3xl font-bold leading-tight tracking-tight text-slate-950 sm:text-4xl">{title}</h3><p className="mt-5 text-sm leading-7 text-slate-500 sm:text-base">{description}</p><ul className="mt-6 space-y-3">{bullets.map(text=><li className="flex items-start gap-2.5 text-sm leading-6 text-slate-600" key={text}><CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-brand-500" />{text}</li>)}</ul><Link to="/register" className="mt-7 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand-600 hover:text-brand-800">Try it for free <ArrowRight className="h-4 w-4" /></Link></div></div>;
}
