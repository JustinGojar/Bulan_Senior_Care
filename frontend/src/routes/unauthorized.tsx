import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ShieldX } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { panelClass, primaryButtonClass } from "@/components/design-kit";

export const Route = createFileRoute("/unauthorized")({
  head: () => ({ meta: [{ title: "Unauthorized — Bulan SeniorCare" }] }),
  component: UnauthorizedPage,
});

function UnauthorizedPage() {
  return (
    <div className="bg-app relative flex min-h-screen items-center justify-center px-4">
      <div className="pointer-events-none absolute inset-0 bg-background/40 backdrop-blur-[2px]" />
      <section className={`${panelClass} relative w-full max-w-lg p-8 text-center sm:p-10`}>
        <div className="flex items-center justify-center gap-3">
          <BrandLogo className="h-10 w-10 ring-2 ring-gold/70" />
          <p className="font-display text-sm font-bold">Bulan SeniorCare</p>
        </div>
        <span className="mx-auto mt-8 grid h-14 w-14 place-items-center rounded-lg border border-destructive/30 bg-destructive/10 text-destructive">
          <ShieldX className="h-7 w-7" />
        </span>
        <h1 className="mt-5 text-3xl font-extrabold">Not authorized</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          You do not have permission to view this page. Please return to the dashboard or contact an
          administrator.
        </p>
        <Link to="/dashboard" className={`${primaryButtonClass} mt-7`}>
          <ArrowLeft className="h-4 w-4" />
          Go to dashboard
        </Link>
      </section>
    </div>
  );
}
