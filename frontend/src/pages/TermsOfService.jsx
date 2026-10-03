import LegalDocument, { LegalSection } from "../components/layout/LegalDocument";

export default function TermsOfService() {
  return (
    <LegalDocument title="Terms of Service">
      <LegalSection title="Service">
        <p>JustDMs provides Instagram comment and direct-message automation through official Meta APIs. Features may change as Meta updates its platform, permissions, or technical limits.</p>
      </LegalSection>
      <LegalSection title="Account Responsibilities">
        <p>You must provide accurate account information, protect your credentials, and have authority to connect each Instagram professional account. You are responsible for automations and content configured through your account.</p>
      </LegalSection>
      <LegalSection title="Subscriptions and Payments">
        <p>Paid plans renew according to the selected monthly or yearly billing cycle until cancelled. Payments are processed by Razorpay. Pricing, cancellation, and eligible refund conditions are described in our Refund & Cancellation Policy.</p>
      </LegalSection>
      <LegalSection title="Platform Rules">
        <p>You must follow applicable law, Meta policies, and our Acceptable Use Policy. We may limit or suspend service where activity threatens users, the platform, or our compliance obligations.</p>
      </LegalSection>
      <LegalSection title="Availability and Liability">
        <p>We work to keep JustDMs reliable, but availability can be affected by Meta, hosting, payment, and network providers. To the extent permitted by law, JustDMs is not liable for indirect losses or third-party platform restrictions.</p>
      </LegalSection>
      <LegalSection title="Contact">
        <p>Questions about these terms can be sent to <a href="mailto:support@justdms.in">support@justdms.in</a>.</p>
      </LegalSection>
    </LegalDocument>
  );
}
