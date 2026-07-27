@echo off
rem Launcher for Metro on the Android emulator (port 8081).
rem Different from START_METRO.bat: that one serves the iPhone over Wi-Fi on 8085,
rem while the emulator build has 127.0.0.1:8081 baked in by
rem plugins\withAndroidDevServer127.js and needs adb reverse.
rem The window stays open: if Metro dies, the watchdog restarts it.
rem NOTE: keep this file ASCII-only - .bat is read in the OEM codepage, and Cyrillic
rem here breaks command parsing. All Russian hints live in the .ps1 (UTF-8 + BOM).
chcp 65001 >nul
cd /d C:\appsprojects\phraseman
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "scripts\metro-emulator.ps1" %*
echo.
echo Metro stopped. Press any key to close this window.
pause >nul
