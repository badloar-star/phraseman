@echo off
rem Single launcher for Metro (iPhone, LAN, port 8085).
rem The window stays open: if Metro crashes, the watchdog restarts it automatically
rem and the phone URL stays the same. Logic lives in scripts\metro-always-on.ps1
rem NOTE: keep this file ASCII-only - .bat is read in the OEM codepage, and Cyrillic
rem here breaks command parsing. All Russian hints are inside the .ps1 (UTF-8 + BOM).
chcp 65001 >nul
cd /d C:\appsprojects\phraseman
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "scripts\metro-always-on.ps1" %*
echo.
echo Metro stopped. Press any key to close this window.
pause >nul
