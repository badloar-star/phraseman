@echo off
rem ============================================================
rem  Phraseman Metro - clean start (LAN, port 8081)
rem
rem  What it does:
rem   1) kills zombie Metro/Expo processes holding dev ports
rem      (same port list as "npm run kill:dev");
rem   2) pins PATH to the stable Node in "C:\Program Files\nodejs"
rem      so the Metro cache key stays the same between runs
rem      (running Metro under a different Node version = cold cache);
rem   3) starts "npm run metro:dev" (expo start --dev-client --lan).
rem
rem  Notes:
rem   - Do NOT use the ":clear" scripts for daily work - they wipe
rem     the whole Metro cache (first run after that is always slow).
rem   - First bundle after a cache clear takes minutes; the next
rem     runs should take seconds. If every run stays slow, check
rem     Defender exclusions for C:\appsprojects\phraseman and C:\Temp.
rem ============================================================
setlocal
title Phraseman Metro - clean start (LAN :8081)

set "PROJECT=C:\appsprojects\phraseman"
set "NODE_DIR=C:\Program Files\nodejs"
set "NPM_GLOBAL=C:\Users\badlo\AppData\Roaming\npm"

echo [1/4] Stopping old Metro/Expo processes on dev ports...
powershell -NoProfile -Command "$ports = (8081..8090) + (19000..19001); $killed = @{}; foreach ($p in $ports) { Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue | ForEach-Object { if (-not $killed.ContainsKey($_.OwningProcess)) { $killed[$_.OwningProcess] = $true; try { Stop-Process -Id $_.OwningProcess -Force -ErrorAction Stop; Write-Host ('   killed PID ' + $_.OwningProcess + ' (port ' + $p + ')') } catch {} } } }; if ($killed.Count -eq 0) { Write-Host '   no old Metro processes found' }"

echo [2/4] Pinning stable Node: %NODE_DIR%
set "PATH=%NODE_DIR%;%NPM_GLOBAL%;%PATH%"
node -v

echo [3/4] Checking Defender exclusions...
powershell -NoProfile -Command "try { $ex = (Get-MpPreference).ExclusionPath; if ($ex -and ($ex -contains 'C:\appsprojects\phraseman')) { Write-Host '   project folder is excluded - OK' } else { Write-Host '   WARNING: C:\appsprojects\phraseman is NOT in Defender exclusions. Metro will crawl slowly. Add it via Windows Security - Virus and threat protection - Exclusions (also add C:\Temp).' } } catch { Write-Host '   could not check Defender exclusions (skipped)' }"

echo [4/4] Starting Metro (dev-client, LAN, port 8081)...
echo.
cd /d "%PROJECT%"
npm run metro:dev

echo.
echo Metro exited. Press any key to close this window.
pause >nul
