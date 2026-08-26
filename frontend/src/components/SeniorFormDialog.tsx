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
  firstName: "",
  middleName: "",
  lastName: "",
  age: 60,
  barangay: BARANGAYS[0]!,
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
  const [document, setDocument] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setDocument(null);
    setDraft(
      senior
        ? {
            name: senior.name,
            firstName: senior.name.split(" ")[0] ?? "",
            middleName: senior.name.split(" ").slice(1, -1).join(" "),
            lastName: senior.name.split(" ").at(-1) ?? "",
            age: senior.age,
            barangay: senior.barangay,
            contact: senior.contact,
            benefit: senior.benefit,
            status: senior.status,
          }
          : { ...EMPTY, ...(leaderBarangay ? { barangay: leaderBarangay } : {}) },
    );
        }, [open, senior, leaderBarangay]);

  const set = <K extends keyof SeniorDraft>(key: K, value: SeniorDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  function submit() {
    if (!draft.firstName?.trim()) return setError("First name is required.");
    if (!draft.lastName?.trim()) return setError("Last name is required.");
    if (draft.age < 60 || draft.age > 130)
      return setError("Age must be 60 or older to qualify for OSCA benefits.");
    if (!draft.contact.trim()) return setError("Contact number is required.");
    onSubmit({
      ...draft,
      name: [draft.firstName, draft.middleName, draft.lastName].filter(Boolean).join(" ").trim(),
      firstName: draft.firstName.trim(),
      middleName: draft.middleName?.trim() ?? "",
      lastName: draft.lastName.trim(),
      contact: draft.contact.trim(),
      document,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
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
              min={60}
              value={draft.age}
              onChange={(e) => {
                const age = Number(e.target.value);
                setDraft((d) => ({ ...d, age, benefit: benefitForAge(age) }));
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
            {leaderBarangay ? (
              <div className="mt-1.5 flex h-10 items-center rounded-md border border-border bg-muted px-3 text-sm">
                {leaderBarangay}
              </div>
            ) : (
              <Select value={draft.barangay} onValueChange={(v) => set("barangay", v)}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BARANGAYS.map((b) => (
                    <SelectItem key={b} value={b}>
                      {b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
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

          <div className="sm:col-span-2">
            <Label htmlFor="senior-document">Supporting document</Label>
            <Input
              id="senior-document"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(event) => setDocument(event.target.files?.[0] ?? null)}
              className="mt-1.5 cursor-pointer"
            />
            <p className="mt-1 text-xs text-muted-foreground">PDF, JPG, or PNG up to 5 MB.</p>
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
