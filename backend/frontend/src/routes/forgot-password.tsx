import { createFileRoute, Link } from "@tanstack/react-router";
import { Mail } from "lucide-react";
import { useState } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { requestPasswordReset } from "@/lib/api";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Forgot Password - Bulan SeniorCare" }] }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);
    requestPasswordReset(email)
      .then((result) => setMessage(result.message))
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setSubmitting(false));
  }

  return (
    <div className="bg-app relative grid min-h-screen place-items-center px-4">
      <ThemeToggle className="absolute top-5 right-5" />
      <div className="surface-card w-full max-w-md p-10">
        <div className="flex items-center gap-3">
          <BrandLogo className="h-11 w-11 ring-2 ring-gold/70" />
          <div>
            <p className="font-display text-sm font-bold">Bulan SeniorCare</p>
            <p className="text-xs text-muted-foreground">OSCA - Municipality of Bulan</p>
          </div>
        </div>
        <h1 className="mt-12 text-4xl font-extrabold">Forgot password?</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Enter your account email and we&apos;ll send you a link to create a new password.
        </p>
        <form className="mt-8" onSubmit={handleSubmit}>
          <label className="flex items-center gap-3 border-b border-border pb-3">
            <input
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Email address"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            <Mail className="h-4 w-4 text-muted-foreground" />
          </label>
          {message && <p className="mt-5 text-sm font-medium text-success">{message}</p>}
          {error && <p className="mt-5 text-sm font-medium text-destructive">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="bg-navy mt-8 w-full rounded-full py-4 text-sm font-bold text-primary-foreground shadow-[var(--shadow-card)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Sending link..." : "Send reset link"}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Remember your password?{" "}
          <Link to="/login" className="font-bold text-foreground">
            Log In
          </Link>
        </p>
      </div>
    </div>
  );
}
