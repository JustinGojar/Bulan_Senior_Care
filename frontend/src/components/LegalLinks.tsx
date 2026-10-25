import { Link } from "@tanstack/react-router";
import { LEGAL_PAGES } from "@/lib/legal";

/** A row of links to the legal pages, for page footers. */
export function LegalLinks({ className = "" }: { className?: string }) {
  return (
    <nav aria-label="Legal" className={`flex flex-wrap gap-x-4 gap-y-1 text-xs ${className}`}>
      {LEGAL_PAGES.map((page) => (
        <Link
          key={page.to}
          to={page.to}
          className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          {page.label}
        </Link>
      ))}
    </nav>
  );
}
