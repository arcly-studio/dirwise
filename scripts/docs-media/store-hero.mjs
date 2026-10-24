// Super hero art pro Microsoft Store (pozadí stránky aplikace) do docs/store/hero/:
// hero-3840x2160.png a hero-1920x1080.png. Bez textu a loga – levých ~40 % zůstává
// prázdných a tmavých (Store tam kreslí název a tlačítko).
// Vpravo skutečný snímek aplikace (tmavé téma, bez průhlednosti) – nijak neupravený, jen
// umístěný do okna se stínem. Varianty: icons = mřížka náhledů Summer 2026 s vybranou
// farewell-sunset.jpg (výchozí), columns = sloupce Photos → Summer 2026 → farewell-sunset.jpg
// s náhledem (soubory s příponou -columns).
// Předpoklad: demo prostředí (fotky z photos.mjs) a běžící dev s CDP na portu 9333
// (viz CLAUDE.md, Screenshoty a demo).
// node scripts/docs-media/store-hero.mjs [--variant icons|columns] [--out <složka>]
//   (prohlížeč pro skládání: CHROME=<cesta k exe>)
import fs from "fs";
import os from "os";
import path from "path";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { setup, panel, TABS } from "./setup.mjs";

const arg = (name, def) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : def; };
const VARIANT = arg("--variant", "icons");
const OUT = path.resolve(arg("--out", fileURLToPath(new URL("../../docs/store/hero/", import.meta.url)))) + path.sep;
// Rozměry okna v CSS px, hustota snímku a šířka okna v kompozici (CSS px při 1920×1080).
// Hustota = 2 × zobrazená šířka / W, takže na 4K se snímek zobrazí 1:1, bez zvětšování pixelů.
// icons: okno 960 px = 6 sloupců mřížky; v kompozici zvětšené, ať jsou náhledy (64 px) větší.
//   Výška se po načtení dorovná tak, aby dole končil celý řádek (viz fitRows).
// columns: užší okno, ať se celé vejde napravo od volné plochy a tlačítka okna zůstanou vidět.
const LAYOUT = {
  icons: { W: 960, H: 740, display: 1180, left: 700 },
  columns: { W: 1040, H: 820, display: 1084, left: 790 },
}[VARIANT];
const { W, display: DISPLAY } = LAYOUT;
let H = LAYOUT.H;
const SHOT_SCALE = (2 * DISPLAY) / W;

// --- 1) skutečný snímek z běžící aplikace ---
// Údaje o tomhle počítači do snímku nepatří: v sidebaru zůstane jen disk C: a stavový
// řádek bez volného místa (chyba z get_disk_free_space = status bar ho nezobrazí). Nic se
// nepřidává, jen skryje (jako filtr Koše v setup.mjs).
const HIDE_MACHINE = `(() => {
  const of = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input.url;
    if (url.startsWith("http://ipc.localhost/get_disk_free_space")) {
      return new Response(JSON.stringify("hidden"), { status: 400, headers: { "Content-Type": "application/json" } });
    }
    const res = await of(input, init);
    if (!url.startsWith("http://ipc.localhost/get_favorites") || !res.ok) return res;
    // Kořen jednotky („X:“ nebo „X:“ s lomítkem) – bez regexu, zpětná lomítka v šabloně se zdvojují.
    const drive = (p) => typeof p === "string" && p.length <= 3 && p[1] === ":";
    const out = (await res.json()).map((sec) => ({ ...sec,
      items: sec.items.filter((i) => !drive(i.path) || /^C:/i.test(i.path)) }));
    return new Response(JSON.stringify(out), { status: res.status, headers: res.headers });
  };
})();`;

// Výšku okna dorovná tak, aby spodní okraj buňky posledního celého řádku ležel těsně nad
// stavovým řádkem – další řádek pak začíná až pod oknem (ani pod sklem stavového řádku
// z něj nic nevykoukne). Kreslení aplikace se nemění, jen velikost okna (viewportu).
async function fitRows(c) {
  const measure = () => c.evaluate(`(() => {
    const scroller = document.querySelector(".fw-panel > .fw-scroll");
    const glassBottom = parseFloat(getComputedStyle(scroller).getPropertyValue("--glass-bottom")) || 0;
    const visibleBottom = scroller.getBoundingClientRect().bottom - glassBottom;
    const cells = [...document.querySelectorAll(".fw-icon-cell")].map((e) => e.getBoundingClientRect());
    const tops = [...new Set(cells.map((r) => Math.round(r.top)))];
    const bottoms = [...new Set(cells.map((r) => r.bottom))].sort((a, b) => a - b);
    return { visibleBottom, columns: cells.filter((r) => Math.round(r.top) === tops[0]).length,
      bottom: bottoms.filter((b) => b <= visibleBottom).pop() };
  })()`);
  const m = await measure();
  H = Math.round(H - (m.visibleBottom - 1 - m.bottom));
  await c.size(W, H, SHOT_SCALE);
  await c.sleep(1500);
  const after = await measure();
  console.log(`mřížka: ${after.columns} sloupců, okno ${W}×${H}, rezerva pod řádkem ${(after.visibleBottom - after.bottom).toFixed(1)} px`);
}

