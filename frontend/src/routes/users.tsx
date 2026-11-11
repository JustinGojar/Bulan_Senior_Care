import { createFileRoute } from "@tanstack/react-router";
import {
  Camera,
  Check,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Pencil,
  Search,
  ShieldAlert,
  ToggleLeft,
  ToggleRight,
  Trash2,
  UserCog,
  UserPlus,
  X,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useConfirmDialog } from "@/components/ConfirmDialog";
import { SystemRolePermissionsSettings } from "@/components/SystemRolePermissionsSettings";
import { AuthAlert, authSubmitClass } from "@/components/AuthLayout";
import { EmptyState, SectionHeader, StatusPill } from "@/components/DesignKit";
import {
  badgeClass,
  fieldClass,
  iconButtonClass,
  panelClass,
  tableMessageClass,
} from "@/components/design-kit";
import { IconActionButton, IconSelect } from "@/components/IconActionButton";
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
  resetManagedUserPassword,
  setManagedUserStatus,
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

const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

function photoUrl(path: string) {
  return `${API_URL.replace(/\/api$/, "")}/storage/${path}`;
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
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState("");
  const [usersPage, setUsersPage] = useState(1);
  const [usersLastPage, setUsersLastPage] = useState(1);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersRefreshKey, setUsersRefreshKey] = useState(0);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [activeTab, setActiveTab] = useState<"users" | "roles">("users");
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);
  const [passwordCopied, setPasswordCopied] = useState(false);
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
  const [role, setRole] = useState<"admin" | "head" | "president" | "encoder" | "viewer">(
    "president",
  );
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirm, confirmDialog] = useConfirmDialog();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const isAdmin = currentUser?.role === "admin";
  const canViewUsers = isAdmin || Boolean(currentUser?.granted_permissions?.includes("users.view"));

  useEffect(() => {
    if (!canViewUsers) {
      setUsersLoading(false);
      return;
    }
    let active = true;
    setUsersLoading(true);
    setUsersError("");
    const timer = window.setTimeout(
      () => {
        getManagedUsers({
          page: usersPage,
          search,
          role: roleFilter,
          status: statusFilter,
        })
          .then((result) => {
            if (!active) return;
            setUsers(result.data);
            setUsersLastPage(result.last_page);
            setUsersTotal(result.total);
          })
          .catch((reason: unknown) => {
            if (active) {
              setUsersError(
                reason instanceof Error ? reason.message : "Could not load user accounts.",
              );
            }
          })
          .finally(() => {
            if (active) setUsersLoading(false);
          });
      },
      search ? 250 : 0,
    );
    getBarangays()
      .then(setBarangays)
      .catch(() => {
        setBarangays([]);
        setBarangaysFailed(true);
      });
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [canViewUsers, usersPage, search, roleFilter, statusFilter, usersRefreshKey]);

  useEffect(() => {
    if (!photo) {
      setPhotoPreview(null);
      return;
    }
    const url = URL.createObjectURL(photo);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  useEffect(() => {
    setUsersPage(1);
  }, [search, roleFilter, statusFilter]);

  if (!canViewUsers) {
    return (
      <AppShell
        title="Access restricted"
        subtitle="You do not have permission to view user accounts"
        breadcrumb={["Dashboard"]}
      >
        <section className={`${panelClass} p-5 sm:p-7`}>
          <SectionHeader
            icon={ShieldAlert}
            title="Admins only"
            subtitle="Ask a Super Admin to grant users.view access."
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
    setRole("president");
    setStatus("active");
    setPhoto(null);
    setRemovePhoto(false);
    setEditingUser(null);
  }

  function handlePhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Profile picture must be a JPG, PNG, or WEBP image.");
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setError("Profile picture must be 2 MB or smaller.");
      return;
    }
    setError(null);
    setPhoto(file);
    setRemovePhoto(false);
  }

  function clearPhoto() {
    setPhoto(null);
    if (editingUser?.profile_photo_path) setRemovePhoto(true);
  }

  function openEditForm(user: ManagedUser) {
    resetForm();
    setEditingUser(user);
    setFirstName(user.first_name ?? "");
    setMiddleName(user.middle_name ?? "");
    setLastName(user.last_name ?? "");
    setEmail(user.email);
    setContactNumber(toLocalMobile(user.contact_number ?? ""));
    setBirthdate(user.birthdate?.slice(0, 10) ?? "");
    setBarangayId(user.barangay_id ? String(user.barangay_id) : "");
    setRole(user.role as typeof role);
    setStatus(user.status);
    setPhoto(null);
    setRemovePhoto(false);
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
        const updated = await updateManagedUser(
          editingUser.id,
          {
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
          },
          { file: photo, remove: removePhoto },
        );
        setUsers((current) => current.map((item) => (item.id === updated.id ? updated : item)));
        setUsersRefreshKey((current) => current + 1);
        if (updated.email !== editingUser.email) {
          toast.success(
            `User account updated. ${updated.email} must be verified before this account can log in again.`,
          );
        } else {
          toast.success("User account updated.");
        }
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
          profilePhoto: photo,
        });
        setUsers((current) => [...current, created.user]);
        setUsersRefreshKey((current) => current + 1);
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

  async function handleToggleStatus(user: ManagedUser) {
    const deactivate = user.status === "active";
    const confirmed = await confirm({
      title: deactivate ? "Deactivate this account?" : "Reactivate this account?",
      description: deactivate
        ? `${user.name} will be signed out and cannot log in until the account is reactivated.`
        : `${user.name} will be able to log in again.`,
      confirmLabel: deactivate ? "Deactivate" : "Reactivate",
      destructive: deactivate,
    });
    if (!confirmed) return;
    try {
      const updated = await setManagedUserStatus(user.id, deactivate ? "inactive" : "active");
      setUsers((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setUsersRefreshKey((current) => current + 1);
      toast.success(deactivate ? "Account deactivated." : "Account reactivated.");
    } catch (reason) {
      toast.error(
        reason instanceof Error ? reason.message : "Unable to change the account status.",
      );
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
      setUsersRefreshKey((current) => current + 1);
      toast.success("User account deleted.");
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Unable to delete account.");
    }
  }

  async function handleResetPassword(user: ManagedUser) {
    const confirmed = await confirm({
      title: "Reset this user's password?",
      description: `${user.name} will be signed out of all devices and must change the temporary password at their next sign-in.`,
      confirmLabel: "Reset password",
      destructive: true,
    });
    if (!confirmed) return;
    try {
      const result = await resetManagedUserPassword(user.id);
      setTemporaryPassword(result.temporary_password);
      setPasswordCopied(false);
      toast.success("Temporary password created. Copy it now; it will not be shown again.");
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Unable to reset the password.");
    }
  }

  const roleLabel = (value: string) =>
    value === "admin"
      ? "Super Admin"
      : value === "head"
        ? "OSCA Head"
        : value === "encoder"
          ? "Encoder"
          : value === "viewer"
            ? "Viewer"
            : "BSCA President";
  const labelClass = "mb-2 block text-sm font-semibold";
  const barangayScope = (user: ManagedUser) =>
    user.role === "president"
      ? (barangays.find((item) => item.id === user.barangay_id)?.barangay_name ?? "Unassigned")
      : "All barangays";
  // An account cannot log in until its email is verified, whatever its status says.
  const accountStatus = (user: ManagedUser) =>
    user.status !== "active" ? "inactive" : user.email_verified_at ? "active" : "pending";
  const filteredUsers = users;
  const hasFilters = Boolean(search || roleFilter || statusFilter);
  const currentPhoto =
    photoPreview ??
    (editingUser?.profile_photo_path && !removePhoto
      ? photoUrl(editingUser.profile_photo_path)
      : null);
  const actionButtonClass =
    "grid h-9 w-9 place-items-center rounded-lg border border-border/60 bg-card text-muted-foreground transition-colors hover:border-ring/40 hover:text-foreground";

  return (
    <AppShell
      title="Users & Roles"
      subtitle="Manage login accounts and barangay access"
      breadcrumb={["Dashboard", "Users & Roles"]}
      actions={
        isAdmin && activeTab === "users" ? (
          <IconActionButton
            label="Create user account"
            variant="primary"
            icon={<UserPlus className="h-5 w-5" />}
            onClick={() => setShowCreateForm(true)}
          />
        ) : undefined
      }
    >
      {isAdmin && (
        <div className="mb-4 flex gap-2" role="tablist" aria-label="User and role management">
          {(["users", "roles"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={activeTab === tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${activeTab === tab ? "bg-navy text-white dark:bg-gold dark:text-gold-foreground" : "border border-border/60 bg-card hover:bg-muted"}`}
            >
              {tab === "users" ? "Users" : "Roles & permissions"}
            </button>
          ))}
        </div>
      )}
      {activeTab === "roles" && isAdmin ? (
        <SystemRolePermissionsSettings />
      ) : (
        <section className={`${panelClass} p-5 sm:p-7`}>
          <SectionHeader
            icon={UserCog}
            title="Login accounts"
            subtitle="Role enforcement belongs on the API; this view mirrors the approved accounts."
            badge={
              <span className={badgeClass}>
                {hasFilters ? `${usersTotal} matching` : usersTotal} accounts
              </span>
            }
          />
          {usersError && (
            <div className="mt-4">
              <AuthAlert tone="error">{usersError}</AuthAlert>
            </div>
          )}
          <div className="mt-5 flex flex-wrap items-center gap-2 sm:gap-3">
            <label className="relative block min-w-0 flex-1 basis-full sm:basis-0">
              <span className="sr-only">Search login accounts</span>
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name, email, or barangay"
                className={`${fieldClass} h-10 pl-10 sm:h-11`}
              />
            </label>
            <IconSelect
              label="Role"
              icon={<UserCog className="h-4 w-4" />}
              value={roleFilter}
              defaultValue=""
              className="sm:w-48"
              options={[
                { value: "", label: "All roles" },
                { value: "admin", label: "Super Admin" },
                { value: "head", label: "OSCA Head" },
                { value: "encoder", label: "Encoder" },
                { value: "viewer", label: "Viewer" },
                { value: "president", label: "BSCA President" },
              ]}
              onChange={setRoleFilter}
            />
            <IconSelect
              label="Status"
              icon={<ToggleRight className="h-4 w-4" />}
              value={statusFilter}
              defaultValue=""
              className="sm:w-40"
              options={[
                { value: "", label: "All statuses" },
                { value: "active", label: "Active" },
                { value: "pending", label: "Pending verification" },
                { value: "inactive", label: "Inactive" },
              ]}
              onChange={setStatusFilter}
            />
            {hasFilters && (
              <IconActionButton
                label="Clear filters"
                variant="outline"
                icon={<X className="h-4 w-4" />}
                className="h-10 w-10 text-xs hover:translate-y-0 sm:h-11 sm:px-4"
                onClick={() => {
                  setSearch("");
                  setRoleFilter("");
                  setStatusFilter("");
                }}
              />
            )}
          </div>
          <div className="mt-4 @container overflow-x-auto rounded-lg border border-border/60">
            <table className="w-full min-w-[720px] text-sm [&_td]:whitespace-nowrap [&_th]:whitespace-nowrap">
              <thead>
                <tr className="bg-muted text-left">
                  {[
                    "Name",
                    "Email",
                    "Role",
                    "Barangay scope",
                    "Status",
                    "Last login",
                    "Actions",
                  ].map((heading) => (
                    <th
                      key={heading}
                      className="px-4 py-3 text-[0.6875rem] font-semibold tracking-wider text-muted-foreground uppercase"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {usersLoading ? (
                  <tr>
                    <td colSpan={7}>
                      <div
                        className={`${tableMessageClass} flex items-center justify-center gap-2`}
                      >
                        <Loader2 className="h-4 w-4 animate-spin" /> Loading user accounts…
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="border-t border-border/60">
                      <td className="px-4 py-3.5 font-semibold">
                        <div className="flex items-center gap-3">
                          <div className="bg-navy grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full text-xs text-white ring-2 ring-gold/40">
                            {user.profile_photo_path ? (
                              <img
                                src={photoUrl(user.profile_photo_path)}
                                alt={`${user.name} profile`}
                                className="h-full w-full object-cover"
                                onError={(event) => {
                                  if (user.role === "admin")
                                    event.currentTarget.src = oscaAdminImage;
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
                            user.role === "president"
                              ? badgeClass
                              : "rounded-full border border-gold/40 bg-gold/15 px-3 py-1 text-xs font-semibold text-gold-foreground dark:text-gold"
                          }
                        >
                          {roleLabel(user.role)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-muted-foreground">{barangayScope(user)}</td>
                      <td className="px-4 py-3.5">
                        {accountStatus(user) === "pending" ? (
                          <StatusPill tone="gold">Pending verification</StatusPill>
                        ) : (
                          <StatusPill tone={user.status === "active" ? "success" : "danger"}>
                            {user.status === "active" ? "Active" : "Inactive"}
                          </StatusPill>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-muted-foreground">
                        {user.last_login ? new Date(user.last_login).toLocaleString() : "Never"}
                      </td>
                      <td className="px-4 py-3.5">
                        {isAdmin && (
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => openEditForm(user)}
                              aria-label={`Edit ${user.name}`}
                              title="Edit account"
                              className={actionButtonClass}
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            {user.id !== currentUser?.id && (
                              <button
                                onClick={() => handleToggleStatus(user)}
                                aria-label={`${user.status === "active" ? "Deactivate" : "Reactivate"} ${user.name}`}
                                title={
                                  user.status === "active"
                                    ? "Deactivate account"
                                    : "Reactivate account"
                                }
                                className={actionButtonClass}
                              >
                                {user.status === "active" ? (
                                  <ToggleRight className="h-4 w-4 text-success" />
                                ) : (
                                  <ToggleLeft className="h-4 w-4" />
                                )}
                              </button>
                            )}
                            {user.id !== currentUser?.id && (
                              <>
                                <button
                                  onClick={() => void handleResetPassword(user)}
                                  aria-label={`Reset password for ${user.name}`}
                                  title="Reset password"
                                  className={actionButtonClass}
                                >
                                  <KeyRound className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => void handleDelete(user)}
                                  aria-label={`Delete ${user.name}`}
                                  title="Delete account"
                                  className={`${actionButtonClass} hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
                {!usersLoading && !usersError && filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={7}>
                      <div className={tableMessageClass}>
                        <EmptyState
                          bare
                          icon={UserRound}
                          title={hasFilters ? "No matching accounts" : "No login accounts yet"}
                          description={
                            hasFilters
                              ? "Try a different search or clear the filters."
                              : "Accounts you create will be listed here."
                          }
                          className="py-12"
                        />
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
            <span>
              Page {usersPage} of {usersLastPage} · {usersTotal} accounts
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setUsersPage((page) => Math.max(1, page - 1))}
                disabled={usersPage <= 1 || usersLoading}
                className="rounded-lg border border-border/60 px-3 py-2 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setUsersPage((page) => Math.min(usersLastPage, page + 1))}
                disabled={usersPage >= usersLastPage || usersLoading}
                className="rounded-lg border border-border/60 px-3 py-2 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </section>
      )}

      {showCreateForm && isAdmin && (
        <div className="fixed inset-0 z-30 grid place-items-center bg-black/50 px-4 backdrop-blur-[2px]">
          <form
            className="surface-card max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto border border-border/60 p-0 shadow-2xl"
            onSubmit={handleSubmit}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-border bg-card px-6 py-5">
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
              <div className="flex items-center gap-4">
                <div className="bg-navy grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full text-lg font-bold text-white ring-2 ring-gold/40">
                  {currentPhoto ? (
                    <img
                      src={currentPhoto}
                      alt="Profile picture preview"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <UserRound className="h-7 w-7 text-white/80" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">
                    Profile picture{" "}
                    <span className="font-normal text-muted-foreground">(optional)</span>
                  </p>
                  <p className="text-xs text-muted-foreground">JPG, PNG, or WEBP, up to 2 MB.</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border/60 bg-card px-3 text-xs font-semibold transition-colors hover:border-ring/40"
                    >
                      <Camera className="h-3.5 w-3.5" />
                      {currentPhoto ? "Change photo" : "Upload photo"}
                    </button>
                    {currentPhoto && (
                      <button
                        type="button"
                        onClick={clearPhoto}
                        className="inline-flex h-8 items-center rounded-lg px-3 text-xs font-semibold text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <input
                    ref={photoInputRef}
                    id="user-profile-photo"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                </div>
              </div>
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
                      {editingUser?.role === "admin" && (
                        <SelectItem value="admin">Super Admin</SelectItem>
                      )}
                      <SelectItem value="head">OSCA Head</SelectItem>
                      <SelectItem value="encoder">Encoder</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                      <SelectItem value="president">BSCA President</SelectItem>
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
                  required={role === "president"}
                  disabled={role !== "president"}
                  value={role === "president" ? barangayId : ""}
                  onChange={setBarangayId}
                  placeholder={
                    role === "president" ? "Select a barangay" : "No barangay assignment"
                  }
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
      {temporaryPassword && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 px-4 backdrop-blur-[2px]">
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="temporary-password-title"
            className={`${panelClass} w-full max-w-md p-6`}
          >
            <h2 id="temporary-password-title" className="text-lg font-semibold">
              Temporary password
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Share this password securely. It is shown only once, and the user must change it at
              their next sign-in.
            </p>
            <code className="mt-4 block select-all break-all rounded-lg border border-border/60 bg-muted p-3 text-base">
              {temporaryPassword}
            </code>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() =>
                  void navigator.clipboard
                    .writeText(temporaryPassword)
                    .then(() => setPasswordCopied(true))
                    .catch(() =>
                      toast.error("Could not copy the password. Select it to copy manually."),
                    )
                }
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-border/60 px-3 text-sm font-semibold"
              >
                {passwordCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {passwordCopied ? "Copied" : "Copy"}
              </button>
              <button
                type="button"
                onClick={() => setTemporaryPassword(null)}
                className="h-10 rounded-lg bg-navy px-4 text-sm font-semibold text-white dark:bg-gold dark:text-gold-foreground"
              >
                Done
              </button>
            </div>
          </section>
        </div>
      )}
      {confirmDialog}
    </AppShell>
  );
}
