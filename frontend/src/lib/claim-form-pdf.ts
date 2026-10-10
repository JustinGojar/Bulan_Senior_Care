import type { jsPDF } from "jspdf";
import arimoBoldItalicUrl from "@/fonts/Arimo-BoldItalic.ttf?url";
import arimoBoldUrl from "@/fonts/Arimo-Bold.ttf?url";
import arimoItalicUrl from "@/fonts/Arimo-Italic.ttf?url";
import arimoRegularUrl from "@/fonts/Arimo-Regular.ttf?url";
import kalamUrl from "@/fonts/Kalam-Regular.ttf?url";
import type { Senior } from "@/lib/osca-data";

// A4 portrait with 12 mm margins.
const L = 12;
const W = 186;
const R = L + W;
const NAVY: [number, number, number] = [31, 56, 110];
// The printed form is set in Arial with a handwritten tagline. Arimo has Arial's letter
// shapes and widths, and Kalam stands in for the handwriting; both are open-licensed.
const FONT = "Arimo";
const SCRIPT_FONT = "Kalam";
const FONT_FILES: Array<[url: string, family: string, style: string]> = [
  [arimoRegularUrl, FONT, "normal"],
  [arimoBoldUrl, FONT, "bold"],
  [arimoItalicUrl, FONT, "italic"],
  [arimoBoldItalicUrl, FONT, "bolditalic"],
  [kalamUrl, SCRIPT_FONT, "normal"],
];

async function embedFonts(pdf: jsPDF) {
  const files = await Promise.all(
    FONT_FILES.map(async ([url]) => new Uint8Array(await (await fetch(url)).arrayBuffer())),
  );
  files.forEach((bytes, index) => {
    const [, family, style] = FONT_FILES[index]!;
    let binary = "";
    for (let offset = 0; offset < bytes.length; offset += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
    }
    const fileName = `${family}-${style}.ttf`;
    pdf.addFileToVFS(fileName, btoa(binary));
    pdf.addFont(fileName, family, style);
  });
}
const BULAN_ZIP = "4706";

type Style = "normal" | "bold" | "italic" | "bolditalic";

function lineHeight(size: number) {
  return size * 0.42;
}

/** Writes wrapped text and returns the y below it. */
function wrap(
  pdf: jsPDF,
  text: string,
  x: number,
  y: number,
  width: number,
  size = 7,
  style: Style = "normal",
) {
  pdf.setFont(FONT, style);
  pdf.setFontSize(size);
  const lines = pdf.splitTextToSize(text, width) as string[];
  pdf.text(lines, x, y);
  return y + lines.length * lineHeight(size);
}

/** A dark section bar like the printed form's headings. */
function bar(pdf: jsPDF, y: number, label: string, height = 6) {
  pdf.setFillColor(...NAVY);
  pdf.rect(L, y, W, height, "F");
  pdf.setTextColor(255, 255, 255);
  wrap(pdf, label, L + 2, y + height / 2 + 1.2, W - 4, 8, "bold");
  pdf.setTextColor(0, 0, 0);
  return y + height;
}

/** A labelled box; the value, when known, is printed in capitals at the bottom. */
function field(pdf: jsPDF, x: number, y: number, w: number, h: number, label: string, value = "") {
  pdf.rect(x, y, w, h);
  wrap(pdf, label, x + 1.2, y + 2.8, w - 2.4, 6, "bold");
  if (value) {
    pdf.setFont(FONT, "bold");
    pdf.setFontSize(9);
    pdf.text(
      (pdf.splitTextToSize(value.toUpperCase(), w - 3) as string[])[0] ?? "",
      x + 1.5,
      y + h - 1.8,
    );
  }
}

function checkbox(pdf: jsPDF, x: number, y: number, label: string, checked = false, size = 6.5) {
  pdf.rect(x, y - 2.5, 2.8, 2.8);
  if (checked) {
    pdf.line(x + 0.4, y - 2.1, x + 2.4, y - 0.1);
    pdf.line(x + 2.4, y - 2.1, x + 0.4, y - 0.1);
  }
  pdf.setFont(FONT, "normal");
  pdf.setFontSize(size);
  pdf.text(label, x + 4, y);
}

