import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { securityHeaders } from "../scripts/browser-security.mjs";

test("CSP allows the exact build startup scripts without allowing arbitrary inline scripts", () => {
  const script = "\r\nwindow.ready = '\0';\r\n";
  const headers = securityHeaders(`<script>${script}</script><script src="/app.js"></script>`);
  assert.ok(
    headers["Content-Security-Policy"].includes(
      `'sha256-${createHash("sha256").update(script.replace(/\r\n/g, "\n").replace(/\0/g, "\uFFFD")).digest("base64")}'`,
    ),
  );
  assert.ok(!headers["Content-Security-Policy"].includes("script-src 'self' 'unsafe-inline'"));
  assert.equal(headers["X-Frame-Options"], "DENY");
  assert.equal(headers["X-Content-Type-Options"], "nosniff");
});
