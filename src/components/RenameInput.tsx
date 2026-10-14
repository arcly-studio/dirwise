import { useEffect, useRef, useState } from "react";

import { isValidFileName, stemLength } from "../fileops";
import { useDisplayNames } from "../lib/extensions";
import type { FileEntry } from "../types";

type RenameInputProps = {
  entry: FileEntry;
  onSubmit: (entry: FileEntry, name: string) => void;
  onCancel: () => void;
  /** row = řádek seznamu a sloupce, icon = název pod ikonou (na střed). */
  variant?: "row" | "icon";
};

export function RenameInput({ entry, onSubmit, onCancel, variant = "row" }: RenameInputProps) {
  const centered = variant === "icon";
  const names = useDisplayNames();
  // Skrytá přípona (Průzkumník, volba Přípony) se v poli neukáže a po
  // potvrzení se vrátí na konec — jako v Průzkumníku. Počítá se jednou, ať
  // změna nastavení během psaní název nerozbije.
  const [suffix] = useState(() => entry.name.slice(names.entry(entry).length));
  const [value, setValue] = useState(() => entry.name.slice(0, entry.name.length - suffix.length));
  const inputRef = useRef<HTMLInputElement>(null);

  // ESC odpojí input a tím spustí blur — bez téhle pojistky by se hned po
  // zrušení potvrdila původní hodnota.
  const finished = useRef(false);

  // Se skrytou příponou by prázdné pole dalo název „.txt“ — Průzkumník to nedovolí.
  const valid = (suffix === "" || value.trim() !== "") && isValidFileName(value + suffix);

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;

    input.focus();
    // U souboru se vybere jen tělo názvu, viditelná přípona zůstane mimo
    // výběr. Složka příponu nemá — "my.folder" se vybere celé; se skrytou
    // příponou je v poli jen tělo, vybere se celé.
    const shown = input.value;
    input.setSelectionRange(0, entry.is_dir || suffix ? shown.length : stemLength(shown));
  }, [entry.is_dir, suffix]);

  function submit() {
    if (finished.current) return;
    if (!valid) {
      // Neplatný název se nepotvrzuje; input zůstane v chybovém stavu.
      inputRef.current?.focus();
      return;
    }
    finished.current = true;
    onSubmit(entry, value + suffix);
  }

  function cancel() {
    if (finished.current) return;
    finished.current = true;
    onCancel();
  }

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      spellCheck={false}
      onChange={(event) => setValue(event.target.value)}
      onClick={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
      onBlur={submit}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === "Enter") {
          event.preventDefault();
          submit();
        } else if (event.key === "Escape") {
          event.preventDefault();
          cancel();
        }
      }}
      // Text v inputu musí ležet přesně tam, kde byl název: stejné písmo
      // a řádkování jako label, a rámeček s vnitřním okrajem (1 + 4 px) se
      // vyrovná záporným okrajem — input se roztáhne do mezery za ikonou,
      // písmena zůstanou na pixelu. U ikon totéž svisle (1px rámeček nahoře)
      // a vodorovně na střed.
      className={`fw-rename min-w-0 rounded-sm text-primary outline-none ${
        centered ? "is-icon w-full text-center" : "flex-1"
      }`}
      style={{
        background: "var(--bg-main)",
        border: `1px solid ${valid ? "var(--accent)" : "var(--danger)"}`,
        userSelect: "text",
      }}
    />
  );
}
