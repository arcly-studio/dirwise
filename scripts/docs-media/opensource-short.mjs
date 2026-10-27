// Krátké video „open source“ (1080×1920): skutečné stránky repozitáře na GitHubu v mobilním zobrazení
// (headless Chrome, bez přihlášení, čistý profil) – repo, MIT licence, README, issues „good first issue“,
// detail jednoho issue. Snímky se pořizují po jednom (deterministický scroll a animace), střihy padají
// na doby skladby (BPM). Nahoře pás se štítkem a titulkem kroku, na konci karta s adresou repa.
// node scripts/docs-media/opensource-short.mjs [--out <složka>] [--bpm 116]
import fs from "fs";
import os from "os";
import path from "path";
import { execFileSync, spawn } from "child_process";
import { fileURLToPath } from "url";

const root = (p) => fileURLToPath(new URL(`../../${p}`, import.meta.url));
const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : def; };
const OUT = path.resolve(opt("--out", path.join(os.tmpdir(), "dirwise-shorts")));
const BPM = Number(opt("--bpm", 116));
const WORK = path.join(os.tmpdir(), "dirwise-opensource-work");
const W = 1080, H = 1920, FPS = 30, BAND = 400;
const VW = 432, VH = (H - BAND) / 2.5, DPR = 2.5; // 432×608 CSS = 1080×1520 px
const ACC = "#ff96dc";
const REPO = "https://github.com/arcly-studio/dirwise";
const BEAT = 60 / BPM;
const END_S = 2, XFADE = 0.3;

// ---------- headless Chrome ----------
async function launch(port = 9336) {
  const exe = [process.env.CHROME, "C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "C:/Program Files/Microsoft/Edge/Application/msedge.exe"].filter(Boolean).find((c) => fs.existsSync(c));
  if (!exe) throw new Error("Nenašel jsem Chrome ani Edge – nastav CHROME=<cesta k exe>.");
  const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), "dirwise-gh-"));
  const proc = spawn(exe, ["--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${profileDir}`, "--no-first-run",
    "--hide-scrollbars", "--force-color-profile=srgb", "--lang=en-US", "--accept-lang=en-US", "about:blank"], { stdio: "ignore" });
  let target;
  for (let i = 0; i < 60 && !target; i++) {
    try { target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === "page"); }
    catch { await new Promise((r) => setTimeout(r, 200)); }
  }
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  let id = 0; const pending = new Map(), listeners = [];
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
    else listeners.forEach((l) => l(m));
  };
  const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
  const evaluate = async (expression) => {
    const r = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 400));
    return r.result.value;
  };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const goto = async (url) => {
    const loaded = new Promise((r) => { const l = (m) => { if (m.method === "Page.loadEventFired") { listeners.splice(listeners.indexOf(l), 1); r(); } }; listeners.push(l); });
    await send("Page.navigate", { url });
    await loaded;
    await sleep(2500);
  };
  const close = async () => {
    ws.close(); proc.kill(); await sleep(500);
    try { fs.rmSync(profileDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 }); } catch {}
  };
  await send("Page.enable");
  return { send, evaluate, goto, sleep, close };
}

// ---------- překryvy (pás nahoře, závěrečná karta) ----------
const dataUri = (file, mime) => `data:${mime};base64,${fs.readFileSync(file).toString("base64")}`;
const FONTS = [500, 800].map((w) => `@font-face{font-family:Inter;font-weight:${w};
  src:url(${dataUri(root(`node_modules/@fontsource/inter/files/inter-latin-${w}-normal.woff2`), "font/woff2")}) format("woff2")}`).join("\n");
