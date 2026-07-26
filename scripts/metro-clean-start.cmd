@echo off
rem ============================================================
rem  Phraseman Metro - clean start (LAN, port 8081)
rem
rem  What it does:
rem   1) prunes stale watchman roots (old agent worktrees) and keeps
rem      only this project watched - stale roots made watchman crawl
rem      ~18 copies of the repo, which crashed it and silently killed
rem      Fast Refresh (edits stopped being picked up);
rem   2) kills zombie Metro/Expo processes holding dev ports
rem      (same port list as "npm run kill:dev");
rem   3) pins PATH to the stable Node in "C:\Program Files\nodejs"
rem      so the Metro cache key stays the same between runs
rem      (running Metro under a different Node version = cold cache);
rem   4) starts "npm run metro:dev" (expo start --dev-client --lan)
rem      in a supervised loop: if Metro crashes or is killed, it comes
rem      back automatically after a short delay. Stop it with Ctrl+C
rem      twice, or just close this window.
rem
rem  Notes:
rem   - Do NOT use the ":clear" scripts for daily work - they wipe
rem     the whole Metro cache (first run after that is always slow).
rem   - Fast Refresh needs `.watchmanconfig` (kept in the repo root) so
rem     watchman skips node_modules/build/docs - without it watchman
rem     crawls ~595k files on Windows and dies.
rem   - First bundle after a cache clear takes minutes; the next
rem     runs should take seconds. If every run stays slow, check
rem     Defender exclusions for C:\appsprojects\phraseman and C:\Temp.
rem ============================================================
setlocal
title Phraseman Metro - clean start (LAN :8081)

set "PROJECT=C:\appsprojects\phraseman"
set "NODE_DIR=C:\Program Files\nodejs"
set "NPM_GLOBAL=C:\Users\badlo\AppData\Roaming\npm"
rem Seconds to wait before restarting Metro after a crash/exit.
set "RESTART_DELAY=3"

echo [1/5] Pruning stale watchman roots...
rem зачем: агентские worktree оставляют за собой watch-корни; watchman начинает
rem следить за десятками копий репозитория, захлёбывается и падает - а вместе с
rem ним умирает Fast Refresh. Оставляем под наблюдением только этот проект.
powershell -NoProfile -Command "$ErrorActionPreference='SilentlyContinue'; $keep='%PROJECT%'.Replace('\','/'); $out = & watchman watch-list 2>$null; if ($LASTEXITCODE -eq 0 -and $out) { $roots = ($out | ConvertFrom-Json).roots; $stale = @($roots | Where-Object { $_ -ne $keep }); foreach ($r in $stale) { & watchman watch-del $r *>$null; Write-Host ('   unwatched ' + $r) }; if ($stale.Count -eq 0) { Write-Host '   only this project is watched - OK' } } else { Write-Host '   watchman not running (it will start with Metro) - skipped' }"

echo [2/5] Stopping old Metro/Expo processes on dev ports...
powershell -NoProfile -Command "$ports = (8081..8090) + (19000..19001); $killed = @{}; foreach ($p in $ports) { Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue | ForEach-Object { if (-not $killed.ContainsKey($_.OwningProcess)) { $killed[$_.OwningProcess] = $true; try { Stop-Process -Id $_.OwningProcess -Force -ErrorAction Stop; Write-Host ('   killed PID ' + $_.OwningProcess + ' (port ' + $p + ')') } catch {} } } }; if ($killed.Count -eq 0) { Write-Host '   no old Metro processes found' }"

echo [3/5] Pinning stable Node: %NODE_DIR%
set "PATH=%NODE_DIR%;%NPM_GLOBAL%;%PATH%"
node -v

echo [4/5] Checking Defender exclusions...
powershell -NoProfile -Command "try { $ex = (Get-MpPreference).ExclusionPath; if ($ex -and ($ex -contains 'C:\appsprojects\phraseman')) { Write-Host '   project folder is excluded - OK' } else { Write-Host '   WARNING: C:\appsprojects\phraseman is NOT in Defender exclusions. Metro will crawl slowly. Add it via Windows Security - Virus and threat protection - Exclusions (also add C:\Temp).' } } catch { Write-Host '   could not check Defender exclusions (skipped)' }"

echo [5/5] Starting Metro (dev-client, LAN, port 8081) with auto-restart...
echo     Metro will be restarted automatically if it exits.
echo     To stop for good: press Ctrl+C twice, or close this window.
echo.
cd /d "%PROJECT%"

:metro_loop
echo ------------------------------------------------------------
echo  Metro starting at %TIME%
echo ------------------------------------------------------------
call npm run metro:dev

rem зачем: пользователь просил, чтобы сервер "никогда не закрывался" - любой выход
rem Metro (краш, обрыв, случайное закрытие) поднимает его заново, а не оставляет
rem мёртвое окно с "press any key".
echo.
echo [!] Metro exited at %TIME% (code %ERRORLEVEL%). Restarting in %RESTART_DELAY%s...
echo     Press Ctrl+C now to stop for good.
rem Free the dev ports before the next attempt, otherwise Expo hops to 8082+
rem and the phone/emulator keeps pointing at the dead 8081.
powershell -NoProfile -Command "$ports = (8081..8090) + (19000..19001); foreach ($p in $ports) { Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue | ForEach-Object { try { Stop-Process -Id $_.OwningProcess -Force -ErrorAction Stop } catch {} } }" >nul 2>&1
timeout /t %RESTART_DELAY% /nobreak >nul
goto metro_loop
