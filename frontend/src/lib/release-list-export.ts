import type { ReleaseRoster } from "@/lib/api";
import { tableExportBuilders, type ExportDocument } from "@/lib/export-file";

const STATUS_LABEL = { released: "Received", failed: "Not received", pending: "Pending" };

function longDate(date: string) {
  return new Date(`${date.slice(0, 10)}T00:00:00`).toLocaleDateString("en-PH", {
    dateStyle: "long",
  });
}

/** A release batch's senior list, with a blank signature column, as PDF, Word, or Excel. */
export function releaseListExport(roster: ReleaseRoster) {
  const items = roster.transactions;
  const total = items.reduce((sum, item) => sum + Number(item.amount), 0);
  const barangays = roster.barangays?.length
    ? roster.barangays.map((barangay) => barangay.barangay_name).join(", ")
    : "All barangays";
  const document: ExportDocument = {
    title: `${roster.benefit.benefit_name} release batch`,
    orientation: "landscape",
    details: [
      `Release date: ${longDate(roster.release_date)} (${roster.period_label})`,
      `Barangays: ${barangays}`,
      `Seniors: ${items.length}`,
    ],
    tables: [
      {
        title: "Release batch",
        columns: [
          { label: "No.", weight: 0.5 },
          { label: "OSCA ID", weight: 1.4 },
          { label: "Last Name", weight: 1.3 },
          { label: "First Name", weight: 1.3 },
          { label: "Middle Name", weight: 1.2 },
          { label: "Barangay", weight: 1.5 },
          { label: "Amount", weight: 1, money: true },
          { label: "Status", weight: 1 },
          { label: "Signature", weight: 1.6 },
        ],
        rows: [
          ...items.map((item, index) => [
            index + 1,
            item.senior?.osca_id_number ?? "",
            item.senior?.last_name ?? "Deleted record",
            item.senior?.first_name ?? "",
            item.senior?.middle_name ?? "",
            item.senior?.barangay?.barangay_name ?? "",
            Number(item.amount),
            STATUS_LABEL[item.status as keyof typeof STATUS_LABEL] ?? item.status,
            "",
          ]),
          ["", "", "", "", "", "TOTAL", total, "", ""],
        ],
        totalRow: true,
      },
    ],
  };
  return {
    fileName: `${roster.benefit.benefit_name}-${roster.release_date.slice(0, 10)}`.replace(
      /\s+/g,
      "-",
    ),
    builders: tableExportBuilders(document),
  };
}