function blankLine(pdf: jsPDF, label: string, x: number, y: number, width: number) {
  pdf.setFont(FONT, "normal");
  pdf.setFontSize(7);
  pdf.text(label, x, y);
  pdf.line(x + pdf.getTextWidth(label) + 1, y + 0.5, x + width, y + 0.5);
}

function pageFooter(pdf: jsPDF, page: number) {
  pdf.setFont(FONT, "bold");
  pdf.setFontSize(7);
  pdf.text(`PAGE ${page} OF 4`, 105, 290, { align: "center" });
}

function usDate(date?: string) {
  if (!date) return "";
  const [year, month, day] = date.slice(0, 10).split("-");
  return year && month && day ? `${month}/${day}/${year}` : date;
}

type FamilyMember = { name: string; relationship: string; age: string };

// Family composition is stored as "Name | Relationship | Age | Status | Occupation" lines.
function familyMembers(senior: Senior): FamilyMember[] {
  return (senior.familyComposition ?? "")
    .split(/\r?\n/)
    .map((line) => line.split("|").map((cell) => cell.trim()))
    .filter((cells) => cells[0])
    .map(([name = "", relationship = "", age = ""]) => ({ name, relationship, age }));
}

const PAYMENT_MODES = [
  "Landbank of the Philippines (PISO or Savings Account)",
  "Other Banks (including rural banks and overseas banks for Grantees based abroad, existing GSIS, SSS, PVAO Pension bank accounts are accepted)",
  "Electronic Money Issuers (EMIs) through GCash Verified Account",
  "Payment Service Providers (PSP) through Palawan Pawnshop Branches (make sure cellphone number above is active)",
];

/** The payout options and account details, shared by the grantee (E) and claimant (F.6-F.7). */
function paymentSection(
  pdf: jsPDF,
  y: number,
  modeLabel: string,
  detailsLabel: string,
  owner: string,
) {
  const noteX = L + 140;
  pdf.rect(L, y, W, 40);
  pdf.line(noteX, y, noteX, y + 40);
  let rowY = wrap(pdf, modeLabel, L + 1.5, y + 3, 136, 6.5, "bold") + 1.5;
  for (const mode of PAYMENT_MODES) {
    checkbox(pdf, L + 3, rowY + 1, "", false);
    rowY = wrap(pdf, mode, L + 7, rowY + 1, 130, 6.5) + 1.2;
  }
  wrap(
    pdf,
    `Note:\n• For bank accounts, attach bank-verified deposit slip reflecting the name of ${owner} (especially for joint accounts).\n• For GCash or online banking, attach screenshot or Profile Information reflecting account number and name of ${owner}.`,
    noteX + 1.5,
    y + 3,
    W - 143,
    6,
  );
  y += 40;
  pdf.rect(L, y, W, 34);
  wrap(pdf, detailsLabel, L + 1.5, y + 3.5, 120, 6.5, "bold");
  const lines = [
    "Account No.:",
    "Bank/GCash name (no acronym):",
    "Branch Name (no acronym):",
    "Bank Address:",
    "Is this a Joint Account (Yes/No)?",
  ];
  lines.forEach((label, index) => blankLine(pdf, label, L + 3, y + 9 + index * 4.6, 120));
  wrap(pdf, "For Living Abroad Only:", L + 128, y + 9, 56, 6.5, "bolditalic");
  blankLine(pdf, "BIC/SWIFT CODE:", L + 128, y + 14, 56);
  blankLine(pdf, "IBAN for European Countries:", L + 128, y + 19, 56);
  return y + 34;
}

/**
 * The NCSC Annex A Grantee Claim Form for an Expanded Centenarians Act cash gift (R.A. No.
 * 11982), filled in with what the system knows about the senior. Bank details, the NCSC
 * registration number and the staff checklist are completed by hand.
 */
