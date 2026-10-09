import { createContext, useContext } from "react";

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