const page = (body, css) => `<!doctype html><html><head><meta charset="utf-8"><style>${FONTS}
*{margin:0;box-sizing:border-box}html,body{width:${W}px;height:${H}px;overflow:hidden;background:transparent}
body{font-family:Inter,sans-serif;-webkit-font-smoothing:antialiased;color:#fff}${css}</style></head><body>${body}</body></html>`;
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const accent = (t) => esc(t).replace(/\[(.+?)\]/g, `<b>$1</b>`);
// Pás: barva pozadí GitHubu (tmavé téma), štítek a titulek; big = úvodní háček (větší písmo).
const band = (text, big) => page(`<div class="band"></div><div class="chip">OPEN SOURCE · MIT</div><h2 class="${big ? "big" : ""}">${accent(text)}</h2>`, `
.band{position:absolute;left:0;top:0;width:${W}px;height:${BAND}px;background:linear-gradient(#0d1117 0%,#0d1117 88%,#0d111700 100%)}
.chip{position:absolute;left:50%;top:120px;transform:translateX(-50%);padding:8px 30px;border-radius:40px;border:3px solid #fff9;
 background:#0008;color:${ACC};font-weight:800;font-size:38px;letter-spacing:1px;white-space:nowrap}
h2{position:absolute;left:30px;right:30px;top:205px;height:170px;display:flex;align-items:center;justify-content:center;flex-wrap:wrap;
 text-align:center;font-weight:800;font-size:68px;letter-spacing:-2px;line-height:1.12}
h2.big{font-size:76px}
h2 b{color:#14161c;background:${ACC};border-radius:18px;padding:0 16px;margin:0 6px;font-weight:800}`);
const endCard = () => page(`<main><img src="${dataUri(root("app-icon.png"), "image/png")}"><h1>Dirwise</h1>
<p>Free &amp; open source · MIT</p><div class="url">github.com/arcly-studio/dirwise</div></main>`, `
main{width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;
 background:radial-gradient(120% 80% at 30% 20%,#34343a 0%,#232325 45%,#161618 100%)}
img{width:340px;height:340px;filter:drop-shadow(0 18px 40px #0009)}
h1{font-weight:800;font-size:128px;letter-spacing:-4px;margin-top:36px}
p{font-weight:500;font-size:48px;color:#d6d6dc;margin-top:18px}
.url{margin-top:44px;padding:16px 34px;border-radius:24px;background:${ACC};color:#14161c;font-weight:800;font-size:46px;letter-spacing:-1px}`);

// ---------- scénář ----------
// Úseky v dobách (střih vždy na začátek taktu). text = titulek v pásu; frame(t, s) = stav stránky v čase t úseku.
const ease = (x) => (x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2);
const clamp = (x) => Math.max(0, Math.min(1, x));
const SEGS = [
  { id: "hook", beats: 4, url: REPO, text: "Free. Open source. [Help build it]", big: true },
  { id: "mit", beats: 8, text: "[MIT license] – use it, fork it" },
  { id: "code", beats: 8, text: "Every line is [on GitHub]" },
  { id: "issues", beats: 12, url: `${REPO}/issues?q=is%3Aissue%20state%3Aopen%20label%3A%22good%20first%20issue%22`, text: "[Good first issues] for newcomers" },
  { id: "issue", beats: 8, url: `${REPO}/issues/8`, text: "Translations · tests · [docs]" },
];

// Pomocné prvky v dokumentu: kroužek zvýraznění a „ťuknutí“ (absolutně v souřadnicích dokumentu).
const HELPERS = `(() => {
  if (window.__fx) return;
  const mk = (css) => { const d = document.createElement("div"); d.style.cssText = "position:absolute;pointer-events:none;z-index:2147483647;" + css; document.body.append(d); return d; };
  const rings = [], tap = mk("width:56px;height:56px;margin:-28px 0 0 -28px;border-radius:50%;background:${ACC}55;border:3px solid ${ACC};opacity:0");
  window.__fx = {
    rect(sel, text) {
      const e = [...document.querySelectorAll(sel)].find((x) => (!text || x.textContent.trim().replace(/\\s+/g, " ").startsWith(text)) && x.getBoundingClientRect().width > 0);
      if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x + scrollX, y: r.y + scrollY, w: r.width, h: r.height };
    },
    ring(i, r, p) {
      while (rings.length <= i) rings.push(mk("border:4px solid ${ACC};border-radius:12px;box-shadow:0 0 0 6px ${ACC}33,0 0 24px ${ACC}aa;opacity:0"));
      const g = rings[i]; if (!r) { g.style.opacity = 0; return; }
      const s = 1.25 - 0.25 * p, pad = 6;
      Object.assign(g.style, { left: r.x - pad + "px", top: r.y - pad + "px", width: r.w + 2 * pad + "px", height: r.h + 2 * pad + "px",
        transform: "scale(" + s + ")", opacity: p });
    },
    tap(x, y, p) { Object.assign(tap.style, { left: x + "px", top: y + "px", transform: "scale(" + (0.6 + 0.8 * p) + ")", opacity: p > 0 ? 1 - p : 0 }); },
    clear() { rings.forEach((g) => (g.style.opacity = 0)); tap.style.opacity = 0; },
  };
})();`;

