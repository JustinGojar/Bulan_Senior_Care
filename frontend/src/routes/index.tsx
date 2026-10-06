import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Bell,
  Building2,
  ClipboardList,
  HandCoins,
  HelpCircle,
  Landmark,
  Menu,
  PieChart,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { SectionHeader } from "@/components/DesignKit";
import { TONE_BAR, panelClass, primaryButtonClass, tileClass } from "@/components/design-kit";
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
  { icon: Users, label: "Total number of registered senior citizens" },
  { icon: PieChart, label: "Benefit distribution status" },
  { icon: Building2, label: "Barangay-level summary" },
  { icon: Landmark, label: "Municipal-level summary" },
];

const HIGHLIGHTS = [
  { icon: ClipboardList, label: "Registration", detail: "Digital senior profiles" },
  { icon: BadgeCheck, label: "Eligibility", detail: "Checked against OSCA rules" },
  { icon: HandCoins, label: "Benefits", detail: "Tracked from release to receipt" },
];

const OBJECTIVES = [
  "Determine the information requirements: profiling, beneficiary qualification, and the existing OSCA workflow.",
  "Implement registration, eligibility, benefit tracking, reports, access control, notifications, and age thresholds.",
  "Integrate descriptive analytics at both barangay and municipal level.",
];

const BENEFICIARIES = [
  [
    "OSCA Staff",
    "Register seniors, update details, track distribution, and generate accurate reports.",
  ],
  ["Senior Citizens", "Receive the right benefits on time, with a clear view of their own status."],
  ["LGU-Bulan", "Better data for planning and decision-making on senior welfare programs."],
] as const;

