// Grafika pro sociální sítě do docs/brand/: profilovky (tmavá/světlá, 1080 a 400 px),
// náhled ořezu do kruhu a bannery (X, GitHub social preview, LinkedIn, Reddit).
// Kreslí se HTML v headless Chrome/Edge přes CDP (bez dalších závislostí): ikona z app-icon.png
// (zdroj 1024 px, z něj vznikly src-tauri/icons), písmo Inter z @fontsource/inter,
// výřez skutečného snímku docs/screenshots/hero-dark.png (bez úprav, jen zmenšený a oříznutý rámem).
// node scripts/docs-media/brand.mjs   (prohlížeč jde přepsat proměnnou CHROME=<cesta k exe>)
import fs from "fs";
import os from "os";
import path from "path";
import { spawn } from "child_process";
import { fileURLToPath } from "url";

const root = (p) => fileURLToPath(new URL(`../../${p}`, import.meta.url));
const OUT = root("docs/brand");
const dataUri = (file, mime) => `data:${mime};base64,${fs.readFileSync(file).toString("base64")}`;

const ICON = dataUri(root("app-icon.png"), "image/png");
const SHOT = dataUri(root("docs/screenshots/hero-dark.png"), "image/png");
const font = (w) => `@font-face { font-family: Inter; font-weight: ${w};
  src: url(${dataUri(root(`node_modules/@fontsource/inter/files/inter-latin-${w}-normal.woff2`), "font/woff2")}) format("woff2"); }`;
const FONTS = [400, 500, 700].map(font).join("\n");

const TITLE = "Dirwise";
const SUB = "A fast file manager for Windows";
// V bannerech záměrně na dva řádky (jinak se zalomí jen „Windows“).
const SUB_HTML = SUB.replace(" for ", "<br>for ");

// Barvy tmavého a světlého tématu aplikace (index.css: --glass-sidebar, --bg-window, --text-primary).
const BG = {
  dark: "radial-gradient(120% 90% at 30% 15%, #34343a 0%, #232325 45%, #161618 100%)",
  light: "radial-gradient(120% 90% at 30% 15%, #ffffff 0%, #f5f5f7 45%, #e3e3e8 100%)",
};

const page = (w, h, body, css = "") => `<!doctype html><html><head><meta charset="utf-8"><style>
${FONTS}
* { margin: 0; box-sizing: border-box; }
html, body { width: ${w}px; height: ${h}px; overflow: hidden; }
body { font-family: Inter, sans-serif; -webkit-font-smoothing: antialiased; }
${css}
</style></head><body>${body}</body></html>`;

// Profilovka: ikona uprostřed, okraj 18 % z každé strany (ikona = 64 % strany), aby ji kruh neořízl.
function profile(size, theme) {
  const icon = Math.round(size * 0.64);
  return page(size, size, `<div class="bg"><img src="${ICON}"></div>`, `
.bg { width: 100%; height: 100%; background: ${BG[theme]}; display: grid; place-items: center; }
img { width: ${icon}px; height: ${icon}px;
  filter: drop-shadow(0 ${size * 0.012}px ${size * 0.03}px rgba(0,0,0,${theme === "dark" ? 0.55 : 0.22})); }`);
}

// Náhled ořezu: obě varianty, celý čtverec zeslabený, kruh v plné síle s obrysem.
function circlePreview(files) {
  const S = 420, GAP = 60, PAD = 60;
  const w = files.length * S + (files.length - 1) * GAP + 2 * PAD, h = S + 2 * PAD + 40;
  const tiles = files.map(([label, uri]) => `<figure>
    <div class="t"><img class="sq" src="${uri}"><img class="ci" src="${uri}"></div>
    <figcaption>${label}</figcaption></figure>`).join("");
  return [w, h, page(w, h, `<main>${tiles}</main>`, `
main { width: 100%; height: 100%; background: #8a8a90; display: flex; gap: ${GAP}px; padding: ${PAD}px; }
figure { display: flex; flex-direction: column; align-items: center; gap: 14px; }
.t { position: relative; width: ${S}px; height: ${S}px; }
.t img { position: absolute; inset: 0; width: 100%; height: 100%; }
.sq { opacity: 0.3; }
.ci { border-radius: 50%; box-shadow: 0 0 0 2px #fff; }
figcaption { color: #fff; font: 500 18px Inter; }`)];
}

