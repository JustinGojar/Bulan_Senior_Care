import { AlertTriangle, CheckCircle2, Info, Loader2, XCircle } from "lucide-react";
import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

/**
 * App toasts: a card panel with a tone accent bar and icon tile, matching the
 * dialogs and status pages. Tone follows the toast type (success, error, ...).
 */
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      closeButton
      gap={10}
      icons={{
        success: <CheckCircle2 className="h-[18px] w-[18px]" />,
        error: <XCircle className="h-[18px] w-[18px]" />,
        warning: <AlertTriangle className="h-[18px] w-[18px]" />,
        info: <Info className="h-[18px] w-[18px]" />,
        loading: <Loader2 className="h-[18px] w-[18px] animate-spin" />,
      }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "group/toast relative flex w-full items-start gap-3 overflow-hidden rounded-xl border border-border/60 bg-card py-3.5 pr-10 pl-4 text-card-foreground shadow-[var(--shadow-card)] border-l-4 border-l-primary data-[type=success]:border-l-success data-[type=error]:border-l-destructive data-[type=warning]:border-l-gold",
          icon: "grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border/60 bg-muted text-muted-foreground group-data-[type=success]/toast:border-success/30 group-data-[type=success]/toast:bg-success/10 group-data-[type=success]/toast:text-success group-data-[type=error]/toast:border-destructive/30 group-data-[type=error]/toast:bg-destructive/10 group-data-[type=error]/toast:text-destructive group-data-[type=warning]/toast:border-gold/40 group-data-[type=warning]/toast:bg-gold/15 group-data-[type=warning]/toast:text-gold-foreground dark:group-data-[type=warning]/toast:text-gold",
          content: "min-w-0 flex-1 self-center",
          title: "font-display text-sm leading-5 font-bold text-foreground",
          description: "mt-0.5 text-[13px] leading-5 text-muted-foreground",
          actionButton:
            "bg-navy mt-0.5 inline-flex h-8 shrink-0 cursor-pointer items-center self-center rounded-lg px-3 text-xs font-bold text-white shadow-[var(--shadow-soft)]",
          cancelButton:
            "mt-0.5 inline-flex h-8 shrink-0 cursor-pointer items-center self-center rounded-lg border border-border bg-card px-3 text-xs font-semibold text-foreground transition-colors hover:bg-muted",
          closeButton:
            "absolute top-2.5 right-2.5 grid h-6 w-6 cursor-pointer place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground [&_svg]:h-3.5 [&_svg]:w-3.5",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
