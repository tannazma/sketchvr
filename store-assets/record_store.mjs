// Records store screenshots and a video of the CURRENT app at 1920x1080.
// Uses the same IWER Quest 3 emulator and Playwright setup as tests/.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";

const root = "/Users/tann/sketchvr";
const out = path.join(root, "store-assets");
const iwerSource = fs.readFileSync(path.join(root, "node_modules/iwer/build/iwer.min.js"), "utf8");
const sketchImage = path.join(root, "icons/icon-512.png");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".png": "image/png", ".webmanifest": "application/manifest+json" };

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  const file = path.join(root, urlPath === "/" ? "index.html" : urlPath);
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404).end(); return; }
  res.writeHead(200, { "content-type": TYPES[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const url = `http://127.0.0.1:${server.address().port}/index.html`;

const browser = await chromium.launch({
  channel: "chrome", headless: true,
  args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream", "--enable-unsafe-swiftshader"]
});
const context = await browser.newContext({
  viewport: { width: 2560, height: 1440 },
  recordVideo: { dir: path.join(out, "raw"), size: { width: 2560, height: 1440 } }
});
const page = await context.newPage();
await page.addInitScript(iwerSource);
await page.addInitScript(() => {
  const device = new IWER.XRDevice(IWER.metaQuest3);
  device.installRuntime({ forceInstall: true });
  window.__iwer = device;
  window.__THREE_DEVTOOLS__ = new EventTarget();
  window.__THREE_DEVTOOLS__.addEventListener("observe", (event) => {
    const renderer = event.detail;
    if (typeof renderer?.render !== "function") return;
    const render = renderer.render.bind(renderer);
    renderer.render = (scene, camera) => { window.__scene = scene; return render(scene, camera); };
  });
});
await page.goto(url, { waitUntil: "load" });
const wait = (ms) => page.waitForTimeout(ms);
const frames = (n) => page.evaluate((k) => new Promise((res) => { let l = k; const t = () => (--l <= 0 ? res() : requestAnimationFrame(t)); requestAnimationFrame(t); }), n);
const shot = (name) => page.screenshot({ path: path.join(out, "screenshots", name) });

// 1. Browser: sketch on the camera view
await page.setInputFiles("#imageUpload", sketchImage);
await page.click("#startButton");
await wait(2500);
await shot("store-1-camera-overlay.png");

// 2. Headset: enter, pin, and show the sketch in the room
await page.waitForFunction(() => !document.querySelector("#xrButton").hidden, null, { timeout: 15000 });
await page.click("#xrButton");
await page.waitForFunction(() => document.body.classList.contains("xr-active"), null, { timeout: 20000 });
await page.waitForFunction(() => window.__scene, null, { timeout: 20000 });
await wait(1500);
const headHeight = await page.evaluate(() => window.__iwer.position.y);
const aim = (t) => page.evaluate(([p, lift]) => {
  const c = window.__iwer.controllers.right;
  c.position.set(p.x, p.y + lift, p.z + 0.2); c.quaternion.set(0, 0, 0, 1);
}, [t, headHeight]);
await aim({ x: 0, y: 1.0, z: -1.5 });
await frames(5);
await page.evaluate(() => window.__iwer.controllers.right.updateButtonValue("trigger", 1));
await frames(3);
await page.evaluate(() => window.__iwer.controllers.right.updateButtonValue("trigger", 0));
await wait(1500);
await shot("store-2-headset-pinned.png");

// 3. Turn the head and walk: the sketch stays put
await page.evaluate(() => { const h = Math.sin(0.25), c = Math.cos(0.25); window.__iwer.quaternion.set(0, h, 0, c); });
await wait(1000);
await shot("store-3-headset-turned.png");
await page.evaluate(() => { const p = window.__iwer.position; p.set(p.x + 0.8, p.y, p.z - 0.6); });
await wait(1200);
await shot("store-4-headset-walked.png");

// 4. Open the HELP panel by aiming the right controller at the HELP tab
const helpPos = await page.evaluate(() => {
  let found = null;
  window.__scene.updateMatrixWorld(true);
  window.__scene.traverse((o) => { if (o.name === "helpTab") found = o; });
  if (!found) return null;
  const e = found.matrixWorld.elements;
  return { x: e[12], y: e[13], z: e[14] };
});
if (helpPos) {
  await page.evaluate(([t, lift]) => {
    const c = window.__iwer.controllers.right;
    c.position.set(t.x, t.y + lift, t.z + 0.2); c.quaternion.set(0, 0, 0, 1);
  }, [helpPos, headHeight]);
  await frames(5);
  await page.evaluate(() => window.__iwer.controllers.right.updateButtonValue("trigger", 1));
  await frames(3);
  await page.evaluate(() => window.__iwer.controllers.right.updateButtonValue("trigger", 0));
  await wait(1500);
}
await shot("store-5-headset-help.png");

// 5. Close: a short hold so the recording ends on the pinned sketch
await wait(2000);
await context.close();
await browser.close();
server.close();
console.log("recorded");
