import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Bell,
  ClipboardList,
  HandCoins,
  ShieldCheck,
  Users,
} from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { apiFetch } from "@/lib/api";
import { useEffect, useState } from "react";

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

type Overview = {
  total_registered: number;
  active_seniors: number;
  pending_applications: number;
  benefits_distributed_amount: number;
  benefits_distributed_count: number;
  distribution_percentage: number;
};

function Landing() {
  const [overview, setOverview] = useState<Overview | null>(null);

  useEffect(() => {
    apiFetch<Overview>("/overview").then(setOverview).catch(() => setOverview(null));
  }, []);

  const distributionAmount = overview?.benefits_distributed_amount ?? 0;
  const formattedAmount = distributionAmount >= 1_000_000
    ? `₱${(distributionAmount / 1_000_000).toFixed(1)}M`
    : `₱${distributionAmount.toLocaleString()}`;

  return (
    <div className="bg-app min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <header className="surface-card flex items-center justify-between gap-6 px-6 py-3">
          <div className="flex items-center gap-3">
            <BrandLogo className="h-10 w-10 ring-2 ring-gold/60" />
            <div>
              <p className="font-display text-sm font-bold">Bulan SeniorCare</p>
              <p className="text-xs text-muted-foreground">OSCA · Bulan, Sorsogon</p>
            </div>
          </div>
          <nav className="hidden items-center gap-7 text-sm font-semibold text-muted-foreground lg:flex">
            {NAV.map((item) => (
              <a key={item} href={`#${item.toLowerCase()}`} className="hover:text-foreground">
                {item}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              to="/login"
              className="rounded-full bg-card px-5 py-2.5 text-sm font-semibold shadow-[var(--shadow-soft)]"
            >
              Login
            </Link>
            <Link
              to="/register"
              className="bg-navy rounded-full px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-soft)]"
            >
              Register
            </Link>
          </div>
        </header>

        <section className="grid items-center gap-12 py-20 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-card px-4 py-2 text-xs font-semibold shadow-[var(--shadow-soft)]">
              <span className="h-4 w-4 rounded-full bg-gold" />
              Municipality of Bulan, Sorsogon
            </span>
            <h1 className="mt-6 text-6xl leading-[1.03] font-extrabold">
              Caring for every <span className="text-coral">Lolo</span> and{" "}
              <span className="text-coral">Lola</span> in Bulan
            </h1>
            <p className="font-display mt-5 text-xl text-muted-foreground">
              Profile. Monitor. Serve better.
            </p>
            <p className="mt-5 max-w-xl text-sm leading-relaxed text-muted-foreground">
              The Bulan SeniorCare Portal replaces paper-based OSCA records with a single, secure
              system for registration, eligibility, benefits, and reporting — built for the Office
              of Senior Citizen Affairs and every barangay leader in the municipality.
            </p>
            <div className="mt-9 flex flex-wrap gap-4">
              <Link
                to="/login"
                className="bg-navy inline-flex items-center gap-2 rounded-full px-7 py-4 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-card)]"
              >
                Get Started <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="mt-9 flex flex-wrap gap-7 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <Users className="h-4 w-4" /> {overview ? `${overview.total_registered.toLocaleString()}+` : "..."} seniors
                registered
              </span>
              <span className="inline-flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" /> Role-based secured
              </span>
            </div>
          </div>

          <div className="surface-card p-7">
            <div className="flex items-center justify-between">
              <p className="font-display text-sm font-bold text-muted-foreground">
                System Dashboard
              </p>
              <span className="rounded-full bg-secondary px-3 py-1 text-[10px] font-bold tracking-wider text-muted-foreground">
                LIVE
              </span>
            </div>
            <div className="mt-8 grid grid-cols-2 gap-6">
              <div>
                <p className="text-xs text-muted-foreground">Total Registered</p>
                <p className="font-display mt-1 text-3xl font-bold">
                  {overview ? overview.total_registered.toLocaleString() : "..."}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Benefits Distributed</p>
                <p className="font-display mt-1 text-3xl font-bold">
                  {overview ? formattedAmount : "..."}
                </p>
              </div>
            </div>
            <div className="mt-9">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Distribution status</span>
                <span className="font-bold text-success">
                  {overview ? `${overview.distribution_percentage}% complete` : "Loading..."}
                </span>
              </div>
              <div className="mt-3 h-2 rounded-full bg-secondary">
                <div
                  className="bg-navy h-2 rounded-full transition-all"
                  style={{ width: `${overview?.distribution_percentage ?? 0}%` }}
                />
              </div>
            </div>
          </div>
        </section>

        <section id="about" className="surface-card p-10">
          <span className="rounded-full bg-secondary px-4 py-1.5 text-xs font-semibold">
            About OSCA Bulan
          </span>
          <h2 className="mt-5 max-w-3xl text-3xl font-extrabold">
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
              ["Objective 1", "Determine the information requirements: profiling, beneficiary qualification, and the existing OSCA workflow."],
              ["Objective 2", "Implement registration, eligibility, benefit tracking, reports, access control, notifications, and age thresholds."],
              ["Objective 3", "Integrate descriptive analytics at both barangay and municipal level."],
            ].map(([tag, body]) => (
              <div key={tag} className="rounded-3xl bg-secondary p-6">
                <p className="text-xs font-bold text-gold-foreground">{tag}</p>
                <p className="mt-2 text-sm text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="features" className="py-20">
          <h2 className="text-3xl font-extrabold">System features</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            The seven modules defined in the study objectives.
          </p>
          <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <article key={title} className="surface-card p-7">
                <div className="bg-navy grid h-11 w-11 place-items-center rounded-2xl text-primary-foreground">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-lg font-bold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="benefits" className="surface-card grid gap-10 p-10 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-extrabold">Who benefits</h2>
            <ul className="mt-6 space-y-5 text-sm">
              {[
                ["OSCA Staff", "Register seniors, update details, track distribution, and generate accurate reports."],
                ["Senior Citizens", "Receive the right benefits on time, with a clear view of their own status."],
                ["LGU-Bulan", "Better data for planning and decision-making on senior welfare programs."],
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
          <div id="analytics">
            <h2 className="text-3xl font-extrabold">Descriptive analytics</h2>
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

        <section id="faq" className="py-20">
          <h2 className="text-3xl font-extrabold">Frequently asked</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {[
              ["Can reports be printed or downloaded?", "Reports are viewable on screen. Printing and export are outside the current scope of the study."],
              ["Does it work offline?", "No. The portal is server-based and needs a stable internet connection."],
              ["Which devices are supported?", "Desktop browsers on Windows 10/11 and Android 7+ phones and tablets."],
              ["How is access controlled?", "Three role levels — seniors see only their own record, OSCA staff and admins manage all records."],
            ].map(([q, a]) => (
              <div key={q} className="surface-card p-7">
                <h3 className="text-base font-bold">{q}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{a}</p>
              </div>
            ))}
          </div>
        </section>

        <footer className="surface-card mb-8 flex flex-wrap items-center justify-center gap-4 px-8 py-6 text-center text-sm text-muted-foreground">
          <p>Office of Senior Citizen Affairs · Municipality of Bulan, Sorsogon</p>
        </footer>
      </div>
    </div>
  );
}
