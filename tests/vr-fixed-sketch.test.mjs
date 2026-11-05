// End-to-end tests for the headset (WebXR) behaviour of Sketch VR.
//
// They run the real index.html in Chrome with the IWER WebXR emulator (the same
// engine as the Immersive Web Emulator extension) and check that:
//   - pressing the trigger fixes the sketch in space,
//   - the fixed sketch does not move when the head turns or the user walks,
//   - the thumbstick slides a fixed sketch along the wall,
//   - the trigger on empty space does not unfix it,
//   - pressing UNFIX releases it, so it follows the view again.
//
// Requires: npm install, and Google Chrome installed (or set CHROME_CHANNEL="" and
// CHROME_PATH to a Chromium binary). Three.js is loaded from the CDN, so the
// machine needs internet access.

import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const iwerSource = fs.readFileSync(path.join(root, "node_modules/iwer/build/iwer.min.js"), "utf8");
const sketchImage = path.join(root, "icons/icon-512.png");

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".png": "image/png", ".webmanifest": "application/manifest+json", ".json": "application/json" };

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
    headless: true,
    args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"]
  });
});

after(async () => {
  await browser?.close();
  await new Promise((resolve) => server?.close(resolve));
});

let page;
let headHeight = 0;
const pageErrors = [];

beforeEach(async () => {
  const context = await browser.newContext({ viewport: { width: 1000, height: 700 } });
  page = await context.newPage();
  pageErrors.length = 0;
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") pageErrors.push(message.text());
  });

  // 1. Emulated Quest 3 runtime (overrides any native WebXR, as the extension does).
  await page.addInitScript(iwerSource);
  await page.addInitScript(() => {
    const device = new IWER.XRDevice(IWER.metaQuest3);
    device.installRuntime({ forceInstall: true });
    window.__iwer = device;
  });
  // 2. Let the test read the three.js scene: three dispatches "observe" with each
  //    renderer, so we wrap render() to remember the scene it draws. The app is unchanged.
  await page.addInitScript(() => {
    window.__THREE_DEVTOOLS__ = new EventTarget();
    window.__THREE_DEVTOOLS__.addEventListener("observe", (event) => {
      const renderer = event.detail;
      if (typeof renderer?.render !== "function") return;
      const render = renderer.render.bind(renderer);
      renderer.render = (scene, camera) => {
        window.__scene = scene;
        return render(scene, camera);
      };
    });
  });

  await page.goto(baseUrl, { waitUntil: "load" });
});

// Upload a sketch, enter the headset session and wait for it to be running.
async function enterHeadset() {
  await page.setInputFiles("#imageUpload", sketchImage);
  await page.waitForFunction(() => !document.querySelector("#xrButton").hidden, null, { timeout: 15000 });
  await page.click("#xrButton");
  await page.waitForFunction(() => document.body.classList.contains("xr-active"), null, { timeout: 15000 });
  await page.waitForFunction(() => window.__scene, null, { timeout: 15000 });
  await frames(5);
  headHeight = await page.evaluate(() => window.__iwer.position.y);
}

const frames = (count) => page.evaluate((n) => new Promise((resolve) => {
  let left = n;
  const tick = () => (--left <= 0 ? resolve() : requestAnimationFrame(tick));
  requestAnimationFrame(tick);
}), count);

const hint = () => page.textContent("#xrPlacementHint");

// World position of the sketch plane (the mesh textured with the uploaded <img>).
const sketchPosition = () => page.evaluate(() => {
  let found = null;
  window.__scene.updateMatrixWorld(true);
  window.__scene.traverse((object) => {
    if (found || !object.isMesh) return;
    const map = object.material?.map;
    if (map?.image?.tagName === "IMG" && object.geometry.type === "PlaneGeometry") found = object;
  });
  if (!found) return null;
  const e = found.matrixWorld.elements;
  return { x: e[12], y: e[13], z: e[14] };
});

// World position of the UNFIX button (a 0.16 x 0.04 plane attached to the camera).
const unfixPosition = () => page.evaluate(() => {
  let found = null;
  window.__scene.updateMatrixWorld(true);
  window.__scene.traverse((object) => {
    if (found || !object.isMesh) return;
    const p = object.geometry.parameters;
    if (p && Math.abs(p.width - 0.16) < 1e-6 && Math.abs(p.height - 0.04) < 1e-6) found = object;
  });
  const e = found.matrixWorld.elements;
  return { x: e[12], y: e[13], z: e[14] };
});