// Banner: blok ikona + nápis vlevo od středu, vpravo výřez snímku jako okno vybíhající z banneru.
// o = { w, h, icon, title, sub, left (x bloku textu), shot: { x, y, w } }
function banner(o) {
  const sh = o.shot;
  return page(o.w, o.h, `<div class="bg">
  <div class="brand"><img class="icon" src="${ICON}"><div><h1>${TITLE}</h1><p>${SUB_HTML}</p></div></div>
  <div class="win"><img src="${SHOT}"></div></div>`, `
.bg { position: relative; width: 100%; height: 100%; overflow: hidden; background:
  radial-gradient(60% 120% at ${sh.x + sh.w * 0.4}px ${o.h}px, rgba(49,113,240,0.30) 0%, rgba(49,113,240,0) 70%), ${BG.dark}; }
.brand { position: absolute; left: ${o.left}px; top: 50%; transform: translateY(-50%);
  display: flex; align-items: center; gap: ${o.icon * 0.28}px; }
.icon { width: ${o.icon}px; height: ${o.icon}px; flex: none; filter: drop-shadow(0 4px 14px rgba(0,0,0,0.5)); }
h1 { color: #f5f5f7; font-weight: 700; font-size: ${o.title}px; letter-spacing: -0.02em; line-height: 1.05; }
p { color: #a1a1a6; font-weight: 500; font-size: ${o.sub}px; margin-top: ${o.sub * 0.45}px; line-height: 1.3; }
.win { position: absolute; left: ${sh.x}px; top: ${sh.y}px; width: ${sh.w}px; border-radius: ${sh.w * 0.012}px;
  overflow: hidden; box-shadow: 0 0 0 1px rgba(255,255,255,0.14), 0 24px 60px rgba(0,0,0,0.6); }
.win img { display: block; width: 100%; }`);
}

const BANNERS = {
  // Profilovka X překrývá levý dolní roh (~ 0–260 × 330–500), obsah drž ve středu.
  "x-header.png": { w: 1500, h: 500, icon: 104, title: 64, sub: 23, left: 300, shot: { x: 850, y: 130, w: 600 } },
  "github-social.png": { w: 1280, h: 640, icon: 120, title: 72, sub: 26, left: 80, shot: { x: 690, y: 150, w: 720 } },
  // LinkedIn: profilovka zakrývá levou část, obsah od středu doprava.
  "linkedin-banner.png": { w: 1584, h: 396, icon: 88, title: 54, sub: 20, left: 560, shot: { x: 1080, y: 70, w: 560 } },
  // Reddit ořezává okraje podle šířky okna, obsah ve středu.
  "reddit-banner.png": { w: 1920, h: 384, icon: 92, title: 56, sub: 21, left: 520, shot: { x: 1060, y: 60, w: 520 } },
};

// --- headless prohlížeč přes CDP ---
function findBrowser() {
  const cands = [process.env.CHROME,
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files/Microsoft/Edge/Application/msedge.exe"].filter(Boolean);
  const exe = cands.find((c) => fs.existsSync(c));
  if (!exe) { console.error("Nenašel jsem Chrome ani Edge – nastav CHROME=<cesta k exe>."); process.exit(1); }
  return exe;
}

const PORT = 9334;
const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), "dirwise-brand-"));
const proc = spawn(findBrowser(), ["--headless=new", `--remote-debugging-port=${PORT}`, `--user-data-dir=${profileDir}`,
  "--no-first-run", "--hide-scrollbars", "--force-color-profile=srgb", "about:blank"], { stdio: "ignore" });

let target;
for (let i = 0; i < 50 && !target; i++) {
  try { target = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).find((t) => t.type === "page"); }
  catch { await new Promise((r) => setTimeout(r, 200)); }
}
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
let id = 0;
const pending = new Map();
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
};
const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });

async function render(html, w, h, file) {
  await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: false });
  const frameId = (await send("Page.getFrameTree")).frameTree.frame.id;
  await send("Page.setDocumentContent", { frameId, html });
  // Počkat na písma a dekódování obrázků.
  await send("Runtime.evaluate", { expression: "Promise.all([document.fonts.ready, ...[...document.images].map(i => i.decode())])", awaitPromise: true });
  const r = await send("Page.captureScreenshot", { format: "png", clip: { x: 0, y: 0, width: w, height: h, scale: 1 } });
  const buf = Buffer.from(r.data, "base64");
  fs.writeFileSync(path.join(OUT, file), buf);
  console.log(`${file}  ${w}×${h}  ${(buf.length / 1024).toFixed(0)} kB`);
  return buf;
}

try {
  fs.mkdirSync(OUT, { recursive: true });
  await send("Page.enable");
  const previews = [];
  for (const theme of ["dark", "light"]) {
    for (const size of [1080, 400]) {
      const buf = await render(profile(size, theme), size, size, `profile-${size}-${theme}.png`);
      if (size === 1080) previews.push([`profile-1080-${theme}.png`, `data:image/png;base64,${buf.toString("base64")}`]);
    }
  }
  const [cw, ch, chtml] = circlePreview(previews);
  await render(chtml, cw, ch, "preview-circle.png");
  for (const [file, o] of Object.entries(BANNERS)) await render(banner(o), o.w, o.h, file);
} finally {
  ws.close();
  proc.kill();
  await new Promise((r) => setTimeout(r, 500));
  fs.rmSync(profileDir, { recursive: true, force: true });
}
