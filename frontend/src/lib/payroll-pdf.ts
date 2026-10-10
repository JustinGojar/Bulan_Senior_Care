import type { ReleaseRoster } from "@/lib/api";
import { loadPdfLogo } from "@/lib/pdf";

type Column = { title: string; width: number; align?: "left" | "center" | "right" };

const ORDINALS = ["1st", "2nd", "3rd", "4th"];
// Width of long bond (legal) landscape inside 10 mm margins.
const TABLE_WIDTH = 335;
const QUARTER_WIDTH = 22;

/**
 * Laid out like the paper cash assistance payroll. Quarterly programs get one column per
 * quarter of the year up to the batch's quarter; one-time grants get a single Amount column.
 * The signature column takes the remaining width.
 */
function payrollColumns(quarters: number[] | null, year: number): Column[] {
  const amountColumns: Column[] = quarters
    ? quarters.map((quarter) => ({
        title: `${ORDINALS[quarter - 1]} Quarter ${year}`,
        width: QUARTER_WIDTH,
        align: "right",
      }))
    : [{ title: "Amount", width: 25, align: "right" }];
  const columns: Column[] = [
    { title: "No.", width: 11, align: "center" },
    { title: "Barangay", width: 32 },
    { title: "Surname", width: 32 },
    { title: "First Name", width: 32 },
    { title: "Middle Name", width: 28 },
    { title: "Ext. Name", width: 12, align: "center" },
    ...amountColumns,
    { title: "Total Amount", width: 24, align: "right" },
    { title: "Actual Amount Paid", width: 24, align: "right" },
    { title: "Signature / Thumbmark", width: 0 },
    { title: "No.", width: 11, align: "center" },
  ];
  const used = columns.reduce((sum, column) => sum + column.width, 0);
  columns[columns.length - 2]!.width = TABLE_WIDTH - used;
  return columns;
}

/** The batch's quarter, from a label like "Q3 2026" or "3rd Quarter", else its release month. */
function batchQuarter(periodLabel: string, releaseDate: string) {
  const labelled =
    periodLabel.match(/\bQ([1-4])\b/i)?.[1] ??
    periodLabel.match(/\b([1-4])(?:st|nd|rd|th)\s+quarter/i)?.[1];
  if (labelled) return Number(labelled);
  const month = new Date(`1 ${periodLabel}`).getMonth();
  const releaseMonth = new Date(`${releaseDate.slice(0, 10)}T00:00:00`).getMonth();
  return Math.floor((Number.isNaN(month) ? releaseMonth : month) / 3) + 1;
}

const TABLE_TOP = 46;
const HEADER_ROW = 11;
const ROW = 13;
const SIGNATORIES_HEIGHT = 34;

