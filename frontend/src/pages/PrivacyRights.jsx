import LegalDocument, { LegalSection } from "../components/layout/LegalDocument";

export default function PrivacyRights() {
  return (
    <LegalDocument title="GDPR & CCPA Privacy Rights">
      <LegalSection title="Your Rights">
        <p>Depending on your location and applicable law, you may have rights to access, correct, delete, restrict, or receive a copy of personal information associated with your JustDMs account. You may also object to certain processing or withdraw consent where consent is the legal basis.</p>
      </LegalSection>
      <LegalSection title="California Privacy Rights">
        <p>Eligible California residents may request disclosure, correction, or deletion of covered personal information. JustDMs does not sell personal information for money. We do not discriminate against users for exercising applicable privacy rights.</p>
      </LegalSection>
      <LegalSection title="European Privacy Rights">
        <p>Eligible EEA and UK users may request access, rectification, erasure, restriction, portability, or objection, and may contact their local data-protection authority. Cross-border processing is handled using safeguards required by applicable law where necessary.</p>
      </LegalSection>
      <LegalSection title="Submit a Request">
        <p>Email <a href="mailto:support@justdms.in">support@justdms.in</a> from your registered account email. We may verify your identity before responding and will process valid requests within the period required by applicable law.</p>
      </LegalSection>
    </LegalDocument>
  );
}
