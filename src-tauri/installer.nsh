; Pluma NSIS installer hooks
; Adds / removes the "Plumaで編集" right-click context menu for supported file extensions.
;
; Scope: HKCU (per-user) — matches Tauri's default per-user NSIS install,
;        no administrator privileges required.
;
; Mechanism: Uses HKCU\Software\Classes\SystemFileAssociations\<.ext>\shell\OpenWithPluma.
;        SystemFileAssociations lets us add a verb to a specific extension without
;        owning that extension's ProgID, so we coexist cleanly with whatever app
;        the user has chosen as the default opener.

!macro PlumaRegisterExt EXT
  WriteRegStr HKCU "Software\Classes\SystemFileAssociations\${EXT}\shell\OpenWithPluma" "" "Plumaで編集"
  WriteRegStr HKCU "Software\Classes\SystemFileAssociations\${EXT}\shell\OpenWithPluma" "Icon" '"$INSTDIR\pluma.exe",0'
  WriteRegStr HKCU "Software\Classes\SystemFileAssociations\${EXT}\shell\OpenWithPluma\command" "" '"$INSTDIR\pluma.exe" "%1"'
!macroend

!macro PlumaUnregisterExt EXT
  DeleteRegKey HKCU "Software\Classes\SystemFileAssociations\${EXT}\shell\OpenWithPluma"
!macroend

!macro NSIS_HOOK_POSTINSTALL
  !insertmacro PlumaRegisterExt ".txt"
  !insertmacro PlumaRegisterExt ".csv"
  !insertmacro PlumaRegisterExt ".tsv"
  !insertmacro PlumaRegisterExt ".tab"
  !insertmacro PlumaRegisterExt ".md"
  !insertmacro PlumaRegisterExt ".htm"
  !insertmacro PlumaRegisterExt ".html"
!macroend

!macro NSIS_HOOK_PREUNINSTALL
  !insertmacro PlumaUnregisterExt ".txt"
  !insertmacro PlumaUnregisterExt ".csv"
  !insertmacro PlumaUnregisterExt ".tsv"
  !insertmacro PlumaUnregisterExt ".tab"
  !insertmacro PlumaUnregisterExt ".md"
  !insertmacro PlumaUnregisterExt ".htm"
  !insertmacro PlumaUnregisterExt ".html"
!macroend
