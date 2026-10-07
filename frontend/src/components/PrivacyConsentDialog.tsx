import { AgreementDialog, type AgreementSection } from "@/components/AgreementDialog";
import { primaryButtonClass } from "@/components/design-kit";
import { PRIVACY_CONSENT_LAST_UPDATED } from "@/lib/terms";

const SECTIONS: AgreementSection[] = [
  {
    title: "Who collects your information",
    body: (
      <p>
        The Office of Senior Citizen Affairs (OSCA) of the Municipality of Bulan, Sorsogon collects
        and keeps your personal information in the Bulan SeniorCare registry.
      </p>
    ),
  },
  {
    title: "What we collect",
    body: (
      <ul>
        <li>
          Your name, birthdate, place of birth, sex, civil status, address, and contact number.
        </li>
        <li>Your educational attainment, skills, and family composition.</li>
        <li>Your senior citizen association membership.</li>
        <li>Your photo, a valid ID, and your birth certificate.</li>
      </ul>
    ),
  },
  {
    title: "Why we collect it",
    body: (
      <ul>
        <li>To register you as a senior citizen of Bulan and issue your OSCA ID number.</li>
        <li>To check your eligibility for benefits, such as the social pension and grants.</li>
        <li>To release your benefits and keep a record of what you received.</li>
        <li>To contact you about your benefits and OSCA announcements.</li>
        <li>To prepare reports and statistics for the municipality, without naming you.</li>
      </ul>
    ),
  },
  {
    title: "Who can see it",
    body: (
      <p>
        Only authorized OSCA staff and your barangay senior citizen leader can see your record. OSCA
        shares your information with other government agencies only when needed to deliver a benefit
        to you, such as the social pension, or when the law requires it.
      </p>
    ),
  },
  {
    title: "How we protect it",
    body: (
      <p>
        Your record is kept in a secure system that only signed-in staff can open, and every change
        to it is logged. OSCA keeps your record while you are registered and for as long as
        government record-keeping rules require.
      </p>
    ),
  },
  {
    title: "Your rights",
    body: (
      <>
        <p>Under the Data Privacy Act of 2012 (Republic Act No. 10173), you have the right to:</p>
        <ul>
          <li>Be told how your information is used.</li>
          <li>See your record and ask for a copy.</li>
          <li>Have wrong or outdated information corrected.</li>
          <li>Object to its use, or ask for it to be removed, where the law allows.</li>
          <li>File a complaint with the National Privacy Commission.</li>
        </ul>
        <p>To use these rights, visit or contact the OSCA office in Bulan.</p>
      </>
    ),
  },
  {
    title: "Your consent",
    body: (
      <p>
        By agreeing, you allow OSCA to collect and use your personal information as described above.
        If you cannot read this notice, OSCA staff will read it to you. An authorized
        representative, such as a family member, may agree on your behalf.
      </p>
    ),
  },
];

export function PrivacyConsentDialog({
  open,
  onOpenChange,
  onAccept,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccept: () => void;
}) {
  return (
    <AgreementDialog
      open={open}
      onOpenChange={onOpenChange}
      onAccept={onAccept}
      title="Data Privacy Consent"
      lastUpdated={PRIVACY_CONSENT_LAST_UPDATED}
      sections={SECTIONS}
      acceptClassName={primaryButtonClass}
    />
  );
}
