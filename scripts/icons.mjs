// Ikony aplikace z jediného zdroje docs/brand/icon-v2/logo/dirwise-icon.svg.
// Všechny velikosti se vykreslí z plného SVG (supersampling 4096 px → lanczos3, sharp násobí
// alfou), žádná zjednodušená varianta pro malé velikosti. Výstup:
//   docs/brand/icon-v2/logo/dirwise-icon-{16…1024}.png, app-icon.png (1024),
//   src/assets/icon.png (512), src-tauri/icons/*.png (přepíše výstup `tauri icon`)
//   a src-tauri/icons/icon.ico (vrstvy 32/16/24/48/64/256 jako PNG, pořadí jako u Tauri).
// sharp se bere z site/node_modules (závislost Astra), aplikace ho nepotřebuje.
// Spuštění: node scripts/icons.mjs
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const root = (...p) => path.join(ROOT, ...p);
const sharp = createRequire(root("site", "package.json"))("sharp");

const SVG = root("docs", "brand", "icon-v2", "logo", "dirwise-icon.svg");
const svg = fs.readFileSync(SVG, "utf8");
if (/<metadata>/.test(svg)) throw new Error("SVG obsahuje <metadata> (C2PA) – nejdřív odstranit");

// viewBox 256 → 4096 px (density 72 × 16)
const big = await sharp(Buffer.from(svg), { density: 72 * 16 }).resize(4096, 4096).png().toBuffer();
const cache = new Map();
const png = async (size) => {
  if (!cache.has(size)) {
    cache.set(size, await sharp(big).resize(size, size, { kernel: "lanczos3" }).png({ compressionLevel: 9 }).toBuffer());
  }
  return cache.get(size);
};
const write = async (file, size) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, await png(size));
};

for (const s of [16, 24, 32, 48, 64, 128, 256, 512, 1024]) {
  await write(root("docs", "brand", "icon-v2", "logo", `dirwise-icon-${s}.png`), s);
}
await write(root("app-icon.png"), 1024);
await write(root("src", "assets", "icon.png"), 512);

const icons = root("src-tauri", "icons");
const tauriPngs = {
  "32x32.png": 32, "64x64.png": 64, "128x128.png": 128, "128x128@2x.png": 256, "icon.png": 512,
  "Square30x30Logo.png": 30, "Square44x44Logo.png": 44, "Square71x71Logo.png": 71, "Square89x89Logo.png": 89,
  "Square107x107Logo.png": 107, "Square142x142Logo.png": 142, "Square150x150Logo.png": 150,
  "Square284x284Logo.png": 284, "Square310x310Logo.png": 310, "StoreLogo.png": 50,
};
for (const [name, s] of Object.entries(tauriPngs)) await write(path.join(icons, name), s);

// ICO: hlavička 6 B, adresář 16 B na vrstvu, data = PNG (Vista+, stejně jako `tauri icon`).
const layers = [32, 16, 24, 48, 64, 256];
const datas = await Promise.all(layers.map(png));
const head = Buffer.alloc(6 + 16 * layers.length);
head.writeUInt16LE(0, 0);
head.writeUInt16LE(1, 2);
head.writeUInt16LE(layers.length, 4);
let offset = head.length;
layers.forEach((s, i) => {
  const o = 6 + 16 * i;
  head[o] = s === 256 ? 0 : s;
  head[o + 1] = s === 256 ? 0 : s;
  head.writeUInt16LE(1, o + 4); // planes
  head.writeUInt16LE(32, o + 6); // bpp
  head.writeUInt32LE(datas[i].length, o + 8);
  head.writeUInt32LE(offset, o + 12);
  offset += datas[i].length;
});
fs.writeFileSync(path.join(icons, "icon.ico"), Buffer.concat([head, ...datas]));
console.log("icons: docs/brand/icon-v2/logo, app-icon.png, src/assets/icon.png, src-tauri/icons (*.png, icon.ico)");
