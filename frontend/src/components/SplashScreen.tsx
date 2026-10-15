import { useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import splashLogo from "@/images/splash-logo.webp";

const SHOWN_KEY = "bulan-splash-shown";
/** Keep the splash up at least this long after launch, so the animation reads as intentional. */
const MIN_VISIBLE_MS = 3000;
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
#app-splash{--logo:min(47vw,220px)}
.splash-logo{position:absolute;left:50%;top:50%;width:var(--logo);height:var(--logo);margin:calc(var(--logo) / -2) 0 0 calc(var(--logo) / -2)}
.splash-logo img{position:relative;display:block;width:100%;height:100%;border-radius:50%}
.splash-text{position:absolute;left:24px;right:24px;top:calc(50% + var(--logo) / 2 + 28px);display:flex;flex-direction:column;align-items:center}
.splash-logo::before,.splash-logo::after{content:"";position:absolute;inset:-10px;border-radius:50%;border:2px solid rgba(214,168,62,.55);opacity:0;animation:splash-ring 2.2s .3s ease-out infinite}
.splash-logo::after{animation-delay:1.4s}
.splash-title{margin:0;font-size:28px;font-weight:800;letter-spacing:-.01em;line-height:1.15;animation:splash-rise .7s .25s ease-out both}
.splash-title span{color:#e2b552}
.splash-sub{margin:10px 0 0;max-width:280px;font-family:"Plus Jakarta Sans",ui-sans-serif,system-ui,sans-serif;font-size:13px;font-weight:500;line-height:1.5;opacity:.68;animation:splash-rise .7s .4s ease-out both}
.splash-loader{width:168px;animation:splash-rise .7s .55s ease-out both}
.splash-bar{position:relative;height:4px;border-radius:999px;background:rgba(255,255,255,.12);overflow:hidden}
.splash-bar::after{content:"";position:absolute;top:0;bottom:0;left:0;width:40%;border-radius:999px;background:linear-gradient(90deg,#d6a83e,#f0cf7a,#d6a83e);animation:splash-slide 1.3s cubic-bezier(.65,0,.35,1) infinite}
.splash-status{margin:12px 0 0;font-family:"Plus Jakarta Sans",ui-sans-serif,system-ui,sans-serif;font-size:11px;font-weight:600;letter-spacing:.18em;text-transform:uppercase;opacity:.55}
@keyframes splash-ring{from{opacity:.9;transform:scale(.92)}to{opacity:0;transform:scale(1.16)}}
@keyframes splash-rise{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
@keyframes splash-slide{from{transform:translateX(-110%)}to{transform:translateX(260%)}}
@media (prefers-reduced-motion:reduce){#app-splash *,#app-splash *::before,#app-splash *::after{animation-duration:.01ms!important;animation-iteration-count:1!important}.splash-bar::after{width:100%;transform:none}}
`;

/** Static markup rendered into the HTML shell; hidden unless splashScript turned it on. */
export function SplashScreen() {
  return (
    <div id="app-splash" role="status" aria-live="polite" aria-label="Loading Bulan Señior Care">
      {/* Same size and place as the logo on Android's own launch screen, so the hand-off from
          that screen to this one is seamless: the logo stays put and the title fades in. */}
      <div className="splash-logo">
        <img src={splashLogo} alt="" width={220} height={220} decoding="async" />
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
      <div className="splash-loader">
        <div className="splash-bar" />
        <p className="splash-status">Loading</p>
      </div>
    </div>
  );
}

/** Fades the splash out once the first page has finished loading. */
export function useSplashDismiss() {
  const pending = useRouterState({ select: (state) => state.status === "pending" });

  useEffect(() => {
    const root = document.documentElement;
    if (pending || !root.classList.contains("splash")) return;

    const wait = Math.max(0, MIN_VISIBLE_MS - performance.now());
    const fadeTimer = window.setTimeout(() => {
      try {
        sessionStorage.setItem(SHOWN_KEY, "1");
      } catch {
        // Private mode can block storage; the splash then just shows again next launch.
      }
      root.classList.add("splash-out");
      // Not cancelled on cleanup: once the fade has started, it finishes.
      window.setTimeout(() => root.classList.remove("splash", "splash-out"), FADE_MS);
    }, wait);
    return () => window.clearTimeout(fadeTimer);
  }, [pending]);
}
