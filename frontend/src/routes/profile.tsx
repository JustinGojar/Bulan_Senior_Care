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
  getStoredUser,
  logout,
  setStoredUser,
  type ApiUser,
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
        <section className="surface-card flex min-h-[640px] flex-col overflow-hidden p-0">
          <div
            className="relative h-[226px] rounded-t-[28px]"
            style={{
              backgroundImage: `linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.08)), url(${coverPhoto})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.22),_transparent_55%)]" />
            <div className="absolute inset-x-0 bottom-0 flex justify-center translate-y-1/2">
              <div className="relative grid h-[128px] w-[128px] place-items-center overflow-hidden rounded-full bg-white text-[2.1rem] font-black text-primary-foreground">
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
                  className="absolute right-1 bottom-1 z-10 grid h-8 w-8 cursor-pointer place-items-center rounded-full bg-[#0d253f] text-white shadow-lg ring-2 ring-white"
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
              <h2 className="text-[2.1rem] font-black tracking-[-0.03em] text-foreground">
                {user?.name ?? "Your profile"}
              </h2>
              <p className="mt-1 text-[0.95rem] text-muted-foreground">{user?.email}</p>
              <span className="mt-4 inline-flex rounded-full bg-[#dfeaf6] px-[1rem] py-[0.45rem] text-[0.7rem] font-bold uppercase tracking-[0.02em] text-[#123a68]">
                {roleLabel}
              </span>
            </div>

            <form onSubmit={saveProfile} className="mt-8 space-y-4">
              <div className="flex items-center gap-3">
                <UserCircle className="h-5 w-5 text-[#1b3b60]" />
                <h2 className="text-[1.05rem] font-bold">Edit Profile</h2>
              </div>
              <label className="block text-sm font-semibold text-foreground">
                Full name
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="mt-2 h-11 w-full rounded-xl border border-border bg-[#f3f7fb] px-4 text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                  required
                />
              </label>
              <label className="block text-sm font-semibold text-foreground">
                Email address
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="mt-2 h-11 w-full rounded-xl border border-border bg-[#f3f7fb] px-4 text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                  required
                />
              </label>
              <label className="block text-sm font-semibold text-foreground">
                Contact number
                <input
                  value={contact}
                  onChange={(event) => setContact(event.target.value)}
                  placeholder="0917-123-4567"
                  className="mt-2 h-11 w-full rounded-xl border border-border bg-[#f3f7fb] px-4 text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                />
              </label>
              <label className="block text-sm font-semibold text-foreground">
                Address
                <input
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                  placeholder="Enter your address"
                  className="mt-2 h-11 w-full rounded-xl border border-border bg-[#f3f7fb] px-4 text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                />
              </label>
              <label className="block text-sm font-semibold text-foreground">
                Role / Position
                <input
                  value={roleLabel}
                  readOnly
                  className="mt-2 h-11 w-full cursor-not-allowed rounded-xl border border-border bg-[#f3f7fb] px-4 text-muted-foreground outline-none"
                />
              </label>
              {photo && (
                <p className="text-xs text-muted-foreground">
                  Preview updated. Click Save profile to upload {photo.name}.
                </p>
              )}
              <button
                type="submit"
                disabled={busy}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0d253f] px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:opacity-95 disabled:opacity-50"
              >
                <Save className="h-4 w-4" /> {busy ? "Saving..." : "Save profile"}
              </button>
            </form>
            <button
              onClick={signOut}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-[#f5a1a1] bg-[#fff5f5] py-3 text-[0.97rem] font-bold text-[#e65050] transition hover:bg-[#fde9e9]"
            >
              <LogOut className="h-4 w-4" /> Log out
            </button>
          </div>
        </section>

        <div className="space-y-6">
          <section className="surface-card p-5 sm:p-7">
            <div className="mb-3 flex items-center gap-3 text-foreground">
              <div className="grid h-9 w-9 place-items-center rounded-full bg-[#dfeaf6] text-[#1b3b60]">
                <BarChart3 className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-[1.05rem] font-bold">System Overview</h2>
                <p className="text-sm text-muted-foreground">
                  Quick access to your most used features
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
              {[
                {
                  label: "Senior Record",
                  to: "/seniors",
                  icon: Users,
                  color: "bg-[#eaf1ff] text-[#3b82f6]",
                },
                {
                  label: "Benefit Tracking",
                  to: "/benefits",
                  icon: HandCoins,
                  color: "bg-[#eafaf2] text-[#22c55e]",
                },
                {
                  label: "Analytics",
                  to: "/analytics",
                  icon: BarChart3,
                  color: "bg-[#f2ebff] text-[#8b5cf6]",
                },
                {
                  label: "Reports",
                  to: "/reports",
                  icon: FileText,
                  color: "bg-[#fff4dc] text-[#f59e0b]",
                },
              ].map(({ label, to, icon: Icon, color }) => (
                <Link
                  key={label}
                  to={to}
                  aria-label={`Go to ${label}`}
                  className="flex min-h-[84px] flex-col items-center justify-center rounded-[14px] border border-border bg-white p-2 text-center shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  <div className={`mb-2 grid h-9 w-9 place-items-center rounded-xl ${color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <p className="text-[0.72rem] font-semibold leading-tight text-foreground">
                    {label}
                  </p>
                </Link>
              ))}
            </div>
          </section>

          <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
            <button
              type="button"
              onClick={() => setPasswordDialogOpen(true)}
              className="surface-card flex w-full items-center justify-between gap-4 p-5 sm:p-7 text-left transition hover:border-[#173A52]/30 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <span className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-[#1b3b60]" />
                <span>
                  <span className="block text-[1.05rem] font-bold">Change Password</span>
                  <span className="mt-1 block text-sm text-muted-foreground">
                    Keep your account secure
                  </span>
                </span>
              </span>
              <KeyRound className="h-5 w-5 shrink-0 text-[#1b3b60]" />
            </button>
            <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-xl">
              <DialogHeader>
                <DialogTitle>Change Password</DialogTitle>
                <DialogDescription>
                  Enter your current password and choose a new password of at least 8 characters.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={savePassword} className="space-y-4">
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowPasswords((visible) => !visible)}
                    className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground"
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
                    className="mt-2 h-11 w-full rounded-xl border border-border bg-[#f3f7fb] px-4 text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
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
                    className="mt-2 h-11 w-full rounded-xl border border-border bg-[#f3f7fb] px-4 text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
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
                    className="mt-2 h-11 w-full rounded-xl border border-border bg-[#f3f7fb] px-4 text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                    required
                  />
                </label>
                <button
                  type="submit"
                  disabled={busy}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0d253f] px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:opacity-95 disabled:opacity-50"
                >
                  <KeyRound className="h-4 w-4" /> {busy ? "Updating..." : "Update password"}
                </button>
              </form>
            </DialogContent>
          </Dialog>

          <section className="surface-card overflow-hidden p-5 sm:p-7">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-full bg-[#eafaf2] text-[#19a75e]">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-[1.05rem] font-bold">Recent Activity</h2>
                  <p className="text-sm text-muted-foreground">Your latest actions in the system</p>
                </div>
              </div>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-2 text-sm font-semibold text-foreground transition hover:bg-accent"
              >
                View all <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6 overflow-hidden rounded-xl border border-border">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-[#f3f7fb] text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Date &amp; Time</th>
                    <th className="px-4 py-3 font-semibold">Action</th>
                    <th className="px-4 py-3 font-semibold">Details</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-border bg-background">
                    <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                      No recent activity.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
