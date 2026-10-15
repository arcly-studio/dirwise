// Screenshoty do docs/screenshots (viz CLAUDE.md, sekce Screenshoty a demo).
// node scripts/docs-media/shots.mjs [jméno …]   (bez argumentu všech deset; recycle-bin poslední)
// Výchozí vzhled (Průhlednost vypnutá). Scéna transparency je skutečný snímek
// obrazovky: okno s rozmazanou průhledností (Acrylic) před testovací tapetou (wallpaper.mjs).
// --store: 1920×1080 do docs/store/ (Microsoft Store chce aspoň 1366×768) – viewport 1280×720
// se škálováním 1,5, ať rozložení odpovídá README a výpis jde odscrollovat pod sklo.
import fs from "fs";
import { fileURLToPath } from "url";
import { setup, panel, TABS } from "./setup.mjs";
import { announceFocus, screen, stage } from "./wallpaper.mjs";

const ALL = ["hero-dark", "hero-light", "split-view", "command-palette", "previews", "transparency", "columns", "tabs", "extensions", "recycle-bin"];
const STORE = process.argv.includes("--store");
const args = process.argv.slice(2).filter((a) => a !== "--store");
const which = args.length > 0 ? args : ALL;
const [W, H, SCALE] = STORE ? [1280, 720, 1.5] : [1280, 800, 1];
const OUT = fileURLToPath(new URL(STORE ? "../../docs/store/" : "../../docs/screenshots/", import.meta.url));
fs.mkdirSync(OUT, { recursive: true });

async function helpers(c) {
  // Klik na prvek podle selektoru (a volitelně textu) skutečnou myší přes CDP.
  const clickEl = async (sel, text, nth = 0) => {
    const pos = await c.evaluate(`(() => {
      const els = [...document.querySelectorAll(${JSON.stringify(sel)})]
        .filter((e) => ${text ? `e.textContent.trim() === ${JSON.stringify(text)} || e.getAttribute("aria-label") === ${JSON.stringify(text)}` : "true"})
        .filter((e) => e.getBoundingClientRect().width > 0);
      const e = els[${nth}];
      if (!e) return null;
      const r = e.getBoundingClientRect();
      return [r.x + r.width / 2, r.y + r.height / 2];
    })()`);
    if (!pos) throw new Error(`nenalezeno: ${sel} ${text ?? ""}`);
    await c.click(pos[0], pos[1]);
    await c.sleep(400);
  };
  const ctrl = (k, code, vk, shift = false) => c.key(k, code, vk, shift ? 10 : 2);
  const palette = async (q) => {
    await ctrl("k", "KeyK", 75);
    await c.sleep(400);
    await c.type(q, 60);
    await c.sleep(500);
  };
  const enter = () => c.key("Enter", "Enter", 13, 0, "\r");
  const esc = () => c.key("Escape", "Escape", 27);
  return { clickEl, ctrl, palette, enter, esc };
}

// Soubory pro scénu Koše (kopie demo dat v C:\Demo); po snímku se z docs/demo vrátí zpátky.
const TRASHED = ["C:\\Demo\\Documents\\quarterly-report.txt", "C:\\Demo\\Downloads\\setup.msi",
  "C:\\Demo\\Photos\\Summer 2026\\festival.jpg", "C:\\Demo\\Projects\\cli-tool"];

let sceneStart = 0;

