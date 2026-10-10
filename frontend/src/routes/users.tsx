import { createFileRoute } from "@tanstack/react-router";
import {
  Eye,
  EyeOff,
  Loader2,
  Pencil,
  ShieldAlert,
  Trash2,
  UserCog,
  UserPlus,
  X,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useConfirmDialog } from "@/components/ConfirmDialog";
import { AuthAlert, authSubmitClass } from "@/components/AuthLayout";
import { EmptyState, SectionHeader, StatusPill } from "@/components/DesignKit";
import { badgeClass, fieldClass, iconButtonClass, panelClass } from "@/components/design-kit";
import { IconActionButton } from "@/components/IconActionButton";
import { SearchableSelect } from "@/components/SearchableSelect";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import oscaAdminImage from "@/images/osca_admin.jpg";
import {
  getBarangays,
  API_URL,
  createManagedUser,
  deleteManagedUser,
  getManagedUsers,
  getStoredUser,
  updateManagedUser,
  type ManagedUser,
} from "@/lib/api";

/** Keeps a PH mobile number as 11 local digits (09XXXXXXXXX), converting a +63 prefix. */
function toLocalMobile(value: string) {
  const digits = value.replace(/\D/g, "");
  return (digits.startsWith("63") ? `0${digits.slice(2)}` : digits).slice(0, 11);
}

