import { createFileRoute, Link } from "@tanstack/react-router";
import type { AgreementSection } from "@/components/AgreementDialog";
import { LegalPage } from "@/components/LegalPage";
import { publicPageHead } from "@/lib/seo";

export const Route = createFileRoute("/privacy-policy")({
  head: () =>
    publicPageHead(
      "/privacy-policy",
      "Privacy Policy — Bulan SeniorCare",
      "How the Office of Senior Citizen Affairs of LGU-Bulan collects, uses and protects personal information in the Bulan SeniorCare portal.",
    ),
  component: PrivacyPolicyPage,
});

const SECTIONS: AgreementSection[] = [
  {
    title: "Who we are",
    body: (
      <p>
        Bulan SeniorCare is run by the Office of Senior Citizen Affairs (OSCA) of the Municipality
        of Bulan, Sorsogon. OSCA is the personal information controller for the records kept in the
        portal and is responsible for them under the Data Privacy Act of 2012 (Republic Act No.
        10173), its Implementing Rules and Regulations, and issuances of the National Privacy
        Commission (NPC).
      </p>
    ),
  },
  {
    title: "Information we collect",
    body: (
      <>
        <p>
          <strong>About senior citizens</strong>, when OSCA staff or a barangay senior citizen
          president registers them:
        </p>
        <ul>
          <li>Name, birthdate, place of birth, sex, civil status, address, and contact number.</li>
          <li>Educational attainment, skills, and family composition.</li>
          <li>Senior citizen association membership and OSCA ID number.</li>
          <li>Photo, valid ID, birth certificate, and other supporting documents.</li>
          <li>Eligibility decisions, benefit requests, and records of benefits released.</li>
        </ul>
        <p>
          <strong>About portal users</strong> (OSCA staff and barangay presidents):
        </p>
        <ul>
          <li>Name, email address, role, barangay, and profile photo.</li>
          <li>Messages and attachments sent through the portal.</li>
          <li>
            Sign-in times, IP address, and an audit log of the changes each account makes to
            records.
          </li>
        </ul>
        <p>
          <strong>About visitors</strong> to the public pages: the hosting providers keep standard
          server logs (IP address, browser type, pages requested, and time). We do not use
          advertising or analytics trackers.
        </p>
      </>
    ),
  },
  {
    title: "How we use it",
    body: (
      <ul>
        <li>To register senior citizens of Bulan and issue OSCA ID numbers.</li>
        <li>To check eligibility for benefits, such as the social pension and grants.</li>
        <li>To release benefits and keep a record of what each senior received.</li>
        <li>To contact seniors and presidents about benefits and OSCA announcements.</li>
        <li>
          To prepare reports and statistics for the municipality, which do not name individuals.
        </li>
        <li>To sign users in, keep accounts secure, and investigate misuse.</li>
      </ul>
    ),
  },
  {
    title: "Legal basis",
    body: (
      <p>
        OSCA processes this information to carry out its functions under Republic Act No. 7432 as
        amended by Republic Acts No. 9257 and 9994 (the Expanded Senior Citizens Act), Republic Act
        No. 11916 (social pension), and related laws, and with the consent each senior gives at
        registration through the Data Privacy Consent form.
      </p>
    ),
  },
  {
    title: "Who can see it",
    body: (
      <>
        <p>
          Only signed-in, authorized users can open records, and each role sees only what it needs:
          barangay presidents see the seniors of their own barangay, and the OSCA Head and
          administrators see municipal records.
        </p>
        <p>
          OSCA shares information with other government agencies (such as the DSWD or the municipal
          treasury) only when needed to deliver a benefit, or when the law, a court, or another
          lawful authority requires it. We never sell personal information.
        </p>
        <p>
          The portal is hosted by service providers (Railway for the application and database, and
          Vercel for the website) that store and process data on our behalf and may keep it on
          servers outside the Philippines. Web fonts are loaded from Google Fonts, which receives
          your IP address when a page loads.
        </p>
      </>
    ),
  },
  {
    title: "How we protect it",
    body: (
      <ul>
        <li>All traffic to the portal is encrypted with HTTPS.</li>
        <li>
          Sign-in uses a secure, HttpOnly session cookie that page scripts cannot read, and sessions
          end after a period of inactivity.
        </li>
        <li>
          Identity documents and message attachments are stored privately and opened only by
          signed-in users with access.
        </li>
        <li>Role-based permissions limit who can view or change each record.</li>
        <li>Every change to a record is written to an audit log.</li>
      </ul>
    ),
  },
  {
    title: "How long we keep it",
    body: (
      <p>
        Senior records are kept while the senior is registered and afterwards for as long as
        government record-keeping rules (including those of the National Archives of the Philippines
        and the Commission on Audit) require. User accounts are kept while the user holds a role in
        OSCA or a barangay association. Audit logs are kept for as long as needed for
        accountability. Records no longer needed are securely deleted or anonymized.
      </p>
    ),
  },
  {
    title: "Your rights",
    body: (
      <>
        <p>Under the Data Privacy Act, you have the right to:</p>
        <ul>
          <li>Be informed of how your personal information is processed.</li>
          <li>Access your record and ask for a copy.</li>
          <li>Have inaccurate or outdated information corrected.</li>
          <li>Object to processing, or ask for erasure or blocking, where the law allows.</li>
          <li>Receive your information in a portable format, where applicable.</li>
          <li>Be compensated for damages caused by unlawful processing.</li>
          <li>File a complaint with the National Privacy Commission (privacy.gov.ph).</li>
        </ul>
      </>
    ),
  },
  {
    title: "Cookies",
    body: (
      <p>
        The portal uses only the cookies and browser storage it needs to work. See the{" "}
        <Link to="/cookie-policy">Cookie Policy</Link> for the full list.
      </p>
    ),
  },
  {
    title: "Personal data breaches",
    body: (
      <p>
        If a breach puts personal information at risk, OSCA will notify the National Privacy
        Commission and the affected individuals as the Data Privacy Act and NPC Circular No. 16-03
        require.
      </p>
    ),
  },
  {
    title: "Changes to this policy",
    body: (
      <p>
        We may update this policy when the portal or the law changes. The date at the top shows when
        it last changed.
      </p>
    ),
  },
  {
    title: "Contact us",
    body: (
      <p>
        To exercise your rights or ask about this policy, visit or contact the Office of Senior
        Citizen Affairs at the Municipal Hall of Bulan, Sorsogon, and ask for its Data Protection
        Officer.
      </p>
    ),
  },
];

function PrivacyPolicyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro={
        <p>
          This policy explains what personal information the Bulan SeniorCare portal collects, why,
          who can see it, and the rights you have over it.
        </p>
      }
      sections={SECTIONS}
    />
  );
}
