import { Download } from "lucide-react";
import { toast } from "sonner";
import { promptInstall, useInstallState } from "@/lib/pwa";

/**
 * "Install app" button that adds Bulan SeniorCare to the phone's home screen. Shown only
 * when the browser offers installation (Chrome on Android, and desktop Chrome or Edge) and
 * the app isn't already installed.
 */
export function InstallAppButton({ className = "" }: { className?: string }) {
  const state = useInstallState();
  if (state !== "available") return null;

  return (
    <button
      type="button"
      onClick={() => {
        void promptInstall().then((accepted) => {
          if (accepted) toast.success("Bulan SeniorCare was added to your home screen.");
        });
      }}
      className={className}
    >
      <Download className="h-4 w-4" /> Install app
    </button>
  );
}
