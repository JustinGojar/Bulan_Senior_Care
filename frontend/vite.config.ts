import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

const apiProxyTarget = process.env["VITE_API_PROXY_TARGET"] ?? "http://127.0.0.1:8000";

export default defineConfig(({ mode }) => ({
  base: mode === "production" ? "/spa-assets/" : "/",
  resolve: { tsconfigPaths: true },
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
    }),
    react(),
    tailwindcss(),
  ],
}));
