import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect, useState } from "react";

import appIcon from "../../src-tauri/icons/64x64.png";
import { useT } from "../i18n";

/** Glyfy Segoe Fluent Icons (Windows 11); Segoe MDL2 Assets (Windows 10) má stejné kódy. */
const GLYPH_MINIMIZE = "\uE921";
const GLYPH_MAXIMIZE = "\uE922";
const GLYPH_RESTORE = "\uE923";
const GLYPH_CLOSE = "\uE8BB";

const appWindow = getCurrentWindow();

type CaptionButtonProps = {
  glyph: string;
  label: string;
  onClick: () => void;
  className?: string;
  /** Tooltip jen tam, kde ho neukáže systém (Maximalizovat má Snap Layouts). */
  tooltip?: boolean;
};

function CaptionButton({ glyph, label, onClick, className = "", tooltip = true }: CaptionButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      data-tooltip={tooltip ? label : undefined}
      onClick={onClick}
      className={`fw-caption-button ${className}`}
    >
      <span aria-hidden>{glyph}</span>
    </button>
  );
}

/**
 * Titulkový pruh 32 px: vlevo ikona a název aplikace, vpravo tlačítka okna
 * Windows 11 (46 × 32). Celý je táhlo okna (data-tauri-drag-region);
 * dvojklik maximalizuje / obnoví — to obstará Tauri samo.
 *
 * Nad Maximalizovat leží nativní overlay (snap.rs) kvůli Snap Layouts: myš
 * dostane on, klik vyřídí sám a hover/stisk pošle událostí `snap-button`.
 * Rozměry tlačítek musí sedět s konstantami v snap.rs.
 */
export function TitleBar({ windowFocused }: { windowFocused: boolean }) {
  const t = useT();
  const [maximized, setMaximized] = useState(false);
  const [snapState, setSnapState] = useState<"none" | "hover" | "pressed">("none");

  useEffect(() => {
    let alive = true;
    const sync = () =>
      void appWindow.isMaximized().then((value) => {
        if (alive) setMaximized(value);
      });
    sync();
    const unlisteners = [
      appWindow.onResized(sync),
      listen<"none" | "hover" | "pressed">("snap-button", (event) => setSnapState(event.payload)),
    ];
    return () => {
      alive = false;
      for (const unlisten of unlisteners) void unlisten.then((fn) => fn());
    };
  }, []);

  return (
    <div
      data-tauri-drag-region
      className={`fw-titlebar flex h-[32px] shrink-0 items-center bg-window ${windowFocused ? "" : "is-inactive"}`}
    >
      <div data-tauri-drag-region className="fw-titlebar-title flex h-full flex-1 items-center gap-2 pl-[12px]">
        <img src={appIcon} width={16} height={16} alt="" draggable={false} className="pointer-events-none" />
        <span className="pointer-events-none text-[12px]">Dirwise</span>
      </div>

      <div className="flex h-full">
        <CaptionButton
          glyph={GLYPH_MINIMIZE}
          label={t("window.minimize")}
          onClick={() => void appWindow.minimize()}
        />
        <CaptionButton
          glyph={maximized ? GLYPH_RESTORE : GLYPH_MAXIMIZE}
          label={maximized ? t("window.restore") : t("window.maximize")}
          tooltip={false}
          className={snapState === "none" ? "" : `is-${snapState}`}
          onClick={() => void appWindow.toggleMaximize()}
        />
        <CaptionButton
          glyph={GLYPH_CLOSE}
          label={t("common.close")}
          className="fw-caption-close"
          onClick={() => void appWindow.close()}
        />
      </div>
    </div>
  );
}
