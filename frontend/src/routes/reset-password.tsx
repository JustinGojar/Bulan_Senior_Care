import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, LockKeyhole } from "lucide-react";
import { useState } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
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
  const [error, setError] = useState<string | null>(token ? null : "This reset link is missing its token.");
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
        <h1 className="mt-12 text-4xl font-extrabold">Create new password</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">Use at least 8 characters for your new password.</p>
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
            <LockKeyhole className="h-4 w-4 text-muted-foreground" />
          </label>
          <label className="mt-6 flex items-center gap-3 border-b border-border pb-3">
            <input
              required
              minLength={8}
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="New password"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            <button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Hide password" : "Show password"} className="text-muted-foreground transition-colors hover:text-foreground">
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </label>
          <label className="mt-6 flex items-center gap-3 border-b border-border pb-3">
            <input
              required
              minLength={8}
              type={showPassword ? "text" : "password"}
              value={passwordConfirmation}
              onChange={(event) => setPasswordConfirmation(event.target.value)}
              placeholder="Confirm new password"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </label>
          {error && <p className="mt-5 text-sm font-medium text-destructive">{error}</p>}
          <button
            type="submit"
            disabled={submitting || !token}
            className="bg-navy mt-8 w-full rounded-full py-4 text-sm font-bold text-primary-foreground shadow-[var(--shadow-card)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Resetting password..." : "Reset password"}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link to="/login" className="font-bold text-foreground">Back to Log In</Link>
        </p>
      </div>
    </div>
  );
}
