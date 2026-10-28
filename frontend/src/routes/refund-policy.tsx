import { createFileRoute } from "@tanstack/react-router";
import type { AgreementSection } from "@/components/AgreementDialog";
import { LegalPage } from "@/components/LegalPage";
import { publicPageHead } from "@/lib/seo";

export const Route = createFileRoute("/refund-policy")({
  head: () =>
    publicPageHead(
      "/refund-policy",
      "Refund Policy — Bulan SeniorCare",
      "Bulan SeniorCare is free to use. Learn how fees, payments and benefit corrections are handled.",
    ),
  component: RefundPolicyPage,
});

const SECTIONS: AgreementSection[] = [
  {
    title: "The portal is free",
    body: (
      <p>
        Bulan SeniorCare does not charge senior citizens, their families, barangay presidents, or
        OSCA staff anything to use it. The portal does not accept payments, so there is nothing to
        refund through it.
      </p>
    ),
  },
  {
    title: "Registration and OSCA IDs",
    body: (
      <p>
        Registering as a senior citizen of Bulan and getting an OSCA ID are free. If anyone asks you
        to pay to be registered, to speed up an application, or to receive a benefit, do not pay,
        and report it to the OSCA office.
      </p>
    ),
  },
  {
    title: "Fees paid at the municipal office",
    body: (
      <p>
        Any fee for a service of the municipality outside this portal (for example, a replacement ID
        or a certified copy of a document, where an ordinance sets one) is paid at the Municipal
        Treasurer&apos;s Office against an official receipt. Refunds of such fees follow the
        Municipality of Bulan&apos;s revenue code and Commission on Audit rules. Bring your official
        receipt to the Municipal Treasurer&apos;s Office to ask for one.
      </p>
    ),
  },
  {
    title: "Benefits",
    body: (
      <p>
        Benefits such as the social pension and cash grants are released by the government, not
        bought, so they are not covered by a refund policy. If a benefit was recorded wrongly, was
        not received, or was released to the wrong person, report it to OSCA. OSCA will review the
        record and correct it following the guidelines of the agency that funds the benefit.
      </p>
    ),
  },
  {
    title: "Contact us",
    body: (
      <p>
        For questions about fees or benefit records, visit or contact the Office of Senior Citizen
        Affairs at the Municipal Hall of Bulan, Sorsogon.
      </p>
    ),
  },
];

function RefundPolicyPage() {
  return (
    <LegalPage
      title="Refund Policy"
      intro={<p>This policy explains how fees, payments, and benefit records are handled.</p>}
      sections={SECTIONS}
    />
  );
}
