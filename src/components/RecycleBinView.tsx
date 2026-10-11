import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";

import { ContextMenu, type MenuItem } from "./ContextMenu";
import { EmptyState } from "./EmptyState";
import { SmallEntryIcon } from "./icons";
import { compareNames, formatModified, formatSize } from "../format";
import { errorDetail, listRecycleBin, type RecycleEntry } from "../fileops";
import { failure, useT } from "../i18n";
import type { FileEntry } from "../types";

/** Název, Původní umístění, Datum smazání, Velikost. */
const GRID_TEMPLATE = "minmax(0, 1.2fr) minmax(0, 1.4fr) 140px 80px";

type SortKey = "name" | "original" | "deleted" | "size";

type RecycleBinViewProps = {
  windowFocused: boolean;
  /** Roste po každé souborové operaci; obsah Koše se pak načte znovu. */
  refreshToken: number;
  /** Ať status bar hlásí počet položek Koše, ne podkladové složky. */
  onCountChange: (count: number) => void;
  onRestore: (items: RecycleEntry[]) => void;
  onPurge: (items: RecycleEntry[]) => void;
  onEmpty: () => void;
};

/** Položka Koše jako FileEntry — kvůli ikoně ze shellu. */
function asEntry(item: RecycleEntry): FileEntry {
  return {
    name: item.name,
    path: item.id,
    is_dir: item.is_dir,
    size: item.size,
    modified: item.deleted,
    created: 0,
    extension: item.extension,
    hidden: false,
    is_symlink: false,
  };
}

/**
 * Pohled na Koš Windows: smazané položky s původním umístěním a datem
 * smazání. Výběr jako ve výpisu (Ctrl / Shift + klik, Ctrl+A), akce Obnovit,
 * Smazat trvale a Vysypat koš provádí App (potvrzení, oprávnění správce).
 */
