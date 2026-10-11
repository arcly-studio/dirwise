// Testovací tapeta za okno se zapnutou Průhledností (1.5) a skutečné snímání
// obrazovky (screen.ps1): tapeta je opravdové okno za aplikací, aplikace před
// ní a snímá se obrazovka — žádné skládání, snímek ukazuje, jak okno vypadá.
// Okno aplikace se krátce dá nad ostatní okna bez aktivace a pak se vrátí.
import fs from "fs";
import os from "os";
import path from "path";
import { execFileSync, spawn } from "child_process";
import { fileURLToPath } from "url";

const SCREEN = fileURLToPath(new URL("./screen.ps1", import.meta.url));

/** Ostrý barevný přechod ve stylu tapet macOS (soubor v %TEMP%). */
export function testWallpaper(width, height) {
  const file = path.join(os.tmpdir(), `finder-win-wallpaper-v2-${width}x${height}.png`);
  if (fs.existsSync(file)) return file;
  execFileSync("ffmpeg", [
    "-v", "error", "-y", "-f", "lavfi",
    "-i", `gradients=s=${width}x${height}:c0=0x1d2b64:c1=0x7b3fa0:c2=0xf0806a:c3=0xffc56b:n=4:seed=7:duration=1:speed=0`,
    "-frames:v", "1", file,
  ]);
  return file;
}

export const screen = (cmd, args = {}) =>
  execFileSync("pwsh", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", SCREEN, "-Cmd", cmd,
    ...Object.entries(args).flatMap(([k, v]) => [`-${k}`, String(v)])], { stdio: ["ignore", "pipe", "inherit"] });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Připraví scénu: okno aplikace na `win`, tapeta přes `area`, obojí nahoře.
 * Vrací úklid (vrátit okna, ukončit tapetu).
 */
export async function stage(win, area = win) {
  screen("stop");
  const bg = spawn("pwsh", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", SCREEN, "-Cmd", "backdrop",
    "-Image", testWallpaper(area.W, area.H), "-X", area.X, "-Y", area.Y, "-W", area.W, "-H", area.H].map(String),
    // Bez detached: s ním se okno WinForms na Windows vůbec neukáže.
    { stdio: "ignore" });
  bg.unref();
  const unstage = () => {
    try { screen("untop"); } finally { screen("stop"); }
  };
  try {
    await sleep(2500);
    screen("place", win);
    screen("top");
    await sleep(800);
  } catch (err) {
    unstage();
    throw err;
  }
  return unstage;
}

/** Okno nemá fokus (kreslí se jako neaktivní) — stránce se fokus oznámí. */
export const announceFocus = (c) => c.evaluate(`window.dispatchEvent(new Event("focus"))`);
