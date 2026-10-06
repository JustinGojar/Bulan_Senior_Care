import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ShieldX } from "lucide-react";
import { StatusPage } from "@/components/StatusPage";
import { primaryButtonClass } from "@/components/design-kit";

export const Route = createFileRoute("/unauthorized")({
  head: () => ({ meta: [{ title: "Unauthorized — Bulan SeniorCare" }] }),
  component: UnauthorizedPage,
});

function UnauthorizedPage() {
  return (
    <StatusPage
      icon={ShieldX}
      tone="danger"
      code="403"
      title="Not authorized"
      actions={
        <Link to="/dashboard" className={primaryButtonClass}>
          <ArrowLeft className="h-4 w-4" />
          Go to dashboard
        </Link>
      }
    >
      You do not have permission to view this page. Please return to the dashboard or contact an
      administrator.
    </StatusPage>
  );
}
