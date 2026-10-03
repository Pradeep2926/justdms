import { Link } from "react-router-dom";
import logoUrl from "../assets/justdms-logo.png";

export default function PrivacyPolicy() {
  return (
    <LegalPage title="Privacy & Data Policy" updated="October 3, 2026">
      <Section title="Overview">
        <p>
          JustDMs helps Instagram Business and Creator accounts automate
          comment replies and Instagram direct message workflows. This Privacy
          Policy explains what information we collect, how we use it, and how
          you can request deletion of your data.
        </p>
      </Section>

      <Section title="Information We Collect">
        <p>We may collect the following information when you use JustDMs:</p>
        <ul>
          <li>Account information such as your email address.</li>
          <li>
            Instagram account details you authorize through Meta, such as
            Instagram user ID, username, profile picture, connected Page ID, and
            access token.
          </li>
          <li>
            Instagram media, comments, comment IDs, sender IDs, webhook events,
            automation rules, message templates, and delivery status needed to
            run your automations.
          </li>
          <li>
            Technical logs used to diagnose errors, webhook processing, and Meta
            API responses.
          </li>
        </ul>
      </Section>

      <Section title="How We Use Information">
        <p>We use this information to:</p>
        <ul>
          <li>Connect your Instagram account to JustDMs.</li>
          <li>Detect comments on selected posts or reels.</li>
          <li>Send configured public replies and direct messages.</li>
          <li>Prevent duplicate replies, duplicate DMs, and duplicate deliveries.</li>
          <li>Maintain automation history, delivery status, and debugging logs.</li>
          <li>Improve reliability, security, and product functionality.</li>
        </ul>
      </Section>

      <Section title="Meta Platform Data">
        <p>
          We only access Instagram and Facebook Page data that you authorize
          through Meta Login and that is necessary to provide the service. We do
          not sell Meta Platform data. We do not use Meta Platform data for
          unrelated advertising, profiling, or resale.
        </p>
      </Section>

      <Section title="Data Sharing">
        <p>
          We do not sell your personal information. We may share limited data
          with service providers that help us host the application, store data,
          process authentication, and operate the product, only as needed to
          provide JustDMs.
        </p>
      </Section>

      <Section title="Service Providers">
        <p>
          JustDMs uses service providers to operate the product, including Meta
          for Instagram integrations, Supabase for authentication and data
          storage, Render and Vercel for application hosting, Resend for
          transactional email, and Razorpay for subscription billing. These
          providers process data only to deliver their contracted services and
          under their own security and privacy obligations.
        </p>
      </Section>

      <Section title="Payments">
        <p>
          Subscription payments are processed by Razorpay. JustDMs does not
          store complete card, bank account, or UPI credentials. We retain
          limited billing records such as your plan, subscription status,
          payment-provider identifiers, billing cycle, and payment timestamps
          for account administration and legal compliance.
        </p>
      </Section>

      <Section title="Data Security">
        <p>
          We use access controls, encrypted connections, restricted service
          credentials, and operational monitoring intended to protect your
          information. No online service can guarantee absolute security, so
          you should also protect your account credentials and notify us if you
          suspect unauthorized access.
        </p>
      </Section>

      <Section title="Data Retention">
        <p>
          We retain account, automation, webhook, and delivery records while
          your account is active or as needed to provide the service, debug
          issues, comply with legal obligations, and prevent abuse. You may
          request deletion at any time.
        </p>
      </Section>

      <Section title="Your Choices">
        <ul>
          <li>You can disconnect JustDMs from your Meta account from Meta settings.</li>
          <li>You can stop or delete automations inside JustDMs.</li>
          <li>
            You can request deletion of your JustDMs account and connected Meta
            data using our <LinkText to="/data-deletion">Data Deletion</LinkText>{" "}
            instructions.
          </li>
        </ul>
      </Section>

      <Section title="Your Data Rights">
        <p>
          Depending on your location, you may request access to, correction of,
          portability of, restriction of, or deletion of personal information
          associated with your account. We may need to verify your identity
          before completing a request.
        </p>
      </Section>

      <Section title="Policy Changes">
        <p>
          We may update this policy when our services, providers, or legal
          obligations change. The latest version and its effective date will
          always be published on this page.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          For privacy questions or deletion requests, contact us at{" "}
          <a href="mailto:support@justdms.in">support@justdms.in</a>.
        </p>
      </Section>
    </LegalPage>
  );
}

function LegalPage({ title, updated, children }) {
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
            Last updated: {updated}
          </p>
          <h1 className="mt-3 text-3xl font-bold text-ink-900 sm:text-4xl">
            {title}
          </h1>
          <div className="mt-8 space-y-8 leading-7 text-slate-600">
            {children}
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

function LinkText({ to, children }) {
  return (
    <Link to={to} className="font-semibold text-brand-700 hover:text-brand-800">
      {children}
    </Link>
  );
}