const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

// Press and release the right controller trigger.
async function pressTrigger(controller = "right") {
  await page.evaluate((name) => window.__iwer.controllers[name].updateButtonValue("trigger", 1), controller);
  await frames(3);
  await page.evaluate((name) => window.__iwer.controllers[name].updateButtonValue("trigger", 0), controller);
  await frames(5);
}

// Point the right controller at a scene position (ray goes -Z, so start 0.2 m in front).
// The emulator reports poses relative to the headset, which starts 1.6 m above the
// scene floor, so the height is added back here.
async function aimRightControllerAt(target) {
  await page.evaluate(([t, lift]) => {
    const c = window.__iwer.controllers.right;
    c.position.set(t.x, t.y + lift, t.z + 0.2);
    c.quaternion.set(0, 0, 0, 1);
  }, [target, headHeight]);
  await frames(3);
}

async function turnHead(degrees) {
  await page.evaluate((deg) => {
    const half = (deg * Math.PI / 180) / 2;
    window.__iwer.quaternion.set(0, Math.sin(half), 0, Math.cos(half));
  }, degrees);
  await frames(5);
}

async function walk(dx, dz) {
  await page.evaluate(([x, z]) => {
    const p = window.__iwer.position;
    p.set(p.x + x, p.y, p.z + z);
  }, [dx, dz]);
  await frames(5);
}

function assertNoErrors() {
  assert.deepEqual(pageErrors, [], "page reported errors");
}

test("trigger fixes the sketch in space", async () => {
  await enterHeadset();
  assert.match(await hint(), /Wall found|No wall found|Aim/);

  await pressTrigger();
  assert.match(await hint(), /^Pinned/, "hint should report the sketch is fixed");
  assertNoErrors();
});

test("fixed sketch stays in place when the head turns", async () => {
  await enterHeadset();
  await pressTrigger();
  const before = await sketchPosition();
  assert.ok(before, "sketch plane should exist");

  await turnHead(60);
  const after = await sketchPosition();
  assert.ok(distance(before, after) < 1e-4, `sketch moved by ${distance(before, after)} m when the head turned`);
  assert.match(await hint(), /^Pinned/);
  assertNoErrors();
});

test("fixed sketch stays in place when the user walks", async () => {
  await enterHeadset();
  await pressTrigger();
  const before = await sketchPosition();

  await walk(1.0, -0.8);
  const after = await sketchPosition();
  assert.ok(distance(before, after) < 1e-4, `sketch moved by ${distance(before, after)} m when the user walked`);
  assert.match(await hint(), /^Pinned/);
  assertNoErrors();
});

test("thumbstick slides a fixed sketch along the wall", async () => {
  await enterHeadset();
  await pressTrigger();
  const before = await sketchPosition();

  await page.evaluate(() => window.__iwer.controllers.right.updateAxes("thumbstick", 1, 0));
  await frames(30);
  await page.evaluate(() => window.__iwer.controllers.right.updateAxes("thumbstick", 0, 0));
  await frames(5);
  const after = await sketchPosition();
  assert.ok(distance(before, after) > 0.01, "thumbstick should move the fixed sketch");
  assert.match(await hint(), /^Pinned/);
  assertNoErrors();
});

test("trigger on empty space does not unfix the sketch", async () => {
  await enterHeadset();
  await pressTrigger();
  await aimRightControllerAt({ x: 6, y: 1, z: 6 });
  await pressTrigger();
  assert.match(await hint(), /^Pinned/, "pressing away from the sketch must keep it fixed");
  assertNoErrors();
});

test("UNFIX releases the sketch so it follows the view again", async () => {
  await enterHeadset();
  await pressTrigger();
  assert.match(await hint(), /^Pinned/, "precondition: the sketch must be fixed first");
  await aimRightControllerAt(await unfixPosition());
  await pressTrigger();
  assert.match(await hint(), /Wall found|No wall found|Aim/, "UNFIX should return to placement mode");

  const before = await sketchPosition();
  await turnHead(60);
  const after = await sketchPosition();
  assert.ok(distance(before, after) > 0.05, "after UNFIX the sketch should move with the head");
  assertNoErrors();
});
