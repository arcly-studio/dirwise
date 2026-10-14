; Háčky NSIS instalátoru (bundle.windows.nsis.installerHooks).
;
; Přechod z Finder-Win 1.5.x na Dirwise 1.6: Tauri odvozuje instalační
; složku, klíč odinstalace i zástupce od productName, takže by nová verze
; skončila vedle staré. Před instalací se proto tiše spustí odinstalátor
; Finder-Win. Bez /UPDATE: s ním by nesmazal zástupce. Nastavení zůstane —
; data (%APPDATA%\com.krystof2ops.finderwin) maže jen zaškrtnuté políčko
; v jeho dialogu, který se v tichém režimu neukáže; identifier je stejný.

!macro NSIS_HOOK_PREINSTALL
  Push $R7
  Push $R8
  Push $R9
  ReadRegStr $R8 HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Finder-Win" "UninstallString"
  ${If} $R8 != ""
    ; Cesta bez uvozovek (InstallLocation je má) — pro _?=.
    ReadRegStr $R9 HKCU "Software\krystof2-ops\Finder-Win" ""
    ${If} $R9 == ""
      ; Záložně z UninstallString: "C:\…\Finder-Win\uninstall.exe" → C:\…\Finder-Win
      StrCpy $R9 $R8 "" 1
      StrCpy $R9 $R9 -15
    ${EndIf}
    ; _?= = běží na místě a ExecWait počká; běžící finder-win.exe ukončí sám.
    ExecWait '$R8 /S _?=$R9' $R7
    ; Jen po úspěchu: při chybě (aplikaci nešlo ukončit) musí stará instalace
    ; zůstat i s odinstalátorem, jinak by nešla odebrat.
    ${If} $R7 = 0
    ${AndIfNot} ${FileExists} "$R9\finder-win.exe"
      ; Na místě se odinstalátor sám smazat nemůže.
      Delete "$R9\uninstall.exe"
      RMDir "$R9"
      DeleteRegKey HKCU "Software\krystof2-ops\Finder-Win"
    ${EndIf}
  ${EndIf}
  ; Cache ikon a náhledů 1.5.x (%LOCALAPPDATA%\finder-win — u výchozí
  ; instalace stejná složka jako stará aplikace). Dirwise má vlastní.
  RMDir /r "$LOCALAPPDATA\finder-win\icons"
  RMDir /r "$LOCALAPPDATA\finder-win\thumbnails"
  RMDir "$LOCALAPPDATA\finder-win"
  Pop $R9
  Pop $R8
  Pop $R7
!macroend
