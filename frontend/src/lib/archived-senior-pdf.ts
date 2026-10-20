import { benefitLabel, inactiveReasonLabel, type Senior } from "@/lib/osca-data";
import { loadPdfLogo } from "@/lib/pdf";

export type ArchiveDetails = {
  archivedAt: string;
  archivedBy?: string | null;
  generatedBy?: string | null;
};

const MARGIN = 18;
const LABEL_WIDTH = 52;
const LINE = 5;

function longDate(value?: string | null) {
  if (!value) return "";
  const parsed = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  return Number.isNaN(parsed.getTime())
    ? ""
    : parsed.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

/** Family members are stored as one "Name | Relationship | Age | Status | Occupation" line each. */
function familyRows(composition?: string) {
  return (composition ?? "")
    .split("\n")
    .map((line) => line.split("|").map((cell) => cell.trim()))
    .filter((cells) => cells.some(Boolean));
}

/** A one-record report of an archived senior: their information plus when and by whom it was archived. */
export async function downloadArchivedSeniorReport(senior: Senior, archive: ArchiveDetails) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const contentWidth = pageWidth - MARGIN * 2;
  const bottom = pageHeight - 20;
  const logo = await loadPdfLogo();
  let y = 0;

  const drawHeader = () => {
    pdf.addImage(logo, "PNG", MARGIN, 10, 18, 18);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.text("Municipality of Bulan, Sorsogon", pageWidth / 2, 15, { align: "center" });
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.text("Office of Senior Citizens Affairs (OSCA)", pageWidth / 2, 20, { align: "center" });
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(13);
    pdf.text("ARCHIVED SENIOR CITIZEN RECORD", pageWidth / 2, 28, { align: "center" });
    pdf.setDrawColor(180);
    pdf.line(MARGIN, 33, pageWidth - MARGIN, 33);
    y = 41;
  };

  const ensureSpace = (height: number) => {
    if (y + height <= bottom) return;
    pdf.addPage();
    drawHeader();
  };

  const section = (title: string) => {
    ensureSpace(14);
    y += 2;
    pdf.setFillColor(235, 235, 235);
    pdf.rect(MARGIN, y - 4.5, contentWidth, 7, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9.5);
    pdf.text(title.toUpperCase(), MARGIN + 2, y);
    y += 8;
  };

  const field = (label: string, value?: string | null) => {
    const lines = pdf.splitTextToSize(value?.trim() || "Not provided", contentWidth - LABEL_WIDTH);
    ensureSpace(lines.length * LINE);
    pdf.setFontSize(9.5);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(100);
    pdf.text(label, MARGIN + 2, y);
    pdf.setTextColor(0);
    pdf.setFont("helvetica", "bold");
    pdf.text(lines, MARGIN + LABEL_WIDTH, y);
    y += lines.length * LINE + 1;
  };

  drawHeader();

  section("Archive details");
  field("OSCA ID", senior.id);
  field("Archived on", longDate(archive.archivedAt));
  field("Archived by", archive.archivedBy);
  field("Status when archived", senior.status);
  if (senior.status === "Inactive") {
    field(
      "Reason for inactive",
      senior.inactiveReason ? inactiveReasonLabel(senior.inactiveReason) : "",
    );
  }
  if (senior.deceased) {
    field("Date of death", longDate(senior.deceased.dateOfDeath));
    field("Death certificate", senior.deceased.certificatePath ? "On file" : "Not on file");
  }
  if (senior.inactiveRemarks) field("Remarks", senior.inactiveRemarks);

  section("Personal information");
  field("Name", senior.name);
  field("Sex", senior.sex ? senior.sex[0]!.toUpperCase() + senior.sex.slice(1) : "");
  field("Date of birth", longDate(senior.birthdate));
  field("Age", senior.age ? String(senior.age) : "");
  field("Place of birth", senior.placeOfBirth);
  field("Civil status", senior.civilStatus);
  field("Contact number", senior.contact);
  field("Address", senior.address);
  field("Barangay", senior.barangay);
  field("Educational attainment", senior.educationalAttainment);
  field("Other skills", senior.otherSkills);
  field("Registration date", longDate(senior.registrationDate));
  field("Benefits", senior.benefit ? benefitLabel(senior.benefit) : "");

  section("Family composition");
  const family = familyRows(senior.familyComposition);
  if (family.length === 0) {
    field("Members", "");
  } else {
    const headings = ["Name", "Relationship", "Age", "Status", "Occupation"];
    const widths = [52, 34, 14, 30, contentWidth - 130];
    const row = (cells: string[], bold: boolean) => {
      ensureSpace(LINE + 2);
      pdf.setFont("helvetica", bold ? "bold" : "normal");
      pdf.setFontSize(8.5);
      let x = MARGIN + 2;
      cells.forEach((cell, index) => {
        const text = (pdf.splitTextToSize(cell || "", widths[index]! - 2) as string[])[0] ?? "";
        pdf.text(text, x, y);
        x += widths[index]!;
      });
      y += LINE + 1;
    };
    row(headings, true);
    family.forEach((cells) => row(cells, false));
  }

  section("Senior citizen association");
  field("Name of association", senior.associationName);
  field("Address of association", senior.associationAddress);
  field("Date of membership", longDate(senior.associationMembershipDate));
  field("Position", senior.associationPosition);

  section("Submitted documents");
  field("Profile photo", senior.photoPath ? "On file" : "Not on file");
  field("Valid ID", senior.validIdPath || senior.idDocumentPath ? "On file" : "Not on file");
  field("Birth certificate", senior.birthCertificatePath ? "On file" : "Not on file");

  // Footer on every page.
  const generated = `Generated ${longDate(new Date().toISOString())}${
    archive.generatedBy ? ` by ${archive.generatedBy}` : ""
  }`;
  const pages = pdf.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    pdf.setPage(page);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(120);
    pdf.text(generated, MARGIN, pageHeight - 10);
    pdf.text(`Page ${page} of ${pages}`, pageWidth - MARGIN, pageHeight - 10, { align: "right" });
    pdf.setTextColor(0);
  }

  pdf.save(`${senior.name} - ${senior.id} - Archived Record.pdf`);
}
