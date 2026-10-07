import { createFileRoute, Link, useBlocker, useNavigate, useRouter } from "@tanstack/react-router";
import { ArrowRight, Eye, EyeOff, Loader2, Lock, Mail, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { AuthAlert, AuthLayout, authInputClass, authSubmitClass } from "@/components/AuthLayout";
import { TermsDialog } from "@/components/TermsDialog";
import { login, takeSessionNotice } from "@/lib/api";

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
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Why the previous session ended (inactivity or its time limit), if it ended on its own.
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  // The browser back button sends the user to the landing page instead of the previous entry,
  // so a signed-out user can never step back into the account pages they were on before
  // logging out. The blocker first undoes the back step; once that settles, the login entry
  // is replaced with the landing page.
  useBlocker({
    shouldBlockFn: ({ action }) => {
      if (action !== "BACK" && action !== "GO") return false;
      window.addEventListener("popstate", () => navigate({ to: "/", replace: true }), {
        once: true,
      });
      return true;
    },
    enableBeforeUnload: false,
  });
  // When the login page was opened by a full page load there is no earlier entry the app can
  // intercept, so slip a landing page entry in beneath it for the back button to land on.
  useEffect(() => {
    if (router.history.location.state.__TSR_index !== 0) return;
    const { href, state } = router.history.location;
    router.history.replace("/");
    router.history.push(href, state);
  }, [router]);
  useEffect(() => {
    const message = takeSessionNotice();
    if (message) setNotice(message);
  }, []);

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to your account to continue to the portal.">
      <form
        className="mt-8 space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitting(true);
          setError(null);
          setNotice(null);
          login(email, password)
            .then(() => navigate({ to: "/dashboard", replace: true }))
            .catch((reason: Error) => setError(reason.message))
            .finally(() => setSubmitting(false));
        }}
      >
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
              className={authInputClass}
            />
          </div>
        </div>

        {notice && !error && <AuthAlert tone="info">{notice}</AuthAlert>}
        {error && <AuthAlert tone="error">{error}</AuthAlert>}

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
              className={`${authInputClass} pr-12`}
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

        <div className="relative flex items-start gap-3">
          <input
            id="login-terms"
            type="checkbox"
            required
            checked={acceptedTerms}
            onChange={(e) => setAcceptedTerms(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--navy)]"
          />
          <label htmlFor="login-terms" className="text-sm text-muted-foreground">
            I agree to the{" "}
            <button
              type="button"
              onClick={() => setTermsOpen(true)}
              className="font-semibold text-primary hover:underline"
            >
              Terms and Conditions
            </button>
          </label>
        </div>

        <button type="submit" disabled={submitting} className={`${authSubmitClass} mt-2`}>
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

      <TermsDialog
        open={termsOpen}
        onOpenChange={setTermsOpen}
        onAccept={() => setAcceptedTerms(true)}
      />
    </AuthLayout>
  );
}