async function prepare(c, seg) {
  if (seg.url) await c.goto(seg.url);
  await c.evaluate(HELPERS);
  await c.evaluate("window.__fx.clear()");
  const R = (sel, text) => c.evaluate(`window.__fx.rect(${JSON.stringify(sel)}, ${JSON.stringify(text ?? "")})`);
  if (seg.id === "hook") seg.ctx = {};
  if (seg.id === "mit") {
    const lic = await R("a", "MIT license");
    if (!lic) throw new Error("MIT license nenalezeno");
    seg.ctx = { lic, y1: Math.max(0, lic.y - VH * 0.45) };
  }
  // Jen seznam souborů repa – README se nescrolluje (úvodní věta zmiňuje cizí produkt, pravidla Storu).
  if (seg.id === "code") {
    const all = await R("a, button, span", "View all files");
    if (!all) throw new Error("View all files nenalezeno");
    const y0 = SEGS[1].ctx.y1;
    seg.ctx = { y0, y1: Math.max(y0, all.y + all.h + 20 - VH) };
  }
  if (seg.id === "issues") {
    const labels = [];
    for (let i = 0; i < 4; i++) {
      labels.push(await c.evaluate(`(() => { const e = [...document.querySelectorAll("a, span")].filter((x) => x.textContent.trim() === "good first issue" && x.children.length <= 1 && x.getBoundingClientRect().width > 0 && x.getBoundingClientRect().width < 200)[${i}];
        if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x + scrollX, y: r.y + scrollY, w: r.width, h: r.height }; })()`));
    }
    const target = await R('a[data-testid="issue-pr-title-link"], a', "Add German translation of the UI");
    const list = await R('a[data-testid="issue-pr-title-link"], a', "Add CONTRIBUTING.md");
    seg.ctx = { labels: labels.filter(Boolean), target, y0: 0, y1: Math.max(0, (target?.y ?? 700) + 60 - VH * 0.8), listY: list?.y ?? 400 };
  }
  if (seg.id === "issue") seg.ctx = {};
}

async function frame(c, seg, t, d) {
  const x = t / d, k = seg.ctx;
  let js = "";
  if (seg.id === "hook") js = "scrollTo(0, 0);";
  if (seg.id === "mit") {
    const y = k.y1 * ease(clamp(x / 0.35));
    js = `scrollTo(0, ${y}); window.__fx.ring(0, ${JSON.stringify(k.lic)}, ${clamp((x - 0.35) / 0.15)});
      window.__fx.tap(${k.lic.x + 30}, ${k.lic.y + k.lic.h / 2}, ${x > 0.4 && x < 0.62 ? (x - 0.4) / 0.22 : 0});`;
  }
  if (seg.id === "code") js = `scrollTo(0, ${k.y0 + (k.y1 - k.y0) * ease(clamp(x / 0.92))});`;
  if (seg.id === "issues") {
    const y = k.y1 * ease(clamp((x - 0.45) / 0.3));
    js = `scrollTo(0, ${y});` + k.labels.map((r, i) => `window.__fx.ring(${i}, ${JSON.stringify(r)}, ${clamp((x - 0.08 - i * 0.07) / 0.1)});`).join("")
      + (k.target ? `window.__fx.tap(${k.target.x + 60}, ${k.target.y + k.target.h / 2}, ${x > 0.8 && x < 0.98 ? (x - 0.8) / 0.18 : 0});` : "");
  }
  if (seg.id === "issue") js = `scrollTo(0, ${120 * ease(clamp((x - 0.3) / 0.6))});`;
  await c.evaluate(js);
  const shot = await c.send("Page.captureScreenshot", { format: "jpeg", quality: 92, captureBeyondViewport: false });
  return Buffer.from(shot.data, "base64");
}

