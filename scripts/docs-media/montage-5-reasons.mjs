// Montáž #18 „5 reasons to try Dirwise“ (G, 1080×1920, 30 fps, 150 BPM). Háček slovo po slovu na doby,
// pak 5 důvodů po 2 taktech (3,2 s): číslo s nárazem, titulek, karta se skutečným screenshotem z dema
// (slides-shots.mjs) s pomalým přiblížením, střih švihem; na konci karta s logem a prolnutí do 1. snímku.
// node scripts/docs-media/montage-5-reasons.mjs [--shots <složka>] [--audio <m4a>] [--still 1,3,5] [--out <složka>]
import fs from "fs";
import os from "os";
import path from "path";
import { execFileSync, spawn } from "child_process";
import { fileURLToPath } from "url";

const root = (p) => fileURLToPath(new URL(`../../${p}`, import.meta.url));
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const SHOTS = path.resolve(opt("--shots", path.join(os.tmpdir(), "dirwise-slides-shots")));
const OUT = path.resolve(opt("--out", path.join(os.tmpdir(), "dirwise-montage")));
const AUDIO = opt("--audio", null);
const STILLS = opt("--still", null)?.split(",").map(Number);
const WORK = path.join(os.tmpdir(), "dirwise-montage-work");
const W = 1080, H = 1920, FPS = 30, B = 0.4, DUR = 49 * B; // 19,6 s
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(WORK, { recursive: true });
fs.mkdirSync(OUT, { recursive: true });

// Důvod: titulek, podtitulek, screenshot a výřez (px screenshotu 2000×1600).
const REASONS = [
  ["Column view", "with a live preview", "set-columns.png", [400, 140, 2000, 1250]],
  ["Ctrl+K", "folders, actions, tags", "split-palette.png", [400, 80, 1700, 640]],
  ["Tabs + split view", "two folders, one window", "split-view.png", [400, 0, 2000, 900]],
  ["Space to preview", "any file, instantly", "sc-preview.png", [140, 120, 1860, 1560]],
  ["Free & open source", "no ads · under 3 MB", "about.png", [620, 380, 1380, 1220]],
];
function cropShot([, , file, [x0, y0, x1, y1]], i) {
  const out = path.join(WORK, `r${i}.jpg`);
  execFileSync("ffmpeg", ["-v", "error", "-y", "-i", path.join(SHOTS, file), "-vf", `crop=${x1 - x0}:${y1 - y0}:${x0}:${y0},scale='min(1400,iw)':-2`, "-q:v", "2", out]);
  return `data:image/jpeg;base64,${fs.readFileSync(out).toString("base64")}`;
}
const DATA = { fps: FPS, B, reasons: REASONS.map((r, i) => ({ t: r[0], s: r[1], img: cropShot(r, i), ar: (r[3][3] - r[3][1]) / (r[3][2] - r[3][0]) })) };
const ICON = `data:image/png;base64,${fs.readFileSync(root("app-icon.png")).toString("base64")}`;
const FONTS = [600, 800, 900].map((w) => `@font-face{font-family:Inter;font-weight:${w};
  src:url(data:font/woff2;base64,${fs.readFileSync(root(`node_modules/@fontsource/inter/files/inter-latin-${w}-normal.woff2`)).toString("base64")}) format("woff2")}`).join("\n");

