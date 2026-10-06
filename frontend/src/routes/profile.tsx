import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BarChart3,
  Camera,
  Eye,
  EyeOff,
  FileText,
  HandCoins,
  KeyRound,
  LogOut,
  Save,
  ShieldCheck,
  UserCircle,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { SectionHeader } from "@/components/DesignKit";
import { fieldClass, panelClass, tileClass } from "@/components/design-kit";
import { authSubmitClass } from "@/components/AuthLayout";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  API_URL,
  apiFetch,
  getBarangays,
  clearToken,
  getAuditLogs,
  getStoredUser,
  logout,
  setStoredUser,
  type ApiUser,
  type AuditLog,
} from "@/lib/api";
import coverPhoto from "@/img/CP.jpg";
import defaultProfileImage from "@/img/Defaut.png";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "My Profile — Bulan SeniorCare" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const [user, setUser] = useState<ApiUser | null>(getStoredUser());
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [contact, setContact] = useState(user?.contact_number ?? "");
  const [address, setAddress] = useState(user?.address ?? "");
  const [assignedBarangay, setAssignedBarangay] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [recentActivity, setRecentActivity] = useState<AuditLog[] | null>(null);
  const isAdmin = user?.role?.toLowerCase() === "admin";

  useEffect(() => {
    apiFetch<ApiUser>("/user")
      .then((freshUser) => {
        setUser(freshUser);
        setName(freshUser.name);
        setEmail(freshUser.email);
        setContact(freshUser.contact_number ?? "");
        setAddress(freshUser.address ?? "");
        setStoredUser(freshUser);
        const isLeader =
          freshUser.role?.toLowerCase() === "leader" ||
          freshUser.roles?.some((role) => role.name.toLowerCase() === "leader");
        if (isLeader && freshUser.barangay_id) {
          getBarangays()
            .then((barangays) =>
              setAssignedBarangay(
                barangays.find((barangay) => barangay.id === freshUser.barangay_id)
                  ?.barangay_name ?? "",
              ),
            )
            .catch(() => setAssignedBarangay(""));
        }
      })
      .catch((error: Error) => {
        if (error.message.includes("session has expired")) {
          toast.error(error.message);
          window.location.href = "/login";
        }
      });
  }, []);

  // Only admins can read the audit log, so only they get their own recent entries here.
  useEffect(() => {
    if (!isAdmin || !user?.id) return;
    getAuditLogs(1)
      .then((result) =>
        setRecentActivity(result.data.filter((log) => log.actor?.id === user.id).slice(0, 5)),
      )
      .catch(() => setRecentActivity([]));
  }, [isAdmin, user?.id]);

  useEffect(() => {
    if (!photo) {
      setPhotoPreview(null);
      return;
    }

    const previewUrl = URL.createObjectURL(photo);
    setPhotoPreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [photo]);

  const photoUrl =
    photoPreview ??
    (user?.profile_photo_path
      ? `${API_URL.replace(/\/api$/, "")}/storage/${user.profile_photo_path}`
      : defaultProfileImage);
  const roleLabel =
    user?.role?.toLowerCase() === "leader"
      ? `BSCA${assignedBarangay ? ` - ${assignedBarangay}` : ""}`
      : user?.role?.toLowerCase() === "head"
        ? "OSCA Head"
        : user?.role?.toLowerCase() === "admin"
          ? "OSCA Admin"
          : (user?.role ?? "user");
  const initials = (name || "User")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const form = new FormData();
      form.append("name", name);
      form.append("email", email);
      form.append("contact_number", contact);
      form.append("address", address);
      if (photo) form.append("profile_photo", photo);
      const updated = await apiFetch<ApiUser>("/profile", { method: "POST", body: form });
      setUser(updated);
      setStoredUser(updated);
      setPhoto(null);
      toast.success("Profile updated successfully.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update profile.");
      if (error instanceof Error && error.message.includes("session has expired")) {
        window.location.href = "/login";
      }
    } finally {
      setBusy(false);
    }
  }

  async function savePassword(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await apiFetch<{ message: string }>("/profile/password", {
        method: "POST",
        body: JSON.stringify({
          current_password: currentPassword,
          password,
          password_confirmation: passwordConfirmation,
        }),
      });
      setCurrentPassword("");
      setPassword("");
      setPasswordConfirmation("");
      setPasswordDialogOpen(false);
      toast.success("Password changed successfully.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not change password.");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    void logout().catch(() => undefined);
    clearToken();
    window.location.href = "/login";
  }

  return (
    <AppShell
      title="My Profile"
      subtitle="Manage your account details and security"
      breadcrumb={["Dashboard", "My Profile"]}
    >
      <div className="grid gap-6 lg:grid-cols-[0.84fr_1.16fr]">
        <section className={`${panelClass} flex min-h-[640px] flex-col overflow-hidden p-0`}>
          <div
            className="relative h-[226px]"
            style={{
              backgroundImage: `linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.08)), url(${coverPhoto})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-[oklch(0.24_0.06_258/0.25)] to-[oklch(0.2_0.05_258/0.75)]" />
            <div className="absolute inset-x-0 bottom-0 flex justify-center translate-y-1/2">
              <div className="bg-navy relative grid h-[128px] w-[128px] place-items-center overflow-hidden rounded-full text-[2.1rem] font-black text-white ring-4 ring-card">
                {photoUrl ? (
                  <img
                    src={photoUrl}
                    alt="Profile"
                    className="h-full w-full object-cover"
                    onError={(event) => {
                      event.currentTarget.src = defaultProfileImage;
                    }}
                  />
                ) : (
                  initials
                )}
                <label
                  htmlFor="profile-photo"
                  className="absolute right-1 bottom-1 z-10 grid h-8 w-8 cursor-pointer place-items-center rounded-full bg-gold text-gold-foreground shadow-lg ring-2 ring-card"
                  title="Change profile picture"
                  aria-label="Change profile picture"
                >
                  <Camera className="h-4 w-4" />
                </label>
              </div>
            </div>
            <input
              id="profile-photo"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(event) => setPhoto(event.target.files?.[0] ?? null)}
            />
          </div>

          <div className="flex flex-1 flex-col px-7 pb-7 pt-[62px]">
            <div className="text-center">
              <h2 className="text-3xl font-extrabold">{user?.name ?? "Your profile"}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{user?.email}</p>
              <span className="mt-4 inline-flex rounded-full border border-gold/40 bg-gold/15 px-3 py-1 text-[11px] font-semibold tracking-wider text-gold-foreground uppercase dark:text-gold">
                {roleLabel}
              </span>
            </div>

            <form onSubmit={saveProfile} className="mt-8 space-y-4">
              <div className="flex items-center gap-2 border-t border-border/60 pt-6">
                <UserCircle className="h-5 w-5 text-primary" />
                <h2 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  Edit profile
                </h2>
              </div>
              <label className="block text-sm font-semibold text-foreground">
                Full name
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className={`${fieldClass} mt-2 h-11 font-normal`}
                  required
                />
              </label>
              <label className="block text-sm font-semibold text-foreground">
                Email address
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className={`${fieldClass} mt-2 h-11 font-normal`}
                  required
                />
              </label>
              <label className="block text-sm font-semibold text-foreground">
                Contact number
                <input
                  value={contact}
                  onChange={(event) => setContact(event.target.value)}
                  placeholder="0917-123-4567"
                  className={`${fieldClass} mt-2 h-11 font-normal`}
                />
              </label>
              <label className="block text-sm font-semibold text-foreground">
                Address
                <input
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                  placeholder="Enter your address"
                  className={`${fieldClass} mt-2 h-11 font-normal`}
                />
              </label>
              <label className="block text-sm font-semibold text-foreground">
                Role / Position
                <input
                  value={roleLabel}
                  readOnly
                  className={`${fieldClass} mt-2 h-11 cursor-not-allowed bg-muted/60 font-normal text-muted-foreground`}
                />
              </label>
              {photo && (
                <p className="text-xs text-muted-foreground">
                  Preview updated. Click Save profile to upload {photo.name}.
                </p>
              )}
              <button type="submit" disabled={busy} className={authSubmitClass}>
                <Save className="h-4 w-4" /> {busy ? "Saving..." : "Save profile"}
              </button>
            </form>
            <button
              onClick={signOut}
              className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 text-sm font-bold text-destructive transition-colors hover:bg-destructive/15"
            >
              <LogOut className="h-4 w-4" /> Log out
            </button>
          </div>
        </section>

        <div className="space-y-6">
          <section className={`${panelClass} p-5 sm:p-7`}>
            <SectionHeader
              icon={BarChart3}
              title="System Overview"
              subtitle="Quick access to your most used features"
            />
            <div className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
              {[
                {
                  label: "Senior Record",
                  to: "/seniors",
                  icon: Users,
                  color: "bg-navy text-white",
                },
                {
                  label: "Benefit Tracking",
                  to: "/benefits",
                  icon: HandCoins,
                  color: "bg-gold text-gold-foreground",
                },
                {
                  label: "Analytics",
                  to: "/analytics",
                  icon: BarChart3,
                  color: "bg-success text-success-foreground",
                },
                {
                  label: "Reports",
                  to: "/reports",
                  icon: FileText,
                  color: "bg-coral text-coral-foreground",
                },
              ].map(({ label, to, icon: Icon, color }) => (
                <Link
                  key={label}
                  to={to}
                  aria-label={`Go to ${label}`}
                  className={`${tileClass} flex min-h-[92px] flex-col items-center justify-center p-3 text-center transition-[transform,border-color,box-shadow] hover:-translate-y-0.5 hover:border-ring/40 hover:shadow-[var(--shadow-soft)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring`}
                >
                  <div className={`mb-2 grid h-9 w-9 place-items-center rounded-lg ${color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <p className="text-xs leading-tight font-semibold">{label}</p>
                </Link>
              ))}
            </div>
          </section>

          <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
            <button
              type="button"
              onClick={() => setPasswordDialogOpen(true)}
              className={`${panelClass} group flex w-full items-center justify-between gap-4 p-5 text-left transition-[border-color,box-shadow] hover:border-ring/40 hover:shadow-[var(--shadow-soft)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:p-7`}
            >
              <span className="flex items-center gap-3">
                <span className="bg-navy grid h-10 w-10 shrink-0 place-items-center rounded-lg">
                  <ShieldCheck className="h-4 w-4 text-gold" />
                </span>
                <span>
                  <span className="block text-lg font-bold">Change Password</span>
                  <span className="mt-1 block text-sm text-muted-foreground">
                    Keep your account secure
                  </span>
                </span>
              </span>
              <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </button>
            <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-xl">
              <DialogHeader>
                <DialogTitle className="font-display">Change Password</DialogTitle>
                <DialogDescription>
                  Enter your current password and choose a new password of at least 8 characters.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={savePassword} className="space-y-4">
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowPasswords((visible) => !visible)}
                    className="inline-flex items-center gap-2 text-xs font-bold text-primary hover:underline"
                  >
                    {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    {showPasswords ? "Hide passwords" : "Show passwords"}
                  </button>
                </div>
                <label className="block text-sm font-semibold text-foreground">
                  Current password
                  <input
                    type={showPasswords ? "text" : "password"}
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                    autoComplete="current-password"
                    className={`${fieldClass} mt-2 h-11 font-normal`}
                    required
                  />
                </label>
                <label className="block text-sm font-semibold text-foreground">
                  New password
                  <input
                    type={showPasswords ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    minLength={8}
                    autoComplete="new-password"
                    className={`${fieldClass} mt-2 h-11 font-normal`}
                    required
                  />
                </label>
                <label className="block text-sm font-semibold text-foreground">
                  Confirm password
                  <input
                    type={showPasswords ? "text" : "password"}
                    value={passwordConfirmation}
                    onChange={(event) => setPasswordConfirmation(event.target.value)}
                    minLength={8}
                    autoComplete="new-password"
                    className={`${fieldClass} mt-2 h-11 font-normal`}
                    required
                  />
                </label>
                <button type="submit" disabled={busy} className={authSubmitClass}>
                  <KeyRound className="h-4 w-4" /> {busy ? "Updating..." : "Update password"}
                </button>
              </form>
            </DialogContent>
          </Dialog>

          <section className={`${panelClass} overflow-hidden p-5 sm:p-7`}>
            <SectionHeader
              icon={ShieldCheck}
              title="Recent Activity"
              subtitle="Your latest actions in the system"
              badge={
                isAdmin ? (
                  <Link
                    to="/audit-logs"
                    className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
                  >
                    View all <ArrowRight className="h-4 w-4" />
                  </Link>
                ) : undefined
              }
            />

            <div className="mt-6 overflow-hidden rounded-lg border border-border/60">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-muted">
                  <tr className="text-[11px] tracking-wider text-muted-foreground uppercase">
                    <th className="px-4 py-3 font-semibold">Date &amp; Time</th>
                    <th className="px-4 py-3 font-semibold">Action</th>
                    <th className="px-4 py-3 font-semibold">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {recentActivity?.map((log) => (
                    <tr key={log.id} className="border-t border-border/60">
                      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 font-semibold capitalize">
                        {log.action.replaceAll("_", " ")}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {log.target_type
                          .split("\\")
                          .at(-1)
                          ?.replace(/([a-z])([A-Z])/g, "$1 $2")}{" "}
                        #{log.target_id}
                      </td>
                    </tr>
                  ))}
                  {(!recentActivity || recentActivity.length === 0) && (
                    <tr className="border-t border-border/60">
                      <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                        {!isAdmin
                          ? "Your activity history is kept in the audit log, which the OSCA administrator can review."
                          : recentActivity === null
                            ? "Loading recent activity..."
                            : "No recent activity."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
