// Nahraje demo scénář skutečně z obrazovky (ffmpeg gdigrab, okno před testovací tapetou,
// viz wallpaper.mjs) a složí docs/demo.gif (960 px, 15 fps).
// Soubory, které scénář vytváří (F5 kopie, + New), maže skript sám před nahráváním.
import fs from "fs";
import os from "os";
import path from "path";
import { execFileSync, spawn } from "child_process";
import { fileURLToPath } from "url";

const DIR = path.join(os.tmpdir(), "dirwise-demo");
const GIF = fileURLToPath(new URL("../../docs/demo.gif", import.meta.url));
import { setup } from "./setup.mjs";
import { announceFocus, stage } from "./wallpaper.mjs";

// F5 kopíruje meeting-notes.md do Projects, + New vytvoří ideas.txt v Documents (levý panel).
for (const f of ["C:\\Demo\\Projects\\meeting-notes.md", "C:\\Demo\\Documents\\ideas.txt"]) fs.rmSync(f, { force: true });

// Kurzor a ukazatel kláves – CDP skutečným kurzorem nehýbe (gdigrab ho nekreslí).
const overlay = `(() => {
  const cur = document.createElement("div");
  cur.style.cssText = "position:fixed;left:0;top:0;width:22px;height:22px;z-index:2147483647;pointer-events:none;transform:translate(-100px,-100px);transition:none";
  cur.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24"><path d="M4 2l15 11-6.5 1.2L16 21l-2.6 1.2-3.4-6.7L5 20z" fill="#111" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/></svg>';
  const hud = document.createElement("div");
  hud.style.cssText = "position:fixed;left:50%;bottom:48px;transform:translateX(-50%);z-index:2147483647;pointer-events:none;padding:8px 16px;border-radius:10px;background:rgba(20,20,20,.85);color:#fff;font:600 18px Inter,system-ui,sans-serif;opacity:0;transition:opacity .2s";
  document.body.append(cur, hud);
  addEventListener("mousemove", (e) => { cur.style.transform = "translate(" + (e.clientX - 3) + "px," + (e.clientY - 2) + "px)"; }, true);
  addEventListener("mousedown", () => { cur.firstChild.style.transform = "scale(.85)"; setTimeout(() => (cur.firstChild.style.transform = ""), 150); }, true);
  let timer;
  window.__hud = (text) => { hud.textContent = text; hud.style.opacity = "1"; clearTimeout(timer); timer = setTimeout(() => (hud.style.opacity = "0"), 1100); };
})();`;

// Okno 1280×800 na primárním monitoru (100 %), za ním testovací tapeta.
const WIN = { X: 200, Y: 120, W: 1280, H: 800 };
const c = await setup(1280, 800, { emulate: false });
const unstage = await stage(WIN);
// Úklid i při chybě ve scénáři: okna zpět pod ostatní, tapeta pryč, nahrávání stop.
let rec = null;
process.on("exit", () => {
  if (rec && rec.exitCode === null) rec.kill();
  try { unstage(); } catch {}
});
await announceFocus(c);
await c.sleep(1500);
await c.evaluate(overlay);

let mouse = [700, 450];
const center = (sel, text) => c.evaluate(`(() => {
  const e = [...document.querySelectorAll(${JSON.stringify(sel)})].find((e) => ${text ? `e.textContent.trim() === ${JSON.stringify(text)}` : "true"} && e.getBoundingClientRect().width > 0);
  if (!e) return null;
  const r = e.getBoundingClientRect();
  return [Math.round(r.x + r.width / 2), Math.round(r.y + r.height / 2)];
})()`);
const moveTo = async ([x, y], ms = 450) => {
  const steps = Math.round(ms / 16);
  const [x0, y0] = mouse;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps, e = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
    await c.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: x0 + (x - x0) * e, y: y0 + (y - y0) * e });
    await c.sleep(16);
  }
  mouse = [x, y];
};
const clickAt = async (sel, text) => {
  const p = await center(sel, text);
  if (!p) throw new Error(`nenalezeno: ${sel} ${text ?? ""}`);
  await moveTo(p);
  await c.sleep(120);
  await c.click(p[0], p[1]);
};
const hud = (s) => c.evaluate(`window.__hud(${JSON.stringify(s)})`);
const PAUSE = 800;

