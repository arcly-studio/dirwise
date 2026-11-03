// Screenshoty pro týdenní dávku slideshow (skill socialni-videa, formát K) – jedno spuštění dema na týden.
// Předpoklad jako u shots.mjs: demo prostředí (C:\Demo, mksettings.mjs, dev s demo-conf.json a CDP 9333).
// node scripts/docs-media/slides-shots.mjs [jméno …] [--out <složka>]   (výchozí %TEMP%\dirwise-slides-shots)
// Viewport 1000×800 CSS px se škálováním 2 (ostré výřezy na kartu slidu). Každý snímek začíná z čistého stavu
// (setup = reset záložek/tématu/jazyka + reload). Koš: jen vlastní demo soubory, po snímcích se trvale smažou
// z Koše (cesta + čas) a vrátí z docs/demo – jako shots.mjs.
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import { setup, panel, TABS } from "./setup.mjs";

const args = process.argv.slice(2);
const oi = args.indexOf("--out");
const OUT = path.resolve(oi >= 0 ? args.splice(oi, 2)[1] : path.join(os.tmpdir(), "dirwise-slides-shots"));
fs.mkdirSync(OUT, { recursive: true });
const W = 1000, H = 800, SCALE = 2;
const DEMO = "C:\\Demo";
const DEMO_SRC = fileURLToPath(new URL("../../docs/demo/", import.meta.url));

function helpers(c) {
  const pos = (sel, text, nth = 0, mode = "eq") => c.evaluate(`(() => {
    const els = [...document.querySelectorAll(${JSON.stringify(sel)})].filter((e) => e.getBoundingClientRect().width > 0)
      .filter((e) => ${text == null ? "true" : mode === "start"
        ? `e.textContent.trim().startsWith(${JSON.stringify(text)})`
        : `e.textContent.trim() === ${JSON.stringify(text)} || e.getAttribute("aria-label") === ${JSON.stringify(text)}`});
    const e = els[${nth}]; if (!e) return null; const r = e.getBoundingClientRect();
    return [r.x + Math.min(r.width / 2, 60), r.y + r.height / 2];
  })()`);
  const need = async (sel, text, nth, mode) => { const p = await pos(sel, text, nth, mode); if (!p) throw new Error(`nenalezeno: ${sel} ${text ?? ""}`); return p; };
  const h = {
    pos, need,
    click: async (sel, text, nth = 0, mode) => { const p = await need(sel, text, nth, mode); await c.click(p[0], p[1]); await c.sleep(450); },
    rclick: async (sel, text, nth = 0, mode) => {
      const [x, y] = await need(sel, text, nth, mode);
      await c.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
      await c.send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "right", clickCount: 1 });
      await c.send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "right", clickCount: 1 });
      await c.sleep(600);
    },
    hover: async (sel, text, nth = 0, mode) => {
      const [x, y] = await need(sel, text, nth, mode);
      await c.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
      await c.sleep(600);
    },
    // Položka menu podle začátku textu (nejmenší viditelný prvek – ne celý obal menu).
    hoverMenu: async (text) => {
      const p = await c.evaluate(`(() => { // Podmenu (View, Appearance, Language, Tags) jsou DIV bez role – bere se nejmenší prvek s textem.
      const e = [...document.querySelectorAll("[role=menu] *")]
        .filter((x) => x.textContent.trim().startsWith(${JSON.stringify(text)}) && x.getBoundingClientRect().width > 0 && x.getBoundingClientRect().height < 44)
        .sort((p, q) => p.getBoundingClientRect().width * p.getBoundingClientRect().height - q.getBoundingClientRect().width * q.getBoundingClientRect().height)[0];
        if (!e) return null; const r = e.getBoundingClientRect(); return [r.x + 30, r.y + r.height / 2]; })()`);
      if (!p) throw new Error("nenalezeno menu: " + text);
      await c.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: p[0], y: p[1] });
      await c.sleep(650);
    },
    key: (k, code, vk, mods = 0, text) => c.key(k, code, vk, mods, text),
    ctrl: (k, code, vk, shift = false) => c.key(k, code, vk, shift ? 10 : 2),
    palette: async (q) => { await c.key("k", "KeyK", 75, 2); await c.sleep(450); await c.type(q, 70); await c.sleep(700); },
    go: async (dir) => {
      await c.key("l", "KeyL", 76, 2); await c.sleep(300);
      await c.send("Input.insertText", { text: dir });
      await c.key("Enter", "Enter", 13, 0, "\r"); await c.sleep(900);
    },
    view: async (v) => { await c.evaluate(`document.querySelector('[aria-label="View as ${v}"]').click()`); await c.sleep(800); },
    sel: async (name) => h.click("[data-path]", name),
    split: async () => {
      if ((await c.evaluate("document.querySelectorAll('.fw-panel').length")) < 2) await c.key("D", "KeyD", 68, 10);
      await c.sleep(1200);
    },
    invoke: (cmd, p) => c.evaluate(`window.__TAURI_INTERNALS__.invoke(${JSON.stringify(cmd)}, ${JSON.stringify(p)})`),
  };
  return h;
}

