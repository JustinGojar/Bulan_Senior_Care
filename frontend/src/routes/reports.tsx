import { createFileRoute, redirect } from "@tanstack/react-router";

// Reports now live in the Reports tab of Analytics; old links and bookmarks land there.
export const Route = createFileRoute("/reports")({
  validateSearch: (search: Record<string, unknown>): { report?: number } => {
    const report = Number(search["report"]);
    return Number.isInteger(report) && report > 0 ? { report } : {};
  },
  beforeLoad: ({ search }) => {
    throw redirect({
      to: "/analytics",
      search: { tab: "reports", ...(search.report ? { report: search.report } : {}) },
    });
  },
});
