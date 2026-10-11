import { createContext, useContext } from "react";
import { invoke } from "@tauri-apps/api/core";

import { TRANSPARENCY_BLUR_AVAILABLE, type TransparencyStrength, type TransparencyStyle } from "./storage";
import { syncWindowBackground } from "../theme";

/*
 * Vzhled „sklo" (od 1.5 základní): titulek, toolbar, záložky a status bar
 * leží přes výpis a obsah pod nimi rozmazaně prosvítá. CSS visí pod
 * :root[data-glass="on"], atribut je napevno v index.html.
 *
 * Volba Průhlednost (1.5) navíc zprůhlední samotné okno: za sidebarem,
 * lištami a výpisem je vidět plocha a okna za aplikací.
 */

/**
 * Co okno kreslí pod obsahem: plné pozadí (vypnuto), Acrylic (rozmazaná
 * plocha), nebo průhlednost bez rozmazání — když Windows efekty nedovolí.
 */
export type WindowBackdrop = "off" | "acrylic" | "clear";

const REDUCED_QUERY = "(prefers-reduced-transparency: reduce)";

/**
 * Smí okno rozmazávat? Ne, když má Windows vypnuté Efekty průhlednosti
 * (registr) nebo prohlížeč hlásí prefers-reduced-transparency — pak zapnutá
 * Průhlednost jede bez rozmazání.
 */
export async function systemTransparency(): Promise<boolean> {
  if (window.matchMedia(REDUCED_QUERY).matches) return false;
  return invoke<boolean>("system_transparency").catch(() => true);
}

/**
 * Zavolá `onChange`, když se systémový stav mohl změnit: změna
 * prefers-reduced-transparency, nebo návrat do okna — Efekty průhlednosti
 * se přepínají v Nastavení Windows a registr žádnou událost nepošle.
 */
export function watchSystemTransparency(onChange: () => void): () => void {
  const query = window.matchMedia(REDUCED_QUERY);
  query.addEventListener("change", onChange);
  window.addEventListener("focus", onChange);
  return () => {
    query.removeEventListener("change", onChange);
    window.removeEventListener("focus", onChange);
  };
}

/**
 * Rozmazaná (Acrylic) jen na přání, když ji Windows dovolí a je v této verzi
 * zapnutá (TRANSPARENCY_BLUR_AVAILABLE); jinak čistá.
 */
export function windowBackdrop(enabled: boolean, style: TransparencyStyle, blurAllowed: boolean): WindowBackdrop {
  if (!enabled) return "off";
  return TRANSPARENCY_BLUR_AVAILABLE && style === "blur" && blurAllowed ? "acrylic" : "clear";
}

// null = nativní stav neznámý (start, reload stránky v dev) — první volání
// podklad nastaví vždy.
let appliedBackdrop: WindowBackdrop | null = null;
let backdropQueue: Promise<void> = Promise.resolve();

/**
 * Přepne podklad okna a CSS (data-transparency = síla). Pořadí hlídá, aby
 * nikdy nebylo vidět průhledné CSS bez podkladu nebo naopak: při vypínání
 * nejdřív plné CSS, pak nativní efekt; při zapínání obráceně. Volání se
 * řadí za sebe, rychlé přepínání se nepředbíhá.
 */
export function applyWindowBackdrop(next: WindowBackdrop, strength: TransparencyStrength): Promise<void> {
  backdropQueue = backdropQueue.then(async () => {
    const root = document.documentElement;
    if (next === "off") {
      delete root.dataset.transparency;
      syncWindowBackground();
    }
    if (next !== appliedBackdrop) {
      await invoke("set_window_backdrop", { backdrop: next }).catch(() => undefined);
      appliedBackdrop = next;
    }
    if (next !== "off") {
      root.dataset.transparency = strength;
      syncWindowBackground();
    }
  });
  return backdropQueue;
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

/** Views ho potřebují do virtualizace (scrollMargin, hit test, stránkování). */
export const GlassInsetsContext = createContext<GlassInsets>({ top: GLASS_TOP, bottom: GLASS_STATUS });

export function useGlassInsets(): GlassInsets {
  return useContext(GlassInsetsContext);
}
