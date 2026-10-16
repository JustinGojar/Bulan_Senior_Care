import { FileText, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AuthAlert } from "@/components/AuthLayout";
import { fieldClass, primaryButtonClass, secondaryButtonClass } from "@/components/design-kit";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiFetch } from "@/lib/api";
import type { Senior } from "@/lib/osca-data";

function localToday() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

/**
 * Records a senior's death with its documentation (date of death and death certificate).
 * The record becomes inactive and benefits still waiting for release are closed.
 */
export function MarkDeceasedDialog({
  senior,
  onClose,
  onSaved,
}: {
  senior: Senior | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [dateOfDeath, setDateOfDeath] = useState("");
  const [certificate, setCertificate] = useState<File | null>(null);
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDateOfDeath("");
    setCertificate(null);
    setRemarks("");
    setError(null);
  }, [senior]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!senior) return;
    if (!certificate) {
      setError("Attach the death certificate.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const body = new FormData();
      body.append("date_of_death", dateOfDeath);
      body.append("death_certificate", certificate);
      if (remarks.trim()) body.append("remarks", remarks.trim());
      await apiFetch(`/seniors/${encodeURIComponent(senior.id)}/deceased`, {
        method: "POST",
        body,
      });
      toast.success(`${senior.name} was recorded as deceased.`);
      onSaved();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to record the death.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={senior !== null} onOpenChange={(open) => !open && !saving && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Mark as deceased</DialogTitle>
          <DialogDescription>
            {senior?.name} ({senior?.id}) will move to the Inactive list. Benefit releases still
            pending for this senior will be closed.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          {error && <AuthAlert tone="error">{error}</AuthAlert>}
          <label className="block text-sm font-semibold">
            Date of death *
            <input
              type="date"
              required
              value={dateOfDeath}
              min={senior?.birthdate}
              max={localToday()}
              onChange={(event) => setDateOfDeath(event.target.value)}
              className={`${fieldClass} mt-2 h-11`}
            />
          </label>
          <div>
            <p className="text-sm font-semibold">Death certificate *</p>
            <label className="mt-2 flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-input bg-background/60 px-4 py-3 text-sm font-semibold transition-colors hover:border-ring">
              <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
              <span className="flex-1 truncate">
                {certificate ? certificate.name : "Choose a PDF, JPG or PNG (up to 5 MB)"}
              </span>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  if (file && file.size > 5 * 1024 * 1024) {
                    setError("The death certificate must be 5 MB or smaller.");
                    return;
                  }
                  setCertificate(file);
                }}
                className="hidden"
              />
            </label>
          </div>
          <label className="block text-sm font-semibold">
            Remarks <span className="font-normal text-muted-foreground">(optional)</span>
            <textarea
              value={remarks}
              maxLength={500}
              rows={3}
              onChange={(event) => setRemarks(event.target.value)}
              placeholder="e.g. Reported by family member; certificate no."
              className={`${fieldClass} mt-2 resize-none py-2.5`}
            />
          </label>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={onClose}
              className={`${secondaryButtonClass} h-10 px-4`}
            >
              Cancel
            </button>
            <button type="submit" disabled={saving} className={`${primaryButtonClass} h-10 px-4`}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saving ? "Saving..." : "Record death"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