const one = (v, view) => ({ active: 0, items: [panel(v, view)] });
const TRASHED = [`${DEMO}\\Documents\\quarterly-report.txt`, `${DEMO}\\Downloads\\setup.msi`,
  `${DEMO}\\Photos\\Summer 2026\\festival.jpg`, `${DEMO}\\Documents\\proposal.docx`];
let trashStart = 0;

// Scény: jméno → { opts (setup), run(c, h), keepMouse }
const S = {
  // ---------- S1 štítky ----------
  "tags-menu": { opts: { tabs: one("Documents", "list") }, keepMouse: true,
    async run(c, h) { await h.rclick("[data-path]", "quarterly-report", 0, "start"); } },
  "tags-list": { opts: { tabs: one("Documents", "list") },
    async run(c, h) { await h.click("[data-path]", "roadmap.pptx", 0, "start"); } },
  "tags-sidebar": { opts: { tabs: one("Documents", "list") },
    async run(c, h) { await h.click("button", "Green", 0, "start"); await c.sleep(900); } },
  "tags-palette": { opts: { tabs: one("Documents", "list") },
    async run(c, h) { await h.palette("gree"); } },
  "tags-toolbar": { opts: { tabs: one("Photos\\Summer 2026", "icon") }, keepMouse: true,
    async run(c, h) { await h.sel("sunset-over-lake.jpg"); await h.click("button", "Tags"); } },

  // ---------- S2 rozdělené okno ----------
  "split-view": { opts: { tabs: one("Projects", "column") },
    async run(c, h) {
      await h.sel("website"); await c.sleep(600); await h.split();
      await c.click(Math.round(W * 0.75), Math.round(H * 0.8)); await c.sleep(300);
      await h.go(`${DEMO}\\Photos\\Summer 2026`); await h.view("List");
    } },
  "split-select": { opts: { tabs: one("Documents", "list") },
    async run(c, h) {
      await h.split();
      await c.click(Math.round(W * 0.75), Math.round(H * 0.8)); await c.sleep(300);
      await h.go(`${DEMO}\\Projects`);
      await c.click(Math.round(W * 0.3), Math.round(H * 0.85)); await c.sleep(300);
      await h.click("[data-path]", "budget-2026.xlsx", 0, "start");
    } },
  "split-menu": { opts: { tabs: one("Documents", "list") }, keepMouse: true,
    async run(c, h) {
      await h.split();
      await c.click(Math.round(W * 0.75), Math.round(H * 0.8)); await c.sleep(300);
      await h.go(`${DEMO}\\Projects`);
      await h.rclick("[data-path]", "budget-2026.xlsx", 0, "start");
      await h.hoverMenu("Copy to Other Panel");
    } },
  "split-palette": { opts: { tabs: one("Documents", "list") },
    async run(c, h) { await h.palette("split"); } },

  // ---------- S3 Koš ----------
  "bin-select": { opts: { tabs: one("Documents", "list") },
    async run(c, h) { await h.click("[data-path]", "quarterly-report", 0, "start"); } },
  "bin-view": { opts: { tabs: one("Documents", "list") },
    async run(c, h) {
      trashStart = Math.floor(Date.now() / 1000);
      await h.invoke("delete_paths", { paths: TRASHED, permanent: false, elevate: false });
      await c.sleep(1500);
      await c.key("F5", "F5", 116); await c.sleep(600);
      await h.click("button, [role=button], a, div", "Recycle Bin", 0, "start"); await c.sleep(1800);
    } },
  "bin-restore": { opts: { tabs: one("Documents", "list") }, keepMouse: true,
    async run(c, h) {
      await h.click("button, [role=button], a, div", "Recycle Bin", 0, "start"); await c.sleep(1800);
      await h.rclick("[data-path], [role=row], [role=option]", "quarterly-report", 0, "start");
      await h.hoverMenu("Restore");
    } },
  "bin-back": { opts: { tabs: one("Documents", "list") },
    async run(c, h) {
      const items = (await h.invoke("list_recycle_bin", {})).filter((i) => `${i.original_dir}\\${i.name}` === TRASHED[0] && i.deleted >= trashStart - 5);
      if (items.length) await h.invoke("restore_recycled", { ids: items.map((i) => i.id), elevate: false }).catch((e) => console.error("restore", e.message));
      await c.sleep(1200); await c.key("F5", "F5", 116); await c.sleep(800);
      await h.click("[data-path]", "quarterly-report.txt", 0, "start").catch(() => {});
    } },

  // ---------- S4 zkratky ----------
  "sc-tabs": { opts: { tabs: { active: 1, items: [panel("Photos\\Summer 2026", "icon"), panel("Documents", "list"), panel("Projects", "column"), panel("Music", "list")] } },
    async run(c) { await c.sleep(600); } },
  "sc-preview": { opts: { tabs: one("Photos\\Summer 2026", "icon") },
    async run(c, h) { await h.sel("coastline.jpg"); await c.key(" ", "Space", 32, 0, " "); await c.sleep(1800); } },
  "sc-path": { opts: { tabs: one("Projects", "list") },
    async run(c, h) { await c.key("l", "KeyL", 76, 2); await c.sleep(300); await c.type("C:\\Demo\\Pho", 60); await c.sleep(800); } },
  "sc-undo": { opts: { tabs: one("Documents", "list") },
    async run(c, h) { await h.palette("undo"); } },

  // ---------- S5 náhledy ----------
  "pv-photo": { opts: { tabs: one("Photos\\Summer 2026", "icon") },
    async run(c, h) { await h.sel("sunset-over-lake.jpg"); await c.key(" ", "Space", 32, 0, " "); await c.sleep(1800); } },
  "pv-video": { opts: { tabs: one("Videos", "icon") },
    async run(c, h) { await h.sel("city-drive.mp4"); await c.key(" ", "Space", 32, 0, " "); await c.sleep(2500); } },
  "pv-markdown": { opts: { tabs: one("Documents", "list") },
    async run(c, h) { await h.click("[data-path]", "meeting-notes", 0, "start"); await c.key(" ", "Space", 32, 0, " "); await c.sleep(1800); } },
  "pv-code": { opts: { tabs: one("Projects\\website", "list") },
    async run(c, h) {
      const f = await c.evaluate(`[...document.querySelectorAll("[data-path]")].map((e) => e.dataset.path.split("\\\\").pop()).find((n) => /\\.(css|js|ts|html|json)$/.test(n))`);
      if (!f) throw new Error("ve website není kód");
      await h.click("[data-path]", f, 0, "start"); await c.key(" ", "Space", 32, 0, " "); await c.sleep(1800);
    } },
  "pv-audio": { opts: { tabs: one("Music", "list") },
    async run(c, h) { await h.click("[data-path]", "Night Drive", 0, "start"); await c.key(" ", "Space", 32, 0, " "); await c.sleep(1800); } },
  "pv-column": { opts: { tabs: one("Videos", "column") },
    async run(c, h) { await h.sel("city-drive.mp4"); await c.sleep(2500); } },

  // ---------- S6 open source / S7 nastavení ----------
  "about": { opts: { tabs: one("Photos\\Summer 2026", "icon") },
    async run(c, h) { await h.click("button", "More"); await h.hoverMenu("About Dirwise"); await c.key("Enter", "Enter", 13, 0, "\r").catch(() => {}); await h.click("[role=menuitem], button", "About Dirwise", 0, "start").catch(() => {}); await c.sleep(900); } },
  "hero-dark": { opts: { tabs: one("Photos\\Summer 2026", "icon") },
    async run(c, h) { await c.wheel(Math.round(W * 0.55), Math.round(H * 0.6), 150, 6); await c.sleep(1000); await h.sel("harbor-lights.jpg"); await c.sleep(1200); } },
  "hero-light": { opts: { theme: "light", tabs: one("Photos\\Summer 2026", "icon") },
    async run(c, h) { await h.sel("harbor-lights.jpg"); await c.sleep(1200); } },
  "set-appearance": { opts: { tabs: one("Photos\\Summer 2026", "icon") }, keepMouse: true,
    async run(c, h) { await h.click("button", "More"); await h.hoverMenu("Appearance"); } },
  "set-language": { opts: { tabs: one("Photos\\Summer 2026", "icon") }, keepMouse: true,
    async run(c, h) { await h.click("button", "More"); await h.hoverMenu("Language"); } },
  "set-extensions": { opts: { tabs: one("Documents", "list") }, keepMouse: true,
    async run(c, h) { await h.click("button", "More"); await h.hoverMenu("View"); await h.hoverMenu("File Extensions"); } },
  "set-columns": { opts: { tabs: one("Photos", "column") },
    async run(c, h) { await h.sel("Summer 2026"); await c.sleep(1000); await h.sel("coastline.jpg"); await c.sleep(2000); } },
};

