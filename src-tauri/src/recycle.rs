//! Koš Windows přes Shell API: výpis (původní umístění, datum smazání),
//! obnovení, trvalé smazání vybraných položek a vysypání. `$Recycle.Bin` se
//! nečte přímo — položky dává složka Koše shellu (FOLDERID_RecycleBinFolder).
//! Obnovení a trvalé smazání jdou přes fileop (IFileOperation nad položkami
//! z výčtu Koše), takže hlásí chyby po položkách a umí jít jako správce.

use serde::Serialize;

use crate::fileop::{self, DeleteReport, Op, Options};
use crate::{AppError, CmdResult};

/// Položka v Koši. `id` je cesta souboru v `$Recycle.Bin` — podle ní se
/// položka při obnovení a smazání najde znovu ve výčtu Koše.
#[derive(Serialize)]
pub struct RecycleEntry {
    id: String,
    /// Původní název (s příponou, i když ji Průzkumník skrývá).
    name: String,
    /// Složka, ze které byla položka smazána.
    original_dir: String,
    /// Unix sekundy.
    deleted: i64,
    size: u64,
    is_dir: bool,
    extension: Option<String>,
}

pub mod shell {
    use std::collections::HashMap;

    use windows::core::{Interface, GUID, PWSTR};
    use windows::Win32::Foundation::PROPERTYKEY;
    use windows::Win32::Storage::EnhancedStorage::{PKEY_FileName, PKEY_Size};
    use windows::Win32::System::Com::CoTaskMemFree;
    use windows::Win32::UI::Shell::{
        BHID_EnumItems, FOLDERID_RecycleBinFolder, IEnumShellItems, IShellItem, IShellItem2,
        SHGetKnownFolderItem, KF_FLAG_DEFAULT, SIGDN_FILESYSPATH, SIGDN_PARENTRELATIVE,
    };

    /// PSGUID_DISPLACED: PID_DISPLACED_FROM (původní složka), PID_DISPLACED_DATE.
    const DISPLACED: GUID = GUID::from_u128(0x9B174B33_40FF_11D2_A27E_00C04FC30871);
    const ORIGINAL_LOCATION: PROPERTYKEY = PROPERTYKEY { fmtid: DISPLACED, pid: 2 };
    const DATE_DELETED: PROPERTYKEY = PROPERTYKEY { fmtid: DISPLACED, pid: 3 };

    fn take(text: PWSTR) -> String {
        let value = unsafe { text.to_string() }.unwrap_or_default();
        unsafe { CoTaskMemFree(Some(text.0 as _)) };
        value
    }

    pub fn path_of(item: &IShellItem) -> Option<String> {
        unsafe { item.GetDisplayName(SIGDN_FILESYSPATH) }.ok().map(take)
    }

    /// Projde položky Koše (všech disků). Volat na vlákně s COM (STA).
    pub fn each(mut visit: impl FnMut(IShellItem)) -> windows::core::Result<()> {
        unsafe {
            let bin: IShellItem = SHGetKnownFolderItem(&FOLDERID_RecycleBinFolder, KF_FLAG_DEFAULT, None)?;
            let items: IEnumShellItems = bin.BindToHandler(None, &BHID_EnumItems)?;
            loop {
                let mut batch = [None];
                let mut fetched = 0;
                if items.Next(&mut batch, Some(&mut fetched)).is_err() || fetched == 0 {
                    break;
                }
                if let Some(item) = batch[0].take() {
                    visit(item);
                }
            }
        }
        Ok(())
    }

    /// Položky Koše podle `id` (cesta v `$Recycle.Bin`, malými písmeny) — pro
    /// IFileOperation se berou položky z výčtu, ne cesty: jen tak shell
    /// obnoví či smaže i záznam Koše ($I soubor).
    pub fn by_id() -> HashMap<String, IShellItem> {
        let mut map = HashMap::new();
        let _ = each(|item| {
            if let Some(path) = path_of(&item) {
                map.insert(path.to_lowercase(), item);
            }
        });
        map
    }

