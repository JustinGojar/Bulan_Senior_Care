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
