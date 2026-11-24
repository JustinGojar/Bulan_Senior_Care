import { createHash } from "node:crypto";
import baseHeaders from "../../backend/resources/browser-security.json" with { type: "json" };

export function securityHeaders(html = "") {
  const hashes = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi)]
    .map((match) => match[1])
    .filter(Boolean)
    .map((script) => script.replace(/\r\n?/g, "\n").replace(/\0/g, "\uFFFD"))
    .map((script) => `'sha256-${createHash("sha256").update(script).digest("base64")}'`);
  return {
    ...baseHeaders,
    "Content-Security-Policy": baseHeaders["Content-Security-Policy"].replace(
      "script-src 'self'",
      `script-src 'self' ${[...new Set(hashes)].join(" ")}`,
    ),
  };
}