function pageMain(D) {
  const B = D.B, HOOK = 4 * B, SEG = 8 * B, END0 = HOOK + 5 * SEG; // 1,6 s · 3,2 s · 17,6 s
  const $ = (id) => document.getElementById(id);
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const prog = (t, a, b) => clamp((t - a) / (b - a));
  const eOut = (p) => 1 - (1 - p) ** 3;
  const eIn = (p) => p ** 3;
  const spring = (s, w = 18, d = 7) => (s <= 0 ? 0 : 1 - Math.exp(-d * s) * Math.cos(w * s));
  const css = (el, s) => Object.assign(el.style, s);
  const ACC = "#ffaa5a";
  window.render = (n) => {
    const t = n / D.fps, beat = (t % B) / B, pulse = Math.exp(-beat * 6);
    // pozadí: tónovaný přechod pulzuje na dobu
    css($("bg"), { background: `radial-gradient(circle at 50% 42%, rgba(255,140,60,${0.28 + 0.12 * pulse}), transparent 62%), linear-gradient(#120a06, #1d0f08 60%, #0b0605)` });
    // háček: slova na doby
    const hook = $("hook"); hook.style.display = t < HOOK + 0.25 ? "" : "none";
    [...hook.children].forEach((w, i) => { const s = spring(t - i * B * 0.75, 20, 8); const out = eIn(prog(t, HOOK, HOOK + 0.25));
      css(w, { opacity: clamp(s * 2) * (1 - out), transform: `translateY(${(1 - s) * 80 - out * 120}px) scale(${0.7 + 0.3 * s})` }); });
    // důvody
    const k = Math.floor((t - HOOK) / SEG), lt = t - HOOK - k * SEG, seg = $("seg");
    if (t >= HOOK && k < 5) {
      seg.style.display = "";
      const R = D.reasons[k];
      $("num").textContent = String(k + 1);
      $("tt").textContent = R.t; $("st").textContent = R.s;
      if ($("img").dataset.k !== String(k)) { $("img").src = R.img; $("img").dataset.k = String(k); }
      const sIn = spring(lt, 20, 8), whip = eOut(prog(lt, 0, 0.3)), out = eIn(prog(lt, SEG - 0.22, SEG));
      const dir = k % 2 ? -1 : 1;
      css($("num"), { transform: `scale(${0.3 + 0.7 * sIn + 0.12 * pulse})` });
      css($("tt"), { opacity: clamp(lt / 0.15), transform: `translateX(${(1 - whip) * 300 * dir}px)` });
      css($("st"), { opacity: clamp((lt - 0.2) / 0.2) });
      // karta: výška podle poměru, max 900 px; pomalé přiblížení a švih ven
      const cw = Math.min(960, 900 / R.ar), ch = cw * R.ar;
      css($("card"), { width: `${cw}px`, height: `${ch}px`, left: `${540 - cw / 2}px`, top: `${1180 - ch / 2}px`,
        transform: `translateX(${(1 - whip) * 1100 * dir - out * 1100 * dir}px) rotate(${(1 - whip) * 6 * dir + (k % 2 ? 1.5 : -1.5)}deg) scale(${0.98 + 0.02 * pulse})`,
        filter: `blur(${(1 - whip) * 14 + out * 14}px)` });
      css($("img"), { transform: `scale(${1 + 0.1 * prog(lt, 0, SEG)})` });
      css($("dots"), {}); [...$("dots").children].forEach((d, i) => { d.style.background = i <= k ? ACC : "#ffffff33"; });
    } else seg.style.display = "none";
    // karta s logem
    const end = $("end"); end.style.display = t >= END0 ? "" : "none";
    if (t >= END0) [...end.children].forEach((c, i) => { const p = spring(t - END0 - i * 0.12, 14, 7); css(c, { opacity: clamp(p * 1.5), transform: `translateY(${(1 - p) * 60}px) scale(${0.85 + 0.15 * p})` }); });
    $("flash").style.opacity = t >= HOOK && t < END0 + 0.2 && ((t - HOOK) % SEG) < 0.12 ? 0.35 * (1 - ((t - HOOK) % SEG) / 0.12) : 0;
    $("fade").style.opacity = prog(t, 19.25, 19.6);
  };
}

function page() {
  return `<!doctype html><html><head><meta charset="utf-8"><style>${FONTS}
*{box-sizing:border-box;margin:0}body{width:1080px;height:1920px;overflow:hidden;background:#0b0605;font-family:Inter;color:#fff}
#bg,#flash,#fade{position:absolute;inset:0}#flash{background:#fff;opacity:0}#fade{background:#120a06;opacity:0}
#hook{position:absolute;left:0;right:0;top:600px;text-align:center;font:900 150px/1.05 Inter;letter-spacing:-6px}
#hook span{display:block}#hook span:nth-child(2){color:#ffaa5a}
#num{position:absolute;left:50%;top:330px;margin-left:-90px;width:180px;height:180px;border-radius:50%;background:#ffaa5a;color:#140c06;
 font:900 120px/180px Inter;text-align:center;box-shadow:0 0 60px #ffaa5a88}
#tt{position:absolute;left:30px;right:30px;top:540px;text-align:center;font:900 110px/1.05 Inter;letter-spacing:-4px;text-shadow:0 6px 40px #000}
#st{position:absolute;left:30px;right:30px;top:670px;text-align:center;font:600 50px Inter;color:#ffd9b8}
#card{position:absolute;border-radius:40px;overflow:hidden;border:6px solid #ffaa5a;box-shadow:0 40px 120px #000c}
#img{width:100%;height:100%;object-fit:cover;transform-origin:50% 40%}
#dots{position:absolute;left:50%;top:1680px;transform:translateX(-50%);display:flex;gap:18px}#dots i{width:22px;height:22px;border-radius:50%}
#end{position:absolute;left:0;right:0;top:640px;text-align:center}
#end img{width:300px;height:300px}#end h1{font:900 150px Inter;letter-spacing:-5px;margin-top:20px}
#end p{font:700 56px Inter;color:#ffd9b8;margin-top:20px}#end small{display:block;font:600 40px Inter;color:#ffffffaa;margin-top:26px}
</style></head><body><div id="bg"></div>
<div id="hook"><span>5 reasons</span><span>to try</span><span>Dirwise</span></div>
<div id="seg"><div id="num"></div><div id="tt"></div><div id="st"></div><div id="card"><img id="img"></div><div id="dots"><i></i><i></i><i></i><i></i><i></i></div></div>
<div id="end"><img src="${ICON}"><h1>Dirwise</h1><p>File manager for Windows</p><small>Free · Open source · Microsoft Store</small></div>
<div id="flash"></div><div id="fade"></div>
<script>(${pageMain.toString()})(${JSON.stringify(DATA)});</script></body></html>`;
}

