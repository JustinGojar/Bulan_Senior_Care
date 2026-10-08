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
import { clearFieldById, flagFieldById, flagFieldsById } from "@/lib/form-validation";
import { primaryButtonClass, secondaryButtonClass } from "@/components/design-kit";
import { PrivacyConsentDialog } from "@/components/PrivacyConsentDialog";
import { SearchableSelect } from "@/components/SearchableSelect";
import { PrivateFileLink } from "@/components/PrivateFile";
import { seniorFileUrl } from "@/lib/api";
import { BARANGAYS, benefitForAge, type Senior } from "@/lib/osca-data";
import type { SeniorDraft } from "@/lib/use-seniors";

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
  placeOfBirth: "",
  civilStatus: "",
  educationalAttainment: "",
  otherSkills: "",
  familyComposition: "",
  associationName: "",
  associationAddress: "",
  associationMembershipDate: "",
  associationPosition: "",
  benefit: "Social Pension",
  status: "Pending",
};

const CIVIL_STATUSES = ["Single", "Married", "Widowed", "Separated", "Annulled"];

const RELATIONSHIPS = [
  "Spouse",
  "Son",
  "Daughter",
  "Grandson",
  "Granddaughter",
  "Son-in-law",
  "Daughter-in-law",
  "Brother",
  "Sister",
  "Nephew",
  "Niece",
  "Guardian",
  "Other relative",
];

// Matches the four family rows printed on the registration form PDF.
const FAMILY_ROWS = 4;
type FamilyRow = [string, string, string, string, string];

// Stored as one "Name | Relationship | Age | Status | Occupation" line per member.
function parseFamilyRows(value: string): FamilyRow[] {
  const rows = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, FAMILY_ROWS)
    .map((line) => {
      const cells = line.split("|").map((cell) => cell.trim());
      return Array.from({ length: 5 }, (_, i) => cells[i] ?? "") as FamilyRow;
    });
  while (rows.length < FAMILY_ROWS) rows.push(["", "", "", "", ""]);
  return rows;
}

function serializeFamilyRows(rows: FamilyRow[]) {
  return rows
    .filter((row) => row.some((cell) => cell.trim()))
    .map((row) => row.map((cell) => cell.trim()).join(" | "))
    .join("\n");
}

