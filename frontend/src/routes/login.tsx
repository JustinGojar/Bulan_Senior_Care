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
    <div className="bg-app relative grid min-h-screen place-items-center px-4">
      <ThemeToggle className="absolute top-5 right-5" />
      <div className="surface-card grid w-full max-w-4xl overflow-hidden md:grid-cols-2">
        <div className="bg-navy p-10 text-primary-foreground">
          <div className="flex items-center gap-3">
            <BrandLogo className="h-11 w-11 ring-2 ring-gold/70" />
            <div>
              <p className="font-display text-sm font-bold">Bulan SeniorCare</p>
              <p className="text-xs opacity-70">OSCA · Municipality of Bulan</p>
            </div>
          </div>
          <h1 className="mt-12 text-4xl leading-tight font-extrabold">Welcome, Kagurangnan!</h1>
          <p className="font-display mt-4 text-xl text-gold">Profile. Monitor. Serve better.</p>
          <p className="mt-5 max-w-sm text-sm leading-relaxed opacity-80">
            One portal for senior citizen records, benefits, and services across every barangay in
            Bulan, Sorsogon.
          </p>
          <div className="mt-8 flex flex-wrap gap-3 text-xs font-semibold">
            {["Registration", "Eligibility", "Benefits"].map((tag) => (
              <span key={tag} className="rounded-full bg-white/12 px-4 py-2">
                {tag}
              </span>
            ))}
          </div>
        </div>

        <form
          className="p-10"
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
          <h2 className="text-4xl font-extrabold">Log In</h2>

          <label className="mt-8 flex items-center gap-3 border-b border-border pb-3">
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

          <label className="mt-7 flex items-center gap-3 border-b border-border pb-3">
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

          <div className="mt-6 flex items-center justify-between text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" defaultChecked className="h-4 w-4 accent-primary" />
              Remember Me
            </label>
            <Link to="/forgot-password" className="font-bold">
              Forgot Password?
            </Link>
          </div>

          {error && <p className="mt-5 text-sm font-medium text-destructive">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="bg-navy mt-8 w-full rounded-full py-4 text-sm font-bold text-primary-foreground shadow-[var(--shadow-card)]"
          >
            {submitting ? "Signing in..." : "Log In"}
          </button>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link to="/register" className="font-bold text-foreground">
              Sign Up
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
