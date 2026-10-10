import { useSyncExternalStore } from "react";

// Chrome's install prompt event (not yet in TypeScript's DOM types).
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

if (typeof window !== "undefined") {
  installed =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;

  // Chrome fires this once, early in the page load, so it is captured here rather than
  // in a component that may not be mounted yet.
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    installed = true;
    notify();
  });

  if ("serviceWorker" in navigator && import.meta.env.PROD) {
    const register = () => {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((error: unknown) => {
        console.warn("Service worker registration failed", error);
      });
    };
    // The app bundle can finish loading after the page's load event has already fired.
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export type InstallState = "available" | "installed" | "unavailable";

function getState(): InstallState {
  if (installed) return "installed";
  return deferredPrompt ? "available" : "unavailable";
}

export function useInstallState(): InstallState {
  return useSyncExternalStore(subscribe, getState, () => "unavailable");
}

/** Opens Chrome's "Install app" dialog. Resolves true when the user accepts. */
export async function promptInstall(): Promise<boolean> {
  const prompt = deferredPrompt;
  if (!prompt) return false;
  deferredPrompt = null;
  notify();
  await prompt.prompt();
  const { outcome } = await prompt.userChoice;
  return outcome === "accepted";
}
