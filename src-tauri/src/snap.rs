//! Snap Layouts u vlastního tlačítka Maximalizovat.
//!
//! Windows 11 ukáže nabídku rozložení jen tehdy, když WM_NCHITTEST pod myší
//! vrátí HTMAXBUTTON. Okno je bez dekorací a klientskou plochu celou kryje
//! WebView2 (vlastní child okna), takže se hlavního okna nikdo nezeptá —
//! subclass nepomůže. Nad HTML tlačítkem proto leží neviditelné nativní child
//! okno, které na hit-test odpoví HTMAXBUTTON. Myš tím dostane ono, takže
//! klik (maximalizovat / obnovit) řeší tady a hover/stisk posílá stránce
//! událostí `snap-button` ("hover" / "pressed" / "none"); CSS :hover pod ním
//! nefunguje. Klávesnice jde dál přes HTML tlačítko.
//!
//! Pozice se počítá z pravého okraje: tlačítka mají 46 × 32 CSS px a vpravo
//! od Maximalizovat je jen Zavřít — musí sedět s `TitleBar.tsx`.

use std::sync::atomic::{AtomicIsize, AtomicU8, Ordering};
use std::sync::OnceLock;

use tauri::{Emitter, WebviewWindow};
use windows::core::w;
use windows::Win32::Foundation::{HWND, LPARAM, LRESULT, RECT, WPARAM};
use windows::Win32::Graphics::Gdi::{GetStockObject, ValidateRect, HBRUSH, NULL_BRUSH};
use windows::Win32::System::LibraryLoader::GetModuleHandleW;
use windows::Win32::UI::Input::KeyboardAndMouse::{TrackMouseEvent, TME_LEAVE, TME_NONCLIENT, TRACKMOUSEEVENT};
use windows::Win32::UI::WindowsAndMessaging::{
    CreateWindowExW, DefWindowProcW, GetClientRect, LoadCursorW, RegisterClassW, SetWindowPos, HTMAXBUTTON,
    HWND_TOP, IDC_ARROW, SWP_NOACTIVATE, SWP_SHOWWINDOW, WINDOW_EX_STYLE, WM_ERASEBKGND, WM_NCHITTEST,
    WM_NCLBUTTONDBLCLK, WM_NCLBUTTONDOWN, WM_NCLBUTTONUP, WM_NCMOUSELEAVE, WM_NCMOUSEMOVE, WM_NCPAINT, WM_NCRBUTTONDOWN,
    WM_NCRBUTTONUP, WM_PAINT, WNDCLASSW, WS_CHILD, WS_CLIPSIBLINGS, WS_VISIBLE,
};

const BUTTON_WIDTH: f64 = 46.0;
const BAR_HEIGHT: f64 = 32.0;
/// Kolik tlačítek je vpravo od Maximalizovat (jen Zavřít).
const BUTTONS_RIGHT: f64 = 1.0;

static WINDOW: OnceLock<WebviewWindow> = OnceLock::new();
static OVERLAY: AtomicIsize = AtomicIsize::new(0);

const STATE_NONE: u8 = 0;
const STATE_HOVER: u8 = 1;
const STATE_PRESSED: u8 = 2;
static STATE: AtomicU8 = AtomicU8::new(STATE_NONE);

/// Vytvoří overlay nad tlačítkem. Volat z hlavního vlákna (setup).
pub fn install(window: &WebviewWindow) {
    let Ok(parent) = window.hwnd() else { return };
    if WINDOW.set(window.clone()).is_err() {
        return;
    }
    unsafe {
        let Ok(module) = GetModuleHandleW(None) else { return };
        let class = WNDCLASSW {
            lpfnWndProc: Some(overlay_proc),
            hInstance: module.into(),
            lpszClassName: w!("DirwiseSnapOverlay"),
            hCursor: LoadCursorW(None, IDC_ARROW).unwrap_or_default(),
            // Žádné pozadí: okno nic nekreslí, pod ním je vidět stránka.
            hbrBackground: HBRUSH(GetStockObject(NULL_BRUSH).0),
            ..Default::default()
        };
        if RegisterClassW(&class) == 0 {
            return;
        }
        // WS_CLIPSIBLINGS je nutné, bez něj hit-test vyhraje WebView2.
        // WS_EX_LAYERED ani WS_EX_TRANSPARENT ne — oboje hit-test rozbije.
        let Ok(overlay) = CreateWindowExW(
            WINDOW_EX_STYLE(0),
            w!("DirwiseSnapOverlay"),
            None,
            WS_CHILD | WS_VISIBLE | WS_CLIPSIBLINGS,
            0,
            0,
            0,
            0,
            Some(parent),
            None,
            Some(module.into()),
            None,
        ) else {
            return;
        };
        OVERLAY.store(overlay.0 as isize, Ordering::Relaxed);
    }
    reposition();
}