const FAQ = [
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
] as const;

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
        <header className="surface-card sticky top-2 z-50 flex items-center justify-between gap-2 border border-border/60 bg-card/85 px-3 py-2.5 backdrop-blur-xl sm:top-3 sm:gap-6 sm:px-5 sm:py-3">
          <div className="flex min-w-0 shrink items-center gap-2.5 sm:gap-3">
            <BrandLogo className="h-9 w-9 ring-2 ring-gold/70 sm:h-10 sm:w-10" />
            <div className="min-w-0">
              <p className="font-display truncate text-xs font-bold sm:text-sm">Bulan SeniorCare</p>
              <p className="truncate text-[11px] text-muted-foreground sm:text-xs">
                OSCA · Bulan, Sorsogon
              </p>
            </div>
          </div>
          <nav
            aria-label="Main navigation"
            className="hidden flex-1 items-center justify-center gap-1 text-sm font-semibold text-muted-foreground lg:flex"
          >
            {NAV.map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase()}`}
                className="rounded-lg px-3 py-2 transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
              >
                {item}
              </a>
            ))}
          </nav>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
            <ThemeToggle className="hidden sm:grid" />
            <Link to="/login" className={`${primaryButtonClass} h-9 px-4 sm:h-10 sm:px-5`}>
              Log in <ArrowRight className="hidden h-4 w-4 sm:block" />
            </Link>
            <button
              type="button"
              onClick={() => setMobileMenuOpen((open) => !open)}
              aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-landing-navigation"
              className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-card lg:hidden"
            >
              {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
          {mobileMenuOpen && (
            <nav
              id="mobile-landing-navigation"
              aria-label="Main navigation"
              className="surface-card absolute top-full right-0 left-0 mt-2 grid gap-1 border border-border/60 p-2 lg:hidden"
            >
              {NAV.map((item) => (
                <a
                  key={item}
                  href={`#${item.toLowerCase()}`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-sm font-semibold text-foreground hover:bg-muted"
                >
                  {item}
                </a>
              ))}
              <div className="mt-1 flex items-center justify-between border-t border-border/60 px-3 pt-2">
                <span className="text-sm font-semibold">Appearance</span>
                <ThemeToggle />
              </div>
            </nav>
          )}
        </header>

        <section className="relative mt-6 overflow-hidden rounded-[calc(var(--radius)+8px)] border border-border/60 text-white shadow-[var(--shadow-card)] sm:mt-8">
          <img
            src={seniorCitizensPhoto}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover object-[center_35%]"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[oklch(0.2_0.06_258/0.97)] via-[oklch(0.24_0.06_258/0.9)] to-[oklch(0.26_0.06_258/0.55)]" />
          <div className="relative grid gap-10 px-6 py-14 sm:px-10 sm:py-20 lg:grid-cols-[1.15fr_0.85fr] lg:items-end lg:px-14 lg:py-24">
            <div>
              <span className="inline-flex items-center rounded-full border border-gold/40 bg-gold/15 px-3 py-1 text-[11px] font-semibold tracking-wider text-gold uppercase">
                Office for Senior Citizens Affairs
              </span>
              <h1 className="mt-6 text-3xl leading-tight font-extrabold sm:text-4xl lg:text-5xl xl:text-6xl xl:leading-[1.05]">
                Caring for every <span className="text-gold">Lolo</span> and{" "}
                <span className="text-gold">Lola</span> in Bulan
              </h1>
              <p className="font-display mt-5 text-lg text-white/90 sm:text-xl">
                Profile. Monitor. Serve better.
              </p>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/80 sm:text-base">
                The Bulan SeniorCare Portal replaces paper-based OSCA records with a single, secure
                system for registration, eligibility, benefits, and reporting — built for the Office
                of Senior Citizen Affairs and every barangay leader in the municipality.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  to="/login"
                  className="inline-flex h-12 items-center gap-2 rounded-lg bg-gold px-6 text-sm font-bold text-gold-foreground shadow-[var(--shadow-soft)]"
                >
                  Get Started <ArrowRight className="h-4 w-4" />
                </Link>
                <a
                  href="#features"
                  className="inline-flex h-12 items-center gap-2 rounded-lg border border-white/30 bg-white/10 px-6 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/20"
                >
                  Explore features
                </a>
              </div>
            </div>
            <ul className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              {HIGHLIGHTS.map(({ icon: Icon, label, detail }) => (
                <li
                  key={label}
                  className="flex items-center gap-3 rounded-lg border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/10 ring-1 ring-white/15">
                    <Icon className="h-4 w-4 text-gold" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">{label}</span>
                    <span className="block text-xs text-white/70">{detail}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section
          id="about"
          className={`${panelClass} mt-10 scroll-mt-20 p-5 sm:mt-14 sm:scroll-mt-24 sm:p-8 lg:p-10`}
        >
          <Eyebrow>About OSCA Bulan</Eyebrow>
          <h2 className="mt-4 max-w-3xl text-2xl font-extrabold sm:text-3xl">
            A centralized record for a growing senior population
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            Republic Act No. 9994 requires every municipality to run an Office for Senior Citizens
            Affairs. In Bulan, that office still relies on folders and spreadsheets, so retrieving
            and updating a record takes time and benefit histories are hard to trace. This portal
            digitizes profiling, eligibility, and benefit monitoring so staff spend their time
            serving seniors instead of searching for paper.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {OBJECTIVES.map((body, index) => (
              <div key={body} className={`${tileClass} relative overflow-hidden p-5 sm:p-6`}>
                <span className={`absolute inset-x-0 top-0 h-1 ${TONE_BAR.gold}`} />
                <p className="font-display text-2xl font-extrabold text-gold-foreground dark:text-gold">
                  {String(index + 1).padStart(2, "0")}
                </p>
                <p className="mt-1 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  Objective {index + 1}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="features" className="scroll-mt-20 py-14 sm:scroll-mt-24 sm:py-20">
          <SectionIntro eyebrow="What it does" title="System features">
            The seven modules defined in the study objectives.
          </SectionIntro>
          <div className="mt-8 grid gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <article
                key={title}
                className={`${panelClass} p-5 transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-soft)] sm:p-7`}
              >
                <span className="bg-navy grid h-11 w-11 place-items-center rounded-lg dark:ring-1 dark:ring-white/20">
                  <Icon className="h-5 w-5 text-gold" />
                </span>
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
          <div className={`${panelClass} p-5 sm:p-8 lg:p-10`}>
            <SectionHeader
              icon={Users}
              title="Who benefits"
              subtitle="The people the portal is built for."
            />
            <ul className="mt-6 space-y-3 text-sm">
              {BENEFICIARIES.map(([who, why]) => (
                <li key={who} className={`${tileClass} flex gap-3`}>
                  <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-gold" />
                  <span>
                    <span className="block font-bold">{who}</span>
                    <span className="mt-0.5 block text-muted-foreground">{why}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div
            id="analytics"
            className={`${panelClass} scroll-mt-20 p-5 sm:scroll-mt-24 sm:p-8 lg:p-10`}
          >
            <SectionHeader
              icon={BarChart3}
              title="Descriptive analytics"
              subtitle="Summaries available to OSCA staff."
            />
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {ANALYTICS.map(({ icon: Icon, label }) => (
                <div key={label} className={`${tileClass} flex items-center gap-3`}>
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gold/15 text-gold-foreground dark:text-gold">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="text-sm font-semibold">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="faq" className="scroll-mt-20 py-14 sm:scroll-mt-24 sm:py-20">
          <SectionIntro eyebrow="Questions" title="Frequently asked">
            Common questions about the portal.
          </SectionIntro>
          <div className="mt-8 grid gap-4 sm:gap-5 md:grid-cols-2">
            {FAQ.map(([q, a]) => (
              <div key={q} className={`${panelClass} flex gap-4 p-5 sm:p-7`}>
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-muted text-primary">
                  <HelpCircle className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-base font-bold">{q}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{a}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-navy relative overflow-hidden rounded-[calc(var(--radius)+8px)] px-6 py-10 text-white shadow-[var(--shadow-card)] sm:px-10 sm:py-12">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="max-w-xl">
              <h2 className="text-2xl font-extrabold sm:text-3xl">
                Ready to serve Bulan&apos;s <span className="text-gold">seniors</span>?
              </h2>
              <p className="mt-2 text-sm text-white/80">
                Log in with the account issued by the OSCA administrator.
              </p>
            </div>
            <Link
              to="/login"
              className="inline-flex h-12 items-center gap-2 rounded-lg bg-gold px-6 text-sm font-bold text-gold-foreground shadow-[var(--shadow-soft)]"
            >
              Log in to the portal <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        <footer
          className={`${panelClass} mt-6 mb-8 flex flex-wrap items-center justify-between gap-4 px-5 py-5 text-sm text-muted-foreground sm:px-8`}
        >
          <div className="flex items-center gap-3">
            <BrandLogo className="h-9 w-9 ring-2 ring-gold/60" />
            <p>Office of Senior Citizen Affairs · Municipality of Bulan, Sorsogon</p>
          </div>
          <p className="text-xs">© {new Date().getFullYear()} Bulan SeniorCare</p>
        </footer>
      </div>
    </div>
  );
}

// Headings that sit on the background photo get a frosted backing so they stay readable.
function SectionIntro({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="inline-block max-w-full rounded-lg border border-border/60 bg-card/85 px-5 py-4 shadow-[var(--shadow-soft)] backdrop-blur-md">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="mt-3 text-2xl font-extrabold sm:text-3xl">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{children}</p>
    </div>
  );
}

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-gold/40 bg-gold/15 px-3 py-1 text-[11px] font-semibold tracking-wider text-gold-foreground uppercase dark:text-gold">
      {children}
    </span>
  );
}
