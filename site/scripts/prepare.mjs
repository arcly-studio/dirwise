// Před buildem: OG obrázek z docs/brand a favicony z ikony aplikace (soubory v public/ jsou v .gitignore).
import fs from "fs";
import { fileURLToPath } from "url";
import sharp from "sharp";

const repo = (p) => fileURLToPath(new URL(`../../${p}`, import.meta.url));
const pub = (p) => fileURLToPath(new URL(`../public/${p}`, import.meta.url));
const icon = repo("app-icon.png");

fs.copyFileSync(repo("docs/brand/github-social.png"), pub("og.png"));
fs.copyFileSync(repo("src-tauri/icons/icon.ico"), pub("favicon.ico"));
await sharp(icon).resize(32, 32).png().toFile(pub("favicon-32.png"));
// apple-touch-icon nesmí být průhledná – ikona na tmavém podkladu webu.
await sharp(icon).resize(180, 180).flatten({ background: "#000000" }).png().toFile(pub("apple-touch-icon.png"));
console.log("prepare: og.png, favicon.ico, favicon-32.png, apple-touch-icon.png");
