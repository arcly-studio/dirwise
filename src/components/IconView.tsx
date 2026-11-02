import { memo, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

import { LargeEntryIcon } from "./icons";
import { canShellThumbnail, SHELL_THUMBNAIL_LIMIT } from "../lib/fileIcons";
import { RenameInput } from "./RenameInput";
import { TagDots } from "./TagDots";
import { entryOpacity } from "../format";
import { dragItemsFor, endDrag, startEntryDrag } from "../lib/dnd";
import {
  dropPropsFor,
  selectMods,
  useFolderDrop,
  useStableCallback,
  type DropInto,
  type FolderDropHandlers,
} from "../lib/rowDnd";
import { sameEntry } from "../lib/rows";
import { useGlassInsets } from "../lib/glass";
import { ICON_VIEW_SIZES, setIconSize, tagsOf, type IconViewSize } from "../lib/storage";
import type { ViewHandleRef } from "../lib/viewHandle";
import type { FileEntry, SelectMods, TagColor, TagMap } from "../types";
import { useDisplayNames } from "../lib/extensions";

/** Geometrie mřížky pro jednu velikost ikon (musí sedět s tím, co buňka
 *  vykreslí). Virtualizace, gumička i klávesnice z ní počítají. */
type Geometry = {
  /** Strana ikony / náhledu v CSS px. */
  icon: number;
  cellWidth: number;
  /** Výška buňky = ikona + 54 (odsazení, dlaždice, 2 řádky názvu, štítky). */
  cellHeight: number;
  gapX: number;
  gapY: number;
  rowPitch: number;
};

function geometry(icon: number, cellWidth: number, gapX: number, gapY: number): Geometry {
  const cellHeight = icon + 54;
  return { icon, cellWidth, cellHeight, gapX, gapY, rowPitch: cellHeight + gapY };
}

/** Střední = vzhled do 1.6 (ikona 64, buňka 96 × 118, mezery 16 / 24). */
const GEOMETRY: Record<IconViewSize, Geometry> = {
  small: geometry(48, 80, 12, 20),
  medium: geometry(64, 96, 16, 24),
  large: geometry(128, 160, 20, 24),
};

/** Okraj plochy mřížky (stejný pro všechny velikosti). */
const PADDING = 20;

/** Ctrl + kolečko: o jednu velikost za tolik px posunu. Kolečko myši dá na
 *  zub 100, touchpad (pinch) posílá drobné delty — sčítají se. */
const WHEEL_STEP = 100;

function columnsFor(width: number, geo: Geometry): number {
  return Math.max(1, Math.floor((width - 2 * PADDING + geo.gapX) / (geo.cellWidth + geo.gapX)));
}

/* ---------------------------------- buňka ---------------------------------- */

type CellHandlers = {
  select: (entry: FileEntry, mods: SelectMods) => void;
  open: (entry: FileEntry) => void;
  contextMenu: (entry: FileEntry, x: number, y: number) => void;
  dragItems: (entry: FileEntry) => ReturnType<typeof dragItemsFor>;
  renameSubmit: (entry: FileEntry, name: string) => void;
  renameCancel: () => void;
  drop: FolderDropHandlers;
};

type CellProps = {
  entry: FileEntry;
  /** Smí se ptát shellu na náhled videa / PDF (prvních 200 ve složce). */
  shellPreview: boolean;
  selected: boolean;
  cut: boolean;
  renaming: boolean;
  dropTarget: boolean;
  windowFocused: boolean;
  tags: TagColor[];
  geo: Geometry;
  /** Jediná vybraná položka — celý název jako překryv (ne při přejmenování). */
  expanded: boolean;
  handlers: CellHandlers;
};

/** Jedna ikona. Memoizovaná — klik překreslí jen starý a nový výběr. */
const IconCell = memo(
  function IconCell({
    entry,
    shellPreview,
    selected,
    cut,
    renaming,
    dropTarget,
    windowFocused,
    tags,
    geo,
    expanded,
    handlers,
  }: CellProps) {
    const names = useDisplayNames();
    // Během přejmenování výběr nekreslíme — podbarvení pod inputem ruší.
    const showSelection = selected && !renaming;
    // Jako ve Windows 11: výběr podbarví celou dlaždici (ikonu i název),
    // v neaktivním okně šedě.
    const selectionClass = showSelection ? (windowFocused ? "is-selected" : "is-selected-dim") : "";

    return (
      <div
        data-path={entry.path}
        role="option"
        aria-selected={selected}
        tabIndex={0}
        data-tooltip={names.entry(entry)}
        // Přejmenovaný řádek se netahá — jinak by drag ukradl výběr v inputu.
        draggable={!renaming}
        onDragStart={(event) =>
          startEntryDrag(handlers.dragItems(entry), event)
        }
        onDragEnd={endDrag}
        {...dropPropsFor(entry, handlers.drop)}
        onClick={(event) => handlers.select(entry, selectMods(event))}
        onDoubleClick={() => handlers.open(entry)}
        onContextMenu={(event) => {
          event.preventDefault();
          // Nebublat na kontejner — ten má menu volné plochy. Výběr řeší
          // App: pravý klik do už vybrané skupiny ji nesmí shodit na jednu.
          event.stopPropagation();
          handlers.contextMenu(entry, event.clientX, event.clientY);
        }}
        className={`fw-row fw-icon-cell flex shrink-0 flex-col items-center gap-1 rounded-[8px] ${selectionClass} ${
          dropTarget ? "fw-drop-target" : ""
        }`}
        style={{ width: geo.cellWidth, height: geo.cellHeight, opacity: entryOpacity(entry, cut) }}
      >
        {/* Ikona stojí volně v boxu podle velikosti ikon. */}
        <div className="fw-icon-tile p-1">
          {/* Náhled obrázku — vykreslují se jen viditelné buňky, takže
              se nedekódují tisíce fotek naráz a strop není potřeba. */}
          <LargeEntryIcon entry={entry} size={geo.icon} thumbnail shellPreview={shellPreview} />
        </div>

        {renaming ? (
          <div className="w-full">
            <RenameInput
              entry={entry}
              onSubmit={handlers.renameSubmit}
              onCancel={handlers.renameCancel}
              variant="icon"
            />
          </div>
        ) : (
          // Název: nevybraný na 2 řádky s výpustkou (celý v tooltipu). Jediná
          // vybraná položka ukáže celý název (max 5 řádků) jako překryv přes
          // řádek pod sebou, jako Průzkumník. Překryv je absolutně uvnitř
          // obalu, takže rozměr buňky (gumička, virtualizace, animace náhledu)
          // se nemění, a nechytá myš — klik a drop na přečnívající části
          // trefí položku pod ním, jako by tam nebyl.
          <div className="fw-icon-name-box">
            <span
              className={`fw-icon-name line-clamp-2 max-w-full text-center ${expanded ? "invisible" : ""}`}
              style={{ overflowWrap: "anywhere" }}
            >
              {names.entry(entry)}
            </span>
            {expanded && (
              // Podklad a odsazení drží vnější prvek, ořez na 5 řádků vnitřní:
              // line-clamp ořezává na hraně paddingu, takže spodní odsazení na
              // stejném prvku by ukázalo horní kraj 6. řádku.
              <span className="fw-icon-name fw-icon-name-full text-center">
                <span className="line-clamp-5" style={{ overflowWrap: "anywhere" }}>
                  {names.entry(entry)}
                </span>
              </span>
            )}
          </div>
        )}

        {!renaming && <TagDots colors={tags} size={8} />}
      </div>
    );
  },
  (a, b) =>
    sameEntry(a.entry, b.entry) &&
    a.shellPreview === b.shellPreview &&
    a.selected === b.selected &&
    a.cut === b.cut &&
    a.renaming === b.renaming &&
    a.dropTarget === b.dropTarget &&
    a.windowFocused === b.windowFocused &&
    a.tags === b.tags &&
    a.geo === b.geo &&
    a.expanded === b.expanded &&
    a.handlers === b.handlers,
);

/* --------------------------------- mřížka ---------------------------------- */

type IconViewProps = {
  entries: FileEntry[];
  selectedPaths: Set<string>;
  cutPaths: Set<string>;
  windowFocused: boolean;
  renamingPath: string | null;
  onRenameSubmit: (entry: FileEntry, name: string) => void;
  onRenameCancel: () => void;
  onSelect: (entry: FileEntry, mods: SelectMods) => void;
  onOpen: (entry: FileEntry) => void;
  onContextMenu?: (entry: FileEntry, x: number, y: number) => void;
  onDropInto: DropInto;
  tags: TagMap;
  /** Velikost ikon (settings.json, globální pro všechny záložky a panely). */
  iconSize: IconViewSize;
  /** Posouvaný kontejner (drží ho App) — virtualizace podle něj měří. */
  scrollRef: React.RefObject<HTMLDivElement | null>;
  /** Ovládání výpisu pro App (posun na položku, gumička, klávesnice). */
  handleRef: ViewHandleRef;
  /** Počáteční posun (návrat Zpět). Virtualizace si při připojení scroller
   *  sama nastaví na svou pozici — bez tohohle by ho vrátila na začátek. */
  initialOffset?: number;
};

export function IconView({
  entries,
  selectedPaths,
  cutPaths,
  windowFocused,
  renamingPath,
  onRenameSubmit,
  onRenameCancel,
  onSelect,
  onOpen,
  onContextMenu,
  onDropInto,
  tags,
  iconSize,
  scrollRef,
  handleRef,
  initialOffset = 0,
}: IconViewProps) {
  const geo = GEOMETRY[iconSize];
  const { dropTarget, handlers: drop } = useFolderDrop(onDropInto);

  // Náhledy videí a PDF táhne shell (pomaleji než obrázky) — dostane je
  // nejvýš prvních 200 ve složce, zbytek ikonu.
  const shellPreviewPaths = useMemo(() => {
    const allowed = new Set<string>();
    for (const entry of entries) {
      if (allowed.size >= SHELL_THUMBNAIL_LIMIT) break;
      if (canShellThumbnail(entry)) allowed.add(entry.path);
    }
    return allowed;
  }, [entries]);

  // Počet sloupců ze skutečné šířky kontejneru. ResizeObserver hlásí při
  // tažení okna desítky změn — přepočet se slije do jednoho snímku.
  const [width, setWidth] = useState(() => scrollRef.current?.clientWidth ?? 800);
  const columns = columnsFor(width, geo);
  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    let frame = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setWidth(element.clientWidth));
    });
    observer.observe(element);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [scrollRef]);

  const rowCount = Math.ceil(entries.length / columns);
  // Sklo: mřížka začíná pod lištou (padding scrolleru) a končí nad status barem.
  const glass = useGlassInsets();
  const virtualizer = useVirtualizer({
    // Bez flushSync v obsluze scrollu: React 19 posun nových řádků slije do
    // jednoho vykreslení a hlavní vlákno nebrzdí začátek scrollovacího gesta.
    useFlushSync: false,
    count: rowCount,
    getScrollElement: () => scrollRef.current,
    initialOffset,
    estimateSize: () => geo.rowPitch,
    // Řádek mřížky nese až desítku buněk — 3 řádky navíc stačí na plynulé
    // kolečko a první vykreslení (přepnutí view) je o polovinu lehčí.
    overscan: 3,
    paddingStart: PADDING,
    paddingEnd: PADDING - geo.gapY,
    scrollMargin: glass.top,
    scrollPaddingStart: 8 + glass.top,
    scrollPaddingEnd: 8 + glass.bottom,
  });

  // Kotva pro změnu velikosti: vybraná položka (je-li vidět), jinak první
  // řádek u horního okraje, a její vzdálenost od horního okraje scrolleru.
  // Po změně geometrie se posun dopočítá tak, aby zůstala na stejném místě —
  // jinak by mřížka odskočila jinam (jiný počet sloupců i výška řádku).
  // Bere se ze staré geometrie, proto průběžně (posun, každý render).
  const layout = useRef({ geo, columns, glassTop: glass.top });
  const entriesRef = useRef(entries);
  const selectedRef = useRef(selectedPaths);
  const anchor = useRef<{ index: number; offset: number } | null>(null);
  const captureAnchor = useStableCallback(() => {
    const element = scrollRef.current;
    if (!element) return;
    const { geo: g, columns: cols, glassTop } = layout.current;
    const rowTop = (row: number) => glassTop + PADDING + row * g.rowPitch;
    const viewTop = element.scrollTop + glassTop;
    const viewBottom = element.scrollTop + element.clientHeight;
    const list = entriesRef.current;
    if (selectedRef.current.size > 0) {
      for (let index = 0; index < list.length; index += 1) {
        if (!selectedRef.current.has(list[index].path)) continue;
        const top = rowTop(Math.floor(index / cols));
        if (top + g.cellHeight > viewTop && top < viewBottom) {
          anchor.current = { index, offset: top - element.scrollTop };
          return;
        }
      }
    }
    const row = Math.max(0, Math.floor((viewTop - glassTop - PADDING) / g.rowPitch));
    anchor.current = { index: row * cols, offset: rowTop(row) - element.scrollTop };
  });

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    element.addEventListener("scroll", captureAnchor, { passive: true });
    return () => element.removeEventListener("scroll", captureAnchor);
  }, [scrollRef, captureAnchor]);

  // Po změně velikosti: virtualizace přepočítá řádky a posun se vrátí na kotvu
  // (spočítanou ještě ze staré geometrie). Teprve pak se kotva obnoví.
  const previousGeo = useRef(geo);
  useLayoutEffect(() => {
    const element = scrollRef.current;
    if (previousGeo.current !== geo) {
      previousGeo.current = geo;
      virtualizer.measure();
      const kept = anchor.current;
      if (element && kept !== null) {
        const row = Math.floor(kept.index / columns);
        element.scrollTop = row === 0 ? 0 : Math.max(0, glass.top + PADDING + row * geo.rowPitch - kept.offset);
      }
    }
    layout.current = { geo, columns, glassTop: glass.top };
    entriesRef.current = entries;
    selectedRef.current = selectedPaths;
    captureAnchor();
  });

  // Ctrl + kolečko mění velikost ikon — jen tady, IconView je připojená jen
  // v zobrazení Ikony. Nepasivně, jinak by preventDefault nešel a kolečko by
  // výpis zároveň posunulo. Zoom WebView2 má Tauri vypnutý (zoomHotkeysEnabled),
  // preventDefault je pojistka.
  const iconSizeRef = useRef(iconSize);
  useEffect(() => {
    iconSizeRef.current = iconSize;
  }, [iconSize]);
  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    let accumulated = 0;
    let resetTimer = 0;
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey) return;
      event.preventDefault();
      // Řádky (deltaMode 1) přepočítat na px, jak dává kolečko ve WebView2.
      const delta = event.deltaMode === 1 ? event.deltaY * 33 : event.deltaY;
      if (delta === 0) return;
      // Změna směru zahodí rozpracované gesto.
      if (Math.sign(delta) !== Math.sign(accumulated)) accumulated = 0;
      accumulated += delta;
      window.clearTimeout(resetTimer);
      resetTimer = window.setTimeout(() => (accumulated = 0), 400);
      if (Math.abs(accumulated) < WHEEL_STEP) return;
      // Kolečko od sebe (záporná delta) = větší ikony, jako v Průzkumníku.
      const step = accumulated < 0 ? 1 : -1;
      accumulated = 0;
      const next = ICON_VIEW_SIZES[ICON_VIEW_SIZES.indexOf(iconSizeRef.current) + step];
      if (next !== undefined) {
        iconSizeRef.current = next;
        void setIconSize(next);
      }
    };
    element.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      window.clearTimeout(resetTimer);
      element.removeEventListener("wheel", onWheel);
    };
  }, [scrollRef]);

  const select = useStableCallback(onSelect);
  const open = useStableCallback(onOpen);
  const contextMenu = useStableCallback((entry: FileEntry, x: number, y: number) =>
    onContextMenu?.(entry, x, y),
  );
  const dragItems = useStableCallback((entry: FileEntry) =>
    dragItemsFor(
      entry,
      entries.filter((item) => selectedPaths.has(item.path)),
    ),
  );
  const renameSubmit = useStableCallback(onRenameSubmit);
  const renameCancel = useStableCallback(onRenameCancel);
  // Všechny položky jsou stabilní, takže i objekt vznikne jen jednou.
  const handlers = useMemo<CellHandlers>(
    () => ({ select, open, contextMenu, dragItems, renameSubmit, renameCancel, drop }),
    [select, open, contextMenu, dragItems, renameSubmit, renameCancel, drop],
  );

  useImperativeHandle(
    handleRef,
    () => ({
      scrollToPath: (path, behavior = "auto") => {
        const index = entries.findIndex((entry) => entry.path === path);
        if (index < 0) return;
        const row = Math.floor(index / columns);
        // První řádek odkryje i horní okraj mřížky, ne jen buňku.
        if (row === 0) scrollRef.current?.scrollTo({ top: 0, behavior });
        else virtualizer.scrollToIndex(row, { align: "auto", behavior });
      },
      hitTest: (box) => {
        const element = scrollRef.current;
        if (!element) return [];
        const rect = element.getBoundingClientRect();
        // Obdélník v souřadnicích obsahu mřížky.
        const left = box.left - rect.left - PADDING;
        const right = box.right - rect.left - PADDING;
        const top = box.top - rect.top + element.scrollTop - glass.top - PADDING;
        const bottom = box.bottom - rect.top + element.scrollTop - glass.top - PADDING;

        const hit: string[] = [];
        const firstRow = Math.max(0, Math.floor(top / geo.rowPitch));
        const lastRow = Math.min(rowCount - 1, Math.floor(bottom / geo.rowPitch));
        for (let row = firstRow; row <= lastRow; row += 1) {
          const cellTop = row * geo.rowPitch;
          if (cellTop > bottom || cellTop + geo.cellHeight < top) continue;
          for (let column = 0; column < columns; column += 1) {
            const cellLeft = column * (geo.cellWidth + geo.gapX);
            if (cellLeft > right || cellLeft + geo.cellWidth < left) continue;
            const entry = entries[row * columns + column];
            if (entry) hit.push(entry.path);
          }
        }
        return hit;
      },
      metrics: () => ({
        columns,
        rowsPerPage: Math.max(
          1,
          Math.floor(((scrollRef.current?.clientHeight ?? 0) - glass.top - glass.bottom) / geo.rowPitch),
        ),
      }),
    }),
    [entries, virtualizer, columns, rowCount, scrollRef, glass, geo],
  );

  // Celý název jen u jediné vybrané položky, ne při přejmenování.
  const expandedPath =
    selectedPaths.size === 1 && renamingPath === null ? (selectedPaths.values().next().value ?? null) : null;

  return (
    <div className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
      {virtualizer.getVirtualItems().map((row) => {
        const start = row.index * columns;
        const cells = entries.slice(start, start + columns);
        // Řádek s překryvem názvu nad řádkem pod sebou (řádky jsou absolutní
        // sourozenci s transformací — bez z-indexu by další řádek kreslil navrch).
        const lifted = expandedPath !== null && cells.some((entry) => entry.path === expandedPath);

        return (
          <div
            key={row.key}
            className="absolute top-0 flex"
            style={{
              left: PADDING,
              gap: geo.gapX,
              transform: `translateY(${row.start - glass.top}px)`,
              zIndex: lifted ? 1 : undefined,
            }}
          >
            {cells.map((entry) => (
              <IconCell
                key={entry.path}
                entry={entry}
                shellPreview={shellPreviewPaths.has(entry.path)}
                selected={selectedPaths.has(entry.path)}
                cut={cutPaths.has(entry.path)}
                renaming={entry.path === renamingPath}
                dropTarget={dropTarget === entry.path}
                windowFocused={windowFocused}
                tags={tagsOf(tags, entry.path)}
                geo={geo}
                expanded={entry.path === expandedPath}
                handlers={handlers}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}
