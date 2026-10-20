import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Archive,
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Bell,
  Building2,
  Cake,
  ClipboardList,
  DatabaseBackup,
  FileCheck2,
  HandCoins,
  HelpCircle,
  History,
  Landmark,
  Megaphone,
  Menu,
  MessagesSquare,
  PieChart,
  ShieldCheck,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { SectionHeader } from "@/components/DesignKit";
import { TONE_BAR, panelClass, primaryButtonClass, tileClass } from "@/components/design-kit";
import { InstallAppButton } from "@/components/InstallAppButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { publicPageHead, SITE_DESCRIPTION, SITE_TITLE } from "@/lib/seo";

export const Route = createFileRoute("/")({
  head: () => publicPageHead("/", SITE_TITLE, SITE_DESCRIPTION),
  component: Landing,
});

const NAV = ["About", "Features", "Workflow", "Benefits", "Analytics", "FAQ"];

const HIGHLIGHTS = [
  "Barangay to municipal records",
  "Admin-reviewed eligibility",
  "Approved, published reports",
  "Installable on Android",
];

const FEATURES = [
  {
    icon: ClipboardList,
    title: "Senior Citizen Registration",
    body: "Encode profiles, photos, and supporting documents, or bulk-import a barangay list from a CSV or Excel file. Filter by barangay, sex, and age range.",
  },
  {
    icon: BadgeCheck,
    title: "Eligibility Review",
    body: "New registrations and record edits wait for admin review, so no senior is enrolled in a program before their details are verified.",
  },
  {
    icon: Cake,
    title: "Age Threshold Milestones",
    body: "Seniors who reach an octogenarian, nonagenarian, or centenarian age bracket are flagged automatically, together with the grant they can claim.",
  },
  {
    icon: HandCoins,
    title: "Benefit Tracking and Releases",
    body: "Group releases into dated batches with their documents, print claim forms and payroll masterlists, and block duplicate one-time grants.",
  },
  {
    icon: FileCheck2,
    title: "Reports with Approval",
    body: "The admin generates municipal and barangay reports from stored records; the OSCA Head reviews, approves, and publishes them.",
  },
  {
    icon: BarChart3,
    title: "Descriptive Analytics",
    body: "Charts for registrations per barangay, age distribution, benefit records, and release activity, plus month-over-month growth on the dashboard.",
  },
  {
    icon: MessagesSquare,
    title: "Messaging",
    body: "Barangay leaders and the OSCA Head chat inside the portal and share photos and files privately, with live unread counts.",
  },
  {
    icon: Megaphone,
    title: "Announcements",
    body: "Post OSCA news with images and comments, or bring in posts from the official Facebook Page, so every barangay reads the same update.",
  },
  {
    icon: Bell,
    title: "Notifications and Advisories",
    body: "In-app alerts for reviews, releases, and age milestones, plus optional email and SMS advisories that the admin can switch on or off.",
  },
];

const WORKFLOW = [
  {
    icon: ClipboardList,
    title: "Register",
    body: "Barangay leaders encode seniors in their own barangay, one at a time or by bulk import.",
  },
  {
    icon: BadgeCheck,
    title: "Review",
    body: "The admin verifies each registration and edit request before it counts toward a program.",
  },
  {
    icon: HandCoins,
    title: "Release",
    body: "Benefits are released in dated batches, with claim forms, rosters, and documents kept together.",
  },
  {
    icon: FileCheck2,
    title: "Report",
    body: "Reports are built from the records, approved by the OSCA Head, then published to staff.",
  },
];

const SAFEGUARDS = [
  {
    icon: ShieldCheck,
    title: "Role-based access",
    body: "Admin, OSCA Head, and barangay leader accounts, with email verification for every new user.",
  },
  {
    icon: History,
    title: "Audit logs",
    body: "Every change to accounts, senior records, and benefits is recorded with who made it and when.",
  },
  {
    icon: DatabaseBackup,
    title: "Backup and restore",
    body: "The admin can download a full database backup and restore it from file when needed.",
  },
  {
    icon: Archive,
    title: "Archived records",
    body: "Inactive or deceased seniors are archived, not deleted, and their records can still be printed.",
  },
];

