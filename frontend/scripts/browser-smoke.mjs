// Run against a local deployment build served by Laravel; API fixtures prevent data writes.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

const base = process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:8088";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname)) {
  throw new Error("Browser smoke tests must target a local server.");
}
const chrome = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].find((path) => path && existsSync(path));
if (!chrome) throw new Error("Set CHROME_PATH to a Chromium browser executable.");
const browser = spawn(
  chrome,
  [
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "--remote-debugging-port=0",
    `--user-data-dir=${mkdtempSync(join(tmpdir(), "bulan-smoke-"))}`,
    "about:blank",
  ],
  { windowsHide: true, stdio: ["ignore", "ignore", "pipe"] },
);
let socket;
try {
  const endpoint = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Chrome startup timed out")), 15000);
    browser.once("error", reject);
    browser.stderr.on("data", (data) => {
      const match = String(data).match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if (match) {
        clearTimeout(timer);
        resolve(match[1]);
      }
    });
  });
  const port = new URL(endpoint).port;
  const pages = await fetch(`http://127.0.0.1:${port}/json/list`).then((r) => r.json());
  socket = new WebSocket(pages.find((page) => page.type === "page").webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.onopen = resolve;
    socket.onerror = reject;
  });
  let nextId = 0;
  const pending = new Map();
  const exceptions = [];
  const writes = [];
  const user = {
    id: 999,
    name: "Smoke Admin",
    role: "admin",
    email: "admin@example.test",
    status: "active",
    email_verified_at: "2026-01-01",
    granted_permissions: [],
  };
  const account = {
    id: 1000,
    name: "Test Head",
    first_name: "Test",
    last_name: "Head",
    email: "head@example.test",
    role: "head",
    status: "active",
    email_verified_at: "2026-01-01",
    birthdate: "1980-01-01",
    contact_number: "09171234567",
  };
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = ++nextId;
      pending.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params }));
    });
  socket.onmessage = async ({ data }) => {
    const event = JSON.parse(data);
    if (event.id) {
      const request = pending.get(event.id);
      pending.delete(event.id);
      if (event.error) request?.reject(new Error(event.error.message));
      else request?.resolve(event.result);
    }
    if (event.method === "Runtime.exceptionThrown")
      exceptions.push(event.params.exceptionDetails.text);
    if (event.method === "Fetch.requestPaused") {
      const { requestId, request } = event.params;
      const path = new URL(request.url).pathname;
      if (request.method !== "GET") writes.push(request);
      const body =
        path === "/api/user"
          ? user
          : path === "/api/admin/users"
            ? { data: [account], total: 1, last_page: 1, current_page: 1 }
            : path === "/api/admin/users/1000"
              ? account
              : path.includes("unread")
                ? { count: 0, data: [] }
                : [];
      await send("Fetch.fulfillRequest", {
        requestId,
        responseCode: 200,
        responseHeaders: [{ name: "Content-Type", value: "application/json" }],
        body: Buffer.from(JSON.stringify(body)).toString("base64"),
      });
    }
  };
  const evaluate = async (expression) => {
    const result = await send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (result.exceptionDetails) {
      throw new Error(
        result.exceptionDetails.exception?.description ?? result.exceptionDetails.text,
      );
    }
    return result.result.value;
  };
  const waitFor = async (expression) => {
    for (let attempt = 0; attempt < 100; attempt++) {
      if (await evaluate(expression)) return;
      await delay(100);
    }
    throw new Error(`Timed out: ${expression}`);
  };
  await send("Page.enable");
  await send("Runtime.enable");
  // Intercept every API request: this script never mutates the local database.
  await send("Fetch.enable", { patterns: [{ urlPattern: "*/api/*" }] });
  await send("Page.navigate", { url: `${base}/verify-email` });
  await waitFor('document.body?.innerText.includes("This verification link is incomplete")');
  assert.equal(await evaluate("location.pathname"), "/verify-email");
  console.log("PASS signed-out email verification route");

  const storageScript = await send("Page.addScriptToEvaluateOnNewDocument", {
    source:
      'Object.defineProperty(window,"localStorage",{get(){throw new DOMException("Blocked","SecurityError")}})',
  });
  await send("Page.navigate", { url: `${base}/login` });
  await waitFor(
    'Boolean(document.querySelector("button[aria-label=\\\"Switch to dark mode\\\"]"))',
  );
  await evaluate(
    'document.querySelector("button[aria-label=\\\"Switch to dark mode\\\"]").click()',
  );
  await waitFor('document.documentElement.classList.contains("dark")');
  console.log("PASS theme controls with blocked browser storage");
  await send("Page.removeScriptToEvaluateOnNewDocument", { identifier: storageScript.identifier });

  await send("Page.addScriptToEvaluateOnNewDocument", {
    source:
      'localStorage.setItem("bulan-session-id","smoke-session");sessionStorage.setItem("bulan-splash-shown","1")',
  });
  await send("Page.navigate", { url: `${base}/admin/users` });
  await waitFor('Boolean(document.querySelector("button[aria-label=\\\"Edit Test Head\\\"]"))');
  await evaluate(
    'document.querySelector("button[aria-label=\\\"Create user account\\\"]").click()',
  );
  await waitFor('Boolean(document.getElementById("user-password"))');
  // React's native setter plus a bubbling event simulates typing into controlled inputs.
  await evaluate(`for (const id of ["user-password","user-password-confirmation"]) {
    const input = document.getElementById(id);
    if (!input) continue;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set.call(input,"Canceled#Pass1");
    input.dispatchEvent(new Event("input",{bubbles:true}));
  }`);
  await evaluate(
    'document.querySelector("button[aria-label=\\\"Close create account form\\\"]").click()',
  );
  await evaluate('document.querySelector("button[aria-label=\\\"Edit Test Head\\\"]").click()');
  await waitFor('document.body.innerText.includes("Edit user account")');
  await evaluate('document.getElementById("user-email").form.requestSubmit()');
  await waitFor('!document.getElementById("user-email")');
  assert.equal(writes.length, 1);
  assert.ok(
    !writes[0].postData?.includes('name="password"'),
    "Canceled password leaked into account edit",
  );
  console.log("PASS canceled password does not alter another account");

  await waitFor('Boolean(document.querySelector("button[aria-label=\\\"Edit Test Head\\\"]"))');
  await evaluate('document.querySelector("button[aria-label=\\\"Edit Test Head\\\"]").click()');
  await waitFor('Boolean(document.getElementById("user-email"))');
  await evaluate(
    'document.querySelector("button[aria-label=\\\"Close create account form\\\"]").click()',
  );
  await evaluate(
    'document.querySelector("button[aria-label=\\\"Create user account\\\"]").click()',
  );
  await waitFor('document.body.innerText.includes("Create BSCA account")');
  assert.equal(await evaluate('document.getElementById("user-email").value'), "");
  console.log("PASS create account resets a canceled edit");
  for (const [width, height] of [
    [1280, 800],
    [390, 844],
  ]) {
    await send("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: width < 600,
    });
    const pinned = await evaluate(`(() => {
      const form = document.getElementById("user-email").form;
      form.scrollTop = 0;
      const header = form.firstElementChild;
      const before = header.getBoundingClientRect().top;
      form.scrollTop = form.scrollHeight;
      return Math.abs(header.getBoundingClientRect().top - before) < 1;
    })()`);
    assert.equal(pinned, true, `Account header moved at width ${width}`);
  }
  console.log("PASS account modal header stays visible on desktop and mobile");
  await send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: "reduce" }],
  });
  assert.equal(
    await evaluate('getComputedStyle(document.querySelector("tbody > tr")).animationName'),
    "none",
  );
  console.log("PASS reduced-motion preference disables row animations");

  user.role = "head";
  user.granted_permissions = ["users.view"];
  await send("Page.navigate", { url: `${base}/head/users` });
  await waitFor('document.body?.innerText.includes("Login accounts")');
  assert.equal(await evaluate("location.pathname"), "/head/users");
  assert.equal(
    await evaluate(
      'Boolean(document.querySelector("button[aria-label=\\\"Create user account\\\"]"))',
    ),
    false,
  );
  console.log("PASS granted user-list access without account mutation controls");

  user.must_change_password = true;
  await send("Page.navigate", { url: `${base}/head/dashboard` });
  await waitFor('location.pathname === "/head/profile"');
  console.log("PASS temporary passwords redirect to the password-change screen");

  user.must_change_password = false;
  user.role = "viewer";
  user.granted_permissions = [];
  await send("Page.navigate", { url: `${base}/viewer/users` });
  await waitFor('location.pathname === "/viewer/unauthorized"');
  console.log("PASS viewer URL prefix and denied user-list access");
  assert.deepEqual(exceptions, [], "Uncaught browser errors");
} finally {
  socket?.close();
  browser.kill();
}
