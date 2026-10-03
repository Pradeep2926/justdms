import { Link } from "react-router-dom";
import logoUrl from "../assets/justdms-logo.png";

export default function RefundPolicy() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-5">
          <Link to="/" className="flex items-center gap-2.5">
            <img src={logoUrl} alt="JustDMs" className="h-9 w-9 object-contain" />
            <span className="text-lg font-bold text-ink-900">JustDMs</span>
          </Link>
          <Link to="/" className="text-sm font-semibold text-brand-700">Home</Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 py-10 sm:py-14">
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
          <p className="text-sm font-semibold text-brand-700">Last updated: October 3, 2026</p>
          <h1 className="mt-3 text-3xl font-bold text-ink-900 sm:text-4xl">Refund & Cancellation Policy</h1>

          <div className="legal-content mt-8 space-y-8 leading-7 text-slate-600">
            <Section title="Subscription Billing">
              <p>
                JustDMs Pro is available for ₹199 per month or ₹1,999 per year.
                Your subscription renews automatically at the end of each
                billing period unless it is cancelled before renewal.
              </p>
            </Section>

            <Section title="Cancellation">
              <p>
                You may cancel future renewals at any time by contacting
                JustDMs support on WhatsApp at +91 77991 00870 or by emailing
                support@justdms.in from your registered email address. Access
                remains available until the end of the paid billing period.
              </p>
            </Section>

            <Section title="Refund Eligibility">
              <p>
                Subscription fees are generally non-refundable once a billing
                period has started. We may approve a refund for a duplicate
                charge, an incorrect amount, or a verified technical issue that
                prevented access to the paid service and could not be resolved.
              </p>
            </Section>

            <Section title="Refund Requests">
              <p>
                Submit a refund request within 7 days of the charge. Include
                your registered email, payment ID, payment date, amount, and a
                brief explanation. Approved refunds are sent to the original
                payment method and may take 5–10 business days to appear,
                depending on the bank or payment provider.
              </p>
            </Section>

            <Section title="Meta Service Limits">
              <p>
                Instagram automations depend on Meta APIs and are subject to
                Meta platform limits, account eligibility, outages, and policy
                changes. Temporary delays or limits imposed by Meta do not
                automatically qualify a subscription for a refund.
              </p>
            </Section>

            <Section title="Contact">
              <p>
                Email <a href="mailto:support@justdms.in">support@justdms.in</a>
                {" "}or contact WhatsApp support at{" "}
                <a href="https://wa.me/917799100870">+91 77991 00870</a>.
              </p>
            </Section>
          </div>
        </div>
      </main>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-bold text-ink-900">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
