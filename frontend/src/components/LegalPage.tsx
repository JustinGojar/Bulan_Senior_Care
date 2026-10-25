import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import type { AgreementSection } from "@/components/AgreementDialog";
import { BrandLogo } from "@/components/BrandLogo";
import { panelClass } from "@/components/design-kit";
import { LegalLinks } from "@/components/LegalLinks";
import { LEGAL_LAST_UPDATED } from "@/lib/legal";

/** Full-page layout for the public privacy, terms, refund and cookie pages. */
export function LegalPage({
  title,
  intro,
  sections,
}: {
  title: string;
  intro: ReactNode;
  sections: AgreementSection[];
}) {
  return (
    <div className="bg-app relative min-h-screen px-4 py-8 sm:py-12">
      <div className="pointer-events-none absolute inset-0 bg-background/40 backdrop-blur-[2px]" />
      <div className="relative mx-auto w-full max-w-3xl">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-3">
            <BrandLogo className="h-10 w-10 ring-2 ring-gold/70" />
            <div>
              <p className="font-display text-sm font-bold">Bulan SeniorCare</p>
              <p className="text-xs text-muted-foreground">OSCA · Municipality of Bulan</p>
            </div>
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Home page
          </Link>
        </header>

        <main className={`${panelClass} mt-6 p-6 sm:p-10`}>
          <h1 className="text-3xl font-extrabold">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Last updated {LEGAL_LAST_UPDATED}</p>
          <div className="mt-5 space-y-2 text-sm leading-relaxed text-muted-foreground">
            {intro}
          </div>

          <div className="mt-8 space-y-7">
            {sections.map((section, index) => (
              <section key={section.title}>
                <h2 className="text-base font-bold">
                  {index + 1}. {section.title}
                </h2>
                <div className="mt-2 space-y-2 text-sm leading-relaxed text-muted-foreground [&_a]:font-semibold [&_a]:text-primary [&_a]:underline [&_li]:mt-1 [&_strong]:text-foreground [&_ul]:list-disc [&_ul]:pl-5">
                  {section.body}
                </div>
              </section>
            ))}
          </div>
        </main>

        <footer className="mt-6 mb-4 text-center text-xs text-muted-foreground">
          <LegalLinks className="justify-center" />
          <p className="mt-3">© {new Date().getFullYear()} OSCA Bulan · Bulan SeniorCare Portal</p>
        </footer>
      </div>
    </div>
  );
}
