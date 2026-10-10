import { CalendarCheck, PartyPopper } from "lucide-react";
import { useEffect, useState } from "react";
import { PrivateImage } from "@/components/PrivateFile";
import { tileClass } from "@/components/design-kit";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getSeniorBenefitRecords, seniorFileUrl, type BenefitTransaction } from "@/lib/api";
import { BENEFIT_PROGRAMS, benefitsFor, type EligibilityFlag } from "@/lib/osca-data";

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatDate(date?: string) {
  if (!date) return "";
  const parsed = new Date(`${date}T00:00:00`);
  return Number.isNaN(parsed.getTime())
    ? date
    : parsed.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

/**
 * The release date to show for a benefit, from the senior's newest record for it. Milestone
 * grants only count records from the past year, so a grant paid at 80 is not shown at 85.
 */
function releaseInfo(records: BenefitTransaction[], benefit: string) {
  const yearAgo = new Date();
  yearAgo.setFullYear(yearAgo.getFullYear() - 1);
  const record = records.find((item) => {
    if (item.benefit.benefit_name !== benefit) return false;
    if (benefit === "Social Pension") return true;
    const date = item.benefit_release?.release_date ?? item.date_distributed ?? item.created_at;
    return !date || new Date(date) > yearAgo;
  });
  if (!record) return null;
  if (record.status === "released") {
    const date = record.date_distributed ?? record.benefit_release?.release_date;
    return date ? `Released on ${formatDate(date.slice(0, 10))}` : "Released";
  }
  return record.benefit_release
    ? `Release date: ${formatDate(record.benefit_release.release_date.slice(0, 10))}`
    : null;
}

/** A flagged senior's details, with a congratulations note for reaching the milestone age. */
export function EligibilityFlagDialog({
  flag,
  onClose,
}: {
  flag: EligibilityFlag | null;
  onClose: () => void;
}) {
  const senior = flag?.senior;
  const benefits = flag ? benefitsFor(flag.program.name) : [];
  const [records, setRecords] = useState<BenefitTransaction[]>([]);

  useEffect(() => {
    setRecords([]);
    if (!senior) return;
    let current = true;
    getSeniorBenefitRecords(senior.id)
      .then((response) => current && setRecords(response.data))
      .catch(() => undefined);
    return () => {
      current = false;
    };
  }, [senior]);

  return (
    <Dialog open={flag !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-4">
            <span className="bg-navy grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-full text-sm font-bold text-white ring-2 ring-gold/50">
              <PrivateImage
                path={
                  senior?.photoPath ? seniorFileUrl(senior.id, "photo", senior.photoPath) : null
                }
                className="h-full w-full object-cover"
                fallback={initials(senior?.name ?? "")}
              />
            </span>
            <div className="min-w-0 text-left">
              <DialogTitle className="font-display truncate text-xl">{senior?.name}</DialogTitle>
              <DialogDescription className="mt-1 text-xs">OSCA ID {senior?.id}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {flag && senior && (
          <>
            <div className="rounded-xl border border-gold/40 bg-gold/10 p-4">
              <div className="flex items-center gap-2">
                <PartyPopper className="h-5 w-5 text-gold-foreground dark:text-gold" />
                <p className="font-display text-lg font-extrabold">Congratulations!</p>
              </div>
              <p className="mt-2 text-sm leading-relaxed">
                Congratulations to <strong>{senior.name}</strong> on reaching the age of{" "}
                <strong>{senior.age}</strong>! This milestone is honored under the Expanded
                Centenarians Act. {senior.name} can now claim these benefits:
              </p>
              <ul className="mt-3 space-y-2">
                {benefits.map((name) => {
                  const program = BENEFIT_PROGRAMS.find((item) => item.name === name);
                  const release = releaseInfo(records, name);
                  return (
                    <li
                      key={name}
                      className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-semibold">{name}</span>
                        {program && (
                          <span className="text-xs text-muted-foreground">
                            {program.amount} · {program.schedule}
                          </span>
                        )}
                      </div>
                      {release && (
                        <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-primary">
                          <CalendarCheck className="h-3.5 w-3.5" />
                          {release}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>

            <dl className="grid grid-cols-2 gap-3 text-sm">
              {[
                ["Age", senior.age],
                ["Date of birth", formatDate(senior.birthdate)],
                ["Sex", senior.sex === "male" ? "Male" : senior.sex === "female" ? "Female" : ""],
                ["Status", senior.status],
                ["Barangay", senior.barangay],
                ["Contact", senior.contact],
              ].map(([label, value]) => (
                <div key={String(label)} className={`${tileClass} p-3`}>
                  <dt className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                    {label}
                  </dt>
                  <dd className="mt-1 font-semibold">{value || "Not provided"}</dd>
                </div>
              ))}
              <div className={`${tileClass} col-span-2 p-3`}>
                <dt className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                  Address
                </dt>
                <dd className="mt-1 font-semibold">{senior.address || "Not provided"}</dd>
              </div>
            </dl>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