// ---------- běh ----------
fs.rmSync(WORK, { recursive: true, force: true });
fs.mkdirSync(path.join(WORK, "f"), { recursive: true });
fs.mkdirSync(OUT, { recursive: true });
const c = await launch();
const marks = [];
try {
  // Překryvy (průhledné pozadí, 1080×1920 při DPR 1).
  await c.send("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 1, mobile: false });
  await c.send("Emulation.setDefaultBackgroundColorOverride", { color: { r: 0, g: 0, b: 0, a: 0 } });
  const render = async (html, file) => {
    const frameId = (await c.send("Page.getFrameTree")).frameTree.frame.id;
    await c.send("Page.setDocumentContent", { frameId, html });
    await c.evaluate("Promise.all([document.fonts.ready, ...[...document.images].map(i => i.decode())])");
    fs.writeFileSync(file, Buffer.from((await c.send("Page.captureScreenshot", { format: "png" })).data, "base64"));
  };
  for (const s of SEGS) await render(band(s.text, s.big), path.join(WORK, `band-${s.id}.png`));
  await render(endCard(), path.join(WORK, "end.png"));
  await c.send("Emulation.setDefaultBackgroundColorOverride", {});
  // GitHub jako na telefonu: tmavé téma, mobilní šířka.
  await c.send("Emulation.setDeviceMetricsOverride", { width: VW, height: VH, deviceScaleFactor: DPR, mobile: true });
  await c.send("Emulation.setUserAgentOverride", { userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36" });
  await c.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: "dark" }] });
  let n = 0, t0 = 0;
  for (const seg of SEGS) {
    await prepare(c, seg);
    const d = seg.beats * BEAT, frames = Math.round((t0 + d) * FPS) - Math.round(t0 * FPS);
    marks.push({ id: seg.id, t: Math.round(t0 * FPS) / FPS });
    for (let i = 0; i < frames; i++) {
      fs.writeFileSync(path.join(WORK, "f", `${String(n++).padStart(5, "0")}.jpg`), await frame(c, seg, i / FPS, d));
    }
    t0 += d;
    console.log(`${seg.id}: ${frames} snímků`);
  }
} finally {
  await c.close();
}

// Skládání: stránka pod pásem, pás s titulkem podle úseku, závěrečná karta přes prolnutí.
const main = marks.length ? SEGS.reduce((a, s) => a + s.beats * BEAT, 0) : 0;
const total = main - XFADE + END_S + XFADE;
const ins = ["-framerate", String(FPS), "-i", path.join(WORK, "f", "%05d.jpg"), "-loop", "1", "-t", String(END_S + XFADE), "-i", path.join(WORK, "end.png")];
SEGS.forEach((s) => ins.push("-loop", "1", "-t", main.toFixed(3), "-i", path.join(WORK, `band-${s.id}.png`)));
ins.push("-f", "lavfi", "-t", total.toFixed(3), "-i", "anullsrc=r=48000:cl=stereo");
const parts = [`[0:v]fps=${FPS},format=rgba,pad=${W}:${H}:0:${BAND}:color=0x0d1117,setsar=1[p0]`];
SEGS.forEach((s, i) => {
  const a = marks[i].t, b = i + 1 < marks.length ? marks[i + 1].t : main + 1;
  parts.push(`[p${i}][${2 + i}:v]overlay=0:0:enable='between(t,${a.toFixed(3)},${(b - 0.001).toFixed(3)})'[p${i + 1}]`);
});
parts.push(`[p${SEGS.length}]format=yuv420p[body]`, `[1:v]fps=${FPS},format=yuv420p,setsar=1[end]`,
  `[body][end]xfade=transition=fade:duration=${XFADE}:offset=${(main - XFADE).toFixed(3)},scale=in_range=auto:out_range=tv,format=yuv420p[v]`);
const out = path.join(OUT, "dirwise-short-15-open-source.mp4");
execFileSync("ffmpeg", ["-v", "error", "-y", ...ins, "-filter_complex", parts.join(";"), "-map", "[v]", "-map", `${2 + SEGS.length}:a`,
  "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-profile:v", "high", "-pix_fmt", "yuv420p", "-r", String(FPS),
  "-c:a", "aac", "-b:a", "128k", "-shortest", "-movflags", "+faststart", out], { stdio: "inherit" });
// Časování pro hudbu (music-timed.py): střihy jako značky, BPM pevně.
fs.writeFileSync(out.replace(/\.mp4$/i, ".timing.json"), JSON.stringify({ total, endcard: main - XFADE, bpm: BPM,
  cuts: marks.map((m) => m.t), inputs: [...marks.map((m) => ({ t: m.t, k: `mark:${m.id}` })),
    // ťuknutí: MIT licence (40 % úseku mit), issue #8 (80 % úseku issues)
    ...[["mit", 0.4], ["issues", 0.8]].map(([id, x]) => ({ t: marks.find((m) => m.id === id).t + x * SEGS.find((g) => g.id === id).beats * BEAT, k: "click" }))] }, null, 1));
console.log(`${out}  ${total.toFixed(1)} s`);