export const Route = createFileRoute("/users")({
  head: () => ({ meta: [{ title: "User Management — Bulan SeniorCare" }] }),
  component: UserManagement,
});

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

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function UserManagement() {
  const currentUser = getStoredUser();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [barangayId, setBarangayId] = useState("");
  const [barangays, setBarangays] = useState<BarangayOption[]>([]);
  const [barangaysFailed, setBarangaysFailed] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false);
  const [role, setRole] = useState<"admin" | "head" | "leader">("leader");
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirm, confirmDialog] = useConfirmDialog();
  const isAdmin = currentUser?.role === "admin";

  useEffect(() => {
    getManagedUsers()
      .then(setUsers)
      .catch(() => setUsers([]));
    getBarangays()
      .then(setBarangays)
      .catch(() => {
        setBarangays([]);
        setBarangaysFailed(true);
      });
  }, []);

  if (!isAdmin) {
    return (
      <AppShell
        title="Access restricted"
        subtitle="User Management is available to Admin accounts only"
        breadcrumb={["Dashboard"]}
      >
        <section className={`${panelClass} p-5 sm:p-7`}>
          <SectionHeader
            icon={ShieldAlert}
            title="Admins only"
            subtitle="You do not have permission to view user management."
          />
        </section>
      </AppShell>
    );
  }

  function resetForm() {
    setFirstName("");
    setMiddleName("");
    setLastName("");
    setEmail("");
    setContactNumber("");
    setBirthdate("");
    setBarangayId("");
    setPassword("");
    setPasswordConfirmation("");
    setShowPassword(false);
    setShowPasswordConfirmation(false);
    setRole("leader");
    setStatus("active");
    setEditingUser(null);
  }

  function openEditForm(user: ManagedUser) {
    setEditingUser(user);
    setFirstName(user.first_name ?? "");
    setMiddleName(user.middle_name ?? "");
    setLastName(user.last_name ?? "");
    setEmail(user.email);
    setContactNumber(toLocalMobile(user.contact_number ?? ""));
    setBirthdate(user.birthdate ?? "");
    setBarangayId(user.barangay_id ? String(user.barangay_id) : "");
    setRole(user.role as "admin" | "head" | "leader");
    setStatus(user.status);
    setError(null);
    setShowCreateForm(true);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (
      password &&
      (!/(?=.*[a-z])/.test(password) ||
        !/(?=.*[A-Z])/.test(password) ||
        !/(?=.*\d)/.test(password) ||
        !/(?=.*[^A-Za-z0-9])/.test(password) ||
        password.length < 8)
    ) {
      setError(
        "Password must be at least 8 characters and include uppercase, lowercase, number, and special character.",
      );
      return;
    }
    setSubmitting(true);
    try {
      if (editingUser) {
        const updated = await updateManagedUser(editingUser.id, {
          name: [firstName, middleName, lastName].filter(Boolean).join(" ") || editingUser.name,
          first_name: firstName || null,
          middle_name: middleName || null,
          last_name: lastName || null,
          email,
          contact_number: contactNumber || null,
          birthdate: birthdate || null,
          barangay_id: barangayId ? Number(barangayId) : null,
          role,
          status,
          password: password || undefined,
          password_confirmation: passwordConfirmation || undefined,
        });
        setUsers((current) => current.map((item) => (item.id === updated.id ? updated : item)));
        toast.success("User account updated.");
      } else {
        const created = await createManagedUser({
          firstName,
          middleName,
          lastName,
          email,
          contactNumber,
          birthdate,
          barangayId: barangayId ? Number(barangayId) : null,
          role,
          status,
          password,
          passwordConfirmation,
        });
        setUsers((current) => [...current, created.user]);
        if (created.verificationEmailSent) {
          toast.success(`User account created. A verification email was sent to ${email}.`);
        } else {
          toast.warning(
            "User account created, but the verification email could not be sent. It will be sent again when they try to log in.",
          );
        }
      }
      resetForm();
      setShowCreateForm(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to create account.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(user: ManagedUser) {
    const confirmed = await confirm({
      title: "Delete this account?",
      description: `${user.name} (${user.email}) will no longer be able to log in. This cannot be undone.`,
      confirmLabel: "Delete account",
      destructive: true,
    });
    if (!confirmed) return;
    try {
      await deleteManagedUser(user.id);
      setUsers((current) => current.filter((item) => item.id !== user.id));
      toast.success("User account deleted.");
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Unable to delete account.");
    }
  }

  const roleLabel = (value: string) =>
    value === "admin" ? "OSCA Admin" : value === "head" ? "OSCA Head" : "BSCA President";
  const labelClass = "mb-2 block text-sm font-semibold";
  const actionButtonClass =
    "grid h-9 w-9 place-items-center rounded-lg border border-border/60 bg-card text-muted-foreground transition-colors hover:border-ring/40 hover:text-foreground";

  return (
    <AppShell
      title="User Management"
      subtitle="Manage login accounts and barangay access"
      breadcrumb={["Dashboard", "User Management"]}
      actions={
        isAdmin ? (
          <IconActionButton
            label="Create BSCA / Barangay Senior Citizen Affairs"
            variant="primary"
            icon={<UserPlus className="h-5 w-5" />}
            onClick={() => setShowCreateForm(true)}
          />
        ) : undefined
      }
    >
      <section className={`${panelClass} p-5 sm:p-7`}>
        <SectionHeader
          icon={UserCog}
          title="Login accounts"
          subtitle="Role enforcement belongs on the API; this view mirrors the approved accounts."
          badge={<span className={badgeClass}>{users.length} accounts</span>}
        />
        <div className="mt-6 overflow-x-auto rounded-lg border border-border/60">
          <table className="w-full min-w-[720px] text-sm [&_td]:whitespace-nowrap [&_th]:whitespace-nowrap">
            <thead>
              <tr className="bg-muted text-left">
                {["Name", "Email", "Role", "Barangay scope", "Status", "Actions"].map((heading) => (
                  <th
                    key={heading}
                    className="px-4 py-3 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-t border-border/60">
                  <td className="px-4 py-3.5 font-semibold">
                    <div className="flex items-center gap-3">
                      <div className="bg-navy grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full text-xs text-white ring-2 ring-gold/40">
                        {user.profile_photo_path ? (
                          <img
                            src={`${API_URL.replace(/\/api$/, "")}/storage/${user.profile_photo_path}`}
                            alt={`${user.name} profile`}
                            className="h-full w-full object-cover"
                            onError={(event) => {
                              if (user.role === "admin") event.currentTarget.src = oscaAdminImage;
                            }}
                          />
                        ) : user.role === "admin" ? (
                          <img
                            src={oscaAdminImage}
                            alt={`${user.name} profile`}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          initials(user.name)
                        )}
                      </div>
                      {user.name}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-muted-foreground">{user.email}</td>
                  <td className="px-4 py-3.5">
                    <span
                      className={
                        user.role === "leader"
                          ? badgeClass
                          : "rounded-full border border-gold/40 bg-gold/15 px-3 py-1 text-xs font-semibold text-gold-foreground dark:text-gold"
                      }
                    >
                      {roleLabel(user.role)}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-muted-foreground">
                    {user.role === "leader"
                      ? (barangays.find((item) => item.id === user.barangay_id)?.barangay_name ??
                        "Unassigned")
                      : "All barangays"}
                  </td>
                  <td className="px-4 py-3.5">
                    <StatusPill tone={user.status === "active" ? "success" : "danger"}>
                      {user.status === "active" ? "Active" : "Inactive"}
                    </StatusPill>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => openEditForm(user)}
                        aria-label={`Edit ${user.name}`}
                        title="Edit account"
                        className={actionButtonClass}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(user)}
                        aria-label={`Delete ${user.name}`}
                        title="Delete account"
                        className={`${actionButtonClass} hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <EmptyState
                      bare
                      icon={UserRound}
                      title="No login accounts yet"
                      description="Accounts you create will be listed here."
                      className="py-12"
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {showCreateForm && isAdmin && (
        <div className="fixed inset-0 z-30 grid place-items-center bg-black/50 px-4 backdrop-blur-[2px]">
          <form
            className="surface-card max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto border border-border/60 p-0 shadow-2xl"
            onSubmit={handleSubmit}
          >
            <div className="flex items-center justify-between gap-4 border-b border-border px-6 py-5">
              <div className="flex min-w-0 items-center gap-3">
                <span className="bg-navy grid h-10 w-10 shrink-0 place-items-center rounded-lg">
                  <UserPlus className="h-4 w-4 text-gold" />
                </span>
                <div className="min-w-0">
                  <h2 className="text-xl font-extrabold">
                    {editingUser ? "Edit user account" : "Create BSCA account"}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {editingUser
                      ? "Only Admin can manage these accounts."
                      : "Barangay Senior Citizen Affairs login. Only Admin can manage these accounts."}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                aria-label="Close create account form"
                className={iconButtonClass}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5 p-6">
              {error && <AuthAlert tone="error">{error}</AuthAlert>}
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label htmlFor="user-first-name" className={labelClass}>
                    First name
                  </label>
                  <input
                    id="user-first-name"
                    required
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                    placeholder="Juan"
                    className={`${fieldClass} h-11`}
                  />
                </div>
                <div>
                  <label htmlFor="user-middle-name" className={labelClass}>
                    Middle name
                  </label>
                  <input
                    id="user-middle-name"
                    value={middleName}
                    onChange={(event) => setMiddleName(event.target.value)}
                    placeholder="Optional"
                    className={`${fieldClass} h-11`}
                  />
                </div>
                <div>
                  <label htmlFor="user-last-name" className={labelClass}>
                    Last name
                  </label>
                  <input
                    id="user-last-name"
                    required
                    value={lastName}
                    onChange={(event) => setLastName(event.target.value)}
                    placeholder="Dela Cruz"
                    className={`${fieldClass} h-11`}
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="user-email" className={labelClass}>
                    Email address
                  </label>
                  <input
                    id="user-email"
                    required
                    type="email"
                    autoComplete="off"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="name@example.com"
                    className={`${fieldClass} h-11`}
                  />
                </div>
                <div>
                  <label htmlFor="user-contact" className={labelClass}>
                    Mobile number
                  </label>
                  <input
                    id="user-contact"
                    required={!editingUser}
                    type="tel"
                    inputMode="numeric"
                    maxLength={11}
                    pattern="09[0-9]{9}"
                    title="Enter an 11-digit mobile number starting with 09."
                    value={contactNumber}
                    onChange={(event) => setContactNumber(toLocalMobile(event.target.value))}
                    placeholder="09171234567"
                    className={`${fieldClass} h-11`}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">11 digits, starting with 09.</p>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="user-birthdate" className={labelClass}>
                    Birthday
                  </label>
                  <input
                    id="user-birthdate"
                    required={!editingUser}
                    type="date"
                    value={birthdate}
                    onChange={(event) => setBirthdate(event.target.value)}
                    className={`${fieldClass} h-11`}
                  />
                </div>
                <div>
                  <label htmlFor="user-age" className={labelClass}>
                    Age
                  </label>
                  <input
                    id="user-age"
                    value={getAge(birthdate)}
                    readOnly
                    placeholder="Calculated automatically"
                    className={`${fieldClass} h-11 bg-muted/60`}
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="user-role" className={labelClass}>
                    Role
                  </label>
                  <Select
                    name="role"
                    required
                    value={role}
                    onValueChange={(value) => setRole(value as typeof role)}
                  >
                    <SelectTrigger id="user-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {/* New Admin accounts cannot be made here; existing ones keep their role. */}
                      {editingUser?.role === "admin" && (
                        <SelectItem value="admin">Admin</SelectItem>
                      )}
                      <SelectItem value="head">Head</SelectItem>
                      <SelectItem value="leader">BSCA President</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label htmlFor="user-status" className={labelClass}>
                    Status
                  </label>
                  <Select
                    name="status"
                    required
                    value={status}
                    onValueChange={(value) => setStatus(value as typeof status)}
                  >
                    <SelectTrigger id="user-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label htmlFor="user-barangay" className={labelClass}>
                  Barangay
                </label>
                <SearchableSelect
                  id="user-barangay"
                  label="Barangay"
                  required={role === "leader"}
                  disabled={role !== "leader"}
                  value={role === "leader" ? barangayId : ""}
                  onChange={setBarangayId}
                  placeholder={role === "leader" ? "Select a barangay" : "No barangay assignment"}
                  emptyMessage={
                    barangaysFailed
                      ? "Couldn't load barangays. Refresh the page to try again."
                      : undefined
                  }
                  options={barangays.map((barangay) => ({
                    value: String(barangay.id),
                    label: barangay.barangay_name,
                  }))}
                />
              </div>
              {!editingUser && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="user-password" className={labelClass}>
                      Password
                    </label>
                    <div className="relative">
                      <input
                        id="user-password"
                        minLength={8}
                        required
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="8+ characters"
                        className={`${fieldClass} h-11 pr-11 [&::-ms-reveal]:hidden`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((visible) => !visible)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="user-password-confirmation" className={labelClass}>
                      Confirm password
                    </label>
                    <div className="relative">
                      <input
                        id="user-password-confirmation"
                        minLength={8}
                        required
                        type={showPasswordConfirmation ? "text" : "password"}
                        autoComplete="new-password"
                        value={passwordConfirmation}
                        onChange={(event) => setPasswordConfirmation(event.target.value)}
                        placeholder="Re-enter password"
                        className={`${fieldClass} h-11 pr-11 [&::-ms-reveal]:hidden`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswordConfirmation((visible) => !visible)}
                        aria-label={
                          showPasswordConfirmation
                            ? "Hide confirmation password"
                            : "Show confirmation password"
                        }
                        className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPasswordConfirmation ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground sm:col-span-2">
                    Use uppercase and lowercase letters, a number, and a special character.
                  </p>
                </div>
              )}

              <button type="submit" disabled={submitting} className={authSubmitClass}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : editingUser ? (
                  "Save changes"
                ) : (
                  "Create account"
                )}
              </button>
            </div>
          </form>
        </div>
      )}
      {confirmDialog}
    </AppShell>
  );
}