async function capture() {
  const first = VARIANT === "icons" ? panel("Photos\\Summer 2026", "icon") : panel("Photos", "column");
  const c = await setup(W, H, { theme: "dark", language: "en", tabs: { active: 0, items: [first, TABS.items[1], TABS.items[2]] }, scale: SHOT_SCALE });
  await c.send("Page.addScriptToEvaluateOnNewDocument", { source: HIDE_MACHINE });
  await c.send("Page.reload", { ignoreCache: false });
  await c.sleep(4000);
  const clickName = async (name) => {
    // Po reloadu chvíli trvá, než se výpis načte – zkoušet až 10 s.
    let pos = null;
    for (let i = 0; i < 20 && !pos; i++) {
      if (i > 0) await c.sleep(500);
      pos = await c.evaluate(`(() => { const e = [...document.querySelectorAll("[data-path]")]
      .find((x) => x.textContent.trim() === ${JSON.stringify(name)} && x.getBoundingClientRect().width > 0);
      if (!e) return null; const r = e.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; })()`);
    }
    if (!pos) throw new Error("nenalezeno: " + name);
    await c.click(pos[0], pos[1]);
  };
  await c.sleep(1500);
  if (VARIANT === "columns") {
    await clickName("Summer 2026");
    await c.sleep(1200);
  }
  await clickName("farewell-sunset.jpg");
  // Náhledy (thumbnaily) se načítají ze shellu postupně.
  await c.sleep(VARIANT === "icons" ? 6000 : 2500);
  if (VARIANT === "icons") await fitRows(c);
  // Bez hover stavů (kurzor CDP nehýbe).
  await c.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 1, y: 1 });
  await c.sleep(400);
  const r = await c.send("Page.captureScreenshot", { format: "png" });
  await c.send("Emulation.clearDeviceMetricsOverride");
  c.close();
  return Buffer.from(r.data, "base64");
}

// --- 2) složení v headless prohlížeči (stejně jako brand.mjs) ---
// Rozvržení v CSS px pro 1920×1080; 4K je totéž v hustotě 2.
const html = (shot) => `<!doctype html><html><head><style>
* { margin: 0; box-sizing: border-box; }
html, body { width: 1920px; height: 1080px; overflow: hidden; }
.bg { position: relative; width: 100%; height: 100%; overflow: hidden; background:
  radial-gradient(45% 55% at 74% 22%, rgba(10, 132, 255, 0.42) 0%, rgba(10, 132, 255, 0.14) 45%, rgba(10, 132, 255, 0) 75%),
  radial-gradient(40% 50% at 100% 85%, rgba(0, 104, 218, 0.30) 0%, rgba(0, 104, 218, 0) 70%),
  linear-gradient(90deg, #06080d 0%, #070a11 38%, #0b1426 68%, #102044 100%); }
/* Okno zvětšené na šířku DISPLAY, svisle uprostřed; vpravo zůstává okraj, ať jsou
   tlačítka okna celá. */
.win { position: absolute; left: ${LAYOUT.left}px; top: ${Math.round((1080 - (H * DISPLAY) / W) / 2)}px; width: ${DISPLAY}px; border-radius: 9px; overflow: hidden;
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.10), 0 24px 60px rgba(0, 0, 0, 0.55), 0 60px 140px rgba(0, 0, 0, 0.45); }
.win img { display: block; width: 100%; height: auto; }
</style></head><body><div class="bg"><div class="win"><img src="data:image/png;base64,${shot.toString("base64")}"></div></div></body></html>`;

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

async function compose(shot) {
  const PORT = 9334;
  const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), "dirwise-hero-"));
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
  try {
    await send("Page.enable");
    const frameId = (await send("Page.getFrameTree")).frameTree.frame.id;
    for (const dsf of [2, 1]) {
      await send("Emulation.setDeviceMetricsOverride", { width: 1920, height: 1080, deviceScaleFactor: dsf, mobile: false });
      await send("Page.setDocumentContent", { frameId, html: html(shot) });
      await send("Runtime.evaluate", { expression: "Promise.all([...document.images].map(i => i.decode()))", awaitPromise: true });
      const r = await send("Page.captureScreenshot", { format: "png", clip: { x: 0, y: 0, width: 1920, height: 1080, scale: 1 } });
      const file = `hero-${1920 * dsf}x${1080 * dsf}${VARIANT === "icons" ? "" : "-" + VARIANT}.png`;
      const buf = Buffer.from(r.data, "base64");
      fs.writeFileSync(path.join(OUT, file), buf);
      console.log(`${file}  ${(buf.length / 1024).toFixed(0)} kB`);
    }
  } finally {
    ws.close();
    proc.kill();
    await new Promise((r) => setTimeout(r, 500));
    fs.rmSync(profileDir, { recursive: true, force: true });
  }
}

fs.mkdirSync(OUT, { recursive: true });
const shot = await capture();
fs.writeFileSync(path.join(os.tmpdir(), "dirwise-hero-shot.png"), shot);
await compose(shot);
