import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

export default defineConfig(({ mode }) => ({
  base: mode === "production" ? "/spa-assets/" : "/",
  resolve: { tsconfigPaths: true },
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