/// Posune overlay k tlačítku a dá ho nad WebView2 (ten vzniká asynchronně
/// a mohl by se dostat nad něj). Volat po změně velikosti nebo DPI.
pub fn reposition() {
    let (Some(window), overlay) = (WINDOW.get(), OVERLAY.load(Ordering::Relaxed)) else { return };
    if overlay == 0 {
        return;
    }
    let Ok(parent) = window.hwnd() else { return };
    let scale = window.scale_factor().unwrap_or(1.0);
    let mut client = RECT::default();
    unsafe {
        if GetClientRect(parent, &mut client).is_err() {
            return;
        }
        let width = (BUTTON_WIDTH * scale).round() as i32;
        let x = client.right - ((BUTTONS_RIGHT + 1.0) * BUTTON_WIDTH * scale).round() as i32;
        let _ = SetWindowPos(
            HWND(overlay as *mut _),
            Some(HWND_TOP),
            x,
            0,
            width,
            (BAR_HEIGHT * scale).round() as i32,
            SWP_NOACTIVATE | SWP_SHOWWINDOW,
        );
    }
}

fn set_state(state: u8) {
    if STATE.swap(state, Ordering::Relaxed) == state {
        return;
    }
    let name = match state {
        STATE_HOVER => "hover",
        STATE_PRESSED => "pressed",
        _ => "none",
    };
    if let Some(window) = WINDOW.get() {
        let _ = window.emit("snap-button", name);
    }
}

fn toggle_maximize() {
    let Some(window) = WINDOW.get() else { return };
    let _ = if window.is_maximized().unwrap_or(false) { window.unmaximize() } else { window.maximize() };
}

unsafe extern "system" fn overlay_proc(hwnd: HWND, message: u32, wparam: WPARAM, lparam: LPARAM) -> LRESULT {
    match message {
        // Celé okno je „tlačítko Maximalizovat" — tím se ukáže Snap Layouts.
        WM_NCHITTEST => LRESULT(HTMAXBUTTON as isize),
        WM_NCMOUSEMOVE => {
            if STATE.load(Ordering::Relaxed) == STATE_NONE {
                let mut track = TRACKMOUSEEVENT {
                    cbSize: std::mem::size_of::<TRACKMOUSEEVENT>() as u32,
                    dwFlags: TME_LEAVE | TME_NONCLIENT,
                    hwndTrack: hwnd,
                    dwHoverTime: 0,
                };
                let _ = TrackMouseEvent(&mut track);
                set_state(STATE_HOVER);
            }
            LRESULT(0)
        }
        WM_NCMOUSELEAVE => {
            set_state(STATE_NONE);
            LRESULT(0)
        }
        // Výchozí zpracování by spustilo systémové sledování tlačítka (a
        // nakreslilo klasické tlačítko) — stisk a uvolnění řešíme sami.
        WM_NCLBUTTONDOWN | WM_NCLBUTTONDBLCLK => {
            set_state(STATE_PRESSED);
            LRESULT(0)
        }
        WM_NCLBUTTONUP => {
            if STATE.load(Ordering::Relaxed) == STATE_PRESSED {
                set_state(STATE_HOVER);
                toggle_maximize();
            }
            LRESULT(0)
        }
        WM_NCRBUTTONDOWN | WM_NCRBUTTONUP | WM_NCPAINT => LRESULT(0),
        WM_ERASEBKGND => LRESULT(1),
        WM_PAINT => {
            let _ = ValidateRect(Some(hwnd), None);
            LRESULT(0)
        }
        _ => DefWindowProcW(hwnd, message, wparam, lparam),
    }
}
