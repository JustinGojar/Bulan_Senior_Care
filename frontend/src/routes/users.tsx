import { createFileRoute } from "@tanstack/react-router";
import { UserCog, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { apiFetch, createBarangayLeader, getStoredUser } from "@/lib/api";

export const Route = createFileRoute("/users")({
  head: () => ({ meta: [{ title: "User Management — Bulan SeniorCare" }] }),
  component: UserManagement,
});

const USERS = [
  ["Geraldine So", "admin@osca-bulan.gov.ph", "Admin", "All barangays", "Active"],
  ["Maribel Dela Cruz", "head@osca-bulan.gov.ph", "Head", "All barangays", "Active"],
];

type BarangayOption = { id: number; barangay_name: string };

function getAge(birthdate: string) {
  if (!birthdate) return "";
  const today = new Date();
  const date = new Date(`${birthdate}T00:00:00`);
  let age = today.getFullYear() - date.getFullYear();
  if (
    today.getMonth() < date.getMonth() ||
    (today.getMonth() === date.getMonth() && today.getDate() < date.getDate())
  ) {
    age -= 1;
  }
  return age >= 0 ? String(age) : "";
}

function UserManagement() {
  const currentUser = getStoredUser();
  const [users, setUsers] = useState(USERS);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [barangayId, setBarangayId] = useState("");
  const [barangays, setBarangays] = useState<BarangayOption[]>([]);
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const isAdmin = currentUser?.role === "admin";

  useEffect(() => {
    apiFetch<BarangayOption[]>("/barangays")
      .then(setBarangays)
      .catch(() => setBarangays([]));
  });

  if (!isAdmin) {
    return (
      <AppShell
        title="Access restricted"
        subtitle="User Management is available to Admin accounts only"
        breadcrumb={["Dashboard"]}
      >
        <section className="surface-card p-7">
          <p className="text-sm text-muted-foreground">
            You do not have permission to view user management.
          </p>
        </section>
      </AppShell>
    );
  }

  async function handleCreateLeader(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const leader = await createBarangayLeader({
        firstName,
        middleName,
        lastName,
        email,
        contactNumber,
        birthdate,
        barangayId: Number(barangayId),
        password,
        passwordConfirmation,
      });
      setUsers((current) => [
        ...current,
        [leader.name, leader.email, "Leader", "Unassigned", "Active"],
      ]);
      setFirstName("");
      setMiddleName("");
      setLastName("");
      setEmail("");
      setContactNumber("");
      setBirthdate("");
      setBarangayId("");
      setPassword("");
      setPasswordConfirmation("");
      setShowCreateForm(false);
      toast.success("Barangay Leader account created.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to create account.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell
      title="User Management"
      subtitle="Manage login accounts and barangay access"
      breadcrumb={["Dashboard", "User Management"]}
      actions={
        isAdmin ? (
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-navy rounded-full px-6 py-3.5 text-sm font-semibold text-primary-foreground"
          >
            <UserPlus className="mr-2 inline h-4 w-4" /> Create Barangay Leader
          </button>
        ) : undefined
      }
    >
      <section className="surface-card p-7">
        <div className="flex items-center gap-3">
          <div className="bg-navy grid h-10 w-10 place-items-center rounded-full text-primary-foreground">
            <UserCog className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Login accounts</h2>
            <p className="text-sm text-muted-foreground">
              Role enforcement belongs on the API; this view mirrors the approved accounts.
            </p>
          </div>
        </div>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="text-left">
                {["Name", "Email", "Role", "Barangay scope", "Status", "Action"].map((heading) => (
                  <th key={heading} className="px-4 py-3 font-bold">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map(([name, email, role, scope, status]) => (
                <tr key={email} className="border-t border-border">
                  <td className="px-4 py-4 font-semibold">{name}</td>
                  <td className="px-4 py-4 text-muted-foreground">{email}</td>
                  <td className="px-4 py-4">
                    <span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold">
                      {role}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-muted-foreground">{scope}</td>
                  <td className="px-4 py-4 font-bold text-success">{status}</td>
                  <td className="px-4 py-4">
                    {currentUser?.role !== "head" && (
                      <button
                        onClick={() => toast.success(`Editing ${name}.`)}
                        className="rounded-full bg-secondary px-4 py-2 text-xs font-bold"
                      >
                        Edit
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {showCreateForm && isAdmin && (
        <div className="fixed inset-0 z-30 grid place-items-center bg-navy/40 px-4">
          <form className="surface-card w-full max-w-lg p-7" onSubmit={handleCreateLeader}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold">Create Barangay Leader</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Only Admin can create this account type.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                aria-label="Close create account form"
                className="grid h-9 w-9 place-items-center rounded-full bg-secondary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6 grid gap-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <input required value={firstName} onChange={(event) => setFirstName(event.target.value)} placeholder="First name" className="rounded-xl border border-border bg-transparent px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring/30" />
                <input value={middleName} onChange={(event) => setMiddleName(event.target.value)} placeholder="Middle name" className="rounded-xl border border-border bg-transparent px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring/30" />
                <input required value={lastName} onChange={(event) => setLastName(event.target.value)} placeholder="Last name" className="rounded-xl border border-border bg-transparent px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring/30" />
              </div>
              <input
                required
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Email address"
                className="rounded-xl border border-border bg-transparent px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring/30"
              />
              <input required type="tel" value={contactNumber} onChange={(event) => setContactNumber(event.target.value)} placeholder="Phone / mobile number" className="rounded-xl border border-border bg-transparent px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring/30" />
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="rounded-xl border border-border px-4 py-3">
                  <span className="block text-xs font-semibold text-muted-foreground">Birthday</span>
                  <input required type="date" value={birthdate} onChange={(event) => setBirthdate(event.target.value)} className="mt-1 w-full bg-transparent text-sm outline-none" />
                </label>
                <label className="rounded-xl border border-border px-4 py-3">
                  <span className="block text-xs font-semibold text-muted-foreground">Age</span>
                  <input value={getAge(birthdate)} readOnly placeholder="Calculated automatically" className="mt-1 w-full bg-transparent text-sm outline-none" />
                </label>
              </div>
              <select required value={barangayId} onChange={(event) => setBarangayId(event.target.value)} className="rounded-xl border border-border bg-transparent px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring/30">
                <option value="">Select barangay assignment</option>
                {barangays.map((barangay) => <option key={barangay.id} value={barangay.id}>{barangay.barangay_name}</option>)}
              </select>
              <input
                required
                minLength={8}
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Password (8+ characters)"
                className="rounded-xl border border-border bg-transparent px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring/30"
              />
              <input
                required
                minLength={8}
                type="password"
                value={passwordConfirmation}
                onChange={(event) => setPasswordConfirmation(event.target.value)}
                placeholder="Confirm password"
                className="rounded-xl border border-border bg-transparent px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring/30"
              />
            </div>

            {error && <p className="mt-4 text-sm font-medium text-destructive">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="bg-navy mt-6 w-full rounded-full py-3.5 text-sm font-bold text-primary-foreground disabled:opacity-60"
            >
              {submitting ? "Creating account..." : "Create account"}
            </button>
          </form>
        </div>
      )}
    </AppShell>
  );
}
