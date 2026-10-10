import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

const apiProxyTarget = process.env["VITE_API_PROXY_TARGET"] ?? "http://127.0.0.1:8000";
// Set on Vercel: the Laravel API's public URL (e.g. https://bulan-api.up.railway.app).
const backendUrl = process.env["BACKEND_URL"]?.replace(/\/$/, "");

export default defineConfig(({ mode }) => ({
  base: mode === "production" && !process.env["VERCEL"] ? "/spa-assets/" : "/",
  resolve: { tsconfigPaths: true },
  // Paths with a file extension (uploaded images like /storage/x.png) are answered by Vite's
  // static handler and never reach Nitro's devProxy below, so /storage needs Vite's proxy too.
  server: { proxy: { "/storage": { target: apiProxyTarget, changeOrigin: true } } },
  plugins: [
    tanstackStart({
      server: { entry: "server" },
      spa: { enabled: true },
      router: { basepath: "/" },
    }),
    // Serves Laravel from the dev server's own origin so the API's session cookie applies.
    // Nitro's dev server answers every request before Vite's `server.proxy` sees it, so the
    // proxy has to be Nitro's (development only; production serves the SPA from Laravel).
    nitro({
      devProxy: {
        "/api/**": apiProxyTarget,
        "/storage/**": apiProxyTarget,
      },
      // On Vercel the browser still calls /api on the site's own origin, which Vercel forwards
      // to Laravel, so the API's SameSite=Strict session cookie keeps working.
      routeRules: backendUrl
        ? {
            "/api/**": { proxy: `${backendUrl}/api/**` },
            "/storage/**": { proxy: `${backendUrl}/storage/**` },
          }
        : {},
    }),
    react(),
    tailwindcss(),
  ],
}));
