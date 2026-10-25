/** Date shown on the privacy, terms, refund and cookie pages. Change it whenever their text changes. */
export const LEGAL_LAST_UPDATED = "October 25, 2026";

/** The public legal pages, in the order they are linked from footers and from each other. */
export const LEGAL_PAGES = [
  { to: "/privacy-policy", label: "Privacy Policy" },
  { to: "/terms-of-service", label: "Terms of Service" },
  { to: "/refund-policy", label: "Refund Policy" },
  { to: "/cookie-policy", label: "Cookie Policy" },
] as const;

/**
 * The version of the cookie notice a visitor dismissed. Bump it when the cookie policy adds a new
 * cookie or storage item, so the banner shows again.
 */
export const COOKIE_NOTICE_VERSION = "2026-10-25";
export const COOKIE_NOTICE_KEY = "bulan-cookie-notice";
