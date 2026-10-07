import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

export default defineConfig(({ mode }) => ({
  base: mode === "production" ? "/spa-assets/" : "/",
  resolve: { tsconfigPaths: true },
  server: {
    // Serves Laravel from the dev server's own origin so the API's session cookie applies.
    proxy: Object.fromEntries(
      ["/api", "/storage"].map((path) => [
        path,
        process.env["VITE_API_PROXY_TARGET"] ?? "http://127.0.0.1:8000",
      ]),
    ),
  },
  plugins: [
    tanstackStart({
      server: { entry: "server" },
      spa: { enabled: true },
      router: { basepath: "/" },
    }),
    nitro(),
    react(),
    tailwindcss(),
  ],
}));
