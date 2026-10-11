//! Souborové operace přes shell (IFileOperation) — mazání do Koše i trvale
//! a opakování operací s oprávněním správce.
//!
//! Normální běh je tichý (FOF_NOERRORUI): shell nic nezobrazí a pro každou
//! položku vrátí vlastní HRESULT, ze kterého frontend složí hlášku „který
//! soubor a proč". Odepřený přístup frontend nabídne zopakovat jako správce —
//! pak se operace pustí s FOFX_SHOWELEVATIONPROMPT a shell sám ukáže UAC
//! (elevovaný copy engine shellu, aplikace sama elevovaná není).
//!
//! Knihovna `trash` volá IFileOperation s FOF_NO_UI, ve kterém je i zákaz
//! výzvy UAC — v chráněných místech proto operaci tiše zrušila a vrátila
//! jen „Some operations were aborted".

use serde::{Deserialize, Serialize};

use crate::{AppError, CmdResult};

/// Jedna operace ve frontě IFileOperation.
pub enum Op {
    Delete { path: String },
    Rename { path: String, name: String },
    Copy { from: String, to_dir: String, name: String },
    Move { from: String, to_dir: String, name: String },
    NewFolder { dir: String, name: String },
    /// Položka Koše (`id` = cesta v `$Recycle.Bin`) zpět do původní složky.
    Restore { id: String, to_dir: String, name: String },
    /// Položka Koše trvale pryč.
    Purge { id: String },
}

impl Op {
    /// Cesta, pod kterou operaci ohlásí shell (zdroj, u nové složky cíl).
    pub fn subject(&self) -> String {
        match self {
            Op::Delete { path } | Op::Rename { path, .. } => path.clone(),
            Op::Restore { id, .. } | Op::Purge { id } => id.clone(),
            Op::Copy { from, .. } | Op::Move { from, .. } => from.clone(),
            Op::NewFolder { dir, name } => join(dir, name),
        }
    }
}

pub struct Options {
    /// Mazat do Koše (jinak trvale).
    pub recycle: bool,
    /// Zopakovat jako správce — shell ukáže UAC.
    pub elevate: bool,
    /// Okno, ke kterému shell výzvu UAC přivěsí.
    pub owner: isize,
}

/// Výsledek jedné operace: nová cesta (u Koše cesta položky v Koši), nebo
/// cesta, u které operace selhala, a HRESULT shellu.
pub type ItemResult = Result<Option<String>, (String, i32)>;

fn join(dir: &str, name: &str) -> String {
    format!("{}\\{}", dir.trim_end_matches('\\'), name)
}

/// Porovnání cest ze shellu s cestami od frontendu (velikost písmen, lomítko na konci).
fn norm(path: &str) -> String {
    path.trim_end_matches('\\').to_lowercase()
}

/* ------------------------------ HRESULT → text ---------------------------- */

const fn hr(code: u32) -> i32 {
    code as i32
}

/// Win32 chyby zabalené do HRESULT (HRESULT_FROM_WIN32).
const WIN32_FACILITY: i32 = hr(0x8007_0000);
const E_ACCESSDENIED: i32 = hr(0x8007_0005);
const ERROR_CANCELLED: i32 = hr(0x8007_04C7);
const E_ABORT: i32 = hr(0x8000_4004);
pub const E_FAIL: i32 = hr(0x8000_4005);
pub const E_UNEXPECTED: i32 = hr(0x8000_FFFF);
/// HRESULT_FROM_WIN32(ERROR_FILE_NOT_FOUND).
const E_NOT_FOUND: i32 = hr(0x8007_0002);

// COPYENGINE_E_* ze shobjidl (hodnoty jako v crate windows).
const CE_USER_CANCELLED: i32 = hr(0x8027_0000);
const CE_CANCELLED: i32 = hr(0x8027_0001);
const CE_REQUIRES_ELEVATION: i32 = hr(0x8027_0002);
const CE_ACCESS_DENIED_SRC: i32 = hr(0x8027_0021);
const CE_ACCESS_DENIED_DEST: i32 = hr(0x8027_0022);

