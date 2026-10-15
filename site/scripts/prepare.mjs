// Před buildem: OG obrázek z docs/brand a favicony z ikony aplikace (soubory v public/ jsou v .gitignore).
import fs from "fs";
import { fileURLToPath } from "url";
import sharp from "sharp";
import subsetFont from "subset-font";

const repo = (p) => fileURLToPath(new URL(`../../${p}`, import.meta.url));
const pub = (p) => fileURLToPath(new URL(`../public/${p}`, import.meta.url));
const icon = repo("app-icon.png");

fs.copyFileSync(repo("docs/brand/github-social.png"), pub("og.png"));
fs.copyFileSync(repo("src-tauri/icons/icon.ico"), pub("favicon.ico"));
await sharp(icon).resize(32, 32).png().toFile(pub("favicon-32.png"));
// apple-touch-icon nesmí být průhledná – ikona na tmavém podkladu webu.
await sharp(icon).resize(180, 180).flatten({ background: "#000000" }).png().toFile(pub("apple-touch-icon.png"));
// Hvězdné pole pro hero: deterministický náhodný rozptyl (stejný seed = stejný výsledek), pár set bytů SVG.
let seed = 20261015;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
const stars = Array.from({ length: 140 }, () => {
  const r = rnd() < 0.85 ? 0.6 + rnd() * 0.5 : 1.1 + rnd() * 0.7;
  const o = (0.25 + rnd() * 0.65).toFixed(2);
  return `<circle cx="${(rnd() * 1600).toFixed(0)}" cy="${(rnd() * 900).toFixed(0)}" r="${r.toFixed(1)}" fill-opacity="${o}"/>`;
}).join("");
fs.mkdirSync(pub("media"), { recursive: true });
fs.writeFileSync(pub("media/stars.svg"), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" fill="#fff">${stars}</svg>`);
// Čeština: z Inter latin-ext (83 kB) jen písmena mimo latin-1 – pár kB, preload jen na /cs/.
export const CS_CHARS = "ČčĎďĚěŇňŘřŠšŤťŮůŽž";
const ext = fs.readFileSync(fileURLToPath(new URL("../node_modules/@fontsource-variable/inter/files/inter-latin-ext-wght-normal.woff2", import.meta.url)));
fs.mkdirSync(pub("fonts"), { recursive: true });
fs.writeFileSync(pub("fonts/inter-cs.woff2"), await subsetFont(ext, CS_CHARS, { targetFormat: "woff2" }));
console.log("prepare: og.png, favicon.ico, favicon-32.png, apple-touch-icon.png, media/stars.svg, fonts/inter-cs.woff2");
