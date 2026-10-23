import { loadPdfLogo } from "@/lib/pdf";

export type ExportFormat = "pdf" | "word" | "excel";
/** Builds the file for each format the export offers; only the chosen one runs. */
export type ExportBuilders = Partial<Record<ExportFormat, () => Promise<Blob> | Blob>>;

export const EXPORT_FORMATS: Record<
  ExportFormat,
  { label: string; description: string; mime: string; extension: string }
> = {
  pdf: { label: "PDF", description: "PDF document", mime: "application/pdf", extension: ".pdf" },
  word: {
    label: "Word",
    description: "Word document",
    mime: "application/msword",
    extension: ".doc",
  },
  excel: {
    label: "Excel",
    description: "Excel workbook",
    mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    extension: ".xlsx",
  },
};

const FORMAT_ORDER: ExportFormat[] = ["pdf", "word", "excel"];
/** The formats a table export offers. */
export const TABLE_FORMATS = FORMAT_ORDER;

type SaveFilePicker = (options: {
  suggestedName?: string;
  types?: Array<{ description: string; accept: Record<string, string[]> }>;
  excludeAcceptAllOption?: boolean;
}) => Promise<{
  name: string;
  createWritable: () => Promise<{
    write: (data: Blob) => Promise<void>;
    close: () => Promise<void>;
    abort?: () => Promise<void>;
  }>;
}>;

function savePicker(): SaveFilePicker | null {
  if (typeof window === "undefined" || window.self !== window.top) return null;
  const picker = (window as Window & { showSaveFilePicker?: SaveFilePicker }).showSaveFilePicker;
  return typeof picker === "function" ? picker.bind(window) : null;
}

/**
 * True when the browser shows its own Save dialog with a "Save as type" list (Chrome, Edge),
 * so the format is picked there. Elsewhere the app asks for the format first.
 */
export function canChooseFormatOnSave() {
  return savePicker() !== null;
}

export function exportFormats(builders: ExportBuilders) {
  return FORMAT_ORDER.filter((format) => builders[format]);
}

/** Logs a failed export and returns a message that names the cause. */
export function exportErrorMessage(reason: unknown, message: string) {
  console.error(message, reason);
  return reason instanceof Error && reason.message ? `${message} ${reason.message}` : message;
}

