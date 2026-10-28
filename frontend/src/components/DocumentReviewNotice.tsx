import { FileWarning, Loader2, Upload } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { primaryButtonClass } from "@/components/design-kit";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resubmitSeniorDocuments } from "@/lib/use-seniors";
import { cn } from "@/lib/utils";
import type { Senior } from "@/lib/osca-data";

/**
 * What is wrong with an "In review" registration's documents. The barangay president can upload
 * corrected documents here, which sends the registration back to Admin and Head for review.
 */
export function DocumentReviewNotice({
  senior,
  canResubmit,
  onResubmitted,
}: {
  senior: Senior;
  canResubmit: boolean;
  onResubmitted: (senior: Senior) => void;
}) {
  const [validId, setValidId] = useState<File | null>(null);
  const [birthCertificate, setBirthCertificate] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  async function submit() {
    setUploading(true);
    try {
      const updated = await resubmitSeniorDocuments(senior.id, { validId, birthCertificate });
      toast.success("Corrected documents sent for review.");
      onResubmitted(updated);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not upload the documents.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="rounded-xl border border-gold/40 bg-gold/10 p-3 text-sm">
      <p className="flex items-center gap-1.5 font-bold">
        <FileWarning className="h-4 w-4 text-gold-foreground dark:text-gold" />
        In review: the documents need to be fixed
      </p>
      <p className="mt-1 text-muted-foreground">{senior.reviewNote}</p>
      {canResubmit && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
          className="mt-3 space-y-3 border-t border-gold/30 pt-3"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="resubmit-valid-id">Valid ID</Label>
              <Input
                id="resubmit-valid-id"
                type="file"
                accept="application/pdf,image/jpeg,image/png"
                onChange={(event) => setValidId(event.target.files?.[0] ?? null)}
                className="mt-1.5 cursor-pointer bg-card"
              />
            </div>
            <div>
              <Label htmlFor="resubmit-birth-certificate">Birth Certificate</Label>
              <Input
                id="resubmit-birth-certificate"
                type="file"
                accept="application/pdf,image/jpeg,image/png"
                onChange={(event) => setBirthCertificate(event.target.files?.[0] ?? null)}
                className="mt-1.5 cursor-pointer bg-card"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={uploading || (!validId && !birthCertificate)}
              className={cn(primaryButtonClass, "h-9 px-4 text-sm")}
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Upload corrected documents
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
