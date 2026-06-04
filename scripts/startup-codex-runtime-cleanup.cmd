@echo off
start "" /min powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Start-Sleep -Seconds 300; & 'C:\appsprojects\phraseman\scripts\cleanup-codex-runtime.ps1' -Loop -LoopMinutes 15 -StaleProcessMinutes 10"
