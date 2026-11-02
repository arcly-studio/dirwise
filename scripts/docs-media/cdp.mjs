// Minimální CDP klient pro webview Dirwise (port 9333).
export async function connect() {
  const list = await (await fetch("http://127.0.0.1:9333/json/list")).json();
  const page = list.find((t) => t.type === "page");
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
  const evaluate = async (expr) => {
    const r = await raw("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
    return r.result.value;
  };

  // Pojistka demo prostředí (CLAUDE.md, Screenshoty a demo): skripty smí sahat jen na dev build
  // s demo-conf.json (identifier ….demo, vlastní settings.json) a jen na výpis z C:\Demo.
  // 1) identifier hned po připojení, 2) výpis před každým vstupem (klik, klávesa, kolečko,
  // text) a před snímkem. Porušení = výpis na stderr a konec procesu, ne výjimka, kterou by
  // skript mohl spolknout. Prázdný výpis (načítání, Koš, paleta) projde.
  const stop = (why) => {
    console.error(`POJISTKA DEMO: ${why} – skript končí, nic dalšího se neposílá.`);
    ws.close();
    process.exit(3);
  };
  let identifier = null;
  for (let attempt = 0; attempt < 20 && identifier === null; attempt += 1) {
    identifier = await evaluate(
      `window.__TAURI_INTERNALS__?.invoke("plugin:app|identifier").catch(() => null) ?? null`,
    ).catch(() => null);
    if (identifier === null) await new Promise((r) => setTimeout(r, 250));
  }
  if (typeof identifier !== "string" || !identifier.endsWith(".demo")) {
    stop(`běží identifier ${JSON.stringify(identifier)}, ne ….demo (dev bez --config scripts/docs-media/demo-conf.json?)`);
  }
  const assertDemo = async () => {
    const outside = await evaluate(`(() => {
      const ok = (p) => /^c:\\\\demo(\\\\|$)/i.test(p);
      const paths = [...document.querySelectorAll(".fw-panel [data-path]")].map((e) => e.dataset.path);
      const folder = document.querySelector(".fw-toolbar h1")?.dataset.tooltip;
      if (folder) paths.push(folder);
      return paths.find((p) => !ok(p)) ?? null;
    })()`);
    if (outside !== null) stop(`výpis mimo C:\\Demo (${outside}) – chybí demo patch složek ze setup.mjs?`);
  };
  // Pohyb myši nic nespustí — kontrola nejvýš jednou za 250 ms; stisky, klávesy, kolečko a text vždy.
  let lastMoveCheck = 0;
  const send = async (method, params = {}) => {
    if (method.startsWith("Input.")) {
      const move = method === "Input.dispatchMouseEvent" && params.type === "mouseMoved";
      if (!move || Date.now() - lastMoveCheck > 250) {
        await assertDemo();
        if (move) lastMoveCheck = Date.now();
      }
    }
    return raw(method, params);
  };
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
    await assertDemo();
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
