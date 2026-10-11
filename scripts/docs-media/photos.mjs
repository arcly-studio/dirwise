// Doplní demo fotky do docs/demo/Photos/Summer 2026 (složka je jen lokálně, viz CLAUDE.md),
// ať je ve složce dost položek a výpis při scrollu zajíždí pod skleněnou lištu (1.5).
// Barevné přechody z ffmpeg (zdroj gradients), stejný rozmazaný styl jako zbytek dema.
// node scripts/docs-media/photos.mjs   (ffmpeg v PATH, viz CLAUDE.md)
import fs from "fs";
import { execFileSync } from "child_process";
import { fileURLToPath } from "url";

const OUT = fileURLToPath(new URL("../../docs/demo/Photos/Summer 2026/", import.meta.url));
const NAMES = [
  "alpine-lake", "old-town", "sunrise-hike", "picnic", "lighthouse", "market-day",
  "rainy-street", "night-market", "canoe", "lavender-field", "cliff-walk", "campfire",
  "fishing-village", "rooftops", "sand-dunes", "waterfall", "vineyard", "sailing",
  "bike-ride", "golden-hour", "festival", "starry-sky",
  "pier-at-dusk", "orchard", "street-food", "tide-pools", "hilltop-view", "train-window",
  "lakeside-cabin", "kayaks", "sunflowers", "ice-cream", "beach-volleyball", "harbor-morning",
  "forest-path", "boardwalk", "summer-rain", "museum-day", "evening-swim", "mountain-hut",
  "berry-picking", "farewell-sunset",
];
// Paleta přechodů — sytější i tlumené, ať mřížka nepůsobí jednotvárně.
const COLORS = [
  ["0xff8a5b", "0x5b6cff", "0xffd36b"], ["0x2ec4b6", "0x0b3d91", "0xcbf3f0"],
  ["0xff5d8f", "0xffc15e", "0x7b2cbf"], ["0x80ed99", "0x22577a", "0xc7f9cc"],
  ["0x1b1b3a", "0x693668", "0xf4a261"], ["0xe9c46a", "0xe76f51", "0x264653"],
];

fs.mkdirSync(OUT, { recursive: true });
NAMES.forEach((name, i) => {
  const file = `${OUT}${name}.jpg`;
  if (fs.existsSync(file)) return;
  const [a, b, c] = COLORS[i % COLORS.length];
  execFileSync("ffmpeg", [
    "-v", "error", "-y", "-f", "lavfi",
    "-i", `gradients=s=640x480:c0=${a}:c1=${b}:c2=${c}:n=3:seed=${101 + i * 7}:duration=1:speed=0`,
    "-vf", "gblur=sigma=24", "-frames:v", "1", "-q:v", "4", file,
  ]);
  console.log("ok", name);
});
