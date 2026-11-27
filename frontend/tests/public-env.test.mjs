import assert from "node:assert/strict";
import test from "node:test";
import { assertPublicEnvironment } from "../scripts/public-env.mjs";

test("public URL settings are allowed but browser API secrets fail the build", () => {
  assert.doesNotThrow(() => assertPublicEnvironment({ VITE_API_URL: "/api" }));
  assert.throws(() => assertPublicEnvironment({ VITE_API_KEY: "test-value" }), /VITE_API_KEY/);
  try {
    assertPublicEnvironment({ VITE_SECRET: "do-not-print-this-value" });
  } catch (error) {
    assert.ok(!error.message.includes("do-not-print-this-value"));
  }
});

test("Vercel public deployment and observability configuration are allowed", () => {
  assert.doesNotThrow(() =>
    assertPublicEnvironment({
      VITE_VERCEL_ENV: "production",
      VITE_VERCEL_URL: "example.vercel.app",
      VITE_VERCEL_OBSERVABILITY_CLIENT_CONFIG: JSON.stringify({
        analytics: { scriptSrc: "/example/script.js", eventEndpoint: "/example/event" },
      }),
    }),
  );
});

test("the Vercel prefix does not permit credentials or lookalike variable names", () => {
  for (const key of [
    "VITE_VERCEL_API_KEY",
    "VITE_VERCEL_TOKEN",
    "VITE_VERCEL_OBSERVABILITY_CLIENT_CONFIG_SECRET",
  ]) {
    assert.throws(() => assertPublicEnvironment({ [key]: "test-secret" }), /Unapproved/);
  }
});