// The PDF's built-in fonts have no peso sign.
function money(value: number) {
  return `PHP ${value.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function longDate(date: string) {
  return new Date(`${date.slice(0, 10)}T00:00:00`).toLocaleDateString("en-PH", {
    dateStyle: "long",
  });
}

/**
 * Builds the cash assistance payroll for a release batch: every senior with a signature or
 * thumbmark space, signed on the release day as proof of a cash or clustering payout.
 */
export async function downloadCashPayroll(roster: ReleaseRoster) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "legal" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const quarterly = roster.benefit.schedule === "quarterly";
  const quarter = batchQuarter(roster.period_label, roster.release_date);
  const year =
    Number(roster.period_label.match(/\b(20\d{2})\b/)?.[1]) ||
    new Date(`${roster.release_date.slice(0, 10)}T00:00:00`).getFullYear();
  const quarters = quarterly ? Array.from({ length: quarter }, (_, index) => index + 1) : null;
  const COLUMNS = payrollColumns(quarters, year);
  const totalIndex = COLUMNS.findIndex((column) => column.title === "Total Amount");
  const tableWidth = TABLE_WIDTH;
  const left = (pageWidth - tableWidth) / 2;
  const bottom = pageHeight - 16;
  const logo = await loadPdfLogo();

  const rows = roster.transactions
    .filter((item) => item.senior)
    .map((item) => ({ senior: item.senior!, amount: Number(item.amount) }))
    .sort(
      (first, second) =>
        (first.senior.barangay?.barangay_name ?? "").localeCompare(
          second.senior.barangay?.barangay_name ?? "",
        ) ||
        first.senior.last_name.localeCompare(second.senior.last_name) ||
        first.senior.first_name.localeCompare(second.senior.first_name),
    );
  const total = rows.reduce((sum, row) => sum + row.amount, 0);
  const amountEach = Number(roster.amount ?? rows[0]?.amount ?? 0);
  const rowsPerPage = Math.max(1, Math.floor((bottom - TABLE_TOP - HEADER_ROW) / ROW));
  // The signatories go on the last page, so add a page when they would not fit.
  const lastPageRows = rows.length % rowsPerPage || rowsPerPage;
  const needsExtraPage =
    rows.length > 0 &&
    TABLE_TOP + HEADER_ROW + (lastPageRows + 1) * ROW + SIGNATORIES_HEIGHT > bottom;
  const pageCount = Math.max(1, Math.ceil(rows.length / rowsPerPage)) + (needsExtraPage ? 1 : 0);

  const fit = (text: string, width: number) =>
    (pdf.splitTextToSize(text, width - 3) as string[])[0] ?? "";

  const cellText = (text: string, x: number, y: number, column: Column) => {
    const value = fit(text, column.width);
    if (column.align === "right") pdf.text(value, x + column.width - 1.5, y, { align: "right" });
    else if (column.align === "center")
      pdf.text(value, x + column.width / 2, y, { align: "center" });
    else pdf.text(value, x + 1.5, y);
  };

  const drawHeader = (page: number) => {
    pdf.addImage(logo, "PNG", left, 8, 16, 16);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.text("Municipality of Bulan, Sorsogon", pageWidth / 2, 11, { align: "center" });
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.text("Office of Senior Citizens Affairs (OSCA)", pageWidth / 2, 15.5, { align: "center" });
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);
    pdf.text("CASH ASSISTANCE PAYROLL", pageWidth / 2, 22, { align: "center" });

    pdf.setFontSize(9);
    pdf.setFont("helvetica", "normal");
    pdf.text(`Payroll: ${roster.benefit.benefit_name}`, left + tableWidth, 11, { align: "right" });
    pdf.text(roster.period_label, left + tableWidth, 15.5, { align: "right" });

    pdf.setFontSize(8.5);
    pdf.text(
      quarterly
        ? `Payment for ${roster.benefit.benefit_name} for the ${ORDINALS[quarter - 1]} Quarter ${year} (${roster.period_label}) at ${money(amountEach)} each per quarter in the Municipality of BULAN, SORSOGON.`
        : `Payment for ${roster.benefit.benefit_name} for the period ${roster.period_label} at ${money(amountEach)} each in the Municipality of BULAN, SORSOGON.`,
      left,
      33,
    );
    pdf.text(
      `Release date: ${longDate(roster.release_date)}    Seniors: ${rows.length}    Total: ${money(total)}`,
      left,
      38.5,
    );

    let x = left;
    pdf.setFillColor(225, 225, 225);
    pdf.rect(left, TABLE_TOP, tableWidth, HEADER_ROW, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7.5);
    for (const column of COLUMNS) {
      pdf.rect(x, TABLE_TOP, column.width, HEADER_ROW);
      const lines = pdf.splitTextToSize(column.title.toUpperCase(), column.width - 2) as string[];
      pdf.text(
        lines,
        x + column.width / 2,
        TABLE_TOP + HEADER_ROW / 2 - (lines.length - 1) * 1.4 + 1,
        {
          align: "center",
        },
      );
      x += column.width;
    }

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.text(`Page ${page} of ${pageCount}`, pageWidth / 2, pageHeight - 8, { align: "center" });
  };

  const drawSignatories = (top: number) => {
    const roles = [
      "Prepared by:",
      "Certified correct:",
      "Paid by (Disbursing Officer):",
      "Approved by:",
    ];
    const width = tableWidth / roles.length;
    pdf.setFontSize(8.5);
    roles.forEach((role, index) => {
      const x = left + index * width;
      pdf.setFont("helvetica", "normal");
      pdf.text(role, x + 4, top + 6);
      pdf.line(x + 4, top + 22, x + width - 8, top + 22);
      pdf.setFontSize(7.5);
      pdf.text("Signature over printed name", x + 4, top + 26);
      pdf.setFontSize(8.5);
    });
  };

  for (let page = 1; page <= pageCount; page++) {
    if (page > 1) pdf.addPage("legal", "landscape");
    drawHeader(page);
    const pageRows = rows.slice((page - 1) * rowsPerPage, page * rowsPerPage);
    let y = TABLE_TOP + HEADER_ROW;
    pageRows.forEach((row, index) => {
      const number = String((page - 1) * rowsPerPage + index + 1);
      const values = [
        number,
        row.senior.barangay?.barangay_name ?? "",
        row.senior.last_name.toUpperCase(),
        row.senior.first_name.toUpperCase(),
        (row.senior.middle_name ?? "").toUpperCase(),
        (row.senior.suffix ?? "").toUpperCase(),
        // This batch pays its own quarter; earlier quarters were paid in their own batches.
        ...(quarters
          ? quarters.map((item) => (item === quarter ? money(row.amount) : ""))
          : [money(row.amount)]),
        money(row.amount),
        "",
        "",
        number,
      ];
      let x = left;
      COLUMNS.forEach((column, columnIndex) => {
        pdf.rect(x, y, column.width, ROW);
        cellText(values[columnIndex] ?? "", x, y + ROW / 2 + 1.2, column);
        x += column.width;
      });
      y += ROW;
    });

    if (page === pageCount) {
      // Grand total row, then the signatories.
      const labelWidth = COLUMNS.slice(0, totalIndex).reduce(
        (sum, column) => sum + column.width,
        0,
      );
      const totalColumn = COLUMNS[totalIndex]!;
      pdf.setFont("helvetica", "bold");
      pdf.rect(left, y, labelWidth, ROW - 4);
      pdf.text("TOTAL", left + labelWidth - 1.5, y + (ROW - 4) / 2 + 1.2, { align: "right" });
      pdf.rect(left + labelWidth, y, totalColumn.width, ROW - 4);
      cellText(money(total), left + labelWidth, y + (ROW - 4) / 2 + 1.2, totalColumn);
      pdf.setFont("helvetica", "normal");
      drawSignatories(y + ROW);
    }
  }

  pdf.save(
    `Cash-Payroll-${roster.benefit.benefit_name}-${roster.release_date.slice(0, 10)}.pdf`.replace(
      /\s+/g,
      "-",
    ),
  );
}
