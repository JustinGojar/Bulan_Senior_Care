import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Bell,
  ClipboardList,
  HandCoins,
  Menu,
  ShieldCheck,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import seniorCitizensPhoto from "@/images/img.webp";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Bulan SeniorCare — OSCA Senior Profiling & Benefit Portal" },
      {
        name: "description",
        content:
          "Web-based senior citizen profiling and benefit monitoring system with descriptive analytics for the Office of Senior Citizen Affairs of LGU-Bulan, Sorsogon.",
      },
      { property: "og:title", content: "Bulan SeniorCare — OSCA Portal" },
      {
        property: "og:description",
        content:
          "Registration, eligibility verification, benefit tracking, and barangay-level analytics for OSCA Bulan.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const NAV = ["About", "Features", "Benefits", "Analytics", "FAQ"];

const FEATURES = [
  {
    icon: ClipboardList,
    title: "Senior Citizen Registration",
    body: "Encode profiles, addresses, and supporting documents digitally — no more lost or unreadable paper folders.",
  },
  {
    icon: BadgeCheck,
    title: "Eligibility Verification",
    body: "Validate qualifications against OSCA rules before a beneficiary is endorsed for any program.",
  },
  {
    icon: HandCoins,
    title: "Benefit Tracking",
    body: "Know exactly which benefit each senior already received, and what is still pending release.",
  },
  {
    icon: BarChart3,
    title: "Reports and Analytics",
    body: "Descriptive charts for registrations, distribution status, and barangay to municipal summaries.",
  },
  {
    icon: ShieldCheck,
    title: "Roles and Access Control",
    body: "Three access levels — admin, OSCA head, and barangay leader — each seeing only what they should.",
  },
  {
    icon: Bell,
    title: "Notifications & Age Thresholds",
    body: "Email and SMS advisories, plus automatic detection of octogenarian, nonagenarian, and centenarian milestones.",
  },
];

const ANALYTICS = [
  "Total number of registered senior citizens",
  "Benefit distribution status",
  "Barangay-level summary",
  "Municipal-level summary",
];

function Landing() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    let fallbackTimer: number | undefined;
    let waitingForScroll = false;

    const cardsBySection: Record<string, string> = {
      about: "#about",
      features: "#features .surface-card",
      benefits: "#benefits > .surface-card:first-child",
      analytics: "#analytics",
      faq: "#faq .surface-card",
    };

    const popTargetCards = () => {
      if (!waitingForScroll) return;

      window.clearTimeout(fallbackTimer);
      document.querySelectorAll(".landing-scroll-pop").forEach((card) => {
        card.classList.remove("landing-scroll-pop");
      });

      const selector = cardsBySection[window.location.hash.slice(1)];
      if (selector) {
        document.querySelectorAll(selector).forEach((card) => {
          void (card as HTMLElement).offsetWidth;
          card.classList.add("landing-scroll-pop");
        });
      }

      waitingForScroll = false;
    };

    const scheduleFallback = () => {
      if (!waitingForScroll) return;
      window.clearTimeout(fallbackTimer);
      fallbackTimer = window.setTimeout(popTargetCards, 120);
    };

    const beginNavigation = () => {
      waitingForScroll = true;
      scheduleFallback();
    };

    const handleAnchorClick = (event: MouseEvent) => {
      if (event.target instanceof Element && event.target.closest('a[href^="#"]')) {
        beginNavigation();
      }
    };

    window.addEventListener("hashchange", beginNavigation);
    window.addEventListener("scroll", scheduleFallback, { passive: true });
    window.addEventListener("scrollend", popTargetCards);
    document.addEventListener("click", handleAnchorClick);

    return () => {
      window.clearTimeout(fallbackTimer);
      window.removeEventListener("hashchange", beginNavigation);
      window.removeEventListener("scroll", scheduleFallback);
      window.removeEventListener("scrollend", popTargetCards);
      document.removeEventListener("click", handleAnchorClick);
    };
  }, []);

  return (
    <div className="bg-app landing-page-bg min-h-screen">
      <div className="mx-auto max-w-screen-2xl px-4 py-4 sm:px-6 sm:py-5 lg:px-10 lg:py-6">
        <header className="surface-card sticky top-2 z-50 flex items-center justify-between gap-2 border border-border/70 bg-secondary/78 px-2 py-2.5 backdrop-blur-xl sm:top-3 sm:gap-6 sm:px-6 sm:py-3">
          <div className="flex min-w-0 shrink items-center gap-2.5 sm:gap-3">
            <BrandLogo className="h-9 w-9 ring-2 ring-gold/60 sm:h-10 sm:w-10" />
            <div className="min-w-0">
              <p className="font-display truncate text-xs font-bold sm:text-sm">Bulan SeniorCare</p>
              <p className="truncate text-[11px] text-muted-foreground sm:text-xs">
                Bulan, Sorsogon
              </p>
            </div>
          </div>
          <nav className="hidden flex-1 items-center justify-center gap-1 text-xs font-semibold text-muted-foreground lg:flex xl:gap-4 xl:text-sm">
            {NAV.map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase()}`}
                className="relative isolate rounded-xl px-2 py-2 transition-colors hover:text-foreground before:absolute before:inset-y-0 before:-inset-x-2 before:-z-10 before:rounded-xl before:bg-black/10 before:opacity-0 before:transition-opacity before:content-[''] hover:before:opacity-100 focus-visible:before:opacity-100"
              >
                {item}
              </a>
            ))}
          </nav>
          <div className="flex shrink-0 items-center gap-1 sm:gap-4">
            <ThemeToggle className="hidden sm:grid" />
            <Link
              to="/login"
              className="rounded-full bg-card px-3 py-2 text-xs font-semibold shadow-[var(--shadow-soft)] sm:px-5 sm:py-2.5 sm:text-sm"
            >
              Login
            </Link>
            <button
              type="button"
              onClick={() => setMobileMenuOpen((open) => !open)}
              aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-landing-navigation"
              className="grid h-9 w-9 place-items-center rounded-full bg-card lg:hidden"
            >
              {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
          {mobileMenuOpen && (
            <nav
              id="mobile-landing-navigation"
              aria-label="Main navigation"
              className="absolute top-full right-0 left-0 mt-2 grid gap-1 rounded-xl border border-border bg-card p-2 shadow-xl lg:hidden"
            >
              {NAV.map((item) => (
                <a
                  key={item}
                  href={`#${item.toLowerCase()}`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-sm font-semibold text-foreground hover:bg-secondary"
                >
                  {item}
                </a>
              ))}
              <div className="flex items-center justify-between border-t border-border px-3 pt-2">
                <span className="text-sm font-semibold">Appearance</span>
                <ThemeToggle />
              </div>
            </nav>
          )}
        </header>

        <section className="grid items-center gap-8 py-12 sm:gap-10 sm:py-16 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12 lg:py-20">
          <div>
            <span className="inline-flex items-center rounded-full bg-card px-4 py-2 text-xs font-semibold shadow-[var(--shadow-soft)]">
              Office for Senior Citizens Affairs
            </span>
            <h1 className="mt-6 text-3xl leading-tight font-extrabold sm:text-4xl lg:text-5xl xl:text-6xl xl:leading-[1.03]">
              Caring for every <span className="text-coral">Lolo</span> and{" "}
              <span className="text-coral">Lola</span> in Bulan
            </h1>
            <p className="font-display mt-5 text-lg text-foreground/85 dark:text-white sm:text-xl">
              Profile. Monitor. Serve better.
            </p>
            <p className="mt-5 max-w-xl text-sm leading-relaxed text-foreground/80 dark:text-white">
              The Bulan SeniorCare Portal replaces paper-based OSCA records with a single, secure
              system for registration, eligibility, benefits, and reporting — built for the Office
              of Senior Citizen Affairs and every barangay leader in the municipality.
            </p>
            <div className="mt-9 flex flex-wrap gap-4">
              <Link
                to="/login"
                className="bg-navy inline-flex items-center gap-2 rounded-full px-7 py-4 text-sm font-semibold text-white shadow-[var(--shadow-card)] dark:text-white"
              >
                Get Started <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-xl px-1 py-3 sm:px-2 sm:py-4">
            <div
              aria-hidden="true"
              className="absolute inset-2 rotate-[-6deg] border-8 border-white bg-white shadow-[var(--shadow-card)] sm:inset-4 sm:border-[10px]"
            />
            <div
              aria-hidden="true"
              className="absolute inset-2 rotate-[5deg] border-8 border-white bg-white shadow-[var(--shadow-card)] sm:inset-4 sm:border-[10px]"
            />
            <figure className="relative z-10 rotate-[-1deg] border-8 border-white bg-white shadow-[var(--shadow-card)] sm:border-[10px]">
              <img
                src={seniorCitizensPhoto}
                alt="Senior citizens gathered outdoors in Bulan"
                className="block aspect-[1.7] w-full object-cover"
              />
            </figure>
          </div>
        </section>

        <section
          id="about"
          className="surface-card scroll-mt-20 p-5 sm:scroll-mt-24 sm:p-8 lg:p-10"
        >
          <span className="rounded-full bg-secondary px-4 py-1.5 text-xs font-semibold">
            About OSCA Bulan
          </span>
          <h2 className="mt-5 max-w-3xl text-2xl font-extrabold sm:text-3xl">
            A centralized record for a growing senior population
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            Republic Act No. 9994 requires every municipality to run an Office for Senior Citizens
            Affairs. In Bulan, that office still relies on folders and spreadsheets, so retrieving
            and updating a record takes time and benefit histories are hard to trace. This portal
            digitizes profiling, eligibility, and benefit monitoring so staff spend their time
            serving seniors instead of searching for paper.
          </p>
          <div className="mt-8 grid gap-5 sm:grid-cols-3">
            {[
              [
                "Objective 1",
                "Determine the information requirements: profiling, beneficiary qualification, and the existing OSCA workflow.",
              ],
              [
                "Objective 2",
                "Implement registration, eligibility, benefit tracking, reports, access control, notifications, and age thresholds.",
              ],
              [
                "Objective 3",
                "Integrate descriptive analytics at both barangay and municipal level.",
              ],
            ].map(([tag, body]) => (
              <div key={tag} className="rounded-2xl bg-secondary p-5 sm:rounded-3xl sm:p-6">
                <p className="text-xs font-bold text-gold-foreground dark:text-white">{tag}</p>
                <p className="mt-2 text-sm text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="features" className="scroll-mt-20 py-14 sm:scroll-mt-24 sm:py-20">
          <h2 className="text-2xl font-extrabold sm:text-3xl">System features</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            The seven modules defined in the study objectives.
          </p>
          <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <article key={title} className="surface-card p-5 sm:p-7">
                <div className="bg-navy grid h-11 w-11 place-items-center rounded-2xl text-white">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-lg font-bold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
              </article>
            ))}
          </div>
        </section>

        <section
          id="benefits"
          className="scroll-mt-20 grid gap-5 sm:scroll-mt-24 sm:gap-6 lg:grid-cols-2"
        >
          <div className="surface-card p-5 sm:p-8 lg:p-10">
            <h2 className="text-2xl font-extrabold sm:text-3xl">Who benefits</h2>
            <ul className="mt-6 space-y-5 text-sm">
              {[
                [
                  "OSCA Staff",
                  "Register seniors, update details, track distribution, and generate accurate reports.",
                ],
                [
                  "Senior Citizens",
                  "Receive the right benefits on time, with a clear view of their own status.",
                ],
                [
                  "LGU-Bulan",
                  "Better data for planning and decision-making on senior welfare programs.",
                ],
              ].map(([who, why]) => (
                <li key={who} className="flex gap-4">
                  <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-gold" />
                  <span>
                    <span className="font-bold">{who}. </span>
                    <span className="text-muted-foreground">{why}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div
            id="analytics"
            className="surface-card scroll-mt-20 p-5 sm:scroll-mt-24 sm:p-8 lg:p-10"
          >
            <h2 className="text-2xl font-extrabold sm:text-3xl">Descriptive analytics</h2>
            <div className="mt-6 grid gap-3">
              {ANALYTICS.map((item) => (
                <div
                  key={item}
                  className="rounded-2xl bg-secondary px-5 py-4 text-sm font-semibold"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="faq" className="scroll-mt-20 py-14 sm:scroll-mt-24 sm:py-20">
          <h2 className="text-2xl font-extrabold sm:text-3xl">Frequently asked</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {[
              [
                "Can reports be printed or downloaded?",
                "Reports are viewable on screen. Printing and export are outside the current scope of the study.",
              ],
              [
                "Does it work offline?",
                "No. The portal is server-based and needs a stable internet connection.",
              ],
              [
                "Which devices are supported?",
                "Desktop browsers on Windows 10/11 and Android 7+ phones and tablets.",
              ],
              [
                "How is access controlled?",
                "Three role levels — seniors see only their own record, OSCA staff and admins manage all records.",
              ],
            ].map(([q, a]) => (
              <div key={q} className="surface-card p-5 sm:p-7">
                <h3 className="text-base font-bold">{q}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{a}</p>
              </div>
            ))}
          </div>
        </section>

        <footer className="surface-card mb-8 flex flex-wrap items-center justify-center gap-4 px-4 py-6 text-center text-sm text-muted-foreground sm:px-8">
          <p>Office of Senior Citizen Affairs · Municipality of Bulan, Sorsogon</p>
        </footer>
      </div>
    </div>
  );
}
