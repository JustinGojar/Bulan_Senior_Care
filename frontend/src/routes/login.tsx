import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  HeartHandshake,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useState } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import seniorCitizensPhoto from "@/images/img.webp";
import { login } from "@/lib/api";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Log In — Bulan SeniorCare OSCA Portal" },
      {
        name: "description",
        content:
          "Sign in to the Bulan SeniorCare portal to manage senior citizen profiles, benefits, and analytics for OSCA Bulan.",
      },
      { property: "og:title", content: "Log In — Bulan SeniorCare" },
      {
        property: "og:description",
        content: "Role-based access for OSCA admins, heads, and barangay leaders.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LoginPage,
});

const highlights = [
  { icon: Users, label: "Senior citizen profiling across every barangay" },
  { icon: HeartHandshake, label: "Benefits, eligibility, and service tracking" },
  { icon: ShieldCheck, label: "Secure, role-based access for OSCA staff" },
];

const inputClass =
  "h-12 w-full rounded-lg border border-input bg-background/60 pr-4 pl-11 text-sm text-foreground outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground/80 focus:border-ring focus:ring-4 focus:ring-ring/15";

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  return (
    <div className="bg-app relative grid min-h-screen place-items-center px-4 py-8 sm:px-6">
      <div className="pointer-events-none absolute inset-0 bg-background/40 backdrop-blur-[2px]" />
      <ThemeToggle className="absolute top-5 right-5 z-10" />

      <div className="surface-card relative grid w-full max-w-5xl overflow-hidden border border-border/60 lg:grid-cols-[1.05fr_1fr]">
        {/* Brand panel */}
        <aside className="relative hidden overflow-hidden text-primary-foreground lg:flex lg:flex-col">
          <img
            src={seniorCitizensPhoto}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[oklch(0.24_0.06_258/0.82)] via-[oklch(0.26_0.06_258/0.88)] to-[oklch(0.2_0.05_258/0.97)]" />

          <div className="relative flex h-full flex-col p-10">
            <div className="flex items-center gap-3">
              <BrandLogo className="h-12 w-12 ring-2 ring-gold/80" />
              <div>
                <p className="font-display text-base font-bold">Bulan SeniorCare</p>
                <p className="text-xs opacity-75">OSCA · Municipality of Bulan, Sorsogon</p>
              </div>
            </div>

            <div className="mt-auto pt-16">
              <span className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/15 px-3 py-1 text-[11px] font-semibold tracking-wider text-gold uppercase">
                Office of Senior Citizens Affairs
              </span>
              <h1 className="mt-5 text-4xl leading-tight font-extrabold">
                Profile. Monitor.
                <br />
                <span className="text-gold">Serve better.</span>
              </h1>
              <p className="mt-4 max-w-sm text-sm leading-relaxed opacity-85">
                One portal for senior citizen records, benefits, and services across every barangay
                in Bulan.
              </p>

              <ul className="mt-8 space-y-3">
                {highlights.map(({ icon: Icon, label }) => (
                  <li key={label} className="flex items-center gap-3 text-sm">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/10 ring-1 ring-white/15">
                      <Icon className="h-4 w-4 text-gold" />
                    </span>
                    <span className="opacity-90">{label}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </aside>

        {/* Form panel */}
        <div className="flex flex-col justify-center bg-card px-6 py-10 sm:px-12 sm:py-14">
          <div className="flex items-center gap-3 lg:hidden">
            <BrandLogo className="h-11 w-11 ring-2 ring-gold/70" />
            <div>
              <p className="font-display text-sm font-bold">Bulan SeniorCare</p>
              <p className="text-xs text-muted-foreground">OSCA · Municipality of Bulan</p>
            </div>
          </div>

          <div className="mt-8 lg:mt-0">
            <h2 className="text-3xl font-extrabold sm:text-[2rem]">Welcome back</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Sign in to your account to continue to the portal.
            </p>
          </div>

          <form
            className="mt-8 space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              setSubmitting(true);
              setError(null);
              login(email, password)
                .then(() => navigate({ to: "/dashboard" }))
                .catch((reason: Error) => setError(reason.message))
                .finally(() => setSubmitting(false));
            }}
          >
            {error && (
              <div
                role="alert"
                className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span className="font-medium">{error}</span>
              </div>
            )}

            <div>
              <label htmlFor="login-email" className="mb-2 block text-sm font-semibold">
                Email address
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="login-email"
                  required
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label htmlFor="login-password" className="text-sm font-semibold">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-semibold text-primary hover:underline sm:text-sm"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="login-password"
                  required
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className={`${inputClass} pr-12`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute top-1/2 right-2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-md text-muted-foreground transition-colors hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="bg-navy group mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-lg text-sm font-bold text-white shadow-[var(--shadow-soft)] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 flex items-center gap-3 rounded-lg bg-muted/70 px-4 py-3 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 shrink-0 text-success" />
            <span>Authorized personnel only. Accounts are issued by the OSCA administrator.</span>
          </div>

          <p className="mt-8 text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} OSCA Bulan · Bulan SeniorCare Portal
          </p>
        </div>
      </div>
    </div>
  );
}