const names = args.length ? args : Object.keys(S);
for (const n of names) if (!S[n]) throw new Error(`neznámá scéna: ${n}`);
const ok = [], bad = [];
try {
  for (const n of names) {
    const sc = S[n];
    const c = await setup(W, H, { tabs: TABS, ...sc.opts, scale: SCALE });
    const h = helpers(c);
    try {
      await c.sleep(1200);
      await sc.run(c, h);
      if (!sc.keepMouse) await c.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 1, y: 1 });
      await c.sleep(400);
      await c.shot(path.join(OUT, `${n}.png`));
      ok.push(n);
    } catch (e) { bad.push(`${n}: ${e.message}`); }
    finally {
      for (let i = 0; i < 3; i++) await c.key("Escape", "Escape", 27).catch(() => {});
      await c.evaluate(`import("/src/lib/storage.ts").then((s) => s.setTheme("dark"))`).catch(() => {});
      c.close();
    }
  }
} finally {
  // Koš: jen vlastní demo soubory (cesta + čas od startu scény), pak kopie z docs/demo.
  if (trashStart) {
    const c = await setup(W, H, { tabs: TABS });
    const inv = (cmd, p) => c.evaluate(`window.__TAURI_INTERNALS__.invoke(${JSON.stringify(cmd)}, ${JSON.stringify(p)})`);
    const mine = (await inv("list_recycle_bin", {})).filter((i) => TRASHED.includes(`${i.original_dir}\\${i.name}`) && i.deleted >= trashStart - 5);
    if (mine.length) await inv("purge_recycled", { ids: mine.map((i) => i.id), elevate: false });
    c.close();
  }
  for (const p of TRASHED) if (!fs.existsSync(p)) fs.cpSync(DEMO_SRC + p.replace(/^C:\\Demo\\/, ""), p, { recursive: true });
}
console.log("ok:", ok.join(" "));
if (bad.length) console.log("chyby:\n " + bad.join("\n "));
console.log(OUT);