    pub fn entry(item: &IShellItem) -> Option<super::RecycleEntry> {
        let id = path_of(item)?;
        let item2: IShellItem2 = item.cast().ok()?;
        unsafe {
            let original_dir = item2.GetString(&ORIGINAL_LOCATION).map(take).ok()?;
            let name = item2
                .GetString(&PKEY_FileName)
                .map(take)
                .or_else(|_| item.GetDisplayName(SIGDN_PARENTRELATIVE).map(take))
                .ok()?;
            let deleted = item2
                .GetFileTime(&DATE_DELETED)
                .map(|time| {
                    let ticks = (u64::from(time.dwHighDateTime) << 32) | u64::from(time.dwLowDateTime);
                    // FILETIME (100 ns od 1601) → unix sekundy.
                    (ticks / 10_000_000) as i64 - 11_644_473_600
                })
                .unwrap_or(0);
            // Atribut složky mají i zipy — rozhoduje souborový systém.
            let is_dir = std::fs::metadata(&id).map(|meta| meta.is_dir()).unwrap_or(false);
            let size = if is_dir { 0 } else { item2.GetUInt64(&PKEY_Size).unwrap_or(0) };
            let extension = if is_dir {
                None
            } else {
                std::path::Path::new(&name).extension().map(|ext| ext.to_string_lossy().to_lowercase())
            };
            Some(super::RecycleEntry { id, name, original_dir, deleted, size, is_dir, extension })
        }
    }
}

/// Na vlastním vlákně s COM (async runtime Tauri si COM inicializuje po svém).
fn on_sta<T: Send + 'static>(work: impl FnOnce() -> T + Send + 'static) -> Option<T> {
    use windows::Win32::System::Com::{CoInitializeEx, CoUninitialize, COINIT_APARTMENTTHREADED};

    std::thread::spawn(move || unsafe {
        let init = CoInitializeEx(None, COINIT_APARTMENTTHREADED);
        let result = work();
        if init.is_ok() {
            CoUninitialize();
        }
        result
    })
    .join()
    .ok()
}

#[derive(Serialize)]
pub struct RecycleState {
    count: u64,
    size: u64,
}

/// Počet a velikost položek v Koši (všech disků) — ikona prázdný / plný.
#[tauri::command(async)]
pub fn recycle_bin_state() -> CmdResult<RecycleState> {
    use windows::Win32::UI::Shell::{SHQueryRecycleBinW, SHQUERYRBINFO};

    let mut info = SHQUERYRBINFO { cbSize: std::mem::size_of::<SHQUERYRBINFO>() as u32, ..Default::default() };
    unsafe { SHQueryRecycleBinW(None, &mut info) }.map_err(|err| fileop::describe_hr(err.code().0))?;
    Ok(RecycleState { count: info.i64NumItems.max(0) as u64, size: info.i64Size.max(0) as u64 })
}

#[tauri::command(async)]
pub fn list_recycle_bin() -> CmdResult<Vec<RecycleEntry>> {
    on_sta(|| {
        let mut entries = Vec::new();
        shell::each(|item| entries.extend(shell::entry(&item))).map(|_| entries).map_err(|err| err.code().0)
    })
    .unwrap_or(Err(fileop::E_UNEXPECTED))
    .map_err(fileop::describe_hr)
}

/// Položka Koše, jak ji vidí shell: kde leží v Koši a odkud byla smazána.
/// Původní místo se bere vždy z Koše, ne od frontendu.
pub struct RecycledItem {
    id: String,
    original_dir: String,
    name: String,
}

impl RecycledItem {
    /// Původní cesta — v hláškách místo nic neříkající cesty v $Recycle.Bin.
    fn original(&self) -> String {
        std::path::Path::new(&self.original_dir).join(&self.name).to_string_lossy().to_string()
    }
}

