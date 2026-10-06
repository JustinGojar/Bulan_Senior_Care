import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Eye, EyeOff, KeyRound, Loader2, Lock, LockKeyhole, Mail } from "lucide-react";
import { useState } from "react";
import { AuthAlert, AuthLayout, authInputClass, authSubmitClass } from "@/components/AuthLayout";
import { resetPassword } from "@/lib/api";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Reset Password - Bulan SeniorCare" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token") ?? "";
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(
    token ? null : "This reset link is missing its token.",
  );
  const [submitting, setSubmitting] = useState(false);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    resetPassword(token, email, password, passwordConfirmation)
      .then(() => navigate({ to: "/login" }))
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setSubmitting(false));
  }

  return (
    <AuthLayout
      title="Create new password"
      subtitle="Use at least 8 characters for your new password."
    >
      <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
        {error && <AuthAlert tone="error">{error}</AuthAlert>}

        <div>
          <label htmlFor="reset-email" className="mb-2 block text-sm font-semibold">
            Email address
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              id="reset-email"
              required
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className={authInputClass}
            />
          </div>
        </div>

        <div>
          <label htmlFor="reset-password" className="mb-2 block text-sm font-semibold">
            New password
          </label>
          <div className="relative">
            <Lock className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              id="reset-password"
              required
              minLength={8}
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 8 characters"
              className={`${authInputClass} pr-12`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
              aria-label={showPassword ? "Hide passwords" : "Show passwords"}
              className="absolute top-1/2 right-2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-md text-muted-foreground transition-colors hover:text-foreground"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="reset-password-confirmation" className="mb-2 block text-sm font-semibold">
            Confirm new password
          </label>
          <div className="relative">
            <LockKeyhole className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              id="reset-password-confirmation"
              required
              minLength={8}
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              value={passwordConfirmation}
              onChange={(event) => setPasswordConfirmation(event.target.value)}
              placeholder="Re-enter your new password"
              className={authInputClass}
            />
          </div>
        </div>

        <button type="submit" disabled={submitting || !token} className={`${authSubmitClass} mt-2`}>
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Resetting password...
            </>
          ) : (
            <>
              <KeyRound className="h-4 w-4" />
              Reset password
            </>
          )}
        </button>
      </form>

      <Link
        to="/login"
        className="mt-8 inline-flex items-center justify-center gap-2 self-center text-sm font-semibold text-primary hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to log in
      </Link>
    </AuthLayout>
  );
}
