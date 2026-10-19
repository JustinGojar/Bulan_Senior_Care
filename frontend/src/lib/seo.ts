// Public address of the site, used for absolute URLs in share previews and canonical links. Keep
// it in step with the URLs in public/sitemap.xml.
export const SITE_URL = "https://bulan-senior-care.vercel.app";
export const SITE_TITLE = "Bulan SeniorCare — OSCA Senior Profiling & Benefit Portal";
export const SITE_DESCRIPTION =
  "Web-based senior citizen profiling and benefit monitoring system with descriptive analytics for the Office of Senior Citizen Affairs of LGU-Bulan, Sorsogon.";

/** Title, share-preview and canonical tags for a public page. Pages behind login don't need these. */
export function publicPageHead(path: string, title: string, description: string) {
  const url = `${SITE_URL}${path}`;
  return {
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:url", content: url },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
    ],
    links: [{ rel: "canonical", href: url }],
  };
}