export async function downloadClaimForm(senior: Senior) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  await embedFonts(pdf);
  pdf.setLineWidth(0.25);
  const members = familyMembers(senior);
  const spouse = members.find((member) => /spouse|wife|husband/i.test(member.relationship));
  const children = members
    .filter((member) => /son|daughter|child/i.test(member.relationship))
    .slice(0, 5);
  const civil = (senior.civilStatus ?? "").toLowerCase();
  const street = senior.address.split(",")[0]?.trim() ?? "";

  // Page 1: consent, place of submission and personal information.
  pdf.setFont(FONT, "bold");
  pdf.setFontSize(10);
  pdf.text("Republic of the Philippines", 105, 11, { align: "center" });
  pdf.setFont(FONT, "normal");
  pdf.setFontSize(9.5);
  pdf.text("Office of the President", 105, 15, { align: "center" });
  pdf.setFont(FONT, "bold");
  pdf.setFontSize(13);
  pdf.setTextColor(...NAVY);
  pdf.text("NATIONAL COMMISSION OF SENIOR CITIZENS", 105, 20.5, { align: "center" });
  pdf.setTextColor(0, 0, 0);
  pdf.setFont(FONT, "normal");
  pdf.setFontSize(8);
  pdf.text("20th Floor, The Upper Class Tower, Quezon Avenue Corner Scout Reyes,", 105, 24.5, {
    align: "center",
  });
  pdf.text("Barangay Paligsahan, District 4, Quezon City", 105, 28, { align: "center" });
  pdf.setFont(FONT, "bold");
  pdf.setFontSize(13);
  pdf.text("ANNEX A", R, 34, { align: "right" });
  pdf.setFont(FONT, "normal");
  pdf.setFontSize(5.5);
  pdf.text("This form is not for sale", R, 36.6, { align: "right" });

  let y = 37.5;
  pdf.rect(L, y, W, 14);
  pdf.setFont(FONT, "bold");
  pdf.setFontSize(12);
  pdf.text("GRANTEE CLAIM FORM", 105, y + 5.5, { align: "center" });
  pdf.setFont(SCRIPT_FONT, "normal");
  pdf.setFontSize(13);
  pdf.text("“Honoring Filipino Octogenarians, Nonagenarians and Centenarians”", 105, y + 11.8, {
    align: "center",
  });
  y += 14;
  pdf.rect(L, y, W, 18);
  pdf.setFont(FONT, "bold");
  pdf.setFontSize(7.5);
  pdf.text("PURPOSE:", L + 2, y + 3.8);
  pdf.setFont(FONT, "normal");
  pdf.text(
    "To claim the cash gift under Republic Act (R.A.) No. 11982.",
    L + 2 + pdf.getTextWidth("PURPOSE: "),
    y + 3.8,
  );
  pdf.setFont(FONT, "bold");
  pdf.text("INSTRUCTIONS:", L + 2, y + 7.2);
  wrap(
    pdf,
    '1. Fill-out this form completely and correctly.\n2. Do not leave any blank space. If not applicable, kindly indicate "N/A".\n3. Write legibly and in CAPITAL letters.',
    L + 2,
    y + 10.4,
    W - 4,
    7.5,
  );
  y += 18;

  y = bar(pdf, y, "A. DATA PRIVACY CONSENT");
  pdf.rect(L, y, W, 15);
  wrap(
    pdf,
    "In compliance with R.A. No. 10173, known as the “Data Privacy Act of 2012”, its Implementing Rules and Regulations, and issuances of the National Privacy Commission, I hereby consent the NCSC to collect, use, and process my personal information for the implementation of the R.A. No. 11982 or the ECA.",
    L + 2,
    y + 3.5,
    W - 4,
    6.8,
  );
  checkbox(pdf, L + 50, y + 12.5, "Consent", Boolean(senior.privacyConsentAt), 7);
  checkbox(pdf, L + 120, y + 12.5, "Dissent", false, 7);
  y += 15;

  y = bar(pdf, y, "B. PLACE OF SUBMISSION");
  pdf.rect(L, y, W, 7);
  checkbox(pdf, L + 50, y + 4.8, "Local (within the PH)", true, 7);
  checkbox(pdf, L + 120, y + 4.8, "Abroad", false, 7);
  y += 7;

  y = bar(pdf, y, "C. PERSONAL INFORMATION");
  const left = 112;
  const rows: Array<[string, string, string, string]> = [
    [
      "C.1 NCSC Registration Reference Number (mandatory)",
      "",
      "C.2 LGU OSCA ID Number:",
      senior.id,
    ],
    ["C.3 FIRST NAME", senior.firstName ?? "", "C.4 MIDDLE NAME", senior.middleName ?? ""],
    ["C.5 LAST NAME", senior.lastName ?? "", "C.6 SUFFIX (Sr./Jr./II/III)", senior.suffix ?? ""],
    [
      "C.7 DATE OF BIRTH (Month/Date/Year) Attach photocopies of primary or secondary IDs, whichever is available, to present original upon submission",
      usDate(senior.birthdate),
      "C.8 CELLPHONE NUMBER (This will receive updates/status on the cash gift)",
      senior.contact.startsWith("+63") ? `0${senior.contact.slice(3)}` : senior.contact,
    ],
  ];
  for (const [labelA, valueA, labelB, valueB] of rows) {
    const height = labelA.length > 60 ? 13 : 10;
    field(pdf, L, y, left, height, labelA, valueA);
    field(pdf, L + left, y, W - left, height, labelB, valueB);
    y += height;
  }

  const addressRow = (label: string, parts: Array<[string, string]>) => {
    pdf.rect(L, y, W, 13);
    wrap(pdf, label, L + 1.2, y + 2.8, W - 2.4, 6, "bold");
    const widths = [20, 46, 40, 36, 28, 16];
    let x = L;
    parts.forEach(([caption, value], index) => {
      const width = widths[index] ?? 20;
      pdf.setFont(FONT, "bold");
      pdf.setFontSize(8.5);
      pdf.text(
        (pdf.splitTextToSize(value.toUpperCase(), width - 2) as string[])[0] ?? "",
        x + 1.2,
        y + 8,
      );
      pdf.line(x + 1, y + 9, x + width - 1, y + 9);
      pdf.setFont(FONT, "italic");
      pdf.setFontSize(6);
      pdf.text(caption, x + 1.2, y + 11.8);
      x += width;
    });
    y += 13;
  };
  addressRow("C.9.1 ADDRESS IN THE PHILIPPINES (*indicate if caregiving facility)", [
    ["House #", ""],
    ["Street name", street],
    ["Barangay", senior.barangay],
    ["City/Municipality", "Bulan"],
    ["Province", "Sorsogon"],
    ["Zip Code", BULAN_ZIP],
  ]);
  addressRow("C.9.2 ADDRESS ABROAD (for living abroad only)", [
    ["House #", ""],
    ["Street name", ""],
    ["City", ""],
    ["State", ""],
    ["Country", ""],
    ["Zip Code", ""],
  ]);

  const boxHeight = 24;
  const quarters = [36, 50, 50, 50];
  let x = L;
  quarters.forEach((width) => {
    pdf.rect(x, y, width, boxHeight);
    x += width;
  });
  wrap(pdf, "C.10 SEX", L + 1.2, y + 2.8, 34, 6, "bold");
  checkbox(pdf, L + 3, y + 9, "Male", senior.sex === "male");
  checkbox(pdf, L + 3, y + 14, "Female", senior.sex === "female");
  x = L + 36;
  wrap(pdf, "C.11 CIVIL STATUS", x + 1.2, y + 2.8, 48, 6, "bold");
  const civilOptions: Array<[string, boolean]> = [
    ["Single", civil === "single"],
    ["Married", civil === "married"],
    ["Widow/Widower", civil.startsWith("widow")],
    ["Common-Law", civil.includes("common")],
  ];
  civilOptions.forEach(([label, checked], index) =>
    checkbox(pdf, x + 3, y + 7 + index * 3.8, label, checked),
  );
  const otherCivil = civil && !civilOptions.some(([, checked]) => checked);
  checkbox(
    pdf,
    x + 3,
    y + 22.2,
    `Others: ${otherCivil ? senior.civilStatus : "________"}`,
    Boolean(otherCivil),
  );
  x += 50;
  wrap(pdf, "C.12 CITIZENSHIP", x + 1.2, y + 2.8, 48, 6, "bold");
  checkbox(pdf, x + 3, y + 9, "Filipino");
  checkbox(pdf, x + 3, y + 14, "Dual citizen. Indicate details:");
  pdf.line(x + 7, y + 19.5, x + 47, y + 19.5);
  x += 50;
  wrap(pdf, "C.13 DISABILITY", x + 1.2, y + 2.8, 48, 6, "bold");
  wrap(pdf, "Are you a person with disability?", x + 2, y + 7, 46, 6.3);
  checkbox(pdf, x + 3, y + 11.5, "Yes");
  checkbox(pdf, x + 20, y + 11.5, "No");
  wrap(pdf, "If yes, state the type of disability:", x + 2, y + 16, 46, 6.3);
  pdf.line(x + 2, y + 21.5, x + 48, y + 21.5);
  y += boxHeight;

  pdf.rect(L, y, W, 12);
  wrap(pdf, "C.14 ETHNICITY", L + 1.2, y + 2.8, 60, 6, "bold");
  wrap(pdf, "Are you a member of the Indigenous Peoples (IP)?", L + 2, y + 7, 80, 6.5);
  checkbox(pdf, L + 3, y + 10.5, "Yes");
  checkbox(pdf, L + 20, y + 10.5, "No");
  blankLine(pdf, "If yes, indicate the tribe/group:", L + 95, y + 10, 88);
  pageFooter(pdf, 1);

  // Page 2: family, grantee's account and deceased grantees.
  pdf.addPage();
  y = 12;
  y = bar(pdf, y, "D. FAMILY INFORMATION");
  field(
    pdf,
    L,
    y,
    130,
    10,
    "D.1 NAME OF SPOUSE (Last Name, First Name, Middle Name, Ext.)",
    spouse?.name ?? "",
  );
  field(pdf, L + 130, y, W - 130, 10, "D.2 CONTACT NUMBER");
  y += 10;
  const childColumns: Array<[string, number]> = [
    [
      "D.3 NAME OF CHILDREN (Last Name, First Name, Middle Name, Ext.) Put * asterisk after the name if s/he serves as the primary contact person for the grantee",
      100,
    ],
    ["D.4 SEX", 22],
    ["D.5 AGE", 22],
    ["D.6 CELLPHONE NUMBERS", 42],
  ];
  x = L;
  for (const [label, width] of childColumns) {
    pdf.rect(x, y, width, 12);
    wrap(pdf, label, x + 1.2, y + 2.8, width - 2.4, 6, "bold");
    x += width;
  }
  y += 12;
  for (let index = 0; index < 5; index++) {
    const child = children[index];
    x = L;
    const values = [
      child?.name ?? "",
      child
        ? /daughter/i.test(child.relationship)
          ? "F"
          : /son/i.test(child.relationship)
            ? "M"
            : ""
        : "",
      child?.age ?? "",
      "",
    ];
    childColumns.forEach(([, width], column) => {
      pdf.rect(x, y, width, 7);
      pdf.setFont(FONT, "normal");
      pdf.setFontSize(7);
      pdf.text(`${index + 1})`, x + 1.2, y + 4.6);
      if (values[column]) {
        pdf.setFont(FONT, "bold");
        pdf.setFontSize(8.5);
        pdf.text(
          (pdf.splitTextToSize(values[column]!.toUpperCase(), width - 8) as string[])[0] ?? "",
          x + 6,
          y + 4.8,
        );
      }
      x += width;
    });
    y += 7;
  }
  wrap(pdf, "Note: Use separate sheet, if necessary.", L + 1, y + 3, 100, 6, "italic");
  y += 5;

  y = bar(
    pdf,
    y,
    "E. GRANTEE'S TRANSACTION ACCOUNT (If grantee is deceased, skip this and proceed to Section F)",
  );
  y = paymentSection(
    pdf,
    y,
    "E.1 PREFERRED MODE TO RECEIVE THE CASH GIFT (please check only one and make sure this is under the Grantee's name)",
    "E.2 ACCOUNT DETAILS",
    "GRANTEE",
  );

  y = bar(
    pdf,
    y,
    "F. FOR DECEASED GRANTEES (Attach accomplished Warranty and Release From Liability Form)",
  );
  field(
    pdf,
    L,
    y,
    100,
    24,
    "F.1 DATE OF DEATH (attach photocopy of death certificate issued by the Philippine Statistics Authority (PSA)/Local Civil Registrar (LCR) or overseas-equivalent death certificate, should be apostilled if not issued/certified by the PH Embassy, to present original copy upon submission)",
    usDate(senior.deceased?.dateOfDeath),
  );
  field(
    pdf,
    L + 100,
    y,
    W - 100,
    24,
    "F.2 CONTACT NUMBER AND EMAIL ADDRESS OF CLAIMANT (This will receive updates/status on the cash gift)",
  );
  y += 24;
  field(
    pdf,
    L,
    y,
    W,
    14,
    "F.3 NAME OF CLAIMANT (Last Name, First Name, Middle Name, Ext.) (attach photocopy of PSA/LCR or equivalent documents as proof of relationship, to present original copy upon submission)",
  );
  y += 14;
  pdf.rect(L, y, W, 13);
  wrap(
    pdf,
    "Note: In case the Grantee is without known immediate relatives or next of kin, the caregiver of the facility's management that provided care, shelter, and/or support including the payment of medical and funeral expenses for the grantee's, may claim on behalf of the deceased, provided that there is a certification issued by the concerned Local Government Unit (LGU) or Residential Care Facility (RCF).",
    L + 1.5,
    y + 3,
    W - 3,
    6.3,
    "italic",
  );
  pageFooter(pdf, 2);

  // Page 3: claimant details and attestation.
  pdf.addPage();
  y = 12;
  addressRow("F.4 PERMANENT ADDRESS OF THE CLAIMANT IN THE PHILIPPINES OR ABROAD", [
    ["House number", ""],
    ["Street", ""],
    ["Barangay", ""],
    ["City/Municipality", ""],
    ["Province", ""],
    ["Zip Code", ""],
  ]);
  field(
    pdf,
    L,
    y,
    W,
    12,
    "F.5 RELATIONSHIP TO THE DECEASED (attach photocopy of PSA/LCR or equivalent documents as proof of relationship, to present original copies upon submission)",
  );
  y += 12;
  y = paymentSection(
    pdf,
    y,
    "F.6 CLAIMANT'S PREFERRED MODE TO RECEIVE THE CASH GIFT (please check only one and make sure this is under the name of the Claimant)",
    "F.7 ACCOUNT DETAILS",
    "CLAIMANT",
  );
  y = bar(pdf, y, "G. ATTESTATION / CERTIFICATION OF PROVIDED INFORMATION");
  const attestations = [
    "I hereby attest that all the information in this grantee/claim form is true and correct.",
    "I further warrant that I have complied with all the requirements, and I have presented all original documentary requirements.",
    "I understand that my application shall not be processed if any statement herein made is found to be false, or if any document I submitted is found to have been falsified, or if I fail to comply with all the requirements with respect to my application, without prejudice to whatever actions that may be taken against me in accordance with the applicable laws of the Republic of the Philippines.",
    "Further, I hereby certify that I have not filed claims for cash gifts nor submitted application documents in other barangays, municipalities, cities, provinces, or in other regions/countries.",
    "Should there be any violations or false attestation on the above statements, I will be held liable and accountable under civil law for misrepresentation and concealment of information, which shall warrant investigation, applicable charges, penalties and/or sanction.",
  ];
  const attestTop = y;
  y += 1.5;
  attestations.forEach((item, index) => {
    pdf.setFont(FONT, "normal");
    pdf.setFontSize(7);
    pdf.text(`${index + 1}`, L + 2, y + 3);
    y = wrap(pdf, item, L + 7, y + 3, W - 9, 7) + 1.2;
  });
  pdf.rect(L, attestTop, W, y - attestTop + 1);
  y += 1;
  field(
    pdf,
    L,
    y,
    130,
    22,
    "SIGNATURE / THUMBMARK OF GRANTEE/CLAIMANT OVER PRINTED NAME",
    senior.name,
  );
  field(pdf, L + 130, y, W - 130, 22, "DATE SIGNED:");
  y += 30;
  pdf.setFont(FONT, "bold");
  pdf.setFontSize(12);
  pdf.text("VERIFICATION CHECKLIST", 105, y, { align: "center" });
  pageFooter(pdf, 3);

  // Page 4: staff checklist and verification result.
  pdf.addPage();
  y = 12;
  y = bar(pdf, y, "DO NOT WRITE ANYTHING HERE.  FOR STAFF USE ONLY.", 7);
  const remarksX = L + 150;
  pdf.setFillColor(...NAVY);
  pdf.rect(L, y, 150, 6, "F");
  pdf.setTextColor(255, 255, 255);
  wrap(
    pdf,
    "H. CHECKLIST (to be filled-up by the Verifier/Concerned Staff)",
    L + 2,
    y + 4,
    146,
    7,
    "bold",
  );
  pdf.setTextColor(0, 0, 0);
  pdf.rect(remarksX, y, W - 150, 12);
  wrap(pdf, "REMARKS\n(note lacking docs)", remarksX + 2, y + 4, W - 154, 7, "bold");
  y += 6;
  pdf.rect(L, y, 150, 6);
  wrap(pdf, "DOCUMENTS", L + 60, y + 4.2, 80, 8, "bold");
  y += 6;
  const checklistTop = y;
  y =
    wrap(
      pdf,
      'Note: All should be with name and signature of the verifier and marked with "Verified from the original document"',
      L + 2,
      y + 3.5,
      146,
      6.8,
      "bolditalic",
    ) + 1;
  const grantee = [
    "Accomplished Annex A Grantee/Claimant Form",
    "Primary ID for Local Applicants: PSA/LCR issued birth certificate, PhilSys / National ID, or Valid Philippine Passport",
    'Primary ID for Applicants Abroad: Valid PH Passport or Identification Certificate, signed and marked with "Verified from the Original Document"',
    'Secondary IDs: Photocopy of any two (2) of the identified secondary ID in existing guidelines (indicate name of the two documents in the Remarks), signed and marked with "Verified from the Original Document"',
    "Whole-body/half-upper body photo",
    'Photocopy of Grantee\'s bank-verified deposit slip or screenshot of GCash Profile Information Sheet, signed and marked with "Verified from the Original Document", if applicable',
  ];
  const deceased = [
    'Photocopy PSA/LCR death certificate or apostilled equivalent document issued overseas, signed and marked with "verified from the original document".',
    'Proof of relationship: Photocopy of PSA/LCR certificates/documents or apostilled equivalent document issued overseas, as proof of relationship, signed and marked with "Verified from the Original Document"',
    "Photocopy of Claimant's Bank-verified deposit slip or screenshot of GCash Profile Information signed and marked with \"Verified from the Original Document\" (to replace Grantee's bank account)",
    "Original Copy of Warranty and Release From Liability Form",
    "Original LGU/RCF Certification of no relative",
  ];
  const checklistItem = (item: string) => {
    checkbox(pdf, L + 3, y + 3, "");
    y = wrap(pdf, item, L + 8, y + 3, 140, 7) + 1.2;
  };
  grantee.forEach(checklistItem);
  y = wrap(pdf, "Other documents for deceased grantees:", L + 2, y + 3, 146, 7, "bold") + 0.5;
  deceased.forEach(checklistItem);
  y += 2;
  pdf.rect(L, checklistTop, 150, y - checklistTop);
  pdf.rect(remarksX, checklistTop, W - 150, y - checklistTop);

  y = bar(pdf, y, "I. VERIFICATION RESULT (to be filled-up by the Verifier/Staff)");
  pdf.setFillColor(...NAVY);
  pdf.rect(L, y, W, 10, "F");
  pdf.setTextColor(255, 255, 255);
  wrap(
    pdf,
    "Note: This serves as the ACKNOWLEDGEMENT RECEIPT, once signed by the verifier. Provide grantee/claimant a photocopy or they may take a photo (digital copy, if preferred)",
    L + 2,
    y + 4,
    W - 4,
    7,
  );
  pdf.setTextColor(0, 0, 0);
  y += 10;
  pdf.rect(L, y, W, 52);
  checkbox(pdf, L + 60, y + 7, "Eligible", false, 8.5);
  checkbox(pdf, L + 110, y + 7, "Not eligible", false, 8.5);
  wrap(
    pdf,
    "I hereby certify that the original documents were presented, seen and verified by the undersigned.",
    L + 2,
    y + 13,
    W - 4,
    8.5,
  );
  pdf.line(L + 40, y + 29, R - 40, y + 29);
  wrap(
    pdf,
    "Signature over printed name of Verifier (LGU/OSCA Staff)",
    L + 62,
    y + 32,
    90,
    7,
    "italic",
  );
  pdf.line(L + 20, y + 43, R - 20, y + 43);
  wrap(
    pdf,
    "Name of office with location, Contact Numbers and Email Address of Verifier",
    L + 42,
    y + 46,
    120,
    7,
    "italic",
  );
  y += 52;
  field(pdf, L, y, 80, 14, "Date of Verification:");
  pdf.rect(L + 80, y, W - 80, 14);
  wrap(
    pdf,
    "Note: The NCSC Registration Number serves as the tracking number",
    L + 82,
    y + 4,
    W - 84,
    8,
    "bold",
  );
  pageFooter(pdf, 4);

  pdf.save(`Annex-A-Grantee-Claim-Form-${senior.id}.pdf`);
}
