import { AgreementDialog, type AgreementSection } from "@/components/AgreementDialog";
import { authSubmitClass } from "@/components/AuthLayout";
import { TERMS_LAST_UPDATED } from "@/lib/terms";

const SECTIONS: AgreementSection[] = [
  {
    title: "Acceptance of these terms",
    body: (
      <p>
        The Bulan SeniorCare portal is operated by the Office of Senior Citizen Affairs (OSCA) of
        the Municipality of Bulan, Sorsogon. By signing in, you agree to these Terms and Conditions.
        If you do not agree, do not use the portal.
      </p>
    ),
  },
  {
    title: "Who may use the portal",
    body: (
      <p>
        The portal is for authorized personnel only: OSCA administrators, OSCA heads, and barangay
        leaders. Accounts are issued by the OSCA administrator.
      </p>
    ),
  },
  {
    title: "Your account",
    body: (
      <ul>
        <li>Keep your password confidential and do not share your account with anyone.</li>
        <li>You are responsible for all activity carried out under your account.</li>
        <li>Sign out when you finish, especially on shared or public computers.</li>
        <li>
          Tell the OSCA administrator right away if you think someone else has used your account.
        </li>
      </ul>
    ),
  },
  {
    title: "Acceptable use",
    body: (
      <>
        <p>Use the portal only for official OSCA work. You must not:</p>
        <ul>
          <li>Enter information you know to be false, incomplete, or misleading.</li>
          <li>
            View, copy, export, print, or share senior citizen records for any purpose other than
            your official duties.
          </li>
          <li>
            Try to reach pages, records, or functions your role does not allow, or get around the
            portal&apos;s security.
          </li>
          <li>
            Upload harmful files or content that is offensive, unlawful, or unrelated to OSCA.
          </li>
        </ul>
      </>
    ),
  },
  {
    title: "Personal data and privacy",
    body: (
      <>
        <p>
          The portal holds personal and sensitive personal information about senior citizens. This
          information is protected by the Data Privacy Act of 2012 (Republic Act No. 10173).
        </p>
        <ul>
          <li>Process personal data only as needed for registration, eligibility, and benefits.</li>
          <li>Keep exported files and printouts secure, and delete them when no longer needed.</li>
          <li>
            Report any loss, leak, or unauthorized disclosure of personal data to the OSCA
            administrator immediately.
          </li>
        </ul>
      </>
    ),
  },
  {
    title: "Monitoring and audit logs",
    body: (
      <p>
        Actions taken under each account, including sign-ins and changes to records, are recorded in
        an audit log that administrators review to protect the data and investigate misuse.
      </p>
    ),
  },
  {
    title: "Suspension and termination",
    body: (
      <p>
        The OSCA administrator may suspend or remove an account at any time, including when a user
        leaves their post or breaks these terms. Misuse of personal data may also lead to
        administrative, civil, or criminal liability.
      </p>
    ),
  },
  {
    title: "Changes to these terms",
    body: (
      <p>
        OSCA may update these terms. Continuing to use the portal after a change means you accept
        the updated terms.
      </p>
    ),
  },
];

export function TermsDialog({
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
      title="Terms and Conditions"
      lastUpdated={TERMS_LAST_UPDATED}
      sections={SECTIONS}
      acceptClassName={authSubmitClass}
    />
  );
}
