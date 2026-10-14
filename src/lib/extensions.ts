import { useMemo, useSyncExternalStore } from "react";
import { invoke } from "@tauri-apps/api/core";

import * as storage from "./storage";
import type { ExtensionMode } from "./storage";
import type { FileEntry } from "../types";

/*
 * Zobrazení přípon jako v Průzkumníku. Rozhoduje pravidlo přípony z registru
 * (Rust extensions.rs, s položkou jako `ext_rule`), nastavení Průzkumníku
 * „Skrýt přípony známých typů souborů“ a volba aplikace (Více → Vzhled):
 * Podle Windows / Vždy / Nikdy. Zástupci (.lnk, .url, .pif — NeverShowExt)
 * příponu neukazují nikdy.
 *
 * Mění se jen to, co se zobrazí: řazení, hledání, filtr i operace pracují
 * s celým názvem (`entry.name`).
 */

const RULE_KNOWN = 1;
const RULE_NEVER = 2;
const RULE_ALWAYS = 3;

/** Průzkumník skrývá přípony známých typů (HideFileExt; výchozí Windows ano). */
let hideKnown = true;
/** Pravidla podle přípony — z položek, které prošly, a z dotazů pro holé názvy. */
const rules = new Map<string, number>();
const pending = new Set<string>();
let flush: Promise<void> | null = null;

let version = 0;
const listeners = new Set<() => void>();

function changed(): void {
  version += 1;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Znovu přečte nastavení Průzkumníku (start, návrat do okna). */
export async function refreshExplorerExtensions(): Promise<void> {
  const hides = await invoke<boolean>("explorer_hides_extensions").catch(() => true);
  if (hides !== hideKnown) {
    hideKnown = hides;
    changed();
  }
}

/** Pravidla pro přípony bez položky (nedávné, Koš) — dávkou, pak překreslit. */
function requestRule(extension: string): void {
  if (pending.has(extension)) return;
  pending.add(extension);
  flush ??= Promise.resolve().then(async () => {
    const batch = [...pending];
    pending.clear();
    flush = null;
    const result = await invoke<number[]>("extension_rules", { extensions: batch }).catch(() => null);
    if (!result) return;
    batch.forEach((ext, index) => rules.set(ext, result[index] ?? 0));
    changed();
  });
}

/** Přípona z názvu (jako Rust Path::extension): ".gitignore" ani "a." ji nemají. */
function extensionOf(name: string): string | null {
  const dot = name.lastIndexOf(".");
  return dot > 0 && dot < name.length - 1 ? name.slice(dot + 1).toLowerCase() : null;
}

function hides(rule: number, mode: ExtensionMode): boolean {
  if (rule === RULE_NEVER || mode === "never") return true;
  if (mode === "always" || rule === RULE_ALWAYS) return false;
  return rule === RULE_KNOWN && hideKnown;
}

/** Zobrazovaný název; `rule` z položky, jinak z cache (chybějící se dotáže). */
export function displayName(name: string, isDir: boolean, mode: ExtensionMode, rule?: number): string {
  if (isDir) return name;
  const extension = extensionOf(name);
  if (!extension) return name;
  let known = rule ?? rules.get(extension);
  if (rule !== undefined) rules.set(extension, rule);
  if (known === undefined) {
    requestRule(extension);
    known = 0;
  }
  return hides(known, mode) ? name.slice(0, name.length - extension.length - 1) : name;
}

export type DisplayNames = {
  /** Název položky výpisu. */
  entry: (entry: FileEntry) => string;
  /** Holý název (nedávné soubory, Koš, dialogy). */
  name: (name: string, isDir?: boolean) => string;
  /** Skrývá se u položky přípona? (přejmenování ji pak doplní zpátky) */
  hidesExtension: (entry: FileEntry) => boolean;
};

/** Funkce pro zobrazení názvů; nová identita při změně volby nebo pravidel. */
export function useDisplayNames(): DisplayNames {
  const current = useSyncExternalStore(subscribe, () => version);
  const mode = useSyncExternalStore(storage.subscribe, () => storage.getSnapshot().extensionMode);
  return useMemo(() => {
    const entry = (item: FileEntry) => displayName(item.name, item.is_dir, mode, item.ext_rule);
    return {
      entry,
      name: (name: string, isDir = false) => displayName(name, isDir, mode),
      hidesExtension: (item: FileEntry) => entry(item) !== item.name,
    };
    // current: překreslit po změně pravidel nebo nastavení Průzkumníku.
  }, [mode, current]);
}
