import { Clock } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
import {
  broadcastAuthChange,
  clearToken,
  getCurrentUser,
  getSessionLimits,
  getToken,
  logout,
  setSessionNotice,
} from "@/lib/api";

// Shared through localStorage so activity in any open tab keeps every tab signed in.
const ACTIVITY_KEY = "bulan-last-activity";
const WARNING_MS = 2 * 60_000;
// Writing on every mouse move would be wasteful; this is precise enough for a minutes-long limit.
const ACTIVITY_WRITE_INTERVAL = 5_000;
const ACTIVITY_EVENTS = ["pointerdown", "pointermove", "keydown", "wheel", "touchstart"] as const;

type Warning = { kind: "idle" | "expiry"; secondsLeft: number };

function readLastActivity() {
  try {
    return Number(localStorage.getItem(ACTIVITY_KEY)) || 0;
  } catch {
    return 0;
  }
}

function writeLastActivity(time = Date.now()) {
  try {
    localStorage.setItem(ACTIVITY_KEY, String(time));
  } catch {
    // Without storage, other tabs simply don't see this tab's activity.
  }
}

function formatCountdown(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = String(seconds % 60).padStart(2, "0");
  return `${minutes}:${rest}`;
}

/**
 * Signs the user out after a stretch without mouse, keyboard or touch input, and when the
 * sign-in reaches its absolute limit, with a two-minute warning first. Background polling
 * keeps the server token fresh while a tab is visible, so this is what ends an unattended
 * session; the server's own idle timeout covers closed tabs.
 */
export function SessionTimeout() {
  const [warning, setWarning] = useState<Warning | null>(null);
  const warningRef = useRef<Warning | null>(null);
  const dismissedExpiry = useRef(false);

  useEffect(() => {
    let lastWrite = 0;
    let ended = false;
    writeLastActivity();

    const show = (next: Warning | null) => {
      warningRef.current = next;
      setWarning(next);
    };

    const handleActivity = () => {
      // Once the warning is up, only its buttons count as coming back.
      if (warningRef.current?.kind === "idle") return;
      const now = Date.now();
      if (now - lastWrite < ACTIVITY_WRITE_INTERVAL) return;
      lastWrite = now;
      writeLastActivity(now);
    };

    const endSession = (message: string) => {
      if (ended) return;
      ended = true;
      show(null);
      setSessionNotice(message);
      void logout().catch(() => undefined);
      clearToken();
      broadcastAuthChange();
    };

    const check = () => {
      if (ended || !getToken()) return;
      const { idleTimeoutMinutes, expiresAt } = getSessionLimits();
      const now = Date.now();
      const idleDeadline =
        idleTimeoutMinutes > 0 ? readLastActivity() + idleTimeoutMinutes * 60_000 : Infinity;
      const expiryDeadline = expiresAt ?? Infinity;

      if (expiryDeadline <= now) {
        endSession("Your session reached its time limit. Please log in again.");
        return;
      }
      if (idleDeadline <= now) {
        endSession("Your session expired due to inactivity. Please log in again.");
        return;
      }

      const kind = expiryDeadline <= idleDeadline ? "expiry" : "idle";
      const remaining = Math.min(idleDeadline, expiryDeadline) - now;
      if (remaining > WARNING_MS || (kind === "expiry" && dismissedExpiry.current)) {
        if (warningRef.current) show(null);
        return;
      }
      show({ kind, secondsLeft: Math.ceil(remaining / 1000) });
    };

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, handleActivity, { passive: true });
    }
    // Background tabs throttle timers, so check again as soon as the tab is shown.
    document.addEventListener("visibilitychange", check);
    const timer = window.setInterval(check, 1000);
    return () => {
      for (const event of ACTIVITY_EVENTS) window.removeEventListener(event, handleActivity);
      document.removeEventListener("visibilitychange", check);
      window.clearInterval(timer);
    };
  }, []);

  function staySignedIn() {
    writeLastActivity();
    warningRef.current = null;
    setWarning(null);
    // Also tells the server the user is still here; a 401 here signs out as usual.
    void getCurrentUser().catch(() => undefined);
  }

  function signOutNow() {
    warningRef.current = null;
    setWarning(null);
    void logout().catch(() => undefined);
    clearToken();
    broadcastAuthChange();
  }

  function dismissExpiry() {
    dismissedExpiry.current = true;
    warningRef.current = null;
    setWarning(null);
  }

  const idle = warning?.kind === "idle";
  const countdown = formatCountdown(warning?.secondsLeft ?? 0);

  return (
    <AlertDialog
      open={warning !== null}
      onOpenChange={(open) => {
        // The buttons clear the warning before this runs; what's left is closing with Escape.
        if (open || !warningRef.current) return;
        if (idle) staySignedIn();
        else dismissExpiry();
      }}
    >
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader className="flex-row items-start gap-4 space-y-0">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-gold/40 bg-gold/15 text-gold-foreground dark:text-gold">
            <Clock className="h-5 w-5" />
          </span>
          <div className="min-w-0 space-y-1.5">
            <AlertDialogTitle>
              {idle ? "Are you still there?" : "Your session is ending"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {idle ? (
                <>
                  For your security, you will be signed out in{" "}
                  <strong className="tabular-nums">{countdown}</strong> because of inactivity.
                </>
              ) : (
                <>
                  Your sign-in reaches its time limit in{" "}
                  <strong className="tabular-nums">{countdown}</strong>. Save your work, then log in
                  again to continue.
                </>
              )}
            </AlertDialogDescription>
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={signOutNow}>Sign out</AlertDialogCancel>
          <AlertDialogAction onClick={idle ? staySignedIn : dismissExpiry}>
            {idle ? "Stay signed in" : "Continue"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
