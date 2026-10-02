import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, Mail } from "lucide-react";
import { useState } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
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

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  return (
    <div className="bg-app relative grid min-h-screen place-items-center px-3 py-4 sm:px-4">
      <ThemeToggle className="absolute top-5 right-5" />
      <div className="surface-card grid w-full max-w-4xl translate-y-0 overflow-hidden md:grid-cols-2 md:translate-y-4">
        <div className="bg-navy p-5 text-primary-foreground sm:p-8 md:p-10">
          <div className="flex items-center gap-3">
            <BrandLogo className="h-9 w-9 ring-2 ring-gold/70 sm:h-10 sm:w-10 md:h-11 md:w-11" />
            <div>
              <p className="font-display text-xs font-bold sm:text-sm">Bulan SeniorCare</p>
              <p className="text-[10px] opacity-70 sm:text-xs">OSCA · Municipality of Bulan</p>
            </div>
          </div>
          <h1 className="mt-8 text-3xl leading-tight font-extrabold sm:mt-10 sm:text-4xl md:mt-12">
            Welcome, Lolo's and Lola's!
          </h1>
          <p className="font-display mt-3 text-base text-gold sm:mt-4 sm:text-xl">
            Profile. Monitor. Serve better.
          </p>
          <p className="mt-4 max-w-sm text-xs leading-relaxed opacity-80 sm:text-sm">
            One portal for senior citizen records, benefits, and services across every barangay in
            Bulan, Sorsogon.
          </p>
          <div className="mt-6 flex flex-wrap gap-2 text-[11px] font-semibold sm:mt-8 sm:gap-3 sm:text-xs">
            {["Registration", "Eligibility", "Benefits"].map((tag) => (
              <span key={tag} className="rounded-full bg-white/12 px-3 py-2 sm:px-4">
                {tag}
              </span>
            ))}
          </div>
        </div>

        <form
          className="p-5 sm:p-8 md:p-10"
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
          <h2 className="text-3xl font-extrabold sm:text-4xl">Log In</h2>

          <label className="mt-6 flex items-center gap-3 border-b border-border pb-3 sm:mt-8">
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Mobile Number or Email"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            <Mail className="h-4 w-4 text-muted-foreground" />
          </label>

          <label className="mt-5 flex items-center gap-3 border-b border-border pb-3 sm:mt-7">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            <button
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </label>

          <div className="mt-5 flex justify-end text-xs sm:mt-6 sm:text-sm">
            <Link to="/forgot-password" className="font-bold">
              Forgot Password?
            </Link>
          </div>

          {error && <p className="mt-5 text-sm font-medium text-destructive">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="bg-navy mt-7 w-full rounded-full py-3 text-sm font-bold text-primary-foreground shadow-[var(--shadow-card)] sm:mt-8 sm:py-4"
          >
            {submitting ? "Signing in..." : "Log In"}
          </button>

        </form>
      </div>
    </div>
  );
}
