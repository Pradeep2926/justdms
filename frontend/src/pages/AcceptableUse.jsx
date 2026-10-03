import LegalDocument, { LegalSection } from "../components/layout/LegalDocument";

export default function AcceptableUse() {
  return (
    <LegalDocument title="Acceptable Use Policy">
      <LegalSection title="Permitted Use">
        <p>Use JustDMs for legitimate customer engagement on Instagram accounts you own or are authorized to manage.</p>
      </LegalSection>
      <LegalSection title="Prohibited Activity">
        <ul>
          <li>Spam, unsolicited bulk messaging, harassment, or deceptive communication.</li>
          <li>Impersonation, fraud, unlawful content, or infringement of another person’s rights.</li>
          <li>Artificial engagement manipulation or attempts to evade Meta rate limits and safeguards.</li>
          <li>Unauthorized access, security testing, scraping, reverse engineering, or service disruption.</li>
          <li>Collection or transmission of sensitive personal information without a lawful purpose and proper consent.</li>
        </ul>
      </LegalSection>
      <LegalSection title="Enforcement">
        <p>We may investigate reported misuse and restrict or suspend accounts where reasonably necessary to protect users, JustDMs, Meta integrations, or legal compliance.</p>
      </LegalSection>
      <LegalSection title="Report Abuse">
        <p>Report suspected misuse to <a href="mailto:support@justdms.in">support@justdms.in</a>.</p>
      </LegalSection>
    </LegalDocument>
  );
}
