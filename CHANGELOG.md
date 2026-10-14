# Changelog

Notable changes in each Dirwise release (up to 1.5.2 the app was called Finder-Win). Installers are on the [Releases](https://github.com/krystof2-ops/finder-win/releases) page.

## [1.6.0](https://github.com/krystof2-ops/finder-win/releases/tag/v1.6.0) – 2026-10-14

- **New name: Dirwise** – the previous name pointed to a third-party product. Installer `Dirwise_<version>_x64-setup.exe`, winget ID `krystof2-ops.Dirwise` (coming soon). Settings and the data folders under `com.krystof2ops.finderwin` are kept; the icon and thumbnail cache moved to `%LOCALAPPDATA%\dirwise` (Store build `dirwise-store`) and is rebuilt on demand.
- **Windows 11 window buttons** – the title bar has a small icon and the name “Dirwise” on the left and the standard Minimize, Maximize / Restore and Close buttons on the right, including **Snap Layouts** when hovering Maximize. The coloured buttons on the left are gone.
- **Sidebar** – headings in normal case; sections Quick access (pinned folders, formerly My Favorites) / This PC (Desktop, Downloads, Documents …, formerly Favorites) / Cloud / Drives (with the Recycle Bin, formerly Locations) / Recent / Tags. New context menu item **Pin to Quick Access**.
- **Icons view** – a selected item highlights the whole tile (icon and name), like in Windows 11.
- **Status bar** – “1 of 52 selected · 120.7 GB free”.
- **New folder icon** – amber, in the style of Windows 11 (instead of the blue one).
- **Blurred transparency (Acrylic)** – More → Appearance → Transparency: Off / Blurred / Clear (Blurred is the default when you turn it on; the strength applies to both). Native Windows 11 Acrylic, on Windows 11 22H2 and later with Transparency effects on; on Windows 10 and older Windows 11 only Clear is offered (Acrylic there stutters when dragging the window). When the window loses focus it turns solid instead of jumping to the grey fill Windows uses. Also in the command palette (“Transparency: Blurred”).
- **File extensions like File Explorer** – shortcuts (.lnk, .url, .pif) never show an extension, so they read “Cursor”, “Dirwise”; other files follow Windows’ “Hide extensions for known file types” (known type = registered association; AlwaysShowExt respected). More → Appearance → File Extensions: Like Windows / Always Show / Never Show (also in the command palette). Applies to all views, Preview, Properties, the Recycle Bin, Recent and dialogs; sorting, filtering and search still use the full name. Rename (F2) keeps a hidden extension; a visible one stays unselected.
- **Toolbar fits narrow windows** – it never runs off the edge (window 900–1920 px, any sidebar width, 100–150 % scaling): the search field gets narrower, then turns into a search icon that expands on click.
- **Quick Look renamed to Preview** (Space, menu, command palette) – the old name belongs to another vendor.
- **Upgrading from Finder-Win 1.5.x** – the Dirwise installer silently uninstalls the old installation (no second copy side by side) and your settings are kept. Pin the app to the taskbar again.

## [1.5.2](https://github.com/krystof2-ops/finder-win/releases/tag/v1.5.2) – 2026-10-11

- **Recycle Bin** in the sidebar (last row under Locations; the icon shows empty / full) – list of deleted items with Original Location, Date Deleted and Size (sortable), **Restore** (button, context menu), **Delete Permanently** (Delete key, with confirmation) and **Empty Recycle Bin** (with confirmation). Restore never overwrites an existing item. Also in the command palette (“Recycle Bin”, “Empty Recycle Bin”). Uses the Windows Shell, not the `$Recycle.Bin` folder.
- **Continue as Administrator** – deleting, moving, copying/pasting, renaming, duplicating and creating folders in protected places (e.g. the root of C:\) now offers “Continue as Administrator” and Windows asks for confirmation (UAC), like File Explorer; the app itself does not run as administrator. Restoring from the Recycle Bin into a protected place works too. Operations done as administrator are not added to Undo.
- **Shift+Delete** deletes permanently (with confirmation).
- **Fixed:** deleting in protected places failed with a bare “Some operations were aborted”.
- **Clearer error messages** – each failed item is named with the reason (permission denied, used by another app, doesn't exist, disk full, read-only …); unknown errors show a general sentence and the technical detail under **Details**.

## [1.5.1](https://github.com/krystof2-ops/finder-win/releases/tag/v1.5.1) – 2026-10-11

- **Fixed:** with Transparency on, files scrolled under the top bar and the status bar showed through almost sharp and mixed with the buttons – content no longer shows under the bars; the desktop still shows through.

## [1.5.0](https://github.com/krystof2-ops/finder-win/releases/tag/v1.5.0) – 2026-10-11

- **New default look: glass** – title bar, toolbar and tabs sit on one translucent, blurred plate and the list shows through it as you scroll; the status bar, menus, context menus, command palette, tooltips and toasts are glass too, dialogs blur what is behind them. The sidebar reaches under the window buttons, with a soft gradient, grain and a grey selection like macOS Sonoma; blue is kept for selected files. The 1.4.2 look can no longer be switched on.
- **Window transparency** – More → Appearance → **Transparency: On / Off** (default Off) and **Transparency strength: Subtle / Medium / Strong** (default Medium); picking a strength turns transparency on. The whole window is transparent – sidebar, list, top bar (title bar, toolbar, tabs) and status bar, all with the same opacity for the chosen strength – so the desktop and other windows show through the app. Content scrolling under the top bar stays blurred (glass). Also in the command palette.
- **Smoother scrolling** in long lists – hover transitions pause while scrolling.
- **Readability** – text contrast meets WCAG AA over white, green and busy wallpapers at every transparency strength.
- **Fixed:** the app stopped responding after pressing the Alt key on its own (or F10).
- **Fixed:** the colour tag palette in the context menu was too narrow; submenus are wider.

## [1.4.2](https://github.com/krystof2-ops/finder-win/releases/tag/v1.4.2) – 2026-10-09

- **Drag out of the app** – drag files and folders from Finder-Win to File Explorer, the desktop, a browser upload, Discord or an e-mail. Copy by default, Shift moves. Drag & drop now works both ways.
- **New button** – **+ New** in the toolbar, like File Explorer: Folder, Text Document and every file type Windows offers in New (Word, Excel, ZIP …); also in the context menu (New ▸) and the command palette.
- **Rounded tabs** – each tab is a rounded chip; the active one is highlighted without blending into the content.
- **Terminals** – More → Terminal lists PowerShell 7 and Windows PowerShell separately; unavailable ones are greyed out. Shift+click Open in Terminal picks any installed terminal.
- **Names like File Explorer** – new items that collide get “(2)”, e.g. “New folder (2)”.

## [1.4.1](https://github.com/krystof2-ops/finder-win/releases/tag/v1.4.1) – 2026-10-09

- **Fixed:** drag & drop from File Explorer did not work.

## [1.4.0](https://github.com/krystof2-ops/finder-win/releases/tag/v1.4.0) – 2026-10-07

- **Split window** – two independent panels (Ctrl+Shift+D), Tab switches, F5 / F6 copy / move to the other panel, draggable divider with a remembered ratio.
- **Command palette** – Ctrl+K: folders, actions, tags, paths, Ctrl+Enter file search; one command registry drives shortcuts, the More menu, toolbar and palette.
- **Video and PDF thumbnails** – in Icons view and the preview column, plus duration, resolution and page count; cached locally on disk.
- **Terminal choice** – More → Terminal: Automatic, Windows Terminal, PowerShell, Command Prompt.
- **Explorer-style tabs** – tab bar always visible, content-sized tabs, **+** right after the last tab, × on hover.
- **Appearance menu** – Light · Dark · Match System (default, follows Windows live); lower title bar (32 px).
- **Czech installer** – language choice during setup.

## 1.3.0 – 2026-10-07

- **Tabs** – Ctrl+T / Ctrl+W / Ctrl+Tab / Ctrl+1…9, middle-click and *Open in New Tab*; each tab has its own history, view, sorting, selection, columns and search; reorder by dragging, drop files on a tab, restored on start (folder, view and sorting).
- **Windows clipboard** – copy / cut / paste files between Finder-Win, Explorer, Outlook and browsers (CF_HDROP).
- **Drag & drop from Explorer** – drop files from Explorer or the desktop onto a folder, a sidebar item, a tab or empty space.
- **Undo / Redo** – rename, move, copy, new item, delete (from the Recycle Bin) and tags, last 50 operations.
- **winget manifest** and an opt-out update check (one GET to the GitHub API per day, no telemetry).

## [1.2.1](https://github.com/krystof2-ops/finder-win/releases/tag/v1.2.1) – 2026-10-04

- **New app icon.**

## [1.2.0](https://github.com/krystof2-ops/finder-win/releases/tag/v1.2.0) – 2026-10-02

- **English UI, language switcher, localized dates, sizes and plurals** – the app follows your Windows language (English or Czech) and can be switched in More → Language / Jazyk without a restart.

## [1.1.0](https://github.com/krystof2-ops/finder-win/releases/tag/v1.1.0) – 2026-10-01

- **Audit fixes** – selection and navigation logic, safer file operations, security and configuration hardening.
- **Multi-select and keyboard navigation** – Ctrl/Shift selection, arrow keys across all views, Sort, Share and Tags buttons in the toolbar.
- **Collision dialog** – paste and move ask what to do when a file with the same name already exists (replace, keep both, skip).
- **New design with shell icons** – real Windows file icons, Sonoma-style folders, image thumbnails, reworked toolbar, sidebar, views and dialogs, WCAG AA contrast in both themes.
- **Animations and virtualization** – virtualized listings with streamed directory loading, jump-free navigation, micro-interactions, smoother scrolling and `prefers-reduced-motion` support.

## [1.0.0](https://github.com/krystof2-ops/finder-win/releases/tag/v1.0.0) – 2026-09-28

- First public release.
