// Service worker for the installable app (PWA). Chrome on Android needs one to offer
// "Install app". It caches nothing: records and sessions always come from the server,
// so a new deploy or a signed-out account can never be served from a stale copy.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

// Same navy as the launch and splash screens. Inline only: nothing is cached, so no
// stylesheet, font or image can load while offline.
const OFFLINE_PAGE = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#17213a"><title>Offline · Bulan Señior Care</title>
<style>*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;background:radial-gradient(120% 80% at 50% 50%,#17213a 0%,#17213a 60%,#111a2d 100%);color:#f2f4f8;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;text-align:center}
main{max-width:340px}
.icon{width:72px;height:72px;margin:0 auto 24px;display:grid;place-items:center;border-radius:50%;border:2px solid rgba(226,181,82,.5);color:#e2b552}
.brand{margin:0 0 6px;font-size:12px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:#e2b552}
h1{margin:0;font-size:26px;font-weight:800;letter-spacing:-.01em}
p{margin:12px 0 0;font-size:15px;line-height:1.55;opacity:.75}
button{margin-top:28px;padding:13px 28px;border:0;border-radius:10px;background:#e2b552;color:#17213a;font:inherit;font-size:15px;font-weight:700;cursor:pointer}
button:active{transform:scale(.98)}</style></head>
<body><main><div class="icon"><svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h.01"/><path d="M8.5 16.43a5 5 0 0 1 7 0"/><path d="M5 12.86a10 10 0 0 1 5.17-2.69"/><path d="M19 12.86a10 10 0 0 0-2-1.54"/><path d="M2 8.82a15 15 0 0 1 4.18-2.65"/><path d="M22 8.82a15 15 0 0 0-11.29-3.76"/><path d="m2 2 20 20"/></svg></div>
<p class="brand">Bulan Señior Care</p><h1>You're offline</h1>
<p>Bulan Señior Care needs an internet connection. Check your connection and try again.</p>
<button onclick="location.reload()">Try again</button></main></body></html>`;

self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  event.respondWith(
    fetch(event.request).catch(
      () =>
        new Response(OFFLINE_PAGE, {
          status: 503,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        }),
    ),
  );
});
