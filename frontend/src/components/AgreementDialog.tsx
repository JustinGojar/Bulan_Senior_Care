import type { ReactNode } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type AgreementSection = { title: string; body: ReactNode };

/** Numbered agreement text with an "I agree" button, used for the terms and consent forms. */
export function AgreementDialog({
  open,
  onOpenChange,
  onAccept,
  title,
  lastUpdated,
  sections,
  acceptClassName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccept: () => void;
  title: string;
  lastUpdated: string;
  sections: AgreementSection[];
  acceptClassName: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">{title}</DialogTitle>
          <DialogDescription>Last updated {lastUpdated}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {sections.map((section, index) => (
            <section key={section.title}>
              <h3 className="text-sm font-bold">
                {index + 1}. {section.title}
              </h3>
              <div className="mt-2 space-y-2 text-sm leading-relaxed text-muted-foreground [&_li]:mt-1 [&_ul]:list-disc [&_ul]:pl-5">
                {section.body}
              </div>
            </section>
          ))}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <button type="button" onClick={onAccept} className={acceptClassName}>
              I agree
            </button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
