// Service worker for the installable app (PWA). Chrome on Android needs one to offer
// "Install app". It caches nothing: records and sessions always come from the server,
// so a new deploy or a signed-out account can never be served from a stale copy.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

const OFFLINE_PAGE = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>Offline · Bulan Senior Care</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;font-family:system-ui,sans-serif;background:#f4f6fa;color:#1f3254;text-align:center;padding:24px;box-sizing:border-box}
button{margin-top:16px;padding:12px 20px;border:0;border-radius:10px;background:#1f3254;color:#fff;font-weight:600;font-size:15px}</style></head>
<body><div><h1>You're offline</h1><p>Bulan Senior Care needs an internet connection. Check your connection and try again.</p>
<button onclick="location.reload()">Try again</button></div></body></html>`;

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
