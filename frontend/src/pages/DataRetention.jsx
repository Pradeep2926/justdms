import LegalDocument, { LegalSection } from "../components/layout/LegalDocument";

export default function DataRetention() {
  return (
    <LegalDocument title="Data Retention Policy">
      <LegalSection title="Retention Principles">
        <p>JustDMs keeps information only for as long as needed to operate the service, maintain security, resolve disputes, and meet legal or accounting obligations.</p>
      </LegalSection>
      <LegalSection title="Operational Data">
        <ul>
          <li>Account and connected Instagram records: while the account is active.</li>
          <li>Automation configuration and delivery records: while needed to run and troubleshoot active workflows.</li>
          <li>Security and application logs: for a limited operational period based on security needs.</li>
          <li>Subscription and transaction records: for the period required by tax, accounting, and payment regulations.</li>
        </ul>
      </LegalSection>
      <LegalSection title="Deletion and Backups">
        <p>Verified deletion requests are normally completed within 30 days. Residual copies may remain temporarily in protected backups and are removed through scheduled backup rotation unless retention is legally required.</p>
      </LegalSection>
      <LegalSection title="Request Information">
        <p>For a retention or deletion question, email <a href="mailto:support@justdms.in">support@justdms.in</a> from your registered address.</p>
      </LegalSection>
    </LegalDocument>
  );
}
