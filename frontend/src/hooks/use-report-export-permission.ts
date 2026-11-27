import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

/** Check the server before showing export actions, including on already-open reports. */
export function useReportExportPermission() {
  const [allowed, setAllowed] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    let pending = false;
    async function refresh() {
      if (pending || document.visibilityState === "hidden") return;
      pending = true;
      try {
        const result = await apiFetch<{ allowed: boolean }>("/reports/export-permission", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!controller.signal.aborted) setAllowed(result.allowed === true);
      } catch {
        if (!controller.signal.aborted) setAllowed(false);
      } finally {
        pending = false;
      }
    }
    void refresh();
    const timer = window.setInterval(() => void refresh(), 5000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      controller.abort();
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);
  return allowed;
}
