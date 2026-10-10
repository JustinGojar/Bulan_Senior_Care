import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { AuthAlert, AuthLayout } from "@/components/AuthLayout";
import { verifyEmail } from "@/lib/api";

export const Route = createFileRoute("/verify-email")({
  head: () => ({ meta: [{ title: "Verify Email - Bulan SeniorCare" }] }),
  component: VerifyEmailPage,
});

function VerifyEmailPage() {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const link = {
      id: params.get("id") ?? "",
      hash: params.get("hash") ?? "",
      expires: params.get("expires") ?? "",
      signature: params.get("signature") ?? "",
    };
    if (Object.values(link).some((value) => !value)) {
      setError("This verification link is incomplete. Log in to get a new one.");
      return;
    }
    verifyEmail(link)
      .then((result) => setMessage(result.message))
      .catch((reason: Error) => setError(reason.message));
  }, []);

  return (
    <AuthLayout
      title="Verify your email"
      subtitle="Confirming your email address keeps your Bulan SeniorCare account secure."
    >
      <div className="mt-8 space-y-5">
        {message && <AuthAlert tone="success">{message}</AuthAlert>}
        {error && <AuthAlert tone="error">{error}</AuthAlert>}
        {!message && !error && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Verifying your email address...
          </p>
        )}
      </div>

      <Link
        to="/login"
        className="mt-8 inline-flex items-center justify-center gap-2 self-center text-sm font-semibold text-primary hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        {message ? "Continue to log in" : "Back to log in"}
      </Link>
    </AuthLayout>
  );
}
