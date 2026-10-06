import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Loader2, Mail, Send } from "lucide-react";
import { useState } from "react";
import { AuthAlert, AuthLayout, authInputClass, authSubmitClass } from "@/components/AuthLayout";
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
    <AuthLayout
      title="Forgot password?"
      subtitle="Enter your account email and we'll send you a link to create a new password."
    >
      <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
        {message && <AuthAlert tone="success">{message}</AuthAlert>}
        {error && <AuthAlert tone="error">{error}</AuthAlert>}

        <div>
          <label htmlFor="forgot-email" className="mb-2 block text-sm font-semibold">
            Email address
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              id="forgot-email"
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

        <button type="submit" disabled={submitting} className={`${authSubmitClass} mt-2`}>
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Sending link...
            </>
          ) : (
            <>
              Send reset link
              <Send className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
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