/// Najde `ids` ve výčtu Koše. Co tam už není, skončí rovnou v `report`.
fn lookup(ids: Vec<String>, report: &mut DeleteReport) -> CmdResult<Vec<RecycledItem>> {
    let found = on_sta(move || {
        let bin = shell::by_id();
        ids.into_iter()
            .map(|id| match bin.get(&id.to_lowercase()).and_then(shell::entry) {
                Some(entry) if !entry.original_dir.is_empty() => {
                    Ok(RecycledItem { id: entry.id, original_dir: entry.original_dir, name: entry.name })
                }
                _ => Err(id),
            })
            .collect::<Vec<_>>()
    })
    .ok_or_else(|| fileop::describe_hr(fileop::E_UNEXPECTED))?;

    let mut items = Vec::new();
    for item in found {
        match item {
            Ok(item) => items.push(item),
            Err(id) => report.fail(fileop::Failure::at(&id, id.clone(), AppError::new("error.notInTrash"))),
        }
    }
    Ok(items)
}

/// Obnoví položky na původní místo. Obsazené místo se nepřepisuje — položka
/// skončí v `failed` s „cíl už existuje". Chybějící původní složka se založí.
#[tauri::command(async)]
pub fn restore_recycled(window: tauri::WebviewWindow, ids: Vec<String>, elevate: bool) -> CmdResult<DeleteReport> {
    let mut report = DeleteReport::default();
    let mut queued = Vec::new();
    for item in lookup(ids, &mut report)? {
        if std::path::Path::new(&item.original()).exists() {
            report.fail(fileop::Failure::at(&item.id, item.original(), AppError::new("error.alreadyExists")));
            continue;
        }
        // Bez oprávnění se složka nezaloží — obnovení pak skončí chybou
        // „neexistuje" (jako správce ji shell nezaloží taky).
        let _ = std::fs::create_dir_all(&item.original_dir);
        queued.push(item);
    }
    run(&window, queued, |item| Op::Restore { id: item.id.clone(), to_dir: item.original_dir.clone(), name: item.name.clone() }, elevate, report)
}

/// Smaže vybrané položky Koše trvale.
#[tauri::command(async)]
pub fn purge_recycled(window: tauri::WebviewWindow, ids: Vec<String>, elevate: bool) -> CmdResult<DeleteReport> {
    let mut report = DeleteReport::default();
    let items = lookup(ids, &mut report)?;
    run(&window, items, |item| Op::Purge { id: item.id.clone() }, elevate, report)
}

fn run(
    window: &tauri::WebviewWindow,
    items: Vec<RecycledItem>,
    op: impl Fn(&RecycledItem) -> Op,
    elevate: bool,
    mut report: DeleteReport,
) -> CmdResult<DeleteReport> {
    if items.is_empty() {
        return Ok(report);
    }
    let ops = items.iter().map(op).collect();
    let results = fileop::perform(ops, Options { recycle: false, elevate, owner: fileop::owner_of(window) })?;
    for (item, result) in items.into_iter().zip(results) {
        match result {
            Ok(_) => report.done(item.id),
            // Shell hlásí cestu v $Recycle.Bin — uživateli patří ta původní
            // (u složky i s cestou souboru uvnitř).
            Err((at, code)) => {
                let shown = match at.get(item.id.len()..) {
                    Some(rest) if at.to_lowercase().starts_with(&item.id.to_lowercase()) => format!("{}{}", item.original(), rest),
                    _ => at,
                };
                report.fail(fileop::Failure::new(&item.id, shown, code, elevate))
            }
        }
    }
    Ok(report)
}

/// Vysype Koš všech disků (potvrzení dělá aplikace, průběh ukáže shell).
#[tauri::command(async)]
pub fn empty_recycle_bin(window: tauri::WebviewWindow) -> CmdResult<()> {
    use windows::Win32::Foundation::HWND;
    use windows::Win32::UI::Shell::{SHEmptyRecycleBinW, SHERB_NOCONFIRMATION};

    let owner = fileop::owner_of(&window);
    match on_sta(move || unsafe { SHEmptyRecycleBinW(Some(HWND(owner as _)), None, SHERB_NOCONFIRMATION) }) {
        // Spadlé vlákno — nevíme, jestli se vysypalo.
        None => Err(fileop::describe_hr(fileop::E_FAIL)),
        Some(Ok(())) => Ok(()),
        // Prázdný Koš vrací E_UNEXPECTED — vysypáno je.
        Some(Err(err)) if err.code().0 == fileop::E_UNEXPECTED => Ok(()),
        Some(Err(err)) => Err(fileop::describe_hr(err.code().0)),
    }
}
