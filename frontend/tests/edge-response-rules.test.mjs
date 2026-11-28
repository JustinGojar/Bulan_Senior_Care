import assert from "node:assert/strict";
import test from "node:test";
import { edgeResponseRules } from "../scripts/edge-response-rules.mjs";

function applyRules(path, incoming) {
  const headers = new Headers(incoming);
  for (const rule of edgeResponseRules()) {
    if (!new RegExp(`^${rule.src}$`).test(path)) continue;
    assert.equal(rule.continue, true);
    for (const transform of rule.transforms) {
      assert.equal(transform.type, "response.headers");
      assert.equal(transform.op, "delete");
      headers.delete(transform.target.key);
    }
  }
  return headers;
}

test("static responses lose cross-origin grants without losing security or caching headers", () => {
  for (const path of ["/robots.txt", "/", "/assets/app.js", "/assets/font.woff2"]) {
    const result = applyRules(path, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Expose-Headers": "*",
      "Cache-Control": "public, max-age=3600",
      "Content-Security-Policy": "default-src 'self'",
    });
    assert.equal(result.has("access-control-allow-origin"), false);
    assert.equal(result.has("access-control-allow-credentials"), false);
    assert.equal(result.has("access-control-expose-headers"), false);
    assert.equal(result.get("cache-control"), "public, max-age=3600");
    assert.equal(result.get("content-security-policy"), "default-src 'self'");
  }
});

test("proxied responses lose hosting clues but keep cookies and intentional API CORS", () => {
  for (const path of ["/api", "/api/user", "/storage/file.png"]) {
    const result = applyRules(path, {
      "X-Railway-Edge": "sin1",
      "X-Hikari-Trace": "sin1.example",
      "Access-Control-Allow-Origin": "https://trusted.example",
      "Set-Cookie": "session=example; HttpOnly; Secure; SameSite=Strict",
      "Cache-Control": "private, no-store",
    });
    assert.equal(result.has("x-railway-edge"), false);
    assert.equal(result.has("x-hikari-trace"), false);
    assert.equal(result.get("access-control-allow-origin"), "https://trusted.example");
    assert.ok(result.get("set-cookie").includes("HttpOnly"));
    assert.equal(result.get("cache-control"), "private, no-store");
  }
});