// Nahrávání (bezztrátově do mp4, GIF až nakonec)
fs.rmSync(DIR, { recursive: true, force: true });
fs.mkdirSync(DIR, { recursive: true });
const MP4 = path.join(DIR, "demo.mp4");
rec = spawn("ffmpeg", ["-v", "error", "-y", "-f", "gdigrab", "-framerate", "15", "-draw_mouse", "0",
  "-offset_x", String(WIN.X), "-offset_y", String(WIN.Y), "-video_size", `${WIN.W}x${WIN.H}`, "-i", "desktop",
  "-c:v", "libx264rgb", "-crf", "0", "-preset", "ultrafast", MP4], { stdio: ["pipe", "inherit", "inherit"] });
const recDone = new Promise((resolve, reject) => {
  rec.on("exit", resolve);
  rec.on("error", reject);
});
await c.sleep(1500);

// 0) fotky odjedou pod skleněnou lištu; pak Více → Vzhled → Průhlednost: rozmazaná
await moveTo([700, 520]);
await c.wheel(700, 520, 300, 8, 10);
await c.sleep(700);
await clickAt('[aria-label="More"]');
await c.sleep(500);
const appearance = await center(".fw-menu-item", "Appearance");
await moveTo(appearance);
await c.sleep(700);
// Do podmenu nejdřív vodorovně — šikmo by kurzor otevřel „Animations“.
const transparencyBlur = await center(".fw-menu-item", "Transparency: Blurred");
if (!transparencyBlur) throw new Error("nenalezeno: Transparency: Blurred");
await moveTo([transparencyBlur[0], appearance[1]]);
await c.sleep(200);
await moveTo(transparencyBlur);
await c.sleep(150);
await c.click(transparencyBlur[0], transparencyBlur[1]);
await hud("Transparency: Blurred");
await c.sleep(600);
await moveTo([700, 520]);
await c.wheel(700, 520, 200, 8, 10);
await c.sleep(1400);
// 1) nová záložka tlačítkem +
await clickAt('[aria-label="New Tab (Ctrl+T)"]');
await c.sleep(PAUSE);
// 2) přepnutí na záložku Documents
await clickAt("[role=tab]", "Documents");
await c.sleep(PAUSE);
// 3) rozdělené okno
await hud("Ctrl + Shift + D");
await c.key("D", "KeyD", 68, 10);
await c.sleep(PAUSE + 200);
// pravý panel: Tab ho aktivuje, pak Projects v oblíbených
await hud("Tab");
await c.key("Tab", "Tab", 9);
await c.sleep(500);
await clickAt('[data-tooltip="C:\\\\Demo\\\\Projects"]');
await c.sleep(PAUSE);
// 4) F5 zkopíruje soubor z levého panelu do pravého
await clickAt(`[data-path$="meeting-notes.md"]`);
await c.sleep(500);
await hud("F5 – copy to the other panel");
await c.key("F5", "F5", 116);
await c.sleep(PAUSE + 400);
// 5) + New → Text Document, rovnou v přejmenování
await clickAt(".fw-new-btn");
await c.sleep(700);
await clickAt(".fw-menu-item", "Text Document");
await c.sleep(600);
await c.type("ideas", 110);
await c.key("Enter", "Enter", 13, 0, "\r");
await c.sleep(PAUSE);
// 6) paleta příkazů
await hud("Ctrl + K");
await c.key("k", "KeyK", 75, 2);
await c.sleep(500);
await c.type("dow", 140);
await c.sleep(PAUSE);
await c.key("Enter", "Enter", 13, 0, "\r");
await c.sleep(1600);

if (rec.exitCode === null) rec.stdin.write("q");
await recDone;
c.close();

execFileSync("ffmpeg", ["-v", "error", "-y", "-i", MP4,
  "-vf", "fps=15,scale=960:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=192:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle",
  "-loop", "0", GIF], { stdio: "inherit" });
console.log("hotovo:", GIF, (fs.statSync(GIF).size / 1024).toFixed(0), "kB");
