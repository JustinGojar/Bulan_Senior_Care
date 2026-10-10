import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  LockKeyhole,
  Mail,
  Send,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useState } from "react";
import { AuthAlert, AuthLayout, authInputClass, authSubmitClass } from "@/components/AuthLayout";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { requestPasswordReset, resetPassword, verifyResetCode } from "@/lib/api";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Forgot Password - Bulan SeniorCare" }] }),
  component: ForgotPasswordPage,
});

type Step = "email" | "code" | "password";

/** The server sends at most one code a minute, so the resend button waits that long. */
const RESEND_SECONDS = 60;

const STEP_TEXT: Record<Step, { title: string; subtitle: string }> = {
  email: {
    title: "Forgot password?",
    subtitle: "Enter your account email and we'll send you a 6-digit verification code.",
  },
  code: {
    title: "Enter verification code",
    subtitle: "We sent a 6-digit code to your email. It expires in 15 minutes.",
  },
  password: {
    title: "Create new password",
    subtitle: "Use at least 8 characters, including uppercase, lowercase, a number and a symbol.",
  },
};

function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [passwordSaved, setPasswordSaved] = useState(false);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = window.setTimeout(() => setResendIn((seconds) => seconds - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [resendIn]);

  function run(action: () => Promise<void>) {
    setSubmitting(true);
    setError(null);
    setMessage(null);
    action()
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setSubmitting(false));
  }

  function sendCode() {
    run(async () => {
      const result = await requestPasswordReset(email);
      setMessage(result.message);
      setCode("");
      setStep("code");
      setResendIn(RESEND_SECONDS);
    });
  }

  function checkCode() {
    run(async () => {
      const result = await verifyResetCode(email, code).catch((reason: Error) => {
        // Empty the boxes so the next attempt can be typed straight in.
        setCode("");
        throw reason;
      });
      setResetToken(result.reset_token);
      setMessage(result.message);
      setStep("password");
    });
  }

  function savePassword() {
    run(async () => {
      const result = await resetPassword(resetToken, email, password, passwordConfirmation);
      setMessage(result.message);
      setPasswordSaved(true);
      // Give the user a moment to read the confirmation before going to log in.
      window.setTimeout(() => navigate({ to: "/login" }), 2500);
    });
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step === "email") sendCode();
    else if (step === "code") checkCode();
    else savePassword();
  }

  function startOver() {
    setStep("email");
    setCode("");
    setResetToken("");
    setMessage(null);
    setError(null);
  }

  const { title, subtitle } = STEP_TEXT[step];

  return (
    <AuthLayout title={title} subtitle={subtitle}>
      <StepIndicator step={step} />

      <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
        {message && <AuthAlert tone="success">{message}</AuthAlert>}
        {error && <AuthAlert tone="error">{error}</AuthAlert>}

        {step === "email" && (
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
        )}

        {step === "code" && (
          <div>
            <label htmlFor="forgot-code" className="mb-2 block text-sm font-semibold">
              Verification code
            </label>
            <p className="mb-3 text-sm text-muted-foreground">
              Sent to <span className="font-semibold text-foreground">{email}</span>
            </p>
            <InputOTP
              id="forgot-code"
              maxLength={6}
              inputMode="numeric"
              pattern="^[0-9]*$"
              autoComplete="one-time-code"
              autoFocus
              value={code}
              onChange={setCode}
              containerClassName="justify-center"
            >
              <InputOTPGroup>
                {Array.from({ length: 6 }, (_, index) => (
                  <InputOTPSlot
                    key={index}
                    index={index}
                    className="h-12 w-11 text-lg font-semibold sm:h-14 sm:w-12"
                  />
                ))}
              </InputOTPGroup>
            </InputOTP>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm">
              <button
                type="button"
                onClick={startOver}
                className="font-semibold text-muted-foreground hover:text-foreground"
              >
                Use a different email
              </button>
              <button
                type="button"
                onClick={sendCode}
                disabled={resendIn > 0 || submitting}
                className="font-semibold text-primary hover:underline disabled:cursor-not-allowed disabled:text-muted-foreground disabled:no-underline"
              >
                {resendIn > 0 ? `Resend code in ${resendIn}s` : "Resend code"}
              </button>
            </div>
          </div>
        )}

        {step === "password" && (
          <>
            <div>
              <label htmlFor="new-password" className="mb-2 block text-sm font-semibold">
                New password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="new-password"
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
              <label
                htmlFor="new-password-confirmation"
                className="mb-2 block text-sm font-semibold"
              >
                Confirm new password
              </label>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="new-password-confirmation"
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
          </>
        )}

        <button
          type="submit"
          disabled={submitting || (step === "code" && code.length !== 6) || passwordSaved}
          className={`${authSubmitClass} mt-2`}
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {step === "email"
                ? "Sending code..."
                : step === "code"
                  ? "Verifying..."
                  : "Saving..."}
            </>
          ) : step === "email" ? (
            <>
              Send verification code
              <Send className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </>
          ) : step === "code" ? (
            <>
              <ShieldCheck className="h-4 w-4" />
              Verify code
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

const STEPS: Array<{ id: Step; label: string }> = [
  { id: "email", label: "Email" },
  { id: "code", label: "Code" },
  { id: "password", label: "New password" },
];

function StepIndicator({ step }: { step: Step }) {
  const current = STEPS.findIndex((item) => item.id === step);
  return (
    <ol className="mt-6 flex items-center gap-2" aria-label="Password reset progress">
      {STEPS.map((item, index) => (
        <li key={item.id} className="flex flex-1 items-center gap-2">
          <span
            aria-current={index === current ? "step" : undefined}
            className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold ${
              index <= current
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {index + 1}
          </span>
          <span
            className={`text-xs font-semibold ${index <= current ? "text-foreground" : "text-muted-foreground"}`}
          >
            {item.label}
          </span>
          {index < STEPS.length - 1 && <span className="h-px flex-1 bg-border" />}
        </li>
      ))}
    </ol>
  );
}
