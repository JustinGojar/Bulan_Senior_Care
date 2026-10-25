import { createFileRoute, Link } from "@tanstack/react-router";
import type { AgreementSection } from "@/components/AgreementDialog";
import { LegalPage } from "@/components/LegalPage";
import { publicPageHead } from "@/lib/seo";

export const Route = createFileRoute("/terms-of-service")({
  head: () =>
    publicPageHead(
      "/terms-of-service",
      "Terms of Service — Bulan SeniorCare",
      "The rules for using the Bulan SeniorCare portal of the Office of Senior Citizen Affairs of LGU-Bulan, Sorsogon.",
    ),
  component: TermsOfServicePage,
});

const SECTIONS: AgreementSection[] = [
  {
    title: "About the portal",
    body: (
      <p>
        Bulan SeniorCare is the senior citizen profiling and benefit monitoring system of the Office
        of Senior Citizen Affairs (OSCA) of the Municipality of Bulan, Sorsogon. It is a government
        tool for OSCA staff and barangay senior citizen leaders. The public pages are open to
        everyone; the rest of the portal is only for authorized users.
      </p>
    ),
  },
  {
    title: "Accepting these terms",
    body: (
      <p>
        By opening or signing in to the portal, you agree to these terms and to the{" "}
        <Link to="/privacy-policy">Privacy Policy</Link>. If you do not agree, do not use the
        portal.
      </p>
    ),
  },
  {
    title: "Accounts",
    body: (
      <ul>
        <li>Accounts are issued only by the OSCA administrator. There is no public sign-up.</li>
        <li>
          Keep your password secret and do not share your account. You are responsible for
          everything done under it.
        </li>
        <li>
          Tell the OSCA administrator right away if you think someone else has used your account.
        </li>
        <li>
          OSCA may suspend or remove an account when the user leaves their role, breaks these terms,
          or to protect the portal.
        </li>
      </ul>
    ),
  },
  {
    title: "Acceptable use",
    body: (
      <>
        <p>When you use the portal, you agree to:</p>
        <ul>
          <li>Use it only for official OSCA and barangay senior citizen work.</li>
          <li>Enter information that is true, complete, and backed by proper documents.</li>
          <li>Open only the records you need for your duties.</li>
          <li>
            Keep personal information you see confidential, and not copy, export, print, or share it
            except as your duties require.
          </li>
        </ul>
        <p>You must not:</p>
        <ul>
          <li>Register fictitious seniors or submit false or altered documents.</li>
          <li>Try to access accounts, records, or features you are not authorized to use.</li>
          <li>
            Probe, scan, overload, or interfere with the portal, or upload malware or harmful files.
          </li>
          <li>Use the portal or its data for personal, commercial, or political purposes.</li>
        </ul>
        <p>
          Misuse may lead to account removal, administrative action, and liability under the Data
          Privacy Act, the Cybercrime Prevention Act of 2012 (Republic Act No. 10175), and other
          laws.
        </p>
      </>
    ),
  },
  {
    title: "Records and benefits",
    body: (
      <p>
        The portal helps OSCA keep records and track benefits, but it does not by itself decide
        anyone&apos;s rights. Eligibility for and release of benefits follow the applicable laws,
        national agency guidelines, municipal ordinances, and available funds. A record or status
        shown in the portal is not a guarantee that a benefit will be granted.
      </p>
    ),
  },
  {
    title: "Fees",
    body: (
      <p>
        Using the portal is free. See the <Link to="/refund-policy">Refund Policy</Link> for
        details.
      </p>
    ),
  },
  {
    title: "Ownership",
    body: (
      <p>
        The portal, its design, and the records in it belong to the Municipality of Bulan. Content
        you upload remains subject to OSCA&apos;s record-keeping duties, and you give OSCA the right
        to store and use it for the purposes in the Privacy Policy.
      </p>
    ),
  },
  {
    title: "Availability",
    body: (
      <p>
        We work to keep the portal available and accurate, but it is provided &quot;as is&quot; and
        &quot;as available&quot;. It may be unavailable during maintenance, updates, or outages
        beyond our control. Keep any paper records required by your office.
      </p>
    ),
  },
  {
    title: "Limitation of liability",
    body: (
      <p>
        To the extent the law allows, the Municipality of Bulan and OSCA are not liable for indirect
        or consequential loss arising from the use of, or inability to use, the portal. Nothing in
        these terms limits any liability that cannot be limited under Philippine law.
      </p>
    ),
  },
  {
    title: "Changes to these terms",
    body: (
      <p>
        We may update these terms when the portal or the law changes. The date at the top shows when
        they last changed. Continuing to use the portal after a change means you accept it.
      </p>
    ),
  },
  {
    title: "Governing law",
    body: (
      <p>
        These terms are governed by the laws of the Republic of the Philippines. Disputes will be
        brought before the proper courts of the Province of Sorsogon.
      </p>
    ),
  },
  {
    title: "Contact us",
    body: (
      <p>
        For questions about these terms, visit or contact the Office of Senior Citizen Affairs at
        the Municipal Hall of Bulan, Sorsogon.
      </p>
    ),
  },
];

function TermsOfServicePage() {
  return (
    <LegalPage
      title="Terms of Service"
      intro={<p>These terms set the rules for using the Bulan SeniorCare portal.</p>}
      sections={SECTIONS}
    />
  );
}