async function withChrome(fn) {
  const exe = [process.env.CHROME, "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"].filter(Boolean).find((c) => fs.existsSync(c));
  const PORT = 9337, prof = fs.mkdtempSync(path.join(os.tmpdir(), "dirwise-mont-"));
  const proc = spawn(exe, ["--headless=new", `--remote-debugging-port=${PORT}`, `--user-data-dir=${prof}`, "--no-first-run", "--hide-scrollbars", "--force-color-profile=srgb", "about:blank"], { stdio: "ignore" });
  try {
    let target;
    for (let i = 0; i < 50 && !target; i++) { try { target = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).find((t) => t.type === "page"); } catch { await sleep(200); } }
    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
    let id = 0; const pend = new Map();
    ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); } };
    const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pend.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
    const evaluate = async (expression) => { const r = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails.exception?.description ?? r.exceptionDetails)); return r.result.value; };
    await send("Page.enable");
    await send("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 1, mobile: false });
    const html = path.join(WORK, "montage.html"); fs.writeFileSync(html, page());
    await send("Page.navigate", { url: `file:///${html.replace(/\\/g, "/")}` });
    for (let i = 0; i < 100 && !(await evaluate("typeof window.render === 'function'").catch(() => false)); i++) await sleep(100);
    await evaluate("document.fonts.ready.then(() => 1)");
    // dekódovat všech 5 obrázků předem
    for (let k = 0; k < 5; k++) { await evaluate(`render(${Math.round((1.6 + k * 3.2 + 1) * FPS)}); document.getElementById('img').decode()`); }
    await fn(async (n, file, format = "jpeg") => {
      await evaluate(`render(${n}); document.getElementById('img').decode().catch(()=>0).then(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))`);
      const r = await send("Page.captureScreenshot", format === "png" ? { format } : { format, quality: 94 });
      fs.writeFileSync(file, Buffer.from(r.data, "base64"));
    });
    ws.close();
  } finally { proc.kill(); await sleep(500); try { fs.rmSync(prof, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 }); } catch {} }
}

const TOTAL = Math.round(DUR * FPS);
if (STILLS) {
  await withChrome(async (shot) => { for (const t of STILLS) { const f = path.join(OUT, `m-still-${t}.png`); await shot(Math.round(t * FPS), f, "png"); console.log(f); } });
} else {
  const frames = path.join(WORK, "frames"); fs.rmSync(frames, { recursive: true, force: true }); fs.mkdirSync(frames);
  await withChrome(async (shot) => { for (let n = 0; n < TOTAL; n++) { await shot(n, path.join(frames, `${String(n).padStart(4, "0")}.jpg`)); if (n % 120 === 0) console.log(`snímek ${n}/${TOTAL}`); } });
  const out = path.join(OUT, "dirwise-18-5-reasons.mp4");
  const audio = AUDIO ? ["-i", path.resolve(AUDIO)] : ["-f", "lavfi", "-t", String(DUR), "-i", "anullsrc=r=48000:cl=stereo"];
  execFileSync("ffmpeg", ["-v", "error", "-y", "-framerate", String(FPS), "-i", path.join(frames, "%04d.jpg"), ...audio,
    "-vf", "scale=out_color_matrix=bt709:out_range=tv,format=yuv420p", "-frames:v", String(TOTAL),
    "-c:v", "libx264", "-preset", "slow", "-crf", "19", "-profile:v", "high", "-pix_fmt", "yuv420p", "-r", String(FPS),
    "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", "-shortest", out], { stdio: "inherit" });
  console.log(out);
}