function FamilySelect({
  id,
  label,
  options,
  value,
  onChange,
}: {
  id: string;
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  // Keep older free-text values selectable so editing doesn't blank them.
  const all = value && !options.includes(value) ? [...options, value] : options;
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id={id} aria-label={label} className="h-9 w-full px-3">
        <SelectValue placeholder="Select" />
      </SelectTrigger>
      <SelectContent>
        {all.map((option) => (
          <SelectItem key={option} value={option}>
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

const familyCellId = (row: number, cell: number) => `senior-family-${row}-${cell}`;

// Every field except middle name must be filled before the form can be submitted.
// Listed in form order so the first missing field gets focus.
const REQUIRED_FIELDS: Array<{ key: string; id: string; message: string }> = [
  { key: "lastName", id: "senior-last-name", message: "Surname is required." },
  { key: "firstName", id: "senior-first-name", message: "First name is required." },
  { key: "placeOfBirth", id: "senior-place-of-birth", message: "Place of birth is required." },
  { key: "birthdate", id: "senior-birthdate", message: "Date of birth is required." },
  { key: "sex", id: "senior-sex", message: "Choose sex." },
  { key: "civilStatus", id: "senior-civil-status", message: "Choose civil status." },
  { key: "contact", id: "senior-contact", message: "Contact number is required." },
  { key: "address", id: "senior-address", message: "House number and street are required." },
  { key: "barangay", id: "senior-barangay", message: "Choose a barangay." },
  {
    key: "educationalAttainment",
    id: "senior-educational-attainment",
    message: "Educational attainment is required.",
  },
  { key: "otherSkills", id: "senior-other-skills", message: "Other skills are required." },
  {
    key: "familyComposition",
    id: familyCellId(0, 0),
    message: "Add at least one family member.",
  },
  {
    key: "associationName",
    id: "senior-association-name",
    message: "Name of association is required.",
  },
  {
    key: "associationAddress",
    id: "senior-association-address",
    message: "Choose the address of association.",
  },
  {
    key: "associationMembershipDate",
    id: "senior-membership-date",
    message: "Date of membership is required.",
  },
  {
    key: "associationPosition",
    id: "senior-association-position",
    message: "Position is required.",
  },
  { key: "profilePhoto", id: "senior-profile-photo", message: "Attach a profile picture." },
  { key: "validId", id: "senior-valid-id", message: "Attach a valid ID." },
  {
    key: "birthCertificate",
    id: "senior-birth-certificate",
    message: "Attach a birth certificate.",
  },
];
const FIELD_IDS: Record<string, string> = Object.fromEntries(
  REQUIRED_FIELDS.map(({ key, id }) => [key, id]),
);

// The input holds only the 10 digits after the fixed +63 prefix.
const PH_MOBILE = /^9\d{9}$/;

// Records may be stored as "0917-123-4567" or "+639171234567"; keep the digits after +63 / 0.
function toPhMobile(contact: string) {
  const digits = contact.replace(/\D/g, "");
  if (digits.startsWith("63")) return digits.slice(2, 12);
  if (digits.startsWith("0")) return digits.slice(1, 11);
  return digits.slice(0, 10);
}

// The barangay part of an address. Also the association address fallback when the
// registering account has no address on file.
function associationAddressFor(barangay: string) {
  return `Brgy. ${barangay}, Bulan, Sorsogon`;
}

// The form only edits the house number and street; the barangay suffix is added on save.
function streetFromAddress(address: string, barangay: string) {
  const suffix = `, ${associationAddressFor(barangay)}`;
  return address.endsWith(suffix) ? address.slice(0, -suffix.length) : address;
}

function ageFromBirthdate(birthdate: string) {
  const date = new Date(`${birthdate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return 0;
  const today = new Date();
  let age = today.getFullYear() - date.getFullYear();
  if (
    today.getMonth() < date.getMonth() ||
    (today.getMonth() === date.getMonth() && today.getDate() < date.getDate())
  )
    age -= 1;
  return age;
}

export function SeniorFormDialog({
  open,
  onOpenChange,
  senior,
  isLeader,
  leaderBarangay,
  registrarAddress,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  senior?: Senior | null;
  isLeader?: boolean;
  leaderBarangay?: string | undefined;
  /** Address on the registering leader/BSCA account; becomes the association address. */
  registrarAddress?: string | undefined;
  onSubmit: (draft: SeniorDraft) => void;
}) {
  const [draft, setDraft] = useState<SeniorDraft>(EMPTY);
  const [validId, setValidId] = useState<File | null>(null);
  const [birthCertificate, setBirthCertificate] = useState<File | null>(null);
  const [validIdPreview, setValidIdPreview] = useState<string | null>(null);
  const [birthCertificatePreview, setBirthCertificatePreview] = useState<string | null>(null);
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [familyRows, setFamilyRows] = useState<FamilyRow[]>(() => parseFamilyRows(""));
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [consentOpen, setConsentOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFamilyRows(parseFamilyRows(senior?.familyComposition ?? ""));
    setValidId(null);
    setBirthCertificate(null);
    setProfilePhoto(null);
    setPrivacyConsent(false);
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
            address: streetFromAddress(senior.address, senior.barangay),
            contact: toPhMobile(senior.contact),
            placeOfBirth: senior.placeOfBirth ?? "",
            ...(senior.sex ? { sex: senior.sex } : {}),
            civilStatus: senior.civilStatus ?? "",
            educationalAttainment: senior.educationalAttainment ?? "",
            otherSkills: senior.otherSkills ?? "",
            familyComposition: senior.familyComposition ?? "",
            associationName: senior.associationName ?? "",
            associationAddress: senior.associationAddress ?? "",
            associationMembershipDate: senior.associationMembershipDate ?? "",
            associationPosition: senior.associationPosition ?? "",
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
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [validId]);

  useEffect(() => {
    if (!birthCertificate) {
      setBirthCertificatePreview(null);
      return;
    }
    const preview = birthCertificate.type.startsWith("image/")
      ? URL.createObjectURL(birthCertificate)
      : null;
    setBirthCertificatePreview(preview);
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [birthCertificate]);

  const set = <K extends keyof SeniorDraft>(key: K, value: SeniorDraft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    // Dropdowns fire no input event, so clear their inline error here.
    const id = FIELD_IDS[key];
    if (id) clearFieldById(id);
  };

  function setFamilyCell(rowIndex: number, cellIndex: number, value: string) {
    const rows = familyRows.map((row, i) =>
      i === rowIndex ? (row.map((cell, j) => (j === cellIndex ? value : cell)) as FamilyRow) : row,
    );
    setFamilyRows(rows);
    set("familyComposition", serializeFamilyRows(rows));
    clearFieldById(familyCellId(rowIndex, cellIndex));
  }

  // Existing records keep the address set when they were registered; new ones use the
  // registering account's address.
  // Leaders get a locked address; Admin and Head pick one from the barangay list.
  const associationAddress = isLeader
    ? senior?.associationAddress?.trim() ||
      registrarAddress?.trim() ||
      associationAddressFor(draft.barangay)
    : (draft.associationAddress ?? "");
  const associationAddressOptions = BARANGAYS.map(associationAddressFor);
  if (associationAddress && !associationAddressOptions.includes(associationAddress))
    associationAddressOptions.push(associationAddress);

  function submit() {
    const values: Record<string, unknown> = {
      ...draft,
      associationAddress,
      profilePhoto: senior ? true : profilePhoto,
      validId: senior ? true : validId,
      birthCertificate: senior ? true : birthCertificate,
    };
    const errors: Array<[string, string]> = REQUIRED_FIELDS.filter(({ key }) => {
      const value = values[key];
      return value instanceof File ? false : !String(value ?? "").trim();
    }).map(({ id, message }) => [id, message]);
    // A started family row must have every column filled.
    familyRows.forEach((row, rowIndex) => {
      if (!row.some((cell) => cell.trim())) return;
      const emptyCell = row.findIndex((cell) => !cell.trim());
      if (emptyCell !== -1)
        errors.push([
          familyCellId(rowIndex, emptyCell),
          `Complete all columns for family member ${rowIndex + 1}.`,
        ]);
    });
    if (!senior && !privacyConsent)
      errors.push([
        "senior-privacy-consent",
        "The senior must agree to the Data Privacy Consent before registering.",
      ]);
    if (errors.length > 0) return flagFieldsById(errors);
    const age = ageFromBirthdate(draft.birthdate ?? "");
    if (age < 60 || age > 130)
      return flagFieldById(
        "senior-birthdate",
        "Age must be 60 or older to qualify for OSCA benefits.",
      );
    if (!PH_MOBILE.test(draft.contact))
      return flagFieldById("senior-contact", "Enter 10 digits after +63, starting with 9.");
    onSubmit({
      ...draft,
      age,
      benefit: benefitForAge(age),
      name: [draft.firstName, draft.middleName, draft.lastName].filter(Boolean).join(" ").trim(),
      firstName: (draft.firstName ?? "").trim(),
      middleName: draft.middleName?.trim() ?? "",
      lastName: (draft.lastName ?? "").trim(),
      contact: `+63${draft.contact}`,
      address: `${draft.address.trim()}, ${associationAddressFor(draft.barangay)}`,
      associationAddress,
      validId,
      birthCertificate,
      profilePhoto,
      privacyConsent: !senior && privacyConsent,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-2xl">
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

        <div className="space-y-6">
          <section className="rounded-lg border border-border/60 bg-background/40 p-4 sm:p-5">
            <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Personal information
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div>
                <Label htmlFor="senior-last-name">Surname *</Label>
                <Input
                  id="senior-last-name"
                  value={draft.lastName ?? ""}
                  onChange={(e) => set("lastName", e.target.value)}
                  placeholder="Santos"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="senior-first-name">First name *</Label>
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
              <div>
                <Label htmlFor="senior-place-of-birth">Place of birth *</Label>
                <Input
                  id="senior-place-of-birth"
                  value={draft.placeOfBirth ?? ""}
                  onChange={(e) => set("placeOfBirth", e.target.value)}
                  placeholder="Municipality, province"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="senior-birthdate">Date of birth *</Label>
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
                <Label>Age</Label>
                <p
                  aria-live="polite"
                  className="mt-1.5 flex h-9 cursor-not-allowed items-center rounded-lg border border-input bg-muted px-3 text-sm font-medium text-foreground select-none"
                >
                  {draft.birthdate ? (
                    `${draft.age} years old`
                  ) : (
                    <span className="font-normal text-muted-foreground">
                      Based on date of birth
                    </span>
                  )}
                </p>
              </div>
              <div>
                <Label htmlFor="senior-sex">Sex *</Label>
                <Select
                  value={draft.sex ?? ""}
                  onValueChange={(value) => set("sex", value as "male" | "female")}
                >
                  <SelectTrigger id="senior-sex" className="mt-1.5 h-9 px-3">
                    <SelectValue placeholder="Select sex" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="male">Male</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="senior-civil-status">Civil status *</Label>
                <Select
                  value={draft.civilStatus ?? ""}
                  onValueChange={(value) => set("civilStatus", value)}
                >
                  <SelectTrigger id="senior-civil-status" className="mt-1.5 h-9 px-3">
                    <SelectValue placeholder="Select civil status" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Keep older free-text values selectable so editing doesn't blank them. */}
                    {[
                      ...CIVIL_STATUSES,
                      ...(draft.civilStatus && !CIVIL_STATUSES.includes(draft.civilStatus)
                        ? [draft.civilStatus]
                        : []),
                    ].map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="senior-contact">Contact number *</Label>
                <div className="relative mt-1.5">
                  <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground">
                    +63
                  </span>
                  <Input
                    id="senior-contact"
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    value={draft.contact}
                    onChange={(e) => set("contact", e.target.value.replace(/\D/g, "").slice(0, 10))}
                    className="pl-11"
                  />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  10 digits after +63, starting with 9.
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-border/60 bg-background/40 p-4 sm:p-5">
            <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Residence and eligibility
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="senior-address">Complete address *</Label>
                <div className="relative mt-1.5 flex flex-col gap-2 sm:flex-row">
                  <Input
                    id="senior-address"
                    value={draft.address}
                    onChange={(e) => set("address", e.target.value)}
                    placeholder="House number and street"
                    className="sm:flex-1"
                  />
                  <p className="flex min-h-9 cursor-not-allowed items-center rounded-lg border border-input bg-muted px-3 py-1.5 text-sm font-medium text-foreground select-none sm:whitespace-nowrap">
                    {associationAddressFor(draft.barangay)}
                  </p>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Type the house number and street only. The barangay follows the selected barangay.
                </p>
              </div>
              <div>
                <Label htmlFor="senior-barangay">Barangay *</Label>
                <SearchableSelect
                  id="senior-barangay"
                  label="Barangay"
                  value={draft.barangay}
                  onChange={(v) => set("barangay", v)}
                  disabled={!!leaderBarangay}
                  placeholder="Select a barangay"
                  className="mt-1.5 h-9 px-3"
                  options={BARANGAYS.map((barangay) => ({ value: barangay, label: barangay }))}
                />
              </div>

              <div>
                <Label>Benefit</Label>
                <p
                  aria-live="polite"
                  className="mt-1.5 flex h-9 cursor-not-allowed items-center rounded-lg border border-input bg-muted px-3 text-sm font-medium text-foreground select-none"
                >
                  {draft.birthdate ? (
                    benefitForAge(draft.age)
                  ) : (
                    <span className="font-normal text-muted-foreground">
                      Based on date of birth
                    </span>
                  )}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  80–85 Octogenarian · 90–95 Nonagenarian · 100 Centenarian · other ages Social
                  Pension
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-border/60 bg-background/40 p-4 sm:p-5">
            <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Education, skills, and family
            </p>
            <div className="mt-4 space-y-4">
              <div>
                <Label htmlFor="senior-educational-attainment">Educational attainment *</Label>
                <Input
                  id="senior-educational-attainment"
                  value={draft.educationalAttainment ?? ""}
                  onChange={(event) => set("educationalAttainment", event.target.value)}
                  placeholder="Highest educational attainment"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="senior-other-skills">Other skills *</Label>
                <Input
                  id="senior-other-skills"
                  value={draft.otherSkills ?? ""}
                  onChange={(event) => set("otherSkills", event.target.value)}
                  placeholder="Livelihood, trade, or other skills"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Family composition *</Label>
                <div className="mt-1.5 overflow-x-auto rounded-lg border border-input">
                  <table className="w-full min-w-160 text-sm">
                    <thead className="bg-muted/50 text-xs font-semibold text-muted-foreground uppercase">
                      <tr>
                        <th className="px-2 py-2 text-left">Name</th>
                        <th className="px-2 py-2 text-left">Relationship</th>
                        <th className="w-20 px-2 py-2 text-left">Age</th>
                        <th className="px-2 py-2 text-left">Status</th>
                        <th className="px-2 py-2 text-left">Occupation</th>
                      </tr>
                    </thead>
                    <tbody>
                      {familyRows.map((row, rowIndex) => (
                        <tr key={rowIndex} className="border-t border-border/60">
                          <td className="p-1.5">
                            <Input
                              id={familyCellId(rowIndex, 0)}
                              aria-label={`Family member ${rowIndex + 1} name`}
                              value={row[0]}
                              onChange={(e) => setFamilyCell(rowIndex, 0, e.target.value)}
                            />
                          </td>
                          <td className="p-1.5">
                            <FamilySelect
                              id={familyCellId(rowIndex, 1)}
                              label={`Family member ${rowIndex + 1} relationship`}
                              options={RELATIONSHIPS}
                              value={row[1]}
                              onChange={(v) => setFamilyCell(rowIndex, 1, v)}
                            />
                          </td>
                          <td className="p-1.5">
                            <Input
                              id={familyCellId(rowIndex, 2)}
                              aria-label={`Family member ${rowIndex + 1} age`}
                              inputMode="numeric"
                              maxLength={3}
                              value={row[2]}
                              onChange={(e) =>
                                setFamilyCell(rowIndex, 2, e.target.value.replace(/\D/g, ""))
                              }
                            />
                          </td>
                          <td className="p-1.5">
                            <FamilySelect
                              id={familyCellId(rowIndex, 3)}
                              label={`Family member ${rowIndex + 1} status`}
                              options={CIVIL_STATUSES}
                              value={row[3]}
                              onChange={(v) => setFamilyCell(rowIndex, 3, v)}
                            />
                          </td>
                          <td className="p-1.5">
                            <Input
                              id={familyCellId(rowIndex, 4)}
                              aria-label={`Family member ${rowIndex + 1} occupation`}
                              value={row[4]}
                              onChange={(e) => setFamilyCell(rowIndex, 4, e.target.value)}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Add at least one family member. Up to {FAMILY_ROWS} members.
                </p>
              </div>
            </div>
          </section>

          {senior && !isLeader && (
            <div className="sm:col-span-2">
              <Label>Eligibility status</Label>
              <Select
                value={draft.status}
                onValueChange={(v) => set("status", v as Senior["status"])}
              >
                <SelectTrigger className="mt-1.5 h-9 px-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <section className="rounded-lg border border-border/60 bg-background/40 p-4 sm:p-5">
            <div className="border-b border-border/60 pb-3">
              <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Membership to Senior Citizen Association
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Complete the association details shown on the registration form.
              </p>
            </div>
            <div className="mt-4 space-y-4">
              <div>
                <Label htmlFor="senior-association-name">Name of association *</Label>
                <Input
                  id="senior-association-name"
                  value={draft.associationName ?? ""}
                  onChange={(e) => set("associationName", e.target.value)}
                  placeholder="Senior Citizens Association of..."
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="senior-association-address">Address of association *</Label>
                {isLeader ? (
                  <>
                    <p
                      id="senior-association-address"
                      className="mt-1.5 flex h-9 cursor-not-allowed items-center rounded-lg border border-input bg-muted px-3 text-sm font-medium text-foreground select-none"
                    >
                      {associationAddress}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Based on the address of the registering leader account.
                    </p>
                  </>
                ) : (
                  <SearchableSelect
                    id="senior-association-address"
                    label="Address of association"
                    value={associationAddress}
                    onChange={(v) => set("associationAddress", v)}
                    placeholder="Select an address"
                    className="mt-1.5 h-9 px-3"
                    options={associationAddressOptions.map((address) => ({
                      value: address,
                      label: address,
                    }))}
                  />
                )}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="senior-membership-date">Date of membership *</Label>
                  <Input
                    id="senior-membership-date"
                    type="date"
                    value={draft.associationMembershipDate ?? ""}
                    onChange={(e) => set("associationMembershipDate", e.target.value)}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="senior-association-position">Position *</Label>
                  <Input
                    id="senior-association-position"
                    value={draft.associationPosition ?? ""}
                    onChange={(e) => set("associationPosition", e.target.value)}
                    placeholder="Member or officer"
                    className="mt-1.5"
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-border/60 bg-background/40 p-4 sm:p-5">
            <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Documents and photo
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="senior-profile-photo">Profile Picture{!senior && " *"}</Label>
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
                {validIdPreview ? (
                  <a
                    href={validIdPreview}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 block w-fit"
                  >
                    <img
                      src={validIdPreview}
                      alt="Valid ID preview"
                      className="h-24 w-24 rounded-lg border border-border/60 object-cover"
                    />
                  </a>
                ) : (
                  senior?.validIdPath && (
                    <PrivateFileLink
                      path={seniorFileUrl(senior.id, "valid_id", senior.validIdPath)}
                      className="mt-2 block w-fit"
                    >
                      <span className="text-xs text-muted-foreground">Current Valid ID</span>
                    </PrivateFileLink>
                  )
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
                <p className="mt-1 text-xs text-muted-foreground">
                  PDF, JPG, or PNG up to 5 MB each.
                </p>
                {birthCertificatePreview ? (
                  <a
                    href={birthCertificatePreview}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 block w-fit"
                  >
                    <img
                      src={birthCertificatePreview}
                      alt="Birth Certificate preview"
                      className="h-24 w-24 rounded-lg border border-border/60 object-cover"
                    />
                  </a>
                ) : (
                  senior?.birthCertificatePath && (
                    <PrivateFileLink
                      path={seniorFileUrl(
                        senior.id,
                        "birth_certificate",
                        senior.birthCertificatePath,
                      )}
                      className="mt-2 block w-fit"
                    >
                      <span className="text-xs text-muted-foreground">
                        Current Birth Certificate
                      </span>
                    </PrivateFileLink>
                  )
                )}
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-border/60 bg-background/40 p-4 sm:p-5">
            <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Data privacy consent
            </p>
            {senior ? (
              <p className="mt-3 text-sm text-muted-foreground">
                {senior.privacyConsentAt
                  ? `The senior agreed to the Data Privacy Consent on ${new Date(
                      senior.privacyConsentAt,
                    ).toLocaleDateString("en-PH", { dateStyle: "long" })}.`
                  : "No data privacy consent is on record for this senior."}
              </p>
            ) : (
              <>
                <p className="mt-3 text-sm text-muted-foreground">
                  Read the consent to the senior, or let them read it, before registering them.
                </p>
                <div className="relative mt-4 flex items-start gap-3">
                  <input
                    id="senior-privacy-consent"
                    type="checkbox"
                    checked={privacyConsent}
                    onChange={(event) => {
                      // Checking the box opens the consent; it is ticked once "I agree" is pressed.
                      if (event.target.checked) setConsentOpen(true);
                      else setPrivacyConsent(false);
                    }}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--navy)]"
                  />
                  <label htmlFor="senior-privacy-consent" className="text-sm">
                    The senior, or their authorized representative, agrees to the{" "}
                    <button
                      type="button"
                      onClick={() => setConsentOpen(true)}
                      className="font-semibold text-primary hover:underline"
                    >
                      Data Privacy Consent
                    </button>{" "}
                    *
                  </label>
                </div>
              </>
            )}
          </section>
        </div>

        <PrivacyConsentDialog
          open={consentOpen}
          onOpenChange={setConsentOpen}
          onAccept={() => {
            setPrivacyConsent(true);
            clearFieldById("senior-privacy-consent");
          }}
        />

        <DialogFooter>
          <button onClick={() => onOpenChange(false)} className={secondaryButtonClass}>
            Cancel
          </button>
          <button onClick={submit} className={primaryButtonClass}>
            {senior ? "Save changes" : "Register senior"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
