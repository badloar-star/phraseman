@echo off
chcp 65001 >nul

:: Check for admin rights — if not, relaunch self elevated
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo Запрашиваю права администратора...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

echo [admin] Переключаю Wi-Fi в Private...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Set-NetConnectionProfile -InterfaceAlias 'Wi-Fi' -NetworkCategory Private -ErrorAction Stop"
if %errorlevel% neq 0 (
    echo Не удалось переключить профиль. Пробуем по имени адаптера...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-NetConnectionProfile | Where-Object { $_.InterfaceAlias -match 'Wi-Fi|Wireless|WLAN' } | Set-NetConnectionProfile -NetworkCategory Private"
)

echo [admin] Открываю файрвол для порта 8085...
powershell -NoProfile -ExecutionPolicy Bypass -Command "New-NetFirewallRule -DisplayName 'Expo Metro 8085' -Direction Inbound -LocalPort 8085 -Protocol TCP -Action Allow -Profile Any -ErrorAction SilentlyContinue"

echo [admin] Запускаю Metro для iPhone...
cd /d "%~dp0.."
npm run metro:iphone
pause
