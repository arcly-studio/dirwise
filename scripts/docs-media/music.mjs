// Výměna hudby u hotového videa bez přerenderování (promo.mjs a motion.mjs, parametr --music):
// obraz se kopíruje (-c:v copy), zvuk se znovu zakóduje do AAC 192k, délka přesně podle obrazové
// stopy, +faststart. Výstup vedle originálu s příponou (výchozí -v2), originál zůstane.
import fs from "fs";
import { execFileSync } from "child_process";

// csv výstup ffprobe může končit čárkou – parseFloat ji ignoruje.
const probe = (file, stream) => parseFloat(execFileSync("ffprobe", ["-v", "error", "-select_streams", stream,
  "-show_entries", "stream=duration", "-of", "csv=p=0", file]).toString().trim());

export function swapMusic(video, music, suffix = "-v2") {
  for (const f of [video, music]) if (!fs.existsSync(f)) throw new Error(`chybí soubor: ${f}`);
  const dur = probe(video, "v:0");
  if (probe(music, "a:0") + 0.05 < dur) console.warn(`  hudba je kratší než video (${dur.toFixed(3)} s) – konec bude bez zvuku`);
  const out = video.replace(/\.mp4$/i, `${suffix}.mp4`);
  execFileSync("ffmpeg", ["-v", "error", "-y", "-i", video, "-i", music, "-map", "0:v:0", "-map", "1:a:0",
    "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-t", dur.toFixed(6), "-movflags", "+faststart", out], { stdio: "inherit" });
  return out;
}
