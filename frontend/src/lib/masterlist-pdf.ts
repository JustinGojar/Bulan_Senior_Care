import type { Senior } from "@/lib/osca-data";

type Column = {
  title: string;
  width: number;
  align?: "left" | "center";
  value: (senior: Senior, numbers: { inBarangay: number; overall: number }) => string;
};

// Width of long bond (legal) landscape inside 10 mm margins.
const TABLE_WIDTH = 335;
const TABLE_TOP = 36;
const HEADER_ROW = 12;
const ROW = 7.5;

const MONTHS = [
  "JAN.",
  "FEB.",
  "MARCH",
  "APRIL",
  "MAY",
  "JUNE",
  "JULY",
  "AUG.",
  "SEPT.",
  "OCT.",
  "NOV.",
  "DEC.",
];

function parseDate(date?: string) {
  if (!date) return null;
  const parsed = new Date(`${date.slice(0, 10)}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** "MARCH 13, 1956", as written on the paper masterlist. */
function birthdateText(date?: string) {
  const parsed = parseDate(date);
  return parsed ? `${MONTHS[parsed.getMonth()]} ${parsed.getDate()}, ${parsed.getFullYear()}` : "";
}

/** "07/17/23" */
function shortDate(date?: string) {
  const parsed = parseDate(date);
  if (!parsed) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(parsed.getMonth() + 1)}/${pad(parsed.getDate())}/${String(parsed.getFullYear()).slice(2)}`;
}

const upper = (value?: string) => (value ?? "").toUpperCase();

// Columns of the municipal masterlist. Pension source and indigency are not tracked in the
// system, so they are left blank for the office to fill in. Deceased shows the date of death.
const COLUMNS: Column[] = [
  { title: "No.", width: 10, align: "center", value: (_, numbers) => String(numbers.inBarangay) },
  {
    title: "Over-all Total",
    width: 14,
    align: "center",
    value: (_, numbers) => String(numbers.overall),
  },
  { title: "Lastname", width: 30, value: (senior) => upper(senior.lastName) },
  { title: "First Name", width: 30, value: (senior) => upper(senior.firstName) },
  { title: "Middle Name", width: 27, value: (senior) => upper(senior.middleName) },
  { title: "Ext.", width: 9, align: "center", value: (senior) => upper(senior.suffix) },
  { title: "Barangay", width: 32, value: (senior) => upper(senior.barangay) },
  { title: "Birthdate", width: 26, value: (senior) => birthdateText(senior.birthdate) },
  { title: "Age", width: 9, align: "center", value: (senior) => String(senior.age || "") },
  {
    title: "Sex",
    width: 9,
    align: "center",
    value: (senior) => (senior.sex === "male" ? "M" : senior.sex === "female" ? "F" : ""),
  },
  {
    title: "Civil Status",
    width: 11,
    align: "center",
    value: (senior) => upper(senior.civilStatus).charAt(0),
  },
  { title: "ID Number", width: 28, value: (senior) => senior.id },
  {
    title: "Date Issued",
    width: 18,
    align: "center",
    value: (senior) => shortDate(senior.registrationDate),
  },
  { title: "Place of Issued", width: 18, align: "center", value: () => "LGU-BULAN" },
  // Active seniors are enrolled in the Social Pension.
  {
    title: "SP",
    width: 9,
    align: "center",
    value: (senior) => (senior.status === "Active" ? "SP" : ""),
  },
  { title: "Other Pension (SSS/GSIS)", width: 18, align: "center", value: () => "" },
  { title: "Indigent / Very Poor / Bedridden", width: 20, align: "center", value: () => "" },
  {
    title: "Deceased",
    width: 0,
    align: "center",
    value: (senior) => (senior.deceased ? shortDate(senior.deceased.dateOfDeath) || "YES" : ""),
  },
];
COLUMNS[COLUMNS.length - 1]!.width =
  TABLE_WIDTH - COLUMNS.reduce((sum, column) => sum + column.width, 0);

/** The senior records as the Municipality of Bulan's masterlist of senior citizens. */
export async function downloadMasterlist(seniors: Senior[]) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "legal" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const left = (pageWidth - TABLE_WIDTH) / 2;
  const rowsPerPage = Math.floor((pageHeight - 16 - TABLE_TOP - HEADER_ROW) / ROW);
  const generated = new Date();

  const rows = [...seniors].sort(
    (first, second) =>
      first.barangay.localeCompare(second.barangay) ||
      (first.lastName ?? first.name).localeCompare(second.lastName ?? second.name) ||
      (first.firstName ?? "").localeCompare(second.firstName ?? ""),
  );
  const pageCount = Math.max(1, Math.ceil(rows.length / rowsPerPage));
  // "No." restarts in each barangay; "Over-all Total" runs through the whole list.
  const inBarangay: number[] = [];
  rows.forEach((senior, index) => {
    const previous = rows[index - 1];
    inBarangay.push(previous?.barangay === senior.barangay ? (inBarangay[index - 1] ?? 0) + 1 : 1);
  });

  const drawHeader = (page: number) => {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    ["REPUBLIC OF THE PHILIPPINES", "MUNICIPALITY OF BULAN", "SORSOGON"].forEach((line, index) =>
      pdf.text(line, pageWidth / 2, 10 + index * 4, { align: "center" }),
    );
    pdf.setFontSize(11);
    pdf.text("MASTERLIST OF SENIOR CITIZENS", pageWidth / 2, 28, { align: "center" });

    pdf.setFillColor(253, 230, 138);
    pdf.rect(left, TABLE_TOP, TABLE_WIDTH, HEADER_ROW, "F");
    pdf.setFontSize(6.5);
    let x = left;
    for (const column of COLUMNS) {
      pdf.rect(x, TABLE_TOP, column.width, HEADER_ROW);
      const lines = pdf.splitTextToSize(column.title.toUpperCase(), column.width - 1.5) as string[];
      pdf.text(
        lines,
        x + column.width / 2,
        TABLE_TOP + HEADER_ROW / 2 - (lines.length - 1) * 1.2 + 1,
        {
          align: "center",
        },
      );
      x += column.width;
    }

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.5);
    pdf.text(`Total senior citizens: ${rows.length}`, left, pageHeight - 8);
    pdf.text(`Page ${page} of ${pageCount}`, pageWidth / 2, pageHeight - 8, { align: "center" });
    pdf.text(
      `Generated ${generated.toLocaleDateString("en-PH")}`,
      left + TABLE_WIDTH,
      pageHeight - 8,
      {
        align: "right",
      },
    );
  };

  for (let page = 1; page <= pageCount; page++) {
    if (page > 1) pdf.addPage("legal", "landscape");
    drawHeader(page);
    pdf.setFontSize(7.5);
    let y = TABLE_TOP + HEADER_ROW;
    rows.slice((page - 1) * rowsPerPage, page * rowsPerPage).forEach((senior, index) => {
      const overall = (page - 1) * rowsPerPage + index + 1;
      let x = left;
      for (const column of COLUMNS) {
        pdf.rect(x, y, column.width, ROW);
        const text = column.value(senior, { inBarangay: inBarangay[overall - 1] ?? 1, overall });
        const value = (pdf.splitTextToSize(text, column.width - 2) as string[])[0] ?? "";
        if (column.align === "center") {
          pdf.text(value, x + column.width / 2, y + ROW / 2 + 1, { align: "center" });
        } else {
          pdf.text(value, x + 1.2, y + ROW / 2 + 1);
        }
        x += column.width;
      }
      y += ROW;
    });
  }

  pdf.save(`masterlist-of-senior-citizens-${generated.toISOString().slice(0, 10)}.pdf`);
}
