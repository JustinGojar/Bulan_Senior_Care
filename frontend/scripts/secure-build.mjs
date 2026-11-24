import { readFile, writeFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { securityHeaders } from "./browser-security.mjs";

// Vercel serves prerendered HTML without executing the application server.
// Hash only immutable build output and install headers before its filesystem routes.
const output = path.resolve(".vercel/output");
if (process.env.VERCEL) {
  const configFile = path.join(output, "config.json");
  if (!existsSync(configFile)) throw new Error("Vercel build output config is missing");
  const publicDir = path.join(output, "static");
  const files = await readdir(publicDir, { recursive: true });
  const html = (
    await Promise.all(
      files
        .filter((file) => file.endsWith(".html"))
        .map((file) => readFile(path.join(publicDir, file), "utf8")),
    )
  ).join("\n");
  const config = JSON.parse(await readFile(configFile, "utf8"));
  config.routes = [
    { src: "/(.*)", headers: securityHeaders(html), continue: true },
    { src: "/api(?:/.*)?", headers: { "Cache-Control": "no-store, private" }, continue: true },
    { src: "/storage/(.*)", headers: { "Cache-Control": "no-store, private" }, continue: true },
    ...(config.routes ?? []),
  ];
  await writeFile(configFile, JSON.stringify(config, null, 2));
}
