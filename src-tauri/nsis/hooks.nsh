; Háčky NSIS instalátoru (bundle.windows.nsis.installerHooks).
;
; Přechod z Finder-Win 1.5.x na Dirwise 1.6: Tauri odvozuje instalační
; složku, klíč odinstalace i zástupce od productName, takže by nová verze
; skončila vedle staré. Před instalací se proto tiše spustí odinstalátor
; Finder-Win. Bez /UPDATE: s ním by nesmazal zástupce. Nastavení zůstane —
; data (%APPDATA%\com.krystof2ops.finderwin) maže jen zaškrtnuté políčko
; v jeho dialogu, který se v tichém režimu neukáže; identifier je stejný.
;
; Vydavatel (bundle.publisher) byl do 1.6.0 „krystof2-ops“, teď „Arcly Studio“.
; Tauri ukládá instalační složku do HKCU\Software\<vydavatel>\<productName>
; a při aktualizaci z ní bere _?= pro starý odinstalátor – s prázdnou hodnotou
; by odinstalace předchozí verze skončila hláškou „nelze odinstalovat“ a .onInit
; by nenašel vlastní instalační složku. Klíč se proto přenese ještě před
; stránkou „předchozí verze“ (.onGUIInit přes MUI_CUSTOMFUNCTION_GUIINIT) a
; v tichém režimu (/S, winget), kde .onGUIInit neběží, v PREINSTALL – tam už je
; $INSTDIR určený, proto se po přenosu nastaví znovu i SetOutPath. Výběr jazyka
; se uživateli z 1.6.0 ukáže ještě jednou (MUI ho čte v .onInit, dřív než
; migrace). Cesty jsou natvrdo: soubor se vkládá dřív, než Tauri definuje
; MANUPRODUCTKEY – shodu s publisher/productName hlídá !error v PREINSTALL.
!define DIRWISE_OLD_MANUKEY "Software\krystof2-ops"
!define DIRWISE_MANUPRODUCTKEY "Software\Arcly Studio\Dirwise"
!define DIRWISE_DEFAULT_INSTDIR "$LOCALAPPDATA\Dirwise"
!define MUI_CUSTOMFUNCTION_GUIINIT DirwiseMigrateManufacturerKey

; Přenos klíče vydavatele; starý smaže, nový nepřepíše. $INSTDIR převezme jen
; z výchozí hodnoty (ne přes /D= z příkazové řádky).
!macro DIRWISE_MIGRATE_MANUKEY
  Push $R8
  Push $R9
  ReadRegStr $R9 HKCU "${DIRWISE_OLD_MANUKEY}\Dirwise" ""
  ${If} $R9 != ""
    ReadRegStr $R8 HKCU "${DIRWISE_MANUPRODUCTKEY}" ""
    ${If} $R8 == ""
      WriteRegStr HKCU "${DIRWISE_MANUPRODUCTKEY}" "" $R9
      ${If} $INSTDIR == "${DIRWISE_DEFAULT_INSTDIR}"
        StrCpy $INSTDIR $R9
      ${EndIf}
    ${EndIf}
    DeleteRegKey HKCU "${DIRWISE_OLD_MANUKEY}\Dirwise"
  ${EndIf}
  Pop $R9
  Pop $R8
!macroend

Function DirwiseMigrateManufacturerKey
  !insertmacro DIRWISE_MIGRATE_MANUKEY
FunctionEnd

!macro NSIS_HOOK_PREINSTALL
  !if "${MANUPRODUCTKEY}" != "${DIRWISE_MANUPRODUCTKEY}"
    !error "hooks.nsh: DIRWISE_MANUPRODUCTKEY nesedí s publisher/productName v tauri.conf.json"
  !endif
  !if "${PRODUCTNAME}" != "Dirwise"
    !error "hooks.nsh: productName se změnil, uprav cesty v hooks.nsh"
  !endif
  ; Tichá instalace (/S) .onGUIInit nevolá – přenést klíč tady; po interaktivní
  ; migraci je starý klíč pryč a nic se nestane.
  !insertmacro DIRWISE_MIGRATE_MANUKEY
  SetOutPath $INSTDIR
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
  ; Rodič starého vydavatele až po úklidu obou podklíčů (Dirwise i Finder-Win).
  DeleteRegKey /ifempty HKCU "${DIRWISE_OLD_MANUKEY}"
  Pop $R9
  Pop $R8
  Pop $R7
!macroend
