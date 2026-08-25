import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, Mail, Phone, UserRound } from "lucide-react";
import { useState } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { register, type AccountRole } from "@/lib/api";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Sign Up — Bulan SeniorCare OSCA Portal" },
      {
        name: "description",
        content: "Create a Bulan SeniorCare account for OSCA portal access.",
      },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [role, setRole] = useState<AccountRole>("leader");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await register(name, email, contactNumber, password, passwordConfirmation, role);
      await navigate({ to: "/dashboard" });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Registration failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-app relative grid min-h-screen place-items-center px-4 py-10">
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
          <h1 className="mt-12 text-4xl leading-tight font-extrabold">Join the care network.</h1>
          <p className="font-display mt-4 text-xl text-gold">Profile. Monitor. Serve better.</p>
          <p className="mt-5 max-w-sm text-sm leading-relaxed opacity-80">
            Create an account to access senior citizen records, benefits, and services across every
            barangay in Bulan.
          </p>
        </div>

        <form className="p-10" onSubmit={handleSubmit}>
          <h2 className="text-4xl font-extrabold">Create account</h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Choose the access level for this account.
          </p>

          <label className="mt-8 flex items-center gap-3 border-b border-border pb-3">
            <input
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Full name"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            <UserRound className="h-4 w-4 text-muted-foreground" />
          </label>

          <label className="mt-6 flex items-center gap-3 border-b border-border pb-3">
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

          <label className="mt-6 flex items-center gap-3 border-b border-border pb-3">
            <input
              value={contactNumber}
              onChange={(event) => setContactNumber(event.target.value)}
              placeholder="Contact number (optional)"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            <Phone className="h-4 w-4 text-muted-foreground" />
          </label>

          <label className="mt-6 block border-b border-border pb-3">
            <span className="text-xs font-semibold text-muted-foreground">Account type</span>
            <select
              required
              value={role}
              onChange={(event) => setRole(event.target.value as AccountRole)}
              className="mt-2 w-full bg-transparent text-sm outline-none"
            >
              <option value="admin">Admin</option>
              <option value="head">Head</option>
            </select>
          </label>

          <label className="mt-6 flex items-center gap-3 border-b border-border pb-3">
            <input
              required
              minLength={8}
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password (8+ characters)"
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

          <label className="mt-6 flex items-center gap-3 border-b border-border pb-3">
            <input
              required
              minLength={8}
              type={showPassword ? "text" : "password"}
              value={passwordConfirmation}
              onChange={(event) => setPasswordConfirmation(event.target.value)}
              placeholder="Confirm password"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </label>

          {error && <p className="mt-5 text-sm font-medium text-destructive">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="bg-navy mt-8 w-full rounded-full py-4 text-sm font-bold text-primary-foreground shadow-[var(--shadow-card)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Creating account..." : "Create account"}
          </button>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="font-bold text-foreground">
              Log In
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
