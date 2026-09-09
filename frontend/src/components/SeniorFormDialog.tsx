import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { API_URL } from "@/lib/api";
import { BARANGAYS, type Senior } from "@/lib/osca-data";
import type { SeniorDraft } from "@/lib/use-seniors";

const BENEFITS = [
  "Social Pension",
  "Octogenarian Grant",
  "Nonagenarian Grant",
  "Centenarian Award",
];

const EMPTY: SeniorDraft = {
  name: "",
  birthdate: "",
  firstName: "",
  middleName: "",
  lastName: "",
  age: 0,
  barangay: BARANGAYS[0]!,
  address: "",
  contact: "",
  benefit: "Social Pension",
  status: "Pending",
};

function benefitForAge(age: number) {
  if (age >= 100) return "Centenarian Award";
  if (age >= 90) return "Nonagenarian Grant";
  if (age >= 80) return "Octogenarian Grant";
  return "Social Pension";
}

function ageFromBirthdate(birthdate: string) {
  const date = new Date(`${birthdate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return 0;
  const today = new Date();
  let age = today.getFullYear() - date.getFullYear();
  if (today.getMonth() < date.getMonth() || (today.getMonth() === date.getMonth() && today.getDate() < date.getDate())) age -= 1;
  return age;
}

export function SeniorFormDialog({
  open,
  onOpenChange,
  senior,
  isLeader,
  leaderBarangay,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  senior?: Senior | null;
  isLeader?: boolean;
  leaderBarangay?: string;
  onSubmit: (draft: SeniorDraft) => void;
}) {
  const [draft, setDraft] = useState<SeniorDraft>(EMPTY);
  const [validId, setValidId] = useState<File | null>(null);
  const [birthCertificate, setBirthCertificate] = useState<File | null>(null);
  const [validIdPreview, setValidIdPreview] = useState<string | null>(null);
  const [birthCertificatePreview, setBirthCertificatePreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setValidId(null);
    setBirthCertificate(null);
    setProfilePhoto(null);
    setDraft(
      senior
        ? {
            name: senior.name,
            birthdate: senior.birthdate ?? "",
            firstName: senior.name.split(" ")[0] ?? "",
            middleName: senior.name.split(" ").slice(1, -1).join(" "),
            lastName: senior.name.split(" ").at(-1) ?? "",
            age: senior.birthdate ? ageFromBirthdate(senior.birthdate) : 0,
            barangay: senior.barangay,
            address: senior.address,
            contact: senior.contact,
            benefit: senior.benefit,
            status: senior.status,
          }
          : leaderBarangay
            ? { ...EMPTY, barangay: leaderBarangay }
            : EMPTY,
    );
        }, [open, senior, leaderBarangay]);

  useEffect(() => {
    if (!validId) {
      setValidIdPreview(null);
      return;
    }
    const preview = validId.type.startsWith("image/") ? URL.createObjectURL(validId) : null;
    setValidIdPreview(preview);
    return () => { if (preview) URL.revokeObjectURL(preview); };
  }, [validId]);

  useEffect(() => {
    if (!birthCertificate) {
      setBirthCertificatePreview(null);
      return;
    }
    const preview = birthCertificate.type.startsWith("image/") ? URL.createObjectURL(birthCertificate) : null;
    setBirthCertificatePreview(preview);
    return () => { if (preview) URL.revokeObjectURL(preview); };
  }, [birthCertificate]);
  
  const set = <K extends keyof SeniorDraft>(key: K, value: SeniorDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  function submit() {
    if (!draft.firstName?.trim()) return setError("First name is required.");
    if (!draft.lastName?.trim()) return setError("Last name is required.");
    if (!draft.birthdate) return setError("Birthday is required.");
    const age = ageFromBirthdate(draft.birthdate);
    if (age < 60 || age > 130)
      return setError("Age must be 60 or older to qualify for OSCA benefits.");
    if (!draft.contact.trim()) return setError("Contact number is required.");
    if (!senior && !validId) return setError("A valid ID is required.");
    if (!senior && !birthCertificate) return setError("A birth certificate is required.");
    onSubmit({
      ...draft,
      age,
      benefit: benefitForAge(age),
      name: [draft.firstName, draft.middleName, draft.lastName].filter(Boolean).join(" ").trim(),
      firstName: draft.firstName.trim(),
      middleName: draft.middleName?.trim() ?? "",
      lastName: draft.lastName.trim(),
      contact: draft.contact.trim(),
      validId,
      birthCertificate,
      profilePhoto,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">
            {senior ? "Edit senior record" : "Register senior"}
          </DialogTitle>
          <DialogDescription>
            {senior
              ? `Update the OSCA profile for ${senior.name}.`
              : "Add a new senior citizen to the Bulan OSCA registry."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="senior-first-name">First name</Label>
            <Input
              id="senior-first-name"
              value={draft.firstName ?? ""}
              onChange={(e) => set("firstName", e.target.value)}
              placeholder="Maria"
              className="mt-1.5"
            />
          </div>

          <div>
            <Label htmlFor="senior-middle-name">Middle name</Label>
            <Input
              id="senior-middle-name"
              value={draft.middleName ?? ""}
              onChange={(e) => set("middleName", e.target.value)}
              placeholder="Luz"
              className="mt-1.5"
            />
          </div>

          <div className="sm:col-span-2">
            <Label htmlFor="senior-last-name">Last name</Label>
            <Input
              id="senior-last-name"
              value={draft.lastName ?? ""}
              onChange={(e) => set("lastName", e.target.value)}
              placeholder="Santos"
              className="mt-1.5"
            />
          </div>

          <div>
            <Label htmlFor="senior-age">Age</Label>
            <Input
              id="senior-age"
              type="number"
              value={draft.birthdate ? draft.age : ""}
              placeholder="Calculated automatically"
              readOnly
              aria-readonly="true"
              tabIndex={-1}
              className="mt-1.5"
            />
          </div>

          <div>
            <Label htmlFor="senior-birthdate">Birthday</Label>
            <Input
              id="senior-birthdate"
              type="date"
              value={draft.birthdate ?? ""}
              onChange={(e) => {
                const birthdate = e.target.value;
                const age = ageFromBirthdate(birthdate);
                setDraft((d) => ({ ...d, birthdate, age, benefit: benefitForAge(age) }));
              }}
              className="mt-1.5"
            />
          </div>

          <div>
            <Label htmlFor="senior-contact">Contact number</Label>
            <Input
              id="senior-contact"
              value={draft.contact}
              onChange={(e) => set("contact", e.target.value)}
              placeholder="0917-123-4567"
              className="mt-1.5"
            />
          </div>

          <div>
            <Label>Barangay</Label>
            <Select
              value={draft.barangay}
              onValueChange={(v) => set("barangay", v)}
              disabled={!!leaderBarangay}
            >
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BARANGAYS.map((barangay) => (
                  <SelectItem
                    key={barangay}
                    value={barangay}
                  >
                    {barangay}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Benefit</Label>
            <Select value={draft.benefit} onValueChange={(v) => set("benefit", v)}>
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BENEFITS.map((b) => (
                  <SelectItem key={b} value={b}>
                    {b}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {senior && !isLeader && (
            <div className="sm:col-span-2">
              <Label>Eligibility status</Label>
              <Select
                value={draft.status}
                onValueChange={(v) => set("status", v as Senior["status"])}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <p className="sm:col-span-2 text-lg font-bold">Supporting Documents</p>

          <div>
            <Label htmlFor="senior-profile-photo">Profile Picture</Label>
            <Input
              id="senior-profile-photo"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="user"
              onChange={(event) => setProfilePhoto(event.target.files?.[0] ?? null)}
              className="mt-1.5 cursor-pointer"
            />
          </div>

          <div>
            <Label htmlFor="senior-valid-id">Valid ID{!senior && " *"}</Label>
            <Input
              id="senior-valid-id"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              capture="environment"
              required={!senior}
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                setValidId(file);
              }}
              className="mt-1.5 cursor-pointer"
            />
            {(validIdPreview || senior?.validIdPath) && (
              <a href={validIdPreview ?? `${API_URL.replace(/\/api$/, "")}/storage/${senior?.validIdPath}`} target="_blank" rel="noreferrer" className="mt-2 block w-fit">
                {validIdPreview ? <img src={validIdPreview} alt="Valid ID preview" className="h-24 w-24 rounded-xl border border-border object-cover" /> : <span className="text-xs text-muted-foreground">Current Valid ID</span>}
              </a>
            )}
          </div>
          <div>
            <Label htmlFor="senior-birth-certificate">Birth certificate{!senior && " *"}</Label>
            <Input
              id="senior-birth-certificate"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              capture="environment"
              required={!senior}
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                setBirthCertificate(file);
              }}
              className="mt-1.5 cursor-pointer"
            />
            <p className="mt-1 text-xs text-muted-foreground">PDF, JPG, or PNG up to 5 MB each.</p>
            {(birthCertificatePreview || senior?.birthCertificatePath) && (
              <a href={birthCertificatePreview ?? `${API_URL.replace(/\/api$/, "")}/storage/${senior?.birthCertificatePath}`} target="_blank" rel="noreferrer" className="mt-2 block w-fit">
                {birthCertificatePreview ? <img src={birthCertificatePreview} alt="Birth Certificate preview" className="h-24 w-24 rounded-xl border border-border object-cover" /> : <span className="text-xs text-muted-foreground">Current Birth Certificate</span>}
              </a>
            )}
          </div>

        </div>

        {error && <p className="text-sm font-medium text-destructive">{error}</p>}

        <DialogFooter>
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-full bg-secondary px-6 py-3 text-sm font-semibold"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            className="bg-navy rounded-full px-6 py-3 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-card)]"
          >
            {senior ? "Save changes" : "Register senior"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
