// Minimální CDP klient pro webview Dirwise (port 9333) s pojistkou demo prostředí (viz connect()).

// Náhrada cest demo prostředí – vkládá ji connect() do každého načtení stránky (dřív jen setup.mjs):
// standardní složky → C:\Demo, bez cloud sekce, z jednotek jen místní disky (telefony, USB a síťové
// jednotky se v záběrech neukážou), Koš jen z položek z C:\Demo (skutečný obsah se nikde neukáže),
// neutrální typy menu + New místo typů z registru tohohle počítače.
const MAP = {
  desktop: "C:\\Demo", downloads: "C:\\Demo\\Downloads", documents: "C:\\Demo\\Documents",
  pictures: "C:\\Demo\\Photos", music: "C:\\Demo\\Music", videos: "C:\\Demo\\Videos", home: "C:\\Demo",
};
const SHELL_NEW = [
  { extension: ".docx", name: "Microsoft Word Document", itemName: null },
  { extension: ".xlsx", name: "Microsoft Excel Worksheet", itemName: null },
  { extension: ".pptx", name: "Microsoft PowerPoint Presentation", itemName: null },
  { extension: ".zip", name: "Compressed (zipped) Folder", itemName: "New Compressed (zipped) Folder" },
];
export const DEMO_PATCH = `(() => {
  const MAP = ${JSON.stringify(MAP)};
  const SHELL_NEW = ${JSON.stringify(SHELL_NEW)};
  const of = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input.url;
    const res = await of(input, init);
    if (url.startsWith("http://ipc.localhost/list_recycle_bin") && res.ok) {
      const items = (await res.json()).filter((i) => /^C:\\\\Demo(\\\\|$)/i.test(i.original_dir));
      window.__demoTrash = items;
      return new Response(JSON.stringify(items), { status: res.status, headers: res.headers });
    }
    if (url.startsWith("http://ipc.localhost/recycle_bin_state") && res.ok) {
      const items = window.__demoTrash ?? [];
      const state = { count: items.length, size: items.reduce((a, i) => a + i.size, 0) };
      return new Response(JSON.stringify(state), { status: res.status, headers: res.headers });
    }
    if (url.startsWith("http://ipc.localhost/list_shell_new") && res.ok) {
      return new Response(JSON.stringify(SHELL_NEW), { status: res.status, headers: res.headers });
    }
    if (!url.startsWith("http://ipc.localhost/get_favorites") || !res.ok) return res;
    const r = await res.json();
    const out = r.filter((s) => s.id !== "cloud").map((s) => ({ ...s,
      items: s.items.filter((i) => s.id !== "devices" || i.kind === "local")
        .map((i) => (i.id && MAP[i.id] ? { ...i, path: MAP[i.id] } : i)) }));
    return new Response(JSON.stringify(out), { status: res.status, headers: res.headers });
  };
  window.__demoPatched = true;
})();`;
// Port 9333 může na IPv4 držet jiný WebView2 s ladicím portem – hledá se stránka Dirwise (vite na 1420)
// na 127.0.0.1 i [::1].
export async function connect() {
  let page;
  for (const host of ["127.0.0.1", "[::1]"]) {
    try {
      const list = await (await fetch(`http://${host}:9333/json/list`)).json();
      page = list.find((t) => t.type === "page" && t.url.startsWith("http://localhost:1420"));
    } catch {}
    if (page) break;
  }
  if (!page) throw new Error("Nenašel jsem webview Dirwise na portu 9333 (běží dev s WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS?).");
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  let id = 0;
  const pending = new Map();
  const listeners = [];
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) {
      const { res, rej } = pending.get(m.id);
      pending.delete(m.id);
      m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result);
    } else if (m.method) listeners.forEach((l) => l(m));
  };
  const raw = (method, params = {}) =>
    new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
  const rawEvaluate = async (expr) => {
    const r = await raw("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
    return r.result.value;
  };
  const pause = (ms) => new Promise((r) => setTimeout(r, ms));

  // Pojistka demo prostředí (CLAUDE.md, Screenshoty a demo): skripty smí sahat jen na dev build
  // s demo-conf.json (identifier ….demo, vlastní settings.json) a jen na výpis z C:\Demo.
  // 1) identifier hned po připojení; 2) náhrada cest (DEMO_PATCH) se vloží do každého dalšího
  //    načtení stránky; 3) po Page.reload / Page.navigate se počká na nový dokument a ověří
  //    náhrada i výpis; 4) výpis se kontroluje i při čtení (evaluate, nejvýš 1× za 250 ms),
  //    před každým vstupem (klik, klávesa, kolečko, text; pohyb myši 1× za 250 ms) a před
  //    snímkem – vstup a snímek navíc jen na stránce s náhradou cest. Porušení = stderr a konec
  //    procesu (exit 3), ne výjimka, kterou by skript mohl spolknout. Prázdný výpis projde.
  const stop = (why) => {
    console.error(`POJISTKA DEMO: ${why} – skript končí, nic dalšího se neposílá.`);
    ws.close();
    process.exit(3);
  };
  let identifier = null;
  for (let attempt = 0; attempt < 20 && identifier === null; attempt += 1) {
    identifier = await rawEvaluate(
      `window.__TAURI_INTERNALS__?.invoke("plugin:app|identifier").catch(() => null) ?? null`,
    ).catch(() => null);
    if (identifier === null) await pause(250);
  }
  if (typeof identifier !== "string" || !identifier.endsWith(".demo")) {
    stop(`běží identifier ${JSON.stringify(identifier)}, ne ….demo (dev bez --config scripts/docs-media/demo-conf.json?)`);
  }
  // Náhrada cest platí od příštího načtení stránky po celou dobu tohoto CDP sezení.
  await raw("Page.enable");
  await raw("Page.addScriptToEvaluateOnNewDocument", { source: DEMO_PATCH });

  const assertDemo = async ({ requirePatch = false } = {}) => {
    const r = await rawEvaluate(`(() => {
      const ok = (p) => /^c:\\\\demo(\\\\|$)/i.test(p);
      const paths = [...document.querySelectorAll(".fw-panel [data-path]")].map((e) => e.dataset.path);
      const folder = document.querySelector(".fw-toolbar h1")?.dataset.tooltip;
      if (folder) paths.push(folder);
      return { outside: paths.find((p) => !ok(p)) ?? null, patched: !!window.__demoPatched };
    })()`);
    if (r.outside !== null) stop(`výpis mimo C:\\Demo (${r.outside})`);
    if (requirePatch && !r.patched) {
      stop("stránka je načtená bez náhrady cest – nejdřív setup() nebo Page.reload v tomto skriptu");
    }
  };
  // Po reloadu / navigaci: počkat na nový dokument (zmizí značka ze starého), ten musí mít
  // náhradu cest; pak hlídat výpis, dokud se neobjeví (nejvýš 10 s).
  const afterLoad = async (token) => {
    const t0 = Date.now();
    let fresh = false;
    while (Date.now() - t0 < 10000) {
      const r = await rawEvaluate(`({ token: window.__demoLoadToken ?? null, ready: document.readyState,
        patched: !!window.__demoPatched, items: document.querySelectorAll(".fw-panel [data-path]").length })`).catch(() => null);
      if (r !== null && r.token !== token) {
        fresh = true;
        if (!r.patched && r.ready !== "loading") stop("nová stránka se načetla bez náhrady cest");
        if (r.patched) {
          await assertDemo();
          // Výpis je venku, nebo je stránka 3 s načtená bez výpisu (Koš, prázdná složka).
          if (r.items > 0 || (r.ready === "complete" && Date.now() - t0 > 3000)) return;
        }
      }
      await pause(100);
    }
    if (!fresh) stop("stránka se do 10 s znovu nenačetla – stav nejde ověřit");
  };
  // Čtení stránky: kontrola výpisu nejvýš jednou za 250 ms.
  let lastReadCheck = 0;
  const evaluate = async (expr) => {
    if (Date.now() - lastReadCheck > 250) {
      lastReadCheck = Date.now();
      await assertDemo();
    }
    return rawEvaluate(expr);
  };
  // Pohyb myši nic nespustí — kontrola nejvýš jednou za 250 ms; stisky, klávesy, kolečko a text vždy.
  let lastMoveCheck = 0;
  const send = async (method, params = {}) => {
    if (method.startsWith("Input.")) {
      const move = method === "Input.dispatchMouseEvent" && params.type === "mouseMoved";
      if (!move || Date.now() - lastMoveCheck > 250) {
        await assertDemo({ requirePatch: true });
        if (move) lastMoveCheck = Date.now();
      }
    }
    if (method === "Page.reload" || method === "Page.navigate") {
      const token = `${Date.now()}-${Math.random()}`;
      await rawEvaluate(`(window.__demoLoadToken = ${JSON.stringify(token)}, 1)`).catch(() => null);
      const result = await raw(method, params);
      await afterLoad(token);
      return result;
    }
    return raw(method, params);
  };
  // Stav při připojení: výpis musí být v C:\Demo (i bez setup()).
  await assertDemo();
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  // Klávesa přes Input.dispatchKeyEvent (modifiers: 1 Alt, 2 Ctrl, 4 Meta, 8 Shift).
  const key = async (k, code, vk, modifiers = 0, text) => {
    await send("Input.dispatchKeyEvent", { type: text ? "keyDown" : "rawKeyDown", key: k, code, windowsVirtualKeyCode: vk, modifiers, text });
    await send("Input.dispatchKeyEvent", { type: "keyUp", key: k, code, windowsVirtualKeyCode: vk, modifiers });
  };
  const type = async (s, delay = 120) => {
    for (const ch of s) { await send("Input.insertText", { text: ch }); await sleep(delay); }
  };
  const click = async (x, y) => {
    await send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
    await send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount: 1 });
    await send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", clickCount: 1 });
  };
  // Kolečko myši: posun po krocích (kladné dy dolů), ať scroll vypadá plynule.
  const wheel = async (x, y, dy, steps = 1, delay = 16) => {
    for (let i = 0; i < steps; i++) {
      await send("Input.dispatchMouseEvent", { type: "mouseWheel", x, y, deltaX: 0, deltaY: dy / steps });
      await sleep(delay);
    }
  };
  const size = (width = 1280, height = 800, scale = 1) =>
    send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: scale, mobile: false });
  const shot = async (file) => {
    const fs = await import("fs");
    await assertDemo({ requirePatch: true });
    const r = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(file, Buffer.from(r.data, "base64"));
  };
  return { send, evaluate, sleep, key, type, click, wheel, size, shot, assertDemo, identifier, listeners, close: () => ws.close() };
}

// CLI: node cdp.mjs "<js výraz>"
if (process.argv[1].endsWith("cdp.mjs") && process.argv[2]) {
  const c = await connect();
  console.log(JSON.stringify(await c.evaluate(process.argv[2]), null, 1));
  c.close();
}