const ANALYTICS = [
  { icon: Users, label: "Registered seniors per barangay" },
  { icon: PieChart, label: "Age distribution by age group" },
  { icon: HandCoins, label: "Benefit records per program" },
  { icon: TrendingUp, label: "Benefit release activity" },
  { icon: Building2, label: "Barangay-level summary" },
  { icon: Landmark, label: "Municipal-level summary" },
];

const OBJECTIVES = [
  "Determine the information requirements: profiling, beneficiary qualification, and the existing OSCA workflow.",
  "Implement registration, eligibility, benefit tracking, reports, access control, notifications, and age thresholds.",
  "Integrate descriptive analytics at both barangay and municipal level.",
];

const BENEFICIARIES = [
  [
    "OSCA Staff",
    "Review registrations, release benefits in batches, and publish accurate, approved reports.",
  ],
  [
    "Barangay Leaders",
    "Keep their own barangay's list up to date and message the OSCA Head directly.",
  ],
  ["Senior Citizens", "Receive the right benefits on time, including age milestone grants."],
  ["LGU-Bulan", "Better data for planning and decision-making on senior welfare programs."],
] as const;

const FAQ = [
  [
    "Who can create an account?",
    "Accounts are issued by the OSCA administrator. New users confirm their email address before they can sign in.",
  ],
  [
    "How is access controlled?",
    "Three role levels — Admins manage accounts and review records, the OSCA Head approves releases and reports, and Barangay Leaders work only with seniors in their own barangay.",
  ],
  [
    "Can reports be printed or downloaded?",
    "Yes. Masterlists, claim forms, and approved reports download as PDF, and release rosters as Excel files.",
  ],
  [
    "Can I install it on my phone?",
    "Yes. On Android Chrome and desktop Chrome or Edge, use “Install app” to add Bulan SeniorCare to the home screen.",
  ],
  [
    "Is senior data kept safe?",
    "Sessions sign out after 30 minutes of inactivity, documents and attachments are private, and every change is written to the audit log.",
  ],
  [
    "Does it work offline?",
    "No. The portal is server-based and needs a stable internet connection.",
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
      workflow: "#workflow .surface-card",
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
              <p className="truncate text-[0.6875rem] text-muted-foreground sm:text-xs">
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
            <Link
              to="/login"
              className={`${primaryButtonClass} group h-9 px-4 transition-[background-color,color,transform,box-shadow] duration-200 outline-none hover:-translate-y-0.5 hover:bg-navy-hover hover:bg-none focus-visible:ring-4 focus-visible:ring-navy-hover/35 active:translate-y-0 sm:h-10 sm:px-5`}
            >
              Log in{" "}
              <ArrowRight className="hidden h-4 w-4 transition-transform duration-200 group-hover:translate-x-1 sm:block" />
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

        <section className="py-12 sm:py-16 lg:py-20">
          <span className="inline-flex items-center rounded-full bg-card px-4 py-2 text-xs font-semibold shadow-[var(--shadow-soft)] sm:text-sm">
            Office for Senior Citizens Affairs
          </span>
          {/* One line from tablet width up; the size follows the viewport so it never overflows. */}
          <h1 className="mt-6 text-3xl leading-tight font-extrabold sm:text-4xl md:text-[clamp(1.75rem,3.8vw,3.75rem)] md:leading-[1.05] md:whitespace-nowrap">
            Caring for every <span className="text-coral">Lolo</span> and{" "}
            <span className="text-coral">Lola</span> in Bulan
          </h1>
          <p className="font-display mt-5 text-lg font-semibold text-foreground/85 sm:text-xl lg:text-2xl dark:text-white">
            Profile. Monitor. Serve better.
          </p>
          <p className="mt-5 max-w-2xl text-sm leading-relaxed text-foreground/80 sm:text-base dark:text-white">
            The Bulan SeniorCare Portal replaces paper-based OSCA records with a single, secure
            system for registration, eligibility, benefits, and reporting — built for the Office of
            Senior Citizen Affairs and every barangay leader in the municipality.
          </p>
          <ul className="mt-6 flex flex-wrap gap-2">
            {HIGHLIGHTS.map((item) => (
              <li
                key={item}
                className="inline-flex items-center gap-1.5 rounded-full bg-card/90 px-3 py-1.5 text-xs font-semibold shadow-[var(--shadow-soft)] sm:text-sm"
              >
                <BadgeCheck className="h-4 w-4 text-gold-foreground dark:text-gold" />
                {item}
              </li>
            ))}
          </ul>
          <div className="mt-9 flex flex-wrap gap-4">
            <Link
              to="/login"
              className="group bg-navy inline-flex items-center gap-2 rounded-full px-7 py-4 text-sm font-semibold text-white shadow-[var(--shadow-card)] transition-[background-color,color,transform,box-shadow] duration-200 outline-none hover:-translate-y-0.5 hover:bg-navy-hover hover:bg-none hover:shadow-[0_12px_28px_-8px_rgb(0_0_0/0.35)] focus-visible:ring-4 focus-visible:ring-navy-hover/35 active:translate-y-0 sm:text-base"
            >
              Get Started{" "}
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
            </Link>
            <InstallAppButton className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/90 px-7 py-4 text-sm font-semibold text-foreground shadow-[var(--shadow-soft)] transition-colors hover:bg-muted sm:text-base" />
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
            Every module in the portal, from registration to published reports.
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
          id="workflow"
          className={`${panelClass} scroll-mt-20 p-5 sm:scroll-mt-24 sm:p-8 lg:p-10`}
        >
          <Eyebrow>How it works</Eyebrow>
          <h2 className="mt-4 max-w-3xl text-2xl font-extrabold sm:text-3xl">
            From registration to a published report
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            Each step is handled by the right role, and every record carries who created and last
            modified it.
          </p>
          <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {WORKFLOW.map(({ icon: Icon, title, body }, index) => (
              <li key={title} className={`${tileClass} relative overflow-hidden p-5 sm:p-6`}>
                <span className={`absolute inset-x-0 top-0 h-1 ${TONE_BAR.gold}`} />
                <div className="flex items-center gap-3">
                  <span className="bg-navy grid h-10 w-10 place-items-center rounded-lg dark:ring-1 dark:ring-white/20">
                    <Icon className="h-5 w-5 text-gold" />
                  </span>
                  <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                    Step {index + 1}
                  </p>
                </div>
                <h3 className="mt-4 text-lg font-bold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
              </li>
            ))}
          </ol>
          <div className="mt-10 border-t border-border/60 pt-8">
            <SectionHeader
              icon={ShieldCheck}
              title="Built-in safeguards"
              subtitle="How the portal protects senior records."
            />
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {SAFEGUARDS.map(({ icon: Icon, title, body }) => (
                <div key={title} className={`${tileClass} flex gap-3`}>
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gold/15 text-gold-foreground dark:text-gold">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span>
                    <span className="block text-sm font-bold">{title}</span>
                    <span className="mt-0.5 block text-sm text-muted-foreground">{body}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          id="benefits"
          className="mt-14 grid scroll-mt-20 gap-5 sm:mt-20 sm:scroll-mt-24 sm:gap-6 lg:grid-cols-2"
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
              className="group hover:bg-navy inline-flex h-12 items-center gap-2 rounded-lg bg-gold px-6 text-sm font-bold text-gold-foreground shadow-[var(--shadow-soft)] transition-[background-color,color,transform,box-shadow] duration-200 outline-none hover:-translate-y-0.5 hover:text-white hover:shadow-[0_12px_28px_-8px_rgb(0_0_0/0.35)] focus-visible:ring-4 focus-visible:ring-navy-hover/35 active:translate-y-0"
            >
              Log in to the portal{" "}
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
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
    // No card behind it: navy text with a soft white glow stays readable on the photo background.
    <div className="inline-block max-w-full">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="mt-3 text-2xl font-extrabold text-primary [text-shadow:0_0_14px_rgb(255_255_255/0.9)] dark:[text-shadow:0_2px_12px_rgb(0_0_0/0.6)] sm:text-3xl">
        {title}
      </h2>
      <p className="mt-1 text-sm font-medium text-primary [text-shadow:0_0_10px_rgb(255_255_255/0.95)] dark:[text-shadow:0_1px_8px_rgb(0_0_0/0.6)]">
        {children}
      </p>
    </div>
  );
}

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-white px-3 py-1 text-[0.6875rem] font-semibold tracking-wider text-gold-foreground uppercase">
      {children}
    </span>
  );
}
