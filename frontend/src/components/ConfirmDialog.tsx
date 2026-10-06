import { AlertTriangle, HelpCircle } from "lucide-react";
import { useCallback, useRef, useState, type ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type ConfirmOptions = {
  title: string;
  description: ReactNode;
  confirmLabel: string;
  /** Red confirm button and warning icon, for deletes and other risky actions. */
  destructive?: boolean;
};

/**
 * Styled replacement for window.confirm. Returns `confirm(options)`, which
 * resolves to true or false, and the dialog element to render once.
 */
export function useConfirmDialog() {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((next: ConfirmOptions) => {
    resolver.current?.(false);
    setOptions(next);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const settle = (value: boolean) => {
    resolver.current?.(value);
    resolver.current = null;
    setOptions(null);
  };

  const Icon = options?.destructive ? AlertTriangle : HelpCircle;
  const dialog = (
    <AlertDialog open={options !== null} onOpenChange={(open) => !open && settle(false)}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader className="flex-row items-start gap-4 space-y-0">
          <span
            className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg border ${
              options?.destructive
                ? "border-destructive/30 bg-destructive/10 text-destructive"
                : "border-gold/40 bg-gold/15 text-gold-foreground dark:text-gold"
            }`}
          >
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0 space-y-1.5">
            <AlertDialogTitle>{options?.title}</AlertDialogTitle>
            <AlertDialogDescription>{options?.description}</AlertDialogDescription>
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => settle(false)}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => settle(true)}
            className={
              options?.destructive
                ? "bg-none bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : undefined
            }
          >
            {options?.confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return [confirm, dialog] as const;
}
