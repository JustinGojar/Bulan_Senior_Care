import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldX } from "lucide-react";

export const Route = createFileRoute("/unauthorized")({
  head: () => ({ meta: [{ title: "Unauthorized — Bulan SeniorCare" }] }),
  component: UnauthorizedPage,
});

function UnauthorizedPage() {
  return (
    <div className="bg-app flex min-h-screen items-center justify-center px-4">
      <section className="surface-card w-full max-w-lg p-8 text-center sm:p-10">
        <ShieldX className="mx-auto h-14 w-14 text-destructive" />
        <h1 className="mt-5 text-3xl font-extrabold">Not authorized</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          You do not have permission to view this page. Please return to the dashboard or contact an administrator.
        </p>
        <Link
          to="/dashboard"
          className="bg-navy mt-7 inline-flex rounded-full px-5 py-3 text-sm font-bold text-primary-foreground"
        >
          Go to dashboard
        </Link>
      </section>
    </div>
  );
}
