import { Link } from "@tanstack/react-router";
import { Cookie } from "lucide-react";
import { useEffect, useState } from "react";
import { panelClass, primaryButtonClass } from "@/components/design-kit";
import { COOKIE_NOTICE_KEY, COOKIE_NOTICE_VERSION } from "@/lib/legal";

/**
 * Cookie notice shown until the visitor dismisses it. The portal only uses strictly necessary
 * cookies and storage, so there is nothing optional to switch off; the notice tells visitors what
 * is used and links to the full list.
 */
export function CookieBanner() {
  // Starts hidden so the server render and first client render match; shown after mount.
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      setOpen(localStorage.getItem(COOKIE_NOTICE_KEY) !== COOKIE_NOTICE_VERSION);
    } catch {
      setOpen(true);
    }
  }, []);

  if (!open) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(COOKIE_NOTICE_KEY, COOKIE_NOTICE_VERSION);
    } catch {
      // Storage is blocked; the notice simply closes for this page view.
    }
    setOpen(false);
  };

  return (
    <div
      role="region"
      aria-label="Cookie notice"
      className="fixed inset-x-0 bottom-0 z-[60] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:inset-x-auto sm:right-4 sm:bottom-4 sm:max-w-md sm:p-0"
    >
      <div className={`${panelClass} flex flex-col gap-4 p-5 shadow-[var(--shadow-card)]`}>
        <div className="flex gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gold/15 text-gold-foreground dark:text-gold">
            <Cookie className="h-4 w-4" />
          </span>
          <div className="text-sm">
            <p className="font-bold">We use essential cookies only</p>
            <p className="mt-1 leading-relaxed text-muted-foreground">
              Bulan SeniorCare uses cookies and browser storage to sign you in, keep your account
              secure, and remember your settings. We do not use tracking or advertising cookies.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3">
          <Link
            to="/cookie-policy"
            className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
          >
            Cookie Policy
          </Link>
          <button type="button" onClick={dismiss} className={`${primaryButtonClass} h-10`}>
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
