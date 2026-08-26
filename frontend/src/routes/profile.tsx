import { createFileRoute } from "@tanstack/react-router";
import { Camera, Eye, EyeOff, KeyRound, LogOut, Save, UserCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { API_URL, apiFetch, clearToken, getStoredUser, logout, setStoredUser, type ApiUser } from "@/lib/api";
import oscaAdminImage from "@/images/osca_admin.jpg";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "My Profile — Bulan SeniorCare" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const [user, setUser] = useState<ApiUser | null>(getStoredUser());
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [contact, setContact] = useState(user?.contact_number ?? "");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    apiFetch<ApiUser>("/user").then((freshUser) => {
      setUser(freshUser);
      setName(freshUser.name);
      setEmail(freshUser.email);
      setContact(freshUser.contact_number ?? "");
      setStoredUser(freshUser);
    }).catch((error: Error) => {
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

  const photoUrl = photoPreview ?? (user?.profile_photo_path
    ? `${API_URL.replace(/\/api$/, "")}/storage/${user.profile_photo_path}`
    : (user?.role?.toLowerCase() === "admin" || user?.roles?.some((role) => role.name.toLowerCase() === "admin"))
      ? oscaAdminImage
      : null);
  const initials = (name || "User").split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const form = new FormData();
      form.append("name", name);
      form.append("email", email);
      form.append("contact_number", contact);
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
        body: JSON.stringify({ current_password: currentPassword, password, password_confirmation: passwordConfirmation }),
      });
      setCurrentPassword("");
      setPassword("");
      setPasswordConfirmation("");
      toast.success("Password changed successfully.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not change password.");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    await logout().catch(() => undefined);
    clearToken();
    window.location.href = "/login";
  }

  return (
    <AppShell title="My Profile" subtitle="Manage your account details and security" breadcrumb={["Dashboard", "My Profile"]}>
      <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <section className="surface-card p-7">
          <div className="flex flex-col items-center text-center">
            <div className="relative grid h-28 w-28 overflow-hidden place-items-center rounded-full bg-navy text-2xl font-bold text-primary-foreground ring-4 ring-gold/50">
              {photoUrl ? <img src={photoUrl} alt="Profile" className="h-full w-full object-cover" onError={(event) => { if (user?.role?.toLowerCase() === "admin" || user?.roles?.some((role) => role.name.toLowerCase() === "admin")) event.currentTarget.src = oscaAdminImage; }} /> : initials}
              <label htmlFor="profile-photo" className="absolute right-1 bottom-1 grid h-9 w-9 cursor-pointer place-items-center rounded-full bg-gold text-gold-foreground shadow-lg" title="Change profile picture"><Camera className="h-4 w-4" /></label>
            </div>
            <input id="profile-photo" type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => setPhoto(event.target.files?.[0] ?? null)} />
            <h2 className="mt-5 text-xl font-bold">{user?.name ?? "Your profile"}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{user?.email}</p>
            <span className="mt-4 rounded-full bg-secondary px-4 py-1.5 text-xs font-bold uppercase">{user?.role ?? "user"}</span>
          </div>
          <button onClick={signOut} className="mt-8 flex w-full items-center justify-center gap-2 rounded-full bg-destructive/10 py-3 text-sm font-bold text-destructive"><LogOut className="h-4 w-4" /> Log out</button>
        </section>

        <div className="space-y-6">
          <form onSubmit={saveProfile} className="surface-card p-7">
            <div className="flex items-center gap-3"><UserCircle className="h-5 w-5 text-gold-foreground" /><h2 className="text-lg font-bold">Personal information</h2></div>
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <label className="text-sm font-semibold">Full name<input value={name} onChange={(event) => setName(event.target.value)} className="mt-2 h-12 w-full rounded-xl bg-secondary px-4 outline-none focus:ring-2 focus:ring-ring/30" required /></label>
              <label className="text-sm font-semibold">Email address<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 h-12 w-full rounded-xl bg-secondary px-4 outline-none focus:ring-2 focus:ring-ring/30" required /></label>
              <label className="text-sm font-semibold sm:col-span-2">Contact number<input value={contact} onChange={(event) => setContact(event.target.value)} placeholder="0917-123-4567" className="mt-2 h-12 w-full rounded-xl bg-secondary px-4 outline-none focus:ring-2 focus:ring-ring/30" /></label>
            </div>
            {photo && <p className="mt-4 text-xs text-muted-foreground">Preview updated. Click Save profile to upload {photo.name}.</p>}
            <button type="submit" disabled={busy} className="bg-navy mt-6 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-primary-foreground disabled:opacity-50"><Save className="h-4 w-4" /> {busy ? "Saving..." : "Save profile"}</button>
          </form>

          <form onSubmit={savePassword} className="surface-card p-7">
            <div className="flex items-center gap-3"><KeyRound className="h-5 w-5 text-gold-foreground" /><h2 className="text-lg font-bold">Change password</h2></div>
            <div className="mt-6 flex items-center justify-end">
              <button type="button" onClick={() => setShowPasswords((visible) => !visible)} className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground">
                {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {showPasswords ? "Hide passwords" : "Show passwords"}
              </button>
            </div>
            <div className="mt-3 grid gap-5 sm:grid-cols-3">
              <label className="text-sm font-semibold">Current password<input type={showPasswords ? "text" : "password"} value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className="mt-2 h-12 w-full rounded-xl bg-secondary px-4 outline-none focus:ring-2 focus:ring-ring/30" required /></label>
              <label className="text-sm font-semibold">New password<input type={showPasswords ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} className="mt-2 h-12 w-full rounded-xl bg-secondary px-4 outline-none focus:ring-2 focus:ring-ring/30" required /></label>
              <label className="text-sm font-semibold">Confirm password<input type={showPasswords ? "text" : "password"} value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} minLength={8} className="mt-2 h-12 w-full rounded-xl bg-secondary px-4 outline-none focus:ring-2 focus:ring-ring/30" required /></label>
            </div>
            <button type="submit" disabled={busy} className="bg-navy mt-6 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-primary-foreground disabled:opacity-50"><KeyRound className="h-4 w-4" /> {busy ? "Updating..." : "Update password"}</button>
          </form>

        </div>
      </div>
    </AppShell>
  );
}