export function RecycleBinView({
  windowFocused,
  refreshToken,
  onCountChange,
  onRestore,
  onPurge,
  onEmpty,
}: RecycleBinViewProps) {
  const t = useT();
  const [items, setItems] = useState<RecycleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ text: string; detail?: string } | null>(null);
  const [selection, setSelection] = useState<Set<string>>(new Set());
  /** Odkud se rozšiřuje výběr Shiftem, a kde je aktivní konec výběru. */
  const [anchor, setAnchor] = useState<string | null>(null);
  const [focused, setFocused] = useState<string | null>(null);
  /** Návrat do okna: Koš mezitím mohl změnit Průzkumník. */
  const [reload, setReload] = useState(0);
  const [sort, setSort] = useState<{ key: SortKey; asc: boolean }>({ key: "deleted", asc: false });
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const requestId = useRef(0);

  useEffect(() => {
    const onFocus = () => setReload((value) => value + 1);
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  useEffect(() => {
    const id = ++requestId.current;
    setLoading(true);
    listRecycleBin()
      .then((result) => {
        if (requestId.current !== id) return;
        setItems(result);
        setError(null);
        // Co už v Koši není (obnoveno, smazáno jinde), z výběru vypadne.
        setSelection((current) => new Set(result.filter((item) => current.has(item.id)).map((item) => item.id)));
      })
      .catch((err: unknown) => {
        if (requestId.current !== id) return;
        setItems([]);
        setError({ text: failure("op.loadTrash", err), detail: errorDetail(err) });
      })
      .finally(() => {
        if (requestId.current === id) setLoading(false);
      });
  }, [refreshToken, reload]);

  const sorted = useMemo(() => {
    const direction = sort.asc ? 1 : -1;
    const compare = (a: RecycleEntry, b: RecycleEntry) => {
      switch (sort.key) {
        case "name":
          return compareNames(a.name, b.name);
        case "original":
          return compareNames(a.original_dir, b.original_dir) || compareNames(a.name, b.name);
        case "deleted":
          return a.deleted - b.deleted || compareNames(a.name, b.name);
        case "size":
          return a.size - b.size || compareNames(a.name, b.name);
      }
    };
    return [...items].sort((a, b) => compare(a, b) * direction);
  }, [items, sort]);

  useEffect(() => {
    onCountChange(sorted.length);
  }, [sorted.length, onCountChange]);

  const selected = useMemo(() => sorted.filter((item) => selection.has(item.id)), [sorted, selection]);

  const select = useCallback(
    (item: RecycleEntry, event: { ctrlKey: boolean; shiftKey: boolean }) => {
      setFocused(item.id);
      if (event.shiftKey && anchor !== null) {
        const from = sorted.findIndex((candidate) => candidate.id === anchor);
        const to = sorted.findIndex((candidate) => candidate.id === item.id);
        if (from >= 0 && to >= 0) {
          const [start, end] = from < to ? [from, to] : [to, from];
          setSelection(new Set(sorted.slice(start, end + 1).map((candidate) => candidate.id)));
          return;
        }
      }
      setAnchor(item.id);
      if (event.ctrlKey) {
        setSelection((current) => {
          const next = new Set(current);
          if (next.has(item.id)) next.delete(item.id);
          else next.add(item.id);
          return next;
        });
      } else {
        setSelection(new Set([item.id]));
      }
    },
    [anchor, sorted],
  );

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Delete" && selected.length > 0) {
      event.preventDefault();
      onPurge(selected);
      return;
    }
    if (event.key === "a" && event.ctrlKey) {
      event.preventDefault();
      setSelection(new Set(sorted.map((item) => item.id)));
      return;
    }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    if (sorted.length === 0) return;
    event.preventDefault();
    const current = sorted.findIndex((item) => item.id === (focused ?? anchor));
    const index =
      event.key === "ArrowDown"
        ? Math.min(current + 1, sorted.length - 1)
        : current < 0
          ? sorted.length - 1
          : Math.max(current - 1, 0);
    const next = sorted[index];
    select(next, { ctrlKey: false, shiftKey: event.shiftKey });
    const row = event.currentTarget.querySelector<HTMLElement>(`[data-id="${CSS.escape(next.id)}"]`);
    row?.focus({ preventScroll: true });
    row?.scrollIntoView({ block: "nearest" });
  }

  const header = (key: SortKey, label: string) => (
    <button
      type="button"
      onClick={() => setSort((current) => ({ key, asc: current.key === key ? !current.asc : key !== "deleted" }))}
      className="flex min-w-0 items-center gap-1 text-left hover:text-primary"
    >
      <span className="truncate">{label}</span>
      {sort.key === key &&
        (sort.asc ? <ArrowUp size={10} strokeWidth={2} aria-hidden /> : <ArrowDown size={10} strokeWidth={2} aria-hidden />)}
    </button>
  );

  const menuItems: MenuItem[] = [
    { type: "item", label: t("menu.restore"), onSelect: () => onRestore(selected) },
    { type: "separator" },
    { type: "item", label: t("menu.deletePermanently"), shortcut: "Delete", danger: true, onSelect: () => onPurge(selected) },
  ];

  const actions = (
    <div className="flex items-center justify-end gap-2 px-3 py-1.5">
      <button type="button" className="fw-button" disabled={selected.length === 0} onClick={() => onRestore(selected)}>
        {t("menu.restore")}
      </button>
      <button type="button" className="fw-button" disabled={items.length === 0} onClick={onEmpty}>
        {t("menu.emptyTrash")}
      </button>
    </div>
  );

  let body: React.ReactNode;
  if (loading && items.length === 0) {
    body = <div className="flex h-full items-center justify-center p-6 text-[13px] text-secondary">{t("common.loading")}</div>;
  } else if (error !== null) {
    body = (
      <div className="flex h-full flex-col items-center justify-center gap-1 p-6 text-center text-[13px] text-secondary">
        <span>{error.text}</span>
        {error.detail && <span className="font-mono text-[11px] select-text">{error.detail}</span>}
      </div>
    );
  } else if (sorted.length === 0) {
    body = <EmptyState Icon={Trash2} title={t("trash.empty")} hint={t("trash.emptyHint")} />;
  }

  const selectedClass = windowFocused ? "bg-selected" : "bg-selected-inactive";

  return (
    <div className="min-w-0" onKeyDown={handleKeyDown}>
      <div className="fw-list-header sticky top-0 z-10 border-b border-line bg-toolbar" style={{ backdropFilter: "blur(20px)" }}>
        {actions}
        {body === undefined && (
          <div
            className="grid h-6 items-center gap-3 px-3 text-[11px] font-medium text-secondary"
            style={{ gridTemplateColumns: GRID_TEMPLATE }}
          >
            {header("name", t("sort.name"))}
            {header("original", t("trash.originalLocation"))}
            {header("deleted", t("trash.dateDeleted"))}
            {header("size", t("sort.size"))}
          </div>
        )}
      </div>

      {body ?? (
        <div role="listbox" aria-multiselectable aria-label={t("trash.label")}>
          {sorted.map((item) => {
            const isSelected = selection.has(item.id);
            return (
              <div
                key={item.id}
                role="option"
                aria-selected={isSelected}
                tabIndex={0}
                data-id={item.id}
                data-tooltip={`${item.original_dir}\\${item.name}`}
                onClick={(event) => select(item, event)}
                onContextMenu={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  if (!selection.has(item.id)) select(item, { ctrlKey: false, shiftKey: false });
                  setMenu({ x: event.clientX, y: event.clientY });
                }}
                className={`fw-row fw-result-row grid h-6 items-center gap-3 px-3 text-[13px] text-primary ${
                  isSelected ? selectedClass : "hover:bg-hover"
                }`}
                style={{ gridTemplateColumns: GRID_TEMPLATE }}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <SmallEntryIcon entry={asEntry(item)} />
                  <span className="truncate">{item.name}</span>
                </div>
                <span className="truncate text-secondary">{item.original_dir}</span>
                <span className="truncate text-secondary">{formatModified(item.deleted)}</span>
                <span className="truncate text-right text-secondary">{formatSize(item.size, item.is_dir)}</span>
              </div>
            );
          })}
        </div>
      )}

      {menu && selected.length > 0 && (
        <ContextMenu x={menu.x} y={menu.y} items={menuItems} onClose={() => setMenu(null)} />
      )}
    </div>
  );
}
