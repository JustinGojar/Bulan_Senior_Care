import { useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import splashLogo from "@/images/splash-logo.webp";

const SHOWN_KEY = "bulan-splash-shown";
/** How long the progress bar takes to fill from 0% to 100%. */
const PROGRESS_MS = 5000;
/** Pause at 100% before fading, so the full bar registers. */
const HOLD_MS = 250;
/** Length of the fade-out in splashCss below. */
const FADE_MS = 450;

/**
 * Runs in <head> before first paint. The splash shows when the installed app is opened, or on
 * a phone-sized screen, once per browsing session; reloads and later navigations skip it.
 * The timeout is a safety net that removes it if the app's JavaScript never starts.
 */
export const splashScript = `try{var d=document.documentElement,m=function(q){return window.matchMedia(q).matches};if((m("(display-mode: standalone)")||navigator.standalone===true||m("(max-width: 767px)"))&&!sessionStorage.getItem(${JSON.stringify(SHOWN_KEY)})){d.classList.add("splash");setTimeout(function(){d.classList.remove("splash")},10000)}}catch(e){}`;

/**
 * Inline so the splash is styled on the very first paint, before the app stylesheet arrives.
 * The navy (#17213a) matches background_color in manifest.webmanifest, which Android uses for
 * its own launch screen, so the two screens read as one in both themes.
 */
export const splashCss = `
#app-splash{display:none}
html.splash{overflow:hidden}
html.splash #app-splash{position:fixed;inset:0;z-index:2147483000;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;padding:24px 24px calc(32px + env(safe-area-inset-bottom));background:radial-gradient(120% 80% at 50% 50%,#17213a 0%,#17213a 60%,#111a2d 100%);color:#f2f4f8;font-family:"Sora","Plus Jakarta Sans",ui-sans-serif,system-ui,sans-serif;text-align:center;transition:opacity ${FADE_MS}ms ease,transform ${FADE_MS}ms ease}
html.splash.splash-out #app-splash{opacity:0;transform:scale(1.03);pointer-events:none}
#app-splash{--logo:min(40vw,188px)}
.splash-logo{position:absolute;left:50%;top:50%;width:var(--logo);height:var(--logo);margin:calc(var(--logo) / -2) 0 0 calc(var(--logo) / -2)}
.splash-logo img{position:relative;display:block;width:100%;height:100%;border-radius:50%}
.splash-text{position:absolute;left:24px;right:24px;top:calc(50% + var(--logo) / 2 + 28px);display:flex;flex-direction:column;align-items:center}
.splash-logo::before,.splash-logo::after{content:"";position:absolute;inset:-10px;border-radius:50%;border:2px solid rgba(214,168,62,.55);opacity:0;animation:splash-ring 2.2s .3s ease-out infinite}
.splash-logo::after{animation-delay:1.4s}
.splash-title{margin:0;font-size:28px;font-weight:800;letter-spacing:-.01em;line-height:1.15;animation:splash-rise .7s .25s ease-out both}
.splash-title span{color:#e2b552}
.splash-sub{margin:10px 0 0;max-width:280px;font-family:"Plus Jakarta Sans",ui-sans-serif,system-ui,sans-serif;font-size:13px;font-weight:500;line-height:1.5;opacity:.68;animation:splash-rise .7s .4s ease-out both}
.splash-loader{width:min(240px,70vw);animation:splash-rise .7s .55s ease-out both}
.splash-bar{position:relative;height:6px;border-radius:999px;background:rgba(255,255,255,.12);overflow:hidden}
.splash-fill{position:relative;height:100%;width:0;border-radius:999px;background:linear-gradient(90deg,#c9962b,#e2b552 60%,#f3d68a);box-shadow:0 0 12px rgba(226,181,82,.55);overflow:hidden;animation:splash-fill ${PROGRESS_MS}ms cubic-bezier(.4,0,.6,1) forwards}
.splash-fill::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,.45),transparent);transform:translateX(-100%);animation:splash-shine 1.4s ease-in-out infinite}
.splash-meta{display:flex;justify-content:space-between;align-items:baseline;margin:12px 0 0;font-family:"Plus Jakarta Sans",ui-sans-serif,system-ui,sans-serif;font-size:11px;font-weight:600;letter-spacing:.18em;text-transform:uppercase}
.splash-status{opacity:.55}
.splash-pct{color:#e2b552;font-variant-numeric:tabular-nums;letter-spacing:.04em;counter-reset:pct var(--pct);animation:splash-count ${PROGRESS_MS}ms cubic-bezier(.4,0,.6,1) forwards}
.splash-pct::after{content:counter(pct) "%"}
@keyframes splash-ring{from{opacity:.9;transform:scale(.92)}to{opacity:0;transform:scale(1.16)}}
@keyframes splash-rise{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
@property --pct{syntax:"<integer>";inherits:false;initial-value:0}
@keyframes splash-fill{to{width:100%}}
@keyframes splash-count{from{--pct:0}to{--pct:100}}
@keyframes splash-shine{to{transform:translateX(100%)}}
@media (prefers-reduced-motion:reduce){.splash-logo,.splash-logo::before,.splash-logo::after,.splash-text *,.splash-loader,.splash-fill::after{animation:none!important}.splash-logo::before,.splash-logo::after{opacity:0}}
`;

/** Static markup rendered into the HTML shell; hidden unless splashScript turned it on. */
export function SplashScreen() {
  return (
    <div id="app-splash" role="status" aria-live="polite" aria-label="Loading Bulan Señior Care">
      {/* Same size and place as the logo on Android's own launch screen, so the hand-off from
          that screen to this one is seamless: the logo stays put and the title fades in. */}
      <div className="splash-logo">
        <img src={splashLogo} alt="" width={188} height={188} decoding="async" />
      </div>
      <div className="splash-text">
        <h1 className="splash-title">
          Bulan <span>Señior</span> Care
        </h1>
        <p className="splash-sub">
          Office for Senior Citizens Affairs
          <br />
          LGU Bulan, Sorsogon
        </p>
      </div>
      {/* Pure CSS (fill width plus a counted percentage), so it runs from the first paint,
          before the app's JavaScript has loaded. */}
      <div className="splash-loader">
        <div className="splash-bar">
          <div className="splash-fill" />
        </div>
        <p className="splash-meta">
          <span className="splash-status">Loading</span>
          <span className="splash-pct" />
        </p>
      </div>
    </div>
  );
}

/** Fades the splash out once the progress bar reaches 100% and the first page has loaded. */
export function useSplashDismiss() {
  const pending = useRouterState({ select: (state) => state.status === "pending" });

  useEffect(() => {
    const root = document.documentElement;
    if (pending || !root.classList.contains("splash")) return;

    let cancelled = false;
    let fadeTimer: number | undefined;
    const fill = document.querySelector<HTMLElement>("#app-splash .splash-fill");
    // The fill animation started at first paint; wait for it to reach 100%.
    const filled = Promise.all((fill?.getAnimations?.() ?? []).map((a) => a.finished)).catch(
      () => undefined,
    );
    void filled.then(() => {
      if (cancelled) return;
      fadeTimer = window.setTimeout(() => {
        try {
          sessionStorage.setItem(SHOWN_KEY, "1");
        } catch {
          // Private mode can block storage; the splash then just shows again next launch.
        }
        root.classList.add("splash-out");
        // Not cancelled on cleanup: once the fade has started, it finishes.
        window.setTimeout(() => root.classList.remove("splash", "splash-out"), FADE_MS);
      }, HOLD_MS);
    });
    return () => {
      cancelled = true;
      window.clearTimeout(fadeTimer);
    };
  }, [pending]);
}