/// Pomohlo by oprávnění správce? Jen u odepřeného přístupu — zamčený soubor
/// nebo plný disk elevace nespraví.
pub fn needs_admin(code: i32) -> bool {
    matches!(code, E_ACCESSDENIED | CE_REQUIRES_ELEVATION | CE_ACCESS_DENIED_SRC | CE_ACCESS_DENIED_DEST)
}

pub fn is_cancel(code: i32) -> bool {
    matches!(code, ERROR_CANCELLED | E_ABORT | CE_USER_CANCELLED | CE_CANCELLED)
}

/// HRESULT shellu → klíč překladu. Neznámý kód dostane obecnou větu
/// a technický detail (kód + text Windows) až do rozbalení.
pub fn describe_hr(code: i32) -> AppError {
    let key = match code as u32 {
        _ if is_cancel(code) => "error.cancelled",
        _ if needs_admin(code) => "error.permissionDenied",
        0x8027_003F | 0x8027_002A => "error.readOnly",                      // ACCESSDENIED_READONLY, ALREADY_EXISTS_READONLY
        0x8027_0023 | 0x8027_0024 | 0x8027_0035 => "error.notFound",        // PATH_NOT_FOUND_SRC/DEST, CANT_REACH_SOURCE
        0x8027_0027 | 0x8027_0028 => "error.inUse",                         // SHARING_VIOLATION_SRC/DEST
        0x8027_0032 | 0x8027_0033 | 0x8027_000E => "error.diskFull",        // DISK_FULL(_CLEAN), REMOVABLE_FULL
        0x8027_000D => "error.fileTooLarge",
        0x8027_001D | 0x8027_001E | 0x8027_0038 | 0x8027_003B | 0x8027_003C => "error.pathTooLong",
        0x8027_0025 | 0x8027_0026 => "error.networkUnavailable",            // NET_DISCONNECT_SRC/DEST
        0x8027_0029 | 0x8027_002B | 0x8027_002C => "error.alreadyExists",   // ALREADY_EXISTS_*
        0x8027_0009 | 0x8027_000A => "error.intoItself",                    // DEST_SUBTREE, DEST_SAME_TREE
        0x8027_001F | 0x8027_0020 => "error.trashRoot",                     // ROOT_DIR_SRC/DEST
        0x8027_003D => "error.dirNotEmpty",
        _ if code & hr(0xFFFF_0000) == WIN32_FACILITY => {
            return crate::describe_io(&std::io::Error::from_raw_os_error(code & 0xFFFF));
        }
        _ => return unknown(code),
    };
    AppError::new(key)
}

/// Obecná věta + kód a systémový text jako detail.
fn unknown(code: i32) -> AppError {
    let message = windows::core::Error::from_hresult(windows::core::HRESULT(code)).message();
    AppError::new("error.unknown").arg("detail", format!("0x{:08X} {}", code as u32, message.trim()))
}

/* ------------------------------ IFileOperation ---------------------------- */

mod shell {
    use std::cell::RefCell;
    use std::rc::Rc;

    use windows::core::{implement, Ref, Result, HRESULT, HSTRING, PCWSTR};
    use windows::Win32::Foundation::HWND;
    use windows::Win32::System::Com::{
        CoCreateInstance, CoInitializeEx, CoUninitialize, CLSCTX_ALL, COINIT_APARTMENTTHREADED,
        COINIT_DISABLE_OLE1DDE,
    };
    use windows::Win32::UI::Shell::*;

    /// Co shell ohlásil: cesta (malými písmeny bez lomítka), HRESULT, nová položka.
    pub type Report = Vec<(String, String, i32, Option<String>)>;

    #[implement(IFileOperationProgressSink)]
    struct Sink {
        report: Rc<RefCell<Report>>,
    }

    fn path_of(item: Ref<'_, IShellItem>) -> Option<String> {
        let item = item.as_ref()?;
        let name = unsafe { item.GetDisplayName(SIGDN_FILESYSPATH) }.ok()?;
        let text = unsafe { name.to_string() }.ok();
        unsafe { windows::Win32::System::Com::CoTaskMemFree(Some(name.0 as _)) };
        text
    }

    impl Sink {
        fn note(&self, path: Option<String>, hr: HRESULT, created: Ref<'_, IShellItem>) {
            if let Some(path) = path {
                self.report.borrow_mut().push((super::norm(&path), path, hr.0, path_of(created)));
            }
        }
    }

