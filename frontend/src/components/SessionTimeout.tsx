import { useEffect } from "react";
import { apiFetch, getSessionId } from "@/lib/api";

/** Keep a browser session alive while at least one system tab remains open. */
export function SessionTimeout() {
  useEffect(() => {
    let inFlight = false;
    let lastAttempt = 0;
    const controller = new AbortController();
    const heartbeat = () => {
      if (!getSessionId() || inFlight || Date.now() - lastAttempt < 15_000) return;
      lastAttempt = Date.now();
      inFlight = true;
      void apiFetch("/session/heartbeat", { cache: "no-store", signal: controller.signal })
        // Transient network failures retry next time. The API handles revoked/expired sessions.
        .catch(() => undefined)
        .finally(() => {
          inFlight = false;
        });
    };
    heartbeat();
    // Keep background tabs alive too; closing one tab must not sign out another.
    const timer = window.setInterval(heartbeat, 30_000);
    const events = ["focus", "online", "pageshow", "pointerdown", "keydown"] as const;
    for (const event of events) window.addEventListener(event, heartbeat);
    document.addEventListener("visibilitychange", heartbeat);
    return () => {
      controller.abort();
      window.clearInterval(timer);
      for (const event of events) window.removeEventListener(event, heartbeat);
      document.removeEventListener("visibilitychange", heartbeat);
    };
  }, []);
  return null;
}