const ICON = (c, h) => h.clickEl("[data-path]", "harbor-lights.jpg");
// Hero 1.5: výpis odjetý pod skleněnou lištu, ať je sklo vidět (posun kolečkem nad obsahem).
const HERO = async (c, h) => {
  await c.wheel(Math.round(W * 0.55), Math.round(H * 0.6), 150, 6);
  await c.sleep(1200);
  await ICON(c, h);
  await c.sleep(1500);
};
const scenes = {
  "hero-dark": { run: HERO },
  "hero-light": { opts: { theme: "light" }, run: HERO },
  "split-view": {
    opts: { tabs: { active: 2, items: [TABS.items[0], TABS.items[1], panel("Projects", "column")] } },
    async run(c, h) {
      await h.clickEl("[data-path]", "website");
      await c.sleep(600);
      const panels = await c.evaluate("document.querySelectorAll('[data-view]').length");
      if (panels < 2) await h.ctrl("d", "KeyD", 68, true);
      await c.sleep(1200);
      // Klik do prázdna v pravém panelu ho aktivuje.
      await c.click(Math.round(W * 0.67), Math.round(H * 0.75));
      await c.sleep(400);
      await h.ctrl("l", "KeyL", 76);
      await c.sleep(400);
      await c.send("Input.insertText", { text: "C:\\Demo\\Photos\\Summer 2026" });
      await h.enter();
      await c.sleep(1200);
      await h.clickEl("button[role=radio]", "View as List");
      await c.sleep(1500);
    },
  },
  "command-palette": { async run(c, h) { await h.palette("dow"); await c.sleep(800); } },
  transparency: {
    opts: { theme: "dark", transparency: true, strength: "medium", emulate: false },
    // README: okno 1280×800 přes celý snímek; Store: okno 1600×900 na tapetě přes
    // celou obrazovku 1920×1080 (primární monitor, 100 %).
    real: STORE
      ? { win: { X: 160, Y: 90, W: 1600, H: 900 }, area: { X: 0, Y: 0, W: 1920, H: 1080 } }
      : { win: { X: 200, Y: 120, W: 1280, H: 800 } },
    async run(c) { await c.wheel(Math.round(W * 0.55), Math.round(H * 0.6), 150, 6); await c.sleep(1500); },
  },
  // Sloupcové zobrazení: Photos → Summer 2026 → coastline.jpg, vpravo panel s náhledem fotky.
  columns: {
    opts: { tabs: { active: 0, items: [panel("Photos", "column"), TABS.items[1], TABS.items[2]] } },
    async run(c, h) {
      await h.clickEl("[data-path]", "Summer 2026");
      await c.sleep(1200);
      await h.clickEl("[data-path]", "coastline.jpg");
      await c.sleep(2500);
    },
  },
  // Více záložek s různými složkami a zobrazeními, aktivní Documents jako seznam.
  tabs: {
    opts: { tabs: { active: 1, items: [TABS.items[0], panel("Documents", "list"), panel("Projects", "column"), panel("Music", "list"), panel("Downloads", "icon")] } },
    // Řádek v seznamu má v textu i další sloupce – klik na šestý řádek (roadmap.pptx) podle polohy.
    async run(c) { await c.click(500, 264); await c.sleep(1200); },
  },
  // Koš: pár demo souborů se skutečně smaže do Koše, snímek, pak se z Koše trvale odstraní jen ty
  // z C:\Demo (setup.mjs filtruje výpis na C:\Demo, cizí položky Koše se neukážou ani nesmažou).
  // Scéna je v ALL poslední; smazané soubory se pak obnoví z docs/demo, ať další běhy mají stejná data.
  "recycle-bin": {
    async run(c, h) {
      const inv = (cmd, args) => c.evaluate(`window.__TAURI_INTERNALS__.invoke(${JSON.stringify(cmd)}, ${JSON.stringify(args)})`);
      sceneStart = Math.floor(Date.now() / 1000);
      await inv("delete_paths", { paths: TRASHED, permanent: false, elevate: false });
      await c.sleep(1500);
      await h.clickEl("button, [role=button], a, div", "Recycle Bin");
      await c.sleep(2000);
      await c.click(500, 168);
      await c.sleep(1000);
    },
    async after(c) {
      const inv = (cmd, args) => c.evaluate(`window.__TAURI_INTERNALS__.invoke(${JSON.stringify(cmd)}, ${JSON.stringify(args)})`);
      // Jen položky, které scéna sama smazala (cesta a čas od startu scény) – nic jiného z Koše.
      const mine = (await inv("list_recycle_bin", {})).filter((i) =>
        TRASHED.includes(`${i.original_dir}\\${i.name}`) && i.deleted >= sceneStart - 5);
      if (mine.length > 0) await inv("purge_recycled", { ids: mine.map((i) => i.id), elevate: false });
      // Zpátky do C:\Demo z docs/demo (cesty v C:\Demo odpovídají docs/demo).
      const demo = fileURLToPath(new URL("../../docs/demo/", import.meta.url));
      for (const p of TRASHED) fs.cpSync(demo + p.replace(/^C:\\Demo\\/, ""), p, { recursive: true });
    },
  },
  // Přípony: Více → Zobrazit ▸ Přípony souborů ▸ (Jako ve Windows / Vždy / Nikdy) nad seznamem Documents.
  extensions: {
    opts: { tabs: { active: 1, items: [TABS.items[0], panel("Documents", "list"), TABS.items[2]] } },
    async run(c, h) {
      await h.clickEl("button", "More");
      await c.sleep(500);
      const hover = async (text) => {
        const pos = await c.evaluate(`(() => { const e = [...document.querySelectorAll("[role=menuitem], button, div")].reverse()
          .find((x) => x.textContent.trim().startsWith(${JSON.stringify(text)}) && x.getBoundingClientRect().width > 0 && x.getBoundingClientRect().height < 40);
          if (!e) return null; const r = e.getBoundingClientRect(); return [r.x + 30, r.y + r.height / 2]; })()`);
        if (!pos) throw new Error("nenalezeno: " + text);
        await c.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: pos[0], y: pos[1] });
        await c.sleep(600);
      };
      await hover("View");
      await hover("File Extensions");
    },
    keepMouse: true,
  },
  previews: {
    opts: { tabs: { active: 0, items: [panel("Videos", "column"), TABS.items[1], TABS.items[2]] } },
    async run(c, h) { await h.clickEl("[data-path]", "city-drive.mp4"); await c.sleep(2500); },
  },
};

for (const name of which) {
  const scene = scenes[name];
  const c = await setup(W, H, { ...scene.opts, scale: SCALE });
  const h = await helpers(c);
  if (scene.real) {
    const unstage = await stage(scene.real.win, scene.real.area);
    try {
      await announceFocus(c);
      await c.sleep(1500);
      try { await scene.run(c, h); } catch (e) { console.error(e.message); }
      // Kurzor myši CDP nehýbe — hover stavy bez kurzoru.
      await c.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 1, y: 1 });
      // Rozmazaná průhlednost se kreslí jen v aktivním okně — okno s tapetou mu
      // fokus mohlo vzít, před snímkem se aktivuje znovu.
      screen("front");
      await c.sleep(800);
      screen("shot", { ...(scene.real.area ?? scene.real.win), Out: `${OUT}${name}.png` });
    } finally {
      unstage();
    }
  } else {
    await c.sleep(1500);
    try { await scene.run(c, h); } catch (e) { console.error(e.message); }
    // Kurzor myši CDP nehýbe — hover stavy bez kurzoru (u menu se myš nechá, jinak by se zavřelo).
    if (!scene.keepMouse) await c.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 1, y: 1 });
    try {
      await c.shot(`${OUT}${name}.png`);
    } finally {
      if (scene.after) await scene.after(c, h);
    }
  }
  console.log("ok", name);
  c.close();
}
