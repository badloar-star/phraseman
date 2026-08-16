@echo off
rem Single launcher for Metro (iPhone, LAN, port 8085).
rem The window stays open: if Metro crashes, the watchdog restarts it automatically.
rem The phone URL is written ONLY after the server answers, and erased when it dies.
rem Logic lives in scripts\metro-phone.ps1 (rewritten from scratch 2026-08-16).
rem NOTE: keep this file ASCII-only - .bat is read in the OEM codepage, and Cyrillic
rem here breaks command parsing. All Russian hints are inside the .ps1.
chcp 65001 >nul
cd /d C:\appsprojects\phraseman
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "scripts\metro-phone.ps1" %*
echo.
echo Metro stopped. Press any key to close this window.
pause >nul
