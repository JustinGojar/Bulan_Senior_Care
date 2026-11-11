import assert from "node:assert/strict";
import test from "node:test";
import { readLocalValue, removeLocalValue, writeLocalValue } from "../src/lib/browser-storage.ts";
import { PUBLIC_PATHS, ROLE_PREFIXES, hasSystemPermission } from "../src/lib/route-access.ts";
import { localDateInputValue } from "../src/lib/local-date.ts";
import { applyTheme, getTheme } from "../src/lib/theme.ts";
import { isRejectedSession } from "../src/lib/auth-response.ts";

test("unverified email ends a session without treating ordinary permission failures as logout", () => {
  assert.equal(isRejectedSession(401, null), true);
  assert.equal(isRejectedSession(403, { email_unverified: true }), true);
  assert.equal(isRejectedSession(403, { message: "Permission denied" }), false);
  assert.equal(isRejectedSession(403, null), false);
  assert.equal(isRejectedSession(500, { email_unverified: true }), false);
  assert.equal(isRejectedSession(200, {}), false);
});

test("session state and idle activity survive blocked browser storage", () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    get() {
      throw new DOMException("Storage blocked", "SecurityError");
    },
  });
  try {
    writeLocalValue("test-session", "session-one");
    writeLocalValue("test-activity", "12345");
    assert.equal(readLocalValue("test-session"), "session-one");
    assert.equal(readLocalValue("test-activity"), "12345");
    removeLocalValue("test-session");
    assert.equal(readLocalValue("test-session"), null);
  } finally {
    if (original) Object.defineProperty(globalThis, "localStorage", original);
    else delete globalThis.localStorage;
  }
});

test("failed writes override stale storage and removal prevents resurrecting a session", () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: () => "old-session",
      setItem() {
        throw new DOMException("Full", "QuotaExceededError");
      },
      removeItem() {
        throw new DOMException("Blocked", "SecurityError");
      },
    },
  });
  try {
    writeLocalValue("test-quota", "new-session");
    assert.equal(readLocalValue("test-quota"), "new-session");
    removeLocalValue("test-quota");
    assert.equal(readLocalValue("test-quota"), null);
  } finally {
    if (original) Object.defineProperty(globalThis, "localStorage", original);
    else delete globalThis.localStorage;
  }
});

test("email verification is public and every account role has a URL prefix", () => {
  assert.equal(PUBLIC_PATHS.has("/verify-email"), true);
  for (const role of ["admin", "head", "president", "encoder", "viewer"]) {
    assert.ok(ROLE_PREFIXES[role]);
  }
  assert.equal(PUBLIC_PATHS.has("/users"), false);
});

test("user-list access follows granted permissions without granting account mutations", () => {
  const head = { role: "head", granted_permissions: ["users.view"] };
  assert.equal(hasSystemPermission(head, "users.view"), true);
  assert.equal(hasSystemPermission(head, "users.create"), false);
  assert.equal(hasSystemPermission({ role: "viewer" }, "users.view"), false);
  assert.equal(hasSystemPermission(null, "users.view"), false);
  assert.equal(hasSystemPermission({ role: "admin" }, "users.view"), true);
});

test("date inputs use the local calendar date around UTC midnight", () => {
  const original = process.env.TZ;
  try {
    process.env.TZ = "Asia/Manila";
    assert.equal(localDateInputValue(new Date("2026-11-10T17:00:00Z")), "2026-11-11");
    process.env.TZ = "America/Los_Angeles";
    assert.equal(localDateInputValue(new Date("2026-11-11T01:00:00Z")), "2026-11-10");
  } finally {
    if (original === undefined) delete process.env.TZ;
    else process.env.TZ = original;
  }
});

test("theme controls remain usable when saving preferences is blocked", () => {
  const originals = Object.fromEntries(
    ["localStorage", "window", "document"].map((key) => [
      key,
      Object.getOwnPropertyDescriptor(globalThis, key),
    ]),
  );
  const applied = [];
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    get() {
      throw new DOMException("Blocked", "SecurityError");
    },
  });
  Object.defineProperty(globalThis, "window", { configurable: true, value: {} });
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: {
      documentElement: { classList: { toggle: (...args) => applied.push(args) }, style: {} },
    },
  });
  try {
    applyTheme("dark");
    assert.equal(getTheme(), "dark");
    assert.equal(document.documentElement.style.colorScheme, "dark");
    assert.deepEqual(applied, [["dark", true]]);
  } finally {
    for (const [key, descriptor] of Object.entries(originals)) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  }
});
