# Skutečné snímání obrazovky pro screenshot s průhledností a demo (viz CLAUDE.md).
# Spouštět přes pwsh (PowerShell 7). Okno aplikace = dev build z src-tauri\target.
#   backdrop -Image p -X -Y -W -H   okno s testovací tapetou (běží, dokud se neukončí)
#   place -X -Y -W -H               přesune okno aplikace
#   top / untop                     tapeta a aplikace nad ostatní okna bez aktivace / zpět
#   shot -X -Y -W -H -Out p         snímek oblasti obrazovky (PNG)
#   stop                            ukončí okno s tapetou
param([string]$Cmd, [string]$Image, [int]$X, [int]$Y, [int]$W, [int]$H, [string]$Out)

Add-Type @"
using System; using System.Runtime.InteropServices;
public static class FwScreen {
  [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
  [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr h, IntPtr after, int x, int y, int w, int hh, uint f);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int c);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern IntPtr FindWindow(string c, string t);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern IntPtr FindWindowEx(IntPtr p, IntPtr after, string cls, string title);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
}
"@
[FwScreen]::SetProcessDPIAware() | Out-Null
$TITLE = "fw-backdrop"
$NOSIZE = 0x1; $NOMOVE = 0x2; $NOACTIVATE = 0x10

# Pozor: MainWindowHandle u minimalizovaného okna Tauri vrací skryté okno
# „Tao Thread Event Target“ — hledá se třída „Tauri Window“ dev procesu.
function Get-AppWindow {
  $ids = @((Get-Process dirwise -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*\src-tauri\target\*" }).Id)
  $hwnd = [IntPtr]::Zero
  while (($hwnd = [FwScreen]::FindWindowEx([IntPtr]::Zero, $hwnd, "Tauri Window", [NullString]::Value)) -ne [IntPtr]::Zero) {
    $p = 0; [FwScreen]::GetWindowThreadProcessId($hwnd, [ref]$p) | Out-Null
    if ($ids -contains $p) { return $hwnd }
  }
  throw "okno dev aplikace nenalezeno"
}
function Get-Backdrop { [FwScreen]::FindWindow([NullString]::Value, $TITLE) }

switch ($Cmd) {
  "backdrop" {
    Add-Type -AssemblyName System.Windows.Forms, System.Drawing
    $f = New-Object System.Windows.Forms.Form
    $f.FormBorderStyle = "None"; $f.StartPosition = "Manual"; $f.ShowInTaskbar = $false; $f.Text = $TITLE
    $f.Bounds = New-Object System.Drawing.Rectangle $X, $Y, $W, $H
    $f.BackgroundImage = [System.Drawing.Image]::FromFile($Image); $f.BackgroundImageLayout = "Stretch"
    [System.Windows.Forms.Application]::Run($f)
  }
  "place" { $hwnd = Get-AppWindow; [FwScreen]::ShowWindow($hwnd, 9) | Out-Null; [FwScreen]::SetWindowPos($hwnd, [IntPtr]::Zero, $X, $Y, $W, $H, $NOACTIVATE) | Out-Null }
  "top" {
    # Okno s tapetou startuje pár sekund (pwsh + WinForms) — bez něj by za
    # průhledným oknem prosvítala jiná okna.
    for ($i = 0; $i -lt 100 -and (Get-Backdrop) -eq [IntPtr]::Zero; $i++) { Start-Sleep -Milliseconds 100 }
    if ((Get-Backdrop) -eq [IntPtr]::Zero) { throw "okno s tapetou se neotevřelo" }
    Start-Sleep -Milliseconds 300
    [FwScreen]::SetWindowPos((Get-Backdrop), [IntPtr]-1, 0, 0, 0, 0, $NOSIZE -bor $NOMOVE -bor $NOACTIVATE) | Out-Null
    [FwScreen]::SetWindowPos((Get-AppWindow), [IntPtr]-1, 0, 0, 0, 0, $NOSIZE -bor $NOMOVE -bor $NOACTIVATE) | Out-Null
  }
  "untop" {
    [FwScreen]::SetWindowPos((Get-AppWindow), [IntPtr]-2, 0, 0, 0, 0, $NOSIZE -bor $NOMOVE -bor $NOACTIVATE) | Out-Null
    $b = Get-Backdrop
    if ($b -ne [IntPtr]::Zero) {
      [FwScreen]::SetWindowPos($b, [IntPtr]-2, 0, 0, 0, 0, $NOSIZE -bor $NOMOVE -bor $NOACTIVATE) | Out-Null
      [FwScreen]::SetWindowPos($b, [IntPtr]1, 0, 0, 0, 0, $NOSIZE -bor $NOMOVE -bor $NOACTIVATE) | Out-Null
    }
  }
  "shot" {
    Add-Type -AssemblyName System.Drawing
    $bmp = New-Object System.Drawing.Bitmap $W, $H
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.CopyFromScreen($X, $Y, 0, 0, $bmp.Size)
    $bmp.Save($Out, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose(); $bmp.Dispose()
  }
  "stop" {
    Get-CimInstance Win32_Process -Filter "Name='pwsh.exe'" | Where-Object { $_.CommandLine -like "*screen.ps1*backdrop*" } |
      ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
  }
  default { throw "neznámý příkaz: $Cmd" }
}
