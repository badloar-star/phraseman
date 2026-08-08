@echo off
rem Phraseman Metro for the ANDROID EMULATOR (port 8081).
rem Different from the iPhone launcher (port 8085, Wi-Fi/LAN): the emulator build
rem has 127.0.0.1:8081 baked in by plugins\withAndroidDevServer127.js and needs
rem adb reverse plus the exp+phraseman:// scheme.
rem Metro runs in THIS window via "call npx" - the same pattern as START_METRO.bat,
rem because Start-Process npx.cmd dies silently on this machine.
rem Keep this file ASCII-only: .bat is read in the OEM codepage.
chcp 65001 >nul
title Phraseman Metro - Android Emulator (8081)
cd /d "C:\appsprojects\phraseman"
set EXPO_NO_TELEMETRY=1
rem 8 GB heap: Metro died with a V8 OOM on this 4700-module project.
set NODE_OPTIONS=--max-old-space-size=8192

rem Step 1: free the port, boot the emulator if closed, wire adb reverse.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "scripts\metro-emulator-prepare.ps1"

rem Step 2: wait for Metro in the background, then open the app on the emulator.
start "" /b powershell.exe -NoProfile -ExecutionPolicy Bypass -File "scripts\metro-emulator-open.ps1"

rem Step 3: Metro itself - holds this window, same as the iPhone launcher.
call npx expo start --dev-client --port 8081 %*

echo.
echo Metro stopped. Press any key to close this window.
pause >nul
