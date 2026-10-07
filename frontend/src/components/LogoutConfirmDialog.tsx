import { LogOut } from "lucide-react";
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

// Asks before signing out so a stray click doesn't end the session and lose unsaved work.
export function LogoutConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader className="flex-row items-start gap-4 space-y-0">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-destructive/30 bg-destructive/10 text-destructive">
            <LogOut className="h-5 w-5" />
          </span>
          <div className="min-w-0 space-y-1.5">
            <AlertDialogTitle>Log out of Bulan SeniorCare?</AlertDialogTitle>
            <AlertDialogDescription>
              You will need to sign in again to continue. Any unsaved changes on this page will be
              lost.
            </AlertDialogDescription>
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-none bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={onConfirm}
          >
            <LogOut className="h-4 w-4" /> Log out
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
