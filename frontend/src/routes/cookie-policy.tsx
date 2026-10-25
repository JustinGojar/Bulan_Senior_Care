import { createFileRoute } from "@tanstack/react-router";
import type { AgreementSection } from "@/components/AgreementDialog";
import { LegalPage } from "@/components/LegalPage";
import { publicPageHead } from "@/lib/seo";

export const Route = createFileRoute("/cookie-policy")({
  head: () =>
    publicPageHead(
      "/cookie-policy",
      "Cookie Policy — Bulan SeniorCare",
      "The cookies and browser storage the Bulan SeniorCare portal uses, and how to manage them.",
    ),
  component: CookiePolicyPage,
});

// Keep in step with the cookie set by the backend's AuthenticateFromCookie and the storage keys
// in src/lib, and bump COOKIE_NOTICE_VERSION when an item is added.
const STORAGE_ITEMS: { name: string; type: string; purpose: string; duration: string }[] = [
  {
    name: "bulan_api_token",
    type: "Cookie (HttpOnly)",
    purpose: "Keeps you signed in. Page scripts cannot read it.",
    duration: "Until you log out, or up to 12 hours",
  },
  {
    name: "bulan-session-id",
    type: "Local storage",
    purpose: "Marks that this browser has a signed-in session, so open tabs stay in step.",
    duration: "Until you log out",
  },
  {
    name: "bulan-api-session",
    type: "Local storage",
    purpose: "Your name and role, so the page shows the right menu while it loads.",
    duration: "Until you log out",
  },
  {
    name: "bulan-session-notice",
    type: "Local storage",
    purpose: "Tells you on the login page why your last session ended.",
    duration: "Until shown once",
  },
  {
    name: "bulan-last-activity",
    type: "Local storage",
    purpose: "Signs you out after inactivity, across all open tabs.",
    duration: "Until you log out",
  },
  {
    name: "bulan-theme",
    type: "Local storage",
    purpose: "Remembers light or dark mode.",
    duration: "Until you clear it",
  },
  {
    name: "bulan-notification-settings",
    type: "Local storage",
    purpose: "Remembers your notification settings.",
    duration: "Until you clear it",
  },
  {
    name: "bulan-cookie-notice",
    type: "Local storage",
    purpose: "Remembers that you closed the cookie notice.",
    duration: "Until you clear it",
  },
  {
    name: "bulan-splash-shown",
    type: "Session storage",
    purpose: "Shows the opening screen only once per visit.",
    duration: "Until you close the tab",
  },
];

const SECTIONS: AgreementSection[] = [
  {
    title: "What cookies and browser storage are",
    body: (
      <p>
        Cookies are small files a website saves in your browser. Local and session storage work in a
        similar way. Websites use them to remember things between pages and visits.
      </p>
    ),
  },
  {
    title: "What we use",
    body: (
      <>
        <p>
          Bulan SeniorCare uses only <strong>strictly necessary</strong> cookies and storage: the
          ones it needs to sign you in, keep your account secure, and remember your display
          settings. We do not use advertising, tracking, or analytics cookies, and we do not let
          other companies set cookies through the portal.
        </p>
        <div className="mt-3 overflow-x-auto rounded-lg border border-border/60">
          <table className="w-full min-w-[36rem] text-left text-xs">
            <thead className="bg-muted/60 text-foreground">
              <tr>
                <th className="px-3 py-2 font-semibold">Name</th>
                <th className="px-3 py-2 font-semibold">Type</th>
                <th className="px-3 py-2 font-semibold">Purpose</th>
                <th className="px-3 py-2 font-semibold">How long</th>
              </tr>
            </thead>
            <tbody>
              {STORAGE_ITEMS.map((item) => (
                <tr key={item.name} className="border-t border-border/60 align-top">
                  <td className="px-3 py-2 font-mono text-foreground">{item.name}</td>
                  <td className="px-3 py-2">{item.type}</td>
                  <td className="px-3 py-2">{item.purpose}</td>
                  <td className="px-3 py-2">{item.duration}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          When you install the portal as an app, your browser also keeps a cached copy of its files
          so it opens quickly. This cache holds no personal information.
        </p>
      </>
    ),
  },
  {
    title: "Third parties",
    body: (
      <p>
        Fonts are loaded from Google Fonts, which receives your IP address and browser details when
        a page loads, as described in Google&apos;s privacy policy. Google Fonts does not set
        cookies on the portal.
      </p>
    ),
  },
  {
    title: "Managing cookies",
    body: (
      <p>
        You can clear or block cookies and site data in your browser settings. Because every item
        above is needed for the portal to work, blocking them will stop you from signing in, and
        your theme and notification settings will reset.
      </p>
    ),
  },
  {
    title: "Changes to this policy",
    body: (
      <p>
        If we add a cookie or storage item, we will update this list and show the cookie notice
        again.
      </p>
    ),
  },
];

function CookiePolicyPage() {
  return (
    <LegalPage
      title="Cookie Policy"
      intro={
        <p>
          This policy lists the cookies and browser storage the Bulan SeniorCare portal uses and
          why.
        </p>
      }
      sections={SECTIONS}
    />
  );
}