export function safeFileName(name: string) {
  return (
    name
      .replace(/[\\/:*?"<>|]+/g, "")
      .replace(/\s+/g, " ")
      .trim() || "export"
  );
}

function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Saves an export. Without a `format`, the browser's Save dialog lists every format in
 * `builders` under "Save as type" and the file is built in the one chosen there. Where that
 * dialog isn't available, or a `format` is given, the file downloads in that format.
 * Returns the saved format, or null when the person cancelled the dialog.
 */
export async function saveExport(
  baseName: string,
  builders: ExportBuilders,
  format?: ExportFormat,
): Promise<ExportFormat | null> {
  const formats = exportFormats(builders);
  const first = formats[0];
  if (!first) throw new Error("Nothing to export.");
  const name = safeFileName(baseName);
  const picker = format ? null : savePicker();

  if (picker) {
    let handle: Awaited<ReturnType<SaveFilePicker>> | null = null;
    try {
      handle = await picker({
        suggestedName: `${name}${EXPORT_FORMATS[first].extension}`,
        types: formats.map((item) => ({
          description: EXPORT_FORMATS[item].description,
          accept: { [EXPORT_FORMATS[item].mime]: [EXPORT_FORMATS[item].extension] },
        })),
        excludeAcceptAllOption: true,
      });
    } catch (reason) {
      if (reason instanceof DOMException && reason.name === "AbortError") return null;
      // The dialog can be refused (e.g. the click was too long ago); download instead.
    }
    if (handle) {
      const extension = handle.name.toLowerCase().match(/\.[a-z0-9]+$/)?.[0];
      const chosen = formats.find((item) => EXPORT_FORMATS[item].extension === extension) ?? first;
      const blob = await builders[chosen]!();
      try {
        const writable = await handle.createWritable();
        try {
          await writable.write(blob);
          await writable.close();
        } catch (reason) {
          await writable.abort?.().catch(() => undefined);
          throw reason;
        }
      } catch (reason) {
        // Writing through the dialog can fail, e.g. in a OneDrive-synced folder or when the
        // browser's file check rejects it. The file is ready, so download it instead.
        console.warn("Could not write the file through the Save dialog; downloading it.", reason);
        downloadBlob(blob, handle.name);
      }
      return chosen;
    }
  }

  const chosen = format && builders[format] ? format : first;
  downloadBlob(await builders[chosen]!(), `${name}${EXPORT_FORMATS[chosen].extension}`);
  return chosen;
}

// ---------------------------------------------------------------------------------------------
// Tables rendered as PDF, Word, or Excel from one description.

export type ExportColumn = {
  label: string;
  /** Relative width in the PDF; defaults to 1. */
  weight?: number;
  /** Peso amount: two decimals, and a number format in Excel. */
  money?: boolean;
};

export type ExportTable = {
  title?: string;
  columns: ExportColumn[];
  rows: Array<Array<string | number>>;
  /** Draws the last row bold, as a totals row. */
  totalRow?: boolean;
};

export type ExportDocument = {
  title: string;
  details?: string[];
  tables: ExportTable[];
  orientation?: "portrait" | "landscape";
};

function moneyText(value: number) {
  return value.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function cellText(value: string | number, column: ExportColumn | undefined) {
  if (typeof value !== "number") return value;
  return column?.money ? moneyText(value) : value.toLocaleString();
}

/**
 * Builders for all three formats of a table document. Pass a function to load the data only
 * after the format is chosen, so the Save dialog opens without waiting for it.
 */
export function tableExportBuilders(
  source: ExportDocument | (() => Promise<ExportDocument>),
): ExportBuilders {
  let loaded: Promise<ExportDocument> | null = null;
  const document = () =>
    (loaded ??= typeof source === "function" ? source() : Promise.resolve(source));
  return {
    pdf: async () => tablesToPdf(await document()),
    word: async () => tablesToWord(await document()),
    excel: async () => tablesToExcel(await document()),
  };
}

export async function tablesToPdf({
  title,
  details = [],
  tables,
  orientation = "portrait",
}: ExportDocument) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ orientation, unit: "mm", format: "a4" });
  const logo = await loadPdfLogo();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 14;
  const tableWidth = pageWidth - margin * 2;
  const bottom = pageHeight - 14;
  const lineHeight = 3.6;
  const minRowHeight = 7;
  const padding = 2;

  pdf.addImage(logo, "PNG", margin, 7, 14, 14);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.text("Bulan SeniorCare", margin + 18, 16);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.text("Office of Senior Citizens Affairs (OSCA)", margin + 18, 20.5);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(13);
  pdf.text(title, margin, 30);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  let y = 37;
  details.forEach((line) => {
    const lines = pdf.splitTextToSize(line, tableWidth) as string[];
    pdf.text(lines, margin, y);
    y += 5 * lines.length;
  });
  y += 4;

  const drawTable = ({ title: tableTitle, columns, rows, totalRow }: ExportTable) => {
    const unit = tableWidth / columns.reduce((sum, column) => sum + (column.weight ?? 1), 0);
    const widths = columns.map((column) => (column.weight ?? 1) * unit);
    const lefts = widths.map((_, index) =>
      widths.slice(0, index).reduce((sum, width) => sum + width, margin),
    );
    const wrap = (values: Array<string | number>, bold: boolean) => {
      pdf.setFont("helvetica", bold ? "bold" : "normal");
      return values.map(
        (value, index) =>
          pdf.splitTextToSize(
            cellText(value, columns[index]),
            widths[index]! - padding * 2,
          ) as string[],
      );
    };
    const heightOf = (cells: string[][]) =>
      Math.max(minRowHeight, Math.max(...cells.map((lines) => lines.length)) * lineHeight + 3.4);
    const drawRow = (
      cells: string[][],
      fill: [number, number, number] | null,
      bold: boolean,
      header = false,
    ) => {
      const height = heightOf(cells);
      pdf.setFont("helvetica", bold ? "bold" : "normal");
      cells.forEach((lines, index) => {
        if (fill) pdf.setFillColor(...fill);
        pdf.rect(lefts[index]!, y, widths[index]!, height, fill ? "FD" : "S");
        const right = !header && columns[index]?.money;
        pdf.text(
          lines,
          right ? lefts[index]! + widths[index]! - padding : lefts[index]! + padding,
          y + 4.6,
          { lineHeightFactor: 1.25, ...(right ? { align: "right" as const } : {}) },
        );
      });
      y += height;
    };

    pdf.setFontSize(8);
    const header = wrap(
      columns.map((column) => column.label),
      true,
    );
    const drawHeader = () => drawRow(header, [226, 232, 240], true, true);

    if (y + 8 + heightOf(header) + minRowHeight > bottom) {
      pdf.addPage();
      y = 18;
    }
    if (tableTitle) {
      pdf.setFontSize(11);
      pdf.setFont("helvetica", "bold");
      pdf.text(tableTitle, margin, y);
      y += 3;
    }
    pdf.setFontSize(8);
    pdf.setDrawColor(148, 163, 184);
    pdf.setLineWidth(0.2);
    drawHeader();

    if (rows.length === 0) {
      pdf.setFont("helvetica", "normal");
      pdf.rect(margin, y, tableWidth, minRowHeight);
      pdf.text("None recorded.", margin + padding, y + 4.6);
      y += minRowHeight;
    }
    rows.forEach((row, rowIndex) => {
      const isTotal = Boolean(totalRow) && rowIndex === rows.length - 1;
      const cells = wrap(row, isTotal);
      if (y + heightOf(cells) > bottom) {
        pdf.addPage();
        y = 18;
        drawHeader();
      }
      drawRow(
        cells,
        isTotal ? [241, 245, 249] : rowIndex % 2 === 1 ? [248, 250, 252] : null,
        isTotal,
      );
    });
    y += 8;
  };

  tables.forEach(drawTable);

  const pages = pdf.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    pdf.setPage(page);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.text(`Page ${page} of ${pages}`, pageWidth - margin, pageHeight - 6, { align: "right" });
  }
  return pdf.output("blob");
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** A Word document: HTML tables saved as .doc, which Word opens as a normal document. */
export function tablesToWord({
  title,
  details = [],
  tables,
  orientation = "portrait",
}: ExportDocument) {
  const border = "border:1px solid #94a3b8;padding:4pt 6pt;";
  const table = ({ title: tableTitle, columns, rows, totalRow }: ExportTable) => {
    const body = rows.length
      ? rows
          .map((row, rowIndex) => {
            const isTotal = Boolean(totalRow) && rowIndex === rows.length - 1;
            return `<tr${isTotal ? ' style="font-weight:bold;background:#f1f5f9"' : ""}>${row
              .map((value, index) => {
                const column = columns[index];
                const text =
                  typeof value === "number" && column?.money
                    ? `₱${moneyText(value)}`
                    : cellText(value, column);
                return `<td style="${border}text-align:${column?.money ? "right" : "left"}">${escapeHtml(text)}</td>`;
              })
              .join("")}</tr>`;
          })
          .join("")
      : `<tr><td colspan="${columns.length}" style="${border}">None recorded.</td></tr>`;
    return `${tableTitle ? `<h3>${escapeHtml(tableTitle)}</h3>` : ""}
<table style="border-collapse:collapse;width:100%">
<thead><tr>${columns.map((column) => `<th style="${border}background:#e2e8f0;text-align:left">${escapeHtml(column.label)}</th>`).join("")}</tr></thead>
<tbody>${body}</tbody></table>`;
  };
  const page =
    orientation === "landscape"
      ? "size: 11in 8.5in; mso-page-orientation: landscape;"
      : "size: 8.5in 11in;";
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
<style>
@page Section1 { ${page} margin: 0.6in; }
div.Section1 { page: Section1; }
body { font-family: Calibri, Arial, sans-serif; font-size: 10pt; }
h3 { font-size: 12pt; margin: 14pt 0 4pt; }
</style></head>
<body><div class="Section1">
<h2 style="margin:0">Bulan SeniorCare</h2>
<p style="margin:0">Office of Senior Citizens Affairs (OSCA)</p>
<h2 style="font-size:14pt">${escapeHtml(title)}</h2>
${details.map((line) => `<p style="margin:0">${escapeHtml(line)}</p>`).join("")}
${tables.map(table).join("\n")}
</div></body></html>`;
  return new Blob(["﻿", html], { type: EXPORT_FORMATS.word.mime });
}

/**
 * An Excel workbook. One table goes on one sheet under the title and details; several tables
 * get a "Report" sheet with all of them plus one sheet each for sorting and filtering.
 */
export async function tablesToExcel({ title, details = [], tables }: ExportDocument) {
  const XLSX = await import("xlsx");
  const workbook = XLSX.utils.book_new();
  type Sheet = ReturnType<typeof XLSX.utils.aoa_to_sheet>;

  const formatMoney = (sheet: Sheet, table: ExportTable, firstRow: number) => {
    table.columns.forEach((column, columnIndex) => {
      if (!column.money) return;
      table.rows.forEach((_, rowIndex) => {
        const cell = sheet[XLSX.utils.encode_cell({ r: firstRow + rowIndex, c: columnIndex })] as
          { t?: string; z?: string } | undefined;
        if (cell?.t === "n") cell.z = "#,##0.00";
      });
    });
  };
  const widths = (table: ExportTable) =>
    table.columns.map((column, index) => ({
      wch: Math.min(
        48,
        Math.max(
          column.label.length + 2,
          ...table.rows.map((row) => String(cellText(row[index] ?? "", column)).length + 2),
        ),
      ),
    }));
  const filter = (table: ExportTable, headerRow: number) =>
    table.rows.length > 0
      ? {
          ref: XLSX.utils.encode_range({
            s: { r: headerRow, c: 0 },
            e: { r: headerRow + table.rows.length, c: table.columns.length - 1 },
          }),
        }
      : undefined;

  const intro: Array<Array<string | number>> = [
    ["Bulan SeniorCare"],
    [title],
    ...details.map((line) => [line]),
  ];

  if (tables.length === 1) {
    const table = tables[0]!;
    const headerRow = intro.length + 1;
    const sheet = XLSX.utils.aoa_to_sheet([
      ...intro,
      [],
      table.columns.map((column) => column.label),
      ...table.rows,
    ]);
    formatMoney(sheet, table, headerRow + 1);
    sheet["!cols"] = widths(table);
    const autofilter = filter(table, headerRow);
    if (autofilter) sheet["!autofilter"] = autofilter;
    XLSX.utils.book_append_sheet(workbook, sheet, (table.title ?? title).slice(0, 31));
  } else {
    const all = [...intro];
    const starts: number[] = [];
    tables.forEach((table) => {
      all.push(
        [],
        [table.title ?? ""],
        table.columns.map((column) => column.label),
      );
      starts.push(all.length);
      all.push(...table.rows);
      if (table.rows.length === 0) all.push(["None recorded."]);
    });
    const reportSheet = XLSX.utils.aoa_to_sheet(all);
    tables.forEach((table, index) => formatMoney(reportSheet, table, starts[index]!));
    const widest = Math.max(...tables.map((table) => table.columns.length));
    reportSheet["!cols"] = Array.from({ length: widest }, (_, index) => ({
      wch: index === 0 ? 26 : 18,
    }));
    XLSX.utils.book_append_sheet(workbook, reportSheet, "Report");

    const used = new Set(["Report"]);
    tables.forEach((table, index) => {
      const sheet = XLSX.utils.aoa_to_sheet([
        table.columns.map((column) => column.label),
        ...table.rows,
      ]);
      formatMoney(sheet, table, 1);
      sheet["!cols"] = widths(table);
      const autofilter = filter(table, 0);
      if (autofilter) sheet["!autofilter"] = autofilter;
      let name = (table.title ?? `Table ${index + 1}`).slice(0, 31);
      while (used.has(name)) name = `${name.slice(0, 28)} ${index + 1}`;
      used.add(name);
      XLSX.utils.book_append_sheet(workbook, sheet, name);
    });
  }

  const data = XLSX.write(workbook, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
  return new Blob([data], { type: EXPORT_FORMATS.excel.mime });
}
