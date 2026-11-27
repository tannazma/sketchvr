// Tests for Sketch VR opened as the installed Meta Quest app (the Bubblewrap wrapper).
//
// In the app ("display-mode: standalone", immersive mode) there is no visible 2D page:
// if the page is not in a WebXR session, the headset shows a black screen with three
// loading dots, and Meta's review marks the app as crashed or unresponsive
// (VRC.Quest.Functional.1). These tests act out what a reviewer does and check that
// the app always gets back into VR:
//   - opening the app starts VR by itself,
//   - VR comes back after the session ends (Meta button, headset taken off, interruption),
//   - VR comes back when the app is shown again after being hidden,
//   - VR still starts when the first start attempt is refused,
//   - VR still starts when cdn.jsdelivr.net can't be reached (three.js is served from the site).
//
// Same requirements as vr-fixed-sketch.test.mjs: npm install and Google Chrome.

import { test, before, after, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const iwerSource = fs.readFileSync(path.join(root, "node_modules/iwer/build/iwer.min.js"), "utf8");

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".png": "image/png", ".webmanifest": "application/manifest+json", ".json": "application/json" };

// How long the app gets to (re-)enter VR before we call it "stuck on the dots".
const RECOVER_TIMEOUT_MS = 10000;

let server;
let baseUrl;
let browser;

before(async () => {
  server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    const file = path.join(root, urlPath === "/" ? "index.html" : urlPath);
    if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404).end("not found");
      return;
    }
    res.writeHead(200, { "content-type": TYPES[path.extname(file)] || "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}/index.html`;
  browser = await chromium.launch({
    channel: process.env.CHROME_CHANNEL ?? "chrome",
    executablePath: process.env.CHROME_PATH || undefined,
    headless: true
  });
});

after(async () => {
  await browser?.close();
  await new Promise((resolve) => server?.close(resolve));
});

let context;
let page;

beforeEach(async () => {
  context = await browser.newContext({ viewport: { width: 1000, height: 700 } });
});

afterEach(async () => {
  await context?.close();
});

// Open the page the way the installed app does.
// failFirstStarts: how many requestSession calls are refused before one is allowed.
async function openAsInstalledApp({ failFirstStarts = 0 } = {}) {
  page = await context.newPage();

  // 1. Emulated Quest 3 runtime, as in the other tests.
  await page.addInitScript(iwerSource);
  await page.addInitScript(() => {
    const device = new IWER.XRDevice(IWER.metaQuest3);
    device.installRuntime({ forceInstall: true });
    window.__iwer = device;
  });

  // 2. Pretend to be the installed app: "(display-mode: standalone)" matches.
  await page.addInitScript(() => {
    const realMatchMedia = window.matchMedia.bind(window);
    window.matchMedia = (query) => (/display-mode:\s*standalone/.test(query)
      ? {
          matches: true, media: query, onchange: null,
          addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {},
          dispatchEvent() { return false; }
        }
      : realMatchMedia(query));
  });

  // 3. Record every XR session the app starts, and optionally refuse the first ones.
  await page.addInitScript((failCount) => {
    window.__xrSessions = [];
    window.__xrStartAttempts = 0;
    let refusalsLeft = failCount;
    const realRequestSession = navigator.xr.requestSession.bind(navigator.xr);
    navigator.xr.requestSession = async (...args) => {
      window.__xrStartAttempts += 1;
      if (refusalsLeft > 0) {
        refusalsLeft -= 1;
        throw new DOMException("Simulated refusal by the headset", "NotAllowedError");
      }
      const session = await realRequestSession(...args);
      window.__xrSessions.push(session);
      return session;
    };
  }, failFirstStarts);

  await page.goto(baseUrl, { waitUntil: "load" });
}

const appState = () => page.evaluate(() => ({
  inVR: document.body.classList.contains("xr-active"),
  sessionsStarted: window.__xrSessions.length,
  startAttempts: window.__xrStartAttempts,
  status: document.querySelector("#statusText")?.textContent,
  hiddenError: document.querySelector("#errorMessage")?.textContent
}));

// Wait until the app is in VR with at least `sessions` sessions started so far.
// On timeout, fail with a plain description of what a reviewer would see.
async function expectBackInVR(sessions, situation) {
  try {
    await page.waitForFunction(
      (count) => document.body.classList.contains("xr-active") && window.__xrSessions.length >= count,
      sessions,
      { timeout: RECOVER_TIMEOUT_MS }
    );
  } catch {
    const state = await appState();
    assert.fail(
      `${situation}: the app was still out of VR after ${RECOVER_TIMEOUT_MS / 1000} s. ` +
      "On the headset this is the black screen with three loading dots. " +
      `State: ${JSON.stringify(state)}`
    );
  }
}

// End the current XR session, as Horizon OS does when the Meta button is pressed,
// the headset is taken off, or the app is interrupted.
async function endCurrentSession() {
  await page.evaluate(async () => {
    const session = window.__xrSessions.at(-1);
    await session.end();
  });
  await page.waitForFunction(() => !document.body.classList.contains("xr-active"), null, { timeout: 5000 });
}

async function setPageVisibility(state) {
  await page.evaluate((visibility) => {
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => visibility });
    Object.defineProperty(document, "hidden", { configurable: true, get: () => visibility === "hidden" });
    document.dispatchEvent(new Event("visibilitychange"));
  }, state);
}

test("installed app: opening it starts VR by itself", async () => {
  await openAsInstalledApp();
  await expectBackInVR(1, "Opening the app");
});

test("installed app: VR comes back after the session ends (Meta button / interruption)", async () => {
  await openAsInstalledApp();
  await expectBackInVR(1, "Opening the app");
  await endCurrentSession();
  await expectBackInVR(2, "After the VR session ended");
});

test("installed app: VR comes back when the app is shown again (headset off and on)", async () => {
  await openAsInstalledApp();
  await expectBackInVR(1, "Opening the app");
  // Headset taken off: the page is hidden and the session ends.
  await setPageVisibility("hidden");
  await endCurrentSession();
  // While hidden, the app must not keep trying to start VR.
  await new Promise((resolve) => setTimeout(resolve, 2000));
  assert.equal((await appState()).sessionsStarted, 1, "the app started VR while it was hidden");
  // Headset back on: the page is visible again.
  await setPageVisibility("visible");
  await expectBackInVR(2, "After the headset was put back on");
});

test("installed app: VR still starts when the first start attempt is refused", async () => {
  await openAsInstalledApp({ failFirstStarts: 1 });
  await expectBackInVR(1, "Opening the app after one refused start");
  // It retried, but not in a tight loop.
  const { startAttempts } = await appState();
  assert.ok(startAttempts <= 3, `the app tried to start VR ${startAttempts} times`);
});

test("installed app: VR still starts when the three.js CDN can't be reached", async () => {
  await context.route("https://cdn.jsdelivr.net/**", (route) => route.abort("internetdisconnected"));
  await openAsInstalledApp();
  await expectBackInVR(1, "Opening the app without access to cdn.jsdelivr.net");
});