    impl IFileOperationProgressSink_Impl for Sink_Impl {
        fn StartOperations(&self) -> Result<()> { Ok(()) }
        fn FinishOperations(&self, _: HRESULT) -> Result<()> { Ok(()) }
        fn PreRenameItem(&self, _: u32, _: Ref<'_, IShellItem>, _: &PCWSTR) -> Result<()> { Ok(()) }
        fn PostRenameItem(&self, _: u32, item: Ref<'_, IShellItem>, _: &PCWSTR, hr: HRESULT, created: Ref<'_, IShellItem>) -> Result<()> {
            self.note(path_of(item), hr, created);
            Ok(())
        }
        fn PreMoveItem(&self, _: u32, _: Ref<'_, IShellItem>, _: Ref<'_, IShellItem>, _: &PCWSTR) -> Result<()> { Ok(()) }
        fn PostMoveItem(&self, _: u32, item: Ref<'_, IShellItem>, _: Ref<'_, IShellItem>, _: &PCWSTR, hr: HRESULT, created: Ref<'_, IShellItem>) -> Result<()> {
            self.note(path_of(item), hr, created);
            Ok(())
        }
        fn PreCopyItem(&self, _: u32, _: Ref<'_, IShellItem>, _: Ref<'_, IShellItem>, _: &PCWSTR) -> Result<()> { Ok(()) }
        fn PostCopyItem(&self, _: u32, item: Ref<'_, IShellItem>, _: Ref<'_, IShellItem>, _: &PCWSTR, hr: HRESULT, created: Ref<'_, IShellItem>) -> Result<()> {
            self.note(path_of(item), hr, created);
            Ok(())
        }
        fn PreDeleteItem(&self, _: u32, _: Ref<'_, IShellItem>) -> Result<()> { Ok(()) }
        fn PostDeleteItem(&self, _: u32, item: Ref<'_, IShellItem>, hr: HRESULT, created: Ref<'_, IShellItem>) -> Result<()> {
            self.note(path_of(item), hr, created);
            Ok(())
        }
        fn PreNewItem(&self, _: u32, _: Ref<'_, IShellItem>, _: &PCWSTR) -> Result<()> { Ok(()) }
        fn PostNewItem(&self, _: u32, dir: Ref<'_, IShellItem>, name: &PCWSTR, _: &PCWSTR, _: u32, hr: HRESULT, created: Ref<'_, IShellItem>) -> Result<()> {
            let name = unsafe { name.to_string() }.unwrap_or_default();
            self.note(path_of(dir).map(|dir| super::join(&dir, &name)), hr, created);
            Ok(())
        }
        fn UpdateProgress(&self, _: u32, _: u32) -> Result<()> { Ok(()) }
        fn ResetTimer(&self) -> Result<()> { Ok(()) }
        fn PauseTimer(&self) -> Result<()> { Ok(()) }
        fn ResumeTimer(&self) -> Result<()> { Ok(()) }
    }

    fn item(path: &str) -> Result<IShellItem> {
        unsafe { SHCreateItemFromParsingName(&HSTRING::from(path), None) }
    }

    /// Nezařazená operace (zdroj neexistuje …): její cesta a chyba.
    pub type Rejected = Vec<(String, i32)>;

    /// Proběhne na volajícím vlákně — to musí mít COM apartment-threaded.
    fn run(ops: &[super::Op], opts: &super::Options) -> Result<(Report, Rejected, bool)> {
        use super::Op;

        let operation: IFileOperation = unsafe { CoCreateInstance(&FileOperation, None, CLSCTX_ALL)? };
        let mut flags = FOF_NOERRORUI | FOF_NOCONFIRMMKDIR;
        if opts.recycle {
            // Co se do Koše nevejde, by bez WANTNUKEWARNING zmizelo trvale bez
            // varování. Varování je potvrzovací dotaz — NOCONFIRMATION by ho
            // potlačil, proto ho Koš nemá (odpovídá Průzkumníku).
            flags |= FOFX_RECYCLEONDELETE | FOF_ALLOWUNDO | FOF_WANTNUKEWARNING;
        } else if ops.iter().any(|op| matches!(op, Op::Restore { .. })) {
            // Obnovení z Koše nesmí nic přepsat: obsazené místo kontroluje
            // restore_recycled předem, kdyby mezitím vzniklo, dostane obnovená
            // položka nové jméno.
            flags |= FOF_RENAMEONCOLLISION;
        } else {
            // Trvalé smazání potvrdil uživatel v aplikaci; u kopie a přesunu
            // řeší kolize place() předem a „Nahradit" má přepsat bez ptaní.
            flags |= FOF_NOCONFIRMATION;
        }
        if opts.elevate {
            // SHOWELEVATIONPROMPT: UAC i přes NOERRORUI; REQUIREELEVATION: bez
            // mezikroku „Potřebujete oprávnění správce" — ten nahradil náš dialog.
            // Průběh (u dlouhé kopie) ukáže shell sám.
            flags |= FOFX_SHOWELEVATIONPROMPT | FOFX_REQUIREELEVATION;
        } else {
            flags |= FOF_SILENT;
        }
        unsafe {
            operation.SetOperationFlags(flags)?;
            if opts.owner != 0 {
                operation.SetOwnerWindow(HWND(opts.owner as _))?;
            }
        }

        let report = Rc::new(RefCell::new(Vec::new()));
        let sink: IFileOperationProgressSink = Sink { report: report.clone() }.into();
        let cookie = unsafe { operation.Advise(&sink)? };

        // Položky Koše jen z výčtu Koše (ne podle cesty) — jinak by po nich
        // zůstal záznam v Koši.
        let bin = if ops.iter().any(|op| matches!(op, Op::Restore { .. } | Op::Purge { .. })) {
            crate::recycle::shell::by_id()
        } else {
            Default::default()
        };
        let recycled = |id: &str| bin.get(&id.to_lowercase()).cloned().ok_or_else(|| windows::core::Error::from_hresult(HRESULT(super::E_NOT_FOUND)));

        let mut rejected = Vec::new();
        for op in ops {
            // Chybějící zdroj (SHCreateItemFromParsingName) patří jen té operaci.
            let queued = (|| -> Result<()> {
                unsafe {
                    match op {
                        Op::Delete { path } => operation.DeleteItem(&item(path)?, None),
                        Op::Rename { path, name } => operation.RenameItem(&item(path)?, &HSTRING::from(name), None),
                        Op::Copy { from, to_dir, name } => {
                            operation.CopyItem(&item(from)?, &item(to_dir)?, &HSTRING::from(name), None)
                        }
                        Op::Move { from, to_dir, name } => {
                            operation.MoveItem(&item(from)?, &item(to_dir)?, &HSTRING::from(name), None)
                        }
                        Op::NewFolder { dir, name } => {
                            operation.NewItem(&item(dir)?, 0x10 /* FILE_ATTRIBUTE_DIRECTORY */, &HSTRING::from(name), None, None)
                        }
                        Op::Restore { id, to_dir, name } => {
                            operation.MoveItem(&recycled(id)?, &item(to_dir)?, &HSTRING::from(name), None)
                        }
                        Op::Purge { id } => operation.DeleteItem(&recycled(id)?, None),
                    }
                }
            })();
            if let Err(err) = queued {
                rejected.push((op.subject(), err.code().0));
            }
        }

        // Selhání jednotlivých položek PerformOperations nevrací (ty jsou
        // v sinku); chyba odsud znamená, že neproběhlo nic (zrušená UAC …).
        let performed = if rejected.len() < ops.len() { unsafe { operation.PerformOperations() } } else { Ok(()) };
        let aborted = unsafe { operation.GetAnyOperationsAborted() }.map(|b| b.as_bool()).unwrap_or(false);
        unsafe {
            let _ = operation.Unadvise(cookie);
        }
        drop(sink);
        let report = report.take();
        if let Err(err) = performed {
            if report.is_empty() {
                return Err(err);
            }
        }
        Ok((report, rejected, aborted))
    }

    /// IFileOperation na vlastním vlákně s COM: async runtime Tauri si COM
    /// inicializuje po svém (trash) a shell chce apartment-threaded.
    pub fn perform(ops: Vec<super::Op>, opts: super::Options) -> std::result::Result<(Report, Rejected, bool), i32> {
        std::thread::spawn(move || unsafe {
            let init = CoInitializeEx(None, COINIT_APARTMENTTHREADED | COINIT_DISABLE_OLE1DDE);
            let result = run(&ops, &opts).map_err(|err| err.code().0);
            if init.is_ok() {
                CoUninitialize();
            }
            result
        })
        .join()
        // Spadlé vlákno není zrušení — obecná chyba.
        .unwrap_or(Err(super::E_UNEXPECTED))
    }
}

/// Provede `ops` jednou operací shellu; výsledek pro každou ve stejném pořadí.
pub fn perform(ops: Vec<Op>, opts: Options) -> CmdResult<Vec<ItemResult>> {
    let subjects: Vec<String> = ops.iter().map(Op::subject).collect();
    let (report, rejected, aborted) = shell::perform(ops, opts).map_err(describe_hr)?;

    Ok(subjects
        .into_iter()
        .map(|subject| {
            let key = norm(&subject);
            if let Some((_, code)) = rejected.iter().find(|(path, _)| norm(path) == key) {
                return Err((subject, *code));
            }
            // Selhání položky uvnitř kopírované / mazané složky — hlásí se ta položka.
            let inside = format!("{key}\\");
            let child = report.iter().find(|(path, _, code, _)| *code < 0 && path.starts_with(&inside));
            match report.iter().find(|(path, ..)| *path == key) {
                Some((_, _, code, _)) if *code < 0 => Err((subject, *code)),
                _ if child.is_some() => {
                    let (_, original, code, _) = child.unwrap();
                    Err((original.clone(), *code))
                }
                Some((.., created)) => Ok(created.clone()),
                // Shell položku vůbec nezpracoval — zrušeno (UAC odmítnuta, chyba dřív).
                None if aborted => Err((subject, CE_USER_CANCELLED)),
                // Shell o položce nic neohlásil — úspěch se z toho vyvodit nedá.
                None => Err((subject, E_FAIL)),
            }
        })
        .collect())
}

/// Okno pro výzvu UAC.
pub fn owner_of(window: &tauri::WebviewWindow) -> isize {
    window.hwnd().map(|hwnd| hwnd.0 as isize).unwrap_or(0)
}

/* --------------------------------- commandy -------------------------------- */

/// Položka, kterou se nepodařilo zpracovat. `admin` = pomohlo by
/// „Pokračovat jako správce" (jen u pokusu bez elevace).
#[derive(Serialize)]
pub struct Failure {
    /// Kde operace selhala — u složky i soubor uvnitř.
    path: String,
    /// Položka, kterou uživatel vybral (pro opakování jako správce).
    item: String,
    error: AppError,
    admin: bool,
}

impl Failure {
    pub fn new(item: &str, path: String, code: i32, elevated: bool) -> Self {
        Failure { admin: !elevated && needs_admin(code), error: describe_hr(code), path, item: item.to_string() }
    }

    fn other(item: &str, error: AppError) -> Self {
        Failure::at(item, item.to_string(), error)
    }

    pub fn at(item: &str, path: String, error: AppError) -> Self {
        Failure { path, item: item.to_string(), error, admin: false }
    }
}

#[derive(Serialize, Default)]
pub struct DeleteReport {
    /// Zpracované položky (u mazání původní cesty, u Koše `id`).
    deleted: Vec<String>,
    failed: Vec<Failure>,
}

impl DeleteReport {
    pub fn done(&mut self, path: String) {
        self.deleted.push(path);
    }

    pub fn fail(&mut self, failure: Failure) {
        self.failed.push(failure);
    }
}

/// Smaže výběr jednou operací shellu — do Koše, nebo trvale. Selhání
/// položek nevrací jako chybu, ale v `failed` (s cestou a důvodem).
#[tauri::command(async)]
pub fn delete_paths(window: tauri::WebviewWindow, paths: Vec<String>, permanent: bool, elevate: bool) -> CmdResult<DeleteReport> {
    let ops = paths.iter().map(|path| Op::Delete { path: path.clone() }).collect();
    let results = perform(ops, Options { recycle: !permanent, elevate, owner: owner_of(&window) })?;

    let mut report = DeleteReport { deleted: Vec::new(), failed: Vec::new() };
    for (path, result) in paths.into_iter().zip(results) {
        match result {
            Ok(_) => report.deleted.push(path),
            Err((at, code)) => report.failed.push(Failure::new(&path, at, code, elevate)),
        }
    }
    Ok(report)
}

/// Kopírování / přesun jako správce: jedna položka a co dělat s kolizí.
#[derive(Deserialize)]
pub struct ElevatedItem {
    from: String,
    on_conflict: Option<String>,
}

/// Výsledek jedné položky z `transfer_elevated` — buď `result`, nebo `failure`.
#[derive(Serialize)]
pub struct ElevatedOutcome {
    result: Option<crate::OpResult>,
    failure: Option<Failure>,
}

/// Kopírování nebo přesun (`mode` "copy" / "move") s oprávněním správce.
/// Kolize řeší stejně jako copy_path / move_path; „Nahradit" přepíše soubory
/// a sloučí složky (FOF_NOCONFIRMATION, jako v Průzkumníku).
#[tauri::command(async)]
pub fn transfer_elevated(
    window: tauri::WebviewWindow,
    items: Vec<ElevatedItem>,
    to_dir: String,
    mode: String,
    copy_label: Option<String>,
) -> CmdResult<Vec<ElevatedOutcome>> {
    use std::path::{Path, PathBuf};

    let copy_label = copy_label.unwrap_or_else(|| crate::DEFAULT_COPY_LABEL.to_string());
    let destination = Path::new(&to_dir);
    let moving = mode == "move";

    // Předem: cílové jméno (kolize) a co se vůbec provede.
    let mut outcomes: Vec<Option<ElevatedOutcome>> = Vec::new();
    let mut ops = Vec::new();
    let mut targets = Vec::new();
    for item in &items {
        let source = PathBuf::from(&item.from);
        let planned = (|| -> CmdResult<Option<PathBuf>> {
            let on_conflict = crate::parse_conflict(item.on_conflict.clone())?;
            if moving && crate::is_directly_in(&source, destination) {
                return Ok(None);
            }
            crate::ensure_not_inside(&source, destination)?;
            Ok(match crate::place(&source, destination, on_conflict, &copy_label)? {
                crate::Placement::Fresh(target) | crate::Placement::Replace(target) => Some(target),
                crate::Placement::Skip(_) => None,
            })
        })();
        match planned {
            Ok(Some(target)) => {
                let name = target.file_name().map(|n| n.to_string_lossy().to_string()).unwrap_or_default();
                let (from, to_dir) = (item.from.clone(), to_dir.clone());
                ops.push(if moving { Op::Move { from, to_dir, name } } else { Op::Copy { from, to_dir, name } });
                targets.push(target);
                outcomes.push(None);
            }
            Ok(None) => outcomes.push(Some(ElevatedOutcome {
                result: Some(crate::OpResult { path: item.from.clone(), skipped_links: 0, skipped: true }),
                failure: None,
            })),
            Err(err) => outcomes.push(Some(ElevatedOutcome { result: None, failure: Some(Failure::other(&item.from, err)) })),
        }
    }

    let mut results = if ops.is_empty() {
        Vec::new()
    } else {
        perform(ops, Options { recycle: false, elevate: true, owner: owner_of(&window) })?
    }
    .into_iter()
    .zip(targets);

    Ok(outcomes
        .into_iter()
        .zip(&items)
        .map(|(outcome, item)| {
            outcome.unwrap_or_else(|| match results.next() {
                Some((Ok(_), target)) => ElevatedOutcome {
                    result: Some(crate::OpResult { path: target.to_string_lossy().to_string(), skipped_links: 0, skipped: false }),
                    failure: None,
                },
                Some((Err((at, code)), _)) => ElevatedOutcome { result: None, failure: Some(Failure::new(&item.from, at, code, true)) },
                None => ElevatedOutcome { result: None, failure: Some(Failure::new(&item.from, item.from.clone(), E_ABORT, true)) },
            })
        })
        .collect())
}

/// Jedna operace jako správce; chyba s cestou.
fn single(window: &tauri::WebviewWindow, op: Op) -> CmdResult<Option<String>> {
    let mut results = perform(vec![op], Options { recycle: false, elevate: true, owner: owner_of(window) })?;
    match results.pop() {
        Some(Ok(created)) => Ok(created),
        Some(Err((at, code))) => Err(AppError::at(at, describe_hr(code))),
        None => Err(describe_hr(E_ABORT)),
    }
}

/// Přejmenování jako správce (kontroly jako rename_path).
#[tauri::command(async)]
pub fn rename_elevated(window: tauri::WebviewWindow, from: String, to_name: String) -> CmdResult<String> {
    crate::validate_name(&to_name)?;
    let source = std::path::PathBuf::from(&from);
    let target = crate::parent_of(&source)?.join(to_name.trim());
    let case_only = source.to_string_lossy().to_lowercase() == target.to_string_lossy().to_lowercase();
    if !case_only && target.exists() {
        return Err(AppError::new("error.exists").arg("path", target.to_string_lossy()));
    }
    single(&window, Op::Rename { path: from, name: to_name.trim().to_string() })?;
    Ok(target.to_string_lossy().to_string())
}

/// Nová složka jako správce (kolize jména číslem jako create_folder).
#[tauri::command(async)]
pub fn create_folder_elevated(window: tauri::WebviewWindow, dir: String, name: String) -> CmdResult<String> {
    crate::validate_name(&name)?;
    let target = crate::unique_new_name(std::path::Path::new(&dir), name.trim())?;
    let name = target.file_name().map(|n| n.to_string_lossy().to_string()).unwrap_or_default();
    single(&window, Op::NewFolder { dir, name })?;
    Ok(target.to_string_lossy().to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn describes_shell_codes() {
        assert_eq!(describe_hr(CE_ACCESS_DENIED_SRC).key, "error.permissionDenied");
        assert!(needs_admin(CE_ACCESS_DENIED_DEST) && needs_admin(E_ACCESSDENIED));
        assert!(!needs_admin(hr(0x8027_0027)));
        assert_eq!(describe_hr(hr(0x8027_0027)).key, "error.inUse");
        assert_eq!(describe_hr(ERROR_CANCELLED).key, "error.cancelled");
        assert_eq!(describe_hr(hr(0x8007_0070)).key, "error.diskFull");
        let unknown = describe_hr(hr(0x8027_0041));
        assert_eq!(unknown.key, "error.unknown");
    }

    /// Celá fronta v dočasné složce: nová složka, kopie, přejmenování, přesun
    /// a trvalé smazání (Koše se test nedotkne). Chybějící zdroj nesmí shodit
    /// ostatní operace.
    #[test]
    fn performs_queue_with_per_item_results() {
        let root = std::env::temp_dir().join(format!("fw-fileop-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&root);
        std::fs::create_dir_all(root.join("a")).unwrap();
        std::fs::write(root.join("a").join("x.txt"), "x").unwrap();
        std::fs::write(root.join("gone.txt"), "x").unwrap();
        let dir = root.to_string_lossy().to_string();
        let a = root.join("a").to_string_lossy().to_string();
        let x = root.join("a").join("x.txt").to_string_lossy().to_string();
        let opts = || Options { recycle: false, elevate: false, owner: 0 };

        let results = perform(
            vec![
                Op::NewFolder { dir: dir.clone(), name: "b".into() },
                Op::Copy { from: x.clone(), to_dir: dir.clone(), name: "y.txt".into() },
                Op::Rename { path: x.clone(), name: "z.txt".into() },
            ],
            opts(),
        )
        .unwrap();
        assert!(results.iter().all(Result::is_ok), "{results:?}");
        assert!(root.join("b").is_dir() && root.join("y.txt").is_file() && root.join("a").join("z.txt").is_file());

        let missing = root.join("missing.txt").to_string_lossy().to_string();
        let gone = root.join("gone.txt").to_string_lossy().to_string();
        let results = perform(
            vec![
                Op::Move { from: root.join("y.txt").to_string_lossy().to_string(), to_dir: a.clone(), name: "y.txt".into() },
                Op::Delete { path: missing.clone() },
                Op::Delete { path: gone },
            ],
            opts(),
        )
        .unwrap();
        assert!(results[0].is_ok() && results[2].is_ok(), "{results:?}");
        assert!(matches!(&results[1], Err((path, _)) if *path == missing));
        assert!(root.join("a").join("y.txt").is_file() && !root.join("gone.txt").exists());

        std::fs::remove_dir_all(&root).unwrap();
    }
}
