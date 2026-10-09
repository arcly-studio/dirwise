import { createContext, useContext } from "react";
import { invoke } from "@tauri-apps/api/core";

/**
 * Vzhled „sklo" (1.5): titulek, toolbar, záložky a status bar leží přes
 * výpis a obsah pod nimi rozmazaně prosvítá. Celé CSS visí pod
 * :root[data-glass="on"] — bez atributu je vzhled přesně jako v 1.4.2.
 */
export function applyGlass(on: boolean): void {
  const root = document.documentElement;
  if (on) root.dataset.glass = "on";
  else delete root.dataset.glass;
}

/**
 * Zrcadlo výsledného stavu v localStorage — jen kvůli prvnímu vykreslení
 * (main.tsx), než se načte settings.json a zeptá se Windows. Bez něj by
 * okno s vypnutou průhledností na první snímek naskočilo se sklem.
 */
const MIRROR_KEY = "finder-glass";

export function readGlassMirror(): boolean {
  try {
    return localStorage.getItem(MIRROR_KEY) !== "off";
  } catch {
    return true;
  }
}

export function writeGlassMirror(on: boolean): void {
  try {
    localStorage.setItem(MIRROR_KEY, on ? "on" : "off");
  } catch {
    // Bez zrcadla jen první snímek může mít jiný stav — nic horšího.
  }
}

const REDUCED_QUERY = "(prefers-reduced-transparency: reduce)";

/**
 * Výchozí stav bez volby uživatele: sklo, pokud Windows nemá vypnuté Efekty
 * průhlednosti (registr) a prohlížeč nehlásí prefers-reduced-transparency.
 */
export async function systemGlass(): Promise<boolean> {
  if (window.matchMedia(REDUCED_QUERY).matches) return false;
  return invoke<boolean>("system_transparency").catch(() => true);
}

/**
 * Zavolá `onChange`, když se systémový stav mohl změnit: změna
 * prefers-reduced-transparency, nebo návrat do okna — Efekty průhlednosti
 * se přepínají v Nastavení Windows a registr žádnou událost nepošle.
 */
export function watchSystemGlass(onChange: () => void): () => void {
  const query = window.matchMedia(REDUCED_QUERY);
  query.addEventListener("change", onChange);
  window.addEventListener("focus", onChange);
  return () => {
    query.removeEventListener("change", onChange);
    window.removeEventListener("focus", onChange);
  };
}

/**
 * Výšky lišt přes obsah (stejné hodnoty drží --glass-top / --glass-bottom
 * v index.css): titulek 32 + toolbar 40 + záložky 37; status bar 22 a lišta
 * nové verze 26.
 */
export const GLASS_TOP = 109;
export const GLASS_STATUS = 22;
export const GLASS_UPDATE_BAR = 26;

/** O kolik posouvaný obsah začíná pod lištou nahoře a končí nad status barem. */
export type GlassInsets = { top: number; bottom: number };

export const NO_GLASS_INSETS: GlassInsets = { top: 0, bottom: 0 };

/** Views ho potřebují do virtualizace (scrollMargin, hit test, stránkování). */
export const GlassInsetsContext = createContext<GlassInsets>(NO_GLASS_INSETS);

export function useGlassInsets(): GlassInsets {
  return useContext(GlassInsetsContext);
}
