import { useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";

/** Wait this long before showing the bar, so instant navigations don't flash it. */
const SHOW_DELAY_MS = 120;

/**
 * Thin gold bar at the top of the window while the router is loading the next
 * page (its code chunk and any route loaders).
 */
export function NavigationProgress() {
  const pending = useRouterState({ select: (state) => state.status === "pending" });
  const [visible, setVisible] = useState(false);
  const [finishing, setFinishing] = useState(false);

  useEffect(() => {
    if (pending) {
      setFinishing(false);
      const timer = window.setTimeout(() => setVisible(true), SHOW_DELAY_MS);
      return () => window.clearTimeout(timer);
    }
    if (!visible) return;
    setFinishing(true);
    const timer = window.setTimeout(() => {
      setVisible(false);
      setFinishing(false);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [pending, visible]);

  if (!visible) return null;

  return (
    <div
      role="progressbar"
      aria-label="Loading page"
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[3px] overflow-hidden"
    >
      <div
        className={`h-full bg-gold shadow-[0_0_8px_var(--gold)] transition-[width,opacity] ease-out ${
          finishing
            ? "w-full opacity-0 duration-300"
            : "animate-[nav-progress_8s_cubic-bezier(0.1,0.7,0.2,1)_forwards]"
        }`}
      />
    </div>
  );
}
