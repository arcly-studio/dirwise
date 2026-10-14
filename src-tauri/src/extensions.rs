//! Přípony jako v Průzkumníku: které se ukazují, rozhoduje registr.
//!
//! - NeverShowExt (u přípony nebo jejího ProgID) — přípona se neukáže nikdy
//!   (zástupci .lnk, .url, .pif),
//! - AlwaysShowExt — ukáže se vždy,
//! - známý typ (registrovaná asociace) — skryje se podle nastavení Windows
//!   „Skrýt přípony známých typů souborů“ (HideFileExt),
//! - neznámý typ — přípona zůstane vidět.
//!
//! Pravidlo se počítá jednou na příponu (cache), posílá se s každou položkou
//! (`FileEntry::ext_rule`) a o zobrazení rozhoduje frontend (lib/extensions.ts)
//! — i podle volby aplikace Podle Windows / Vždy / Nikdy.

use std::collections::HashMap;
use std::sync::{Mutex, OnceLock};

/// Neznámý typ (nebo bez přípony) — přípona zůstane.
pub const RULE_PLAIN: u8 = 0;
/// Známý typ — skryje se podle HideFileExt.
pub const RULE_KNOWN: u8 = 1;
/// NeverShowExt — nikdy se neukáže.
pub const RULE_NEVER: u8 = 2;
/// AlwaysShowExt — ukáže se vždy.
pub const RULE_ALWAYS: u8 = 3;

static CACHE: OnceLock<Mutex<HashMap<String, u8>>> = OnceLock::new();

/// Pravidlo pro příponu (bez tečky, malými písmeny).
pub fn rule(extension: &str) -> u8 {
    let cache = CACHE.get_or_init(|| Mutex::new(HashMap::new()));
    if let Some(&known) = cache.lock().ok().as_ref().and_then(|map| map.get(extension)) {
        return known;
    }
    let computed = compute(extension);
    if let Ok(mut map) = cache.lock() {
        map.insert(extension.to_string(), computed);
    }
    computed
}

#[cfg(windows)]
fn compute(extension: &str) -> u8 {
    use windows::Win32::System::Registry::{HKEY_CLASSES_ROOT, HKEY_CURRENT_USER};

    let ext_key = format!(".{extension}");
    if !registry::key_exists(HKEY_CLASSES_ROOT, &ext_key) {
        return RULE_PLAIN;
    }
    let prog_id = registry::default_value(HKEY_CLASSES_ROOT, &ext_key).filter(|id| !id.is_empty());
    let flag = |name: &str| {
        registry::has_value(HKEY_CLASSES_ROOT, &ext_key, name)
            || prog_id.as_deref().is_some_and(|id| registry::has_value(HKEY_CLASSES_ROOT, id, name))
    };
    if flag("NeverShowExt") {
        return RULE_NEVER;
    }
    if flag("AlwaysShowExt") {
        return RULE_ALWAYS;
    }
    let known = prog_id.as_deref().is_some_and(|id| registry::key_exists(HKEY_CLASSES_ROOT, id))
        || registry::key_exists(HKEY_CLASSES_ROOT, &format!("{ext_key}\\OpenWithProgids"))
        || registry::key_exists(
            HKEY_CURRENT_USER,
            &format!("Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\FileExts\\{ext_key}\\UserChoice"),
        );
    if known {
        RULE_KNOWN
    } else {
        RULE_PLAIN
    }
}

#[cfg(not(windows))]
fn compute(_extension: &str) -> u8 {
    RULE_PLAIN
}

/// Pravidla pro přípony bez položky (nedávné soubory, Koš, dialogy).
#[tauri::command(async)]
pub fn extension_rules(extensions: Vec<String>) -> Vec<u8> {
    extensions.iter().map(|ext| rule(&ext.to_lowercase())).collect()
}

/// Má Průzkumník zapnuté „Skrýt přípony známých typů souborů“? Chybějící
/// hodnota = výchozí Windows (skrýt).
#[cfg(windows)]
#[tauri::command(async)]
pub fn explorer_hides_extensions() -> bool {
    use windows::Win32::System::Registry::HKEY_CURRENT_USER;
    registry::dword(
        HKEY_CURRENT_USER,
        "Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced",
        "HideFileExt",
    )
    .is_none_or(|value| value != 0)
}

#[cfg(not(windows))]
#[tauri::command(async)]
pub fn explorer_hides_extensions() -> bool {
    true
}

#[cfg(windows)]
mod registry {
    use windows::core::{HSTRING, PCWSTR};
    use windows::Win32::System::Registry::{
        RegCloseKey, RegGetValueW, RegOpenKeyExW, HKEY, KEY_READ, RRF_RT_ANY, RRF_RT_REG_DWORD, RRF_RT_REG_SZ,
    };

    pub fn key_exists(root: HKEY, subkey: &str) -> bool {
        let mut key = HKEY::default();
        let opened = unsafe { RegOpenKeyExW(root, &HSTRING::from(subkey), Some(0), KEY_READ, &mut key) };
        if opened.is_ok() {
            unsafe {
                let _ = RegCloseKey(key);
            }
        }
        opened.is_ok()
    }

    pub fn has_value(root: HKEY, subkey: &str, name: &str) -> bool {
        unsafe { RegGetValueW(root, &HSTRING::from(subkey), &HSTRING::from(name), RRF_RT_ANY, None, None, None) }
            .is_ok()
    }

    pub fn default_value(root: HKEY, subkey: &str) -> Option<String> {
        let mut buffer = [0u16; 260];
        let mut size = std::mem::size_of_val(&buffer) as u32;
        let status = unsafe {
            RegGetValueW(
                root,
                &HSTRING::from(subkey),
                PCWSTR::null(),
                RRF_RT_REG_SZ,
                None,
                Some(buffer.as_mut_ptr() as *mut _),
                Some(&mut size),
            )
        };
        status.is_ok().then(|| {
            let len = buffer.iter().position(|&c| c == 0).unwrap_or(buffer.len());
            String::from_utf16_lossy(&buffer[..len])
        })
    }

    pub fn dword(root: HKEY, subkey: &str, name: &str) -> Option<u32> {
        let mut value: u32 = 0;
        let mut size = std::mem::size_of::<u32>() as u32;
        let status = unsafe {
            RegGetValueW(
                root,
                &HSTRING::from(subkey),
                &HSTRING::from(name),
                RRF_RT_REG_DWORD,
                None,
                Some(&mut value as *mut u32 as *mut _),
                Some(&mut size),
            )
        };
        status.is_ok().then_some(value)
    }
}

#[cfg(all(test, windows))]
mod tests {
    use super::*;

    #[test]
    fn shortcuts_never_show_extension() {
        assert_eq!(rule("lnk"), RULE_NEVER);
        assert_eq!(rule("url"), RULE_NEVER);
    }

    #[test]
    fn common_types_are_known() {
        assert_eq!(rule("txt"), RULE_KNOWN);
        assert_eq!(rule("exe"), RULE_KNOWN);
    }

    #[test]
    fn unregistered_extension_is_plain() {
        assert_eq!(rule("dirwise-test-unknown-ext"), RULE_PLAIN);
    }
}
