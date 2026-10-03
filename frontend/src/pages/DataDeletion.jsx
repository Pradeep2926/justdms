import { Link } from "react-router-dom";
import logoUrl from "../assets/justdms-logo.png";

export default function DataDeletion() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-5">
          <Link to="/" className="flex items-center gap-2.5">
            <img
              src={logoUrl}
              alt="JustDMs"
              className="h-9 w-9 object-contain"
            />
            <span className="text-lg font-bold text-ink-900">JustDMs</span>
          </Link>
          <Link to="/" className="text-sm font-semibold text-brand-700">
            Home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 py-10 sm:py-14">
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
          <p className="text-sm font-semibold text-brand-700">
            Last updated: August 5, 2026
          </p>
          <h1 className="mt-3 text-3xl font-bold text-ink-900 sm:text-4xl">
            Data Deletion Instructions
          </h1>

          <div className="mt-8 space-y-8 leading-7 text-slate-600">
            <Section title="How To Request Deletion">
              <p>
                To delete your JustDMs account data and connected Instagram
                data, send an email to{" "}
                <a href="mailto:support@justdms.in">support@justdms.in</a> from
                the email address used for your JustDMs account.
              </p>
              <p>Use the subject line: Data Deletion Request.</p>
            </Section>

            <Section title="What To Include">
              <ul>
                <li>Your JustDMs login email address.</li>
                <li>Your connected Instagram username, if available.</li>
                <li>A short message asking us to delete your account data.</li>
              </ul>
            </Section>

            <Section title="What We Delete">
              <p>After verifying your request, we will delete or anonymize:</p>
              <ul>
                <li>Your JustDMs account profile data.</li>
                <li>Connected Instagram account records and tokens.</li>
                <li>Automation rules and saved message templates.</li>
                <li>Webhook events, comment records, DM flow records, and delivery logs.</li>
              </ul>
            </Section>

            <Section title="Processing Time">
              <p>
                We aim to complete verified deletion requests within 30 days.
                Some records may be retained if required for security, fraud
                prevention, legal compliance, or backup recovery, and will be
                removed according to our retention schedule.
              </p>
            </Section>

            <Section title="Disconnect From Meta">
              <p>
                You can also remove JustDMs from your Meta account by visiting
                your Facebook or Instagram account settings and removing app
                access. This stops future access, but you should still email us
                if you want stored JustDMs data deleted.
              </p>
            </Section>

            <Section title="Privacy Policy">
              <p>
                Read our full{" "}
                <Link
                  to="/privacy"
                  className="font-semibold text-brand-700 hover:text-brand-800"
                >
                  Privacy Policy
                </Link>
                .
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
      <div className="legal-content space-y-3">{children}</div>
    </section>
  );
}
