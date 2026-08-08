<#
  DEPRECATED for iPhone: use `npm run metro:iphone` (scripts/metro-iphone-lan.ps1) instead -
  it now has its own restart watchdog with the same hardening. This script stays in use
  only for metro:phone / Android (adb reverse) mode.

  protected-metro-phone.ps1 — «неубиваемый» Metro для РЕАЛЬНОГО телефона, порт 8085 по умолчанию.

  Поддерживает И iPhone, И Android:
   - iPhone (USB-провод + общий Wi-Fi/hotspot): подключение по LAN-адресу компьютера
     http://<IP>:8085 . adb/reverse для iOS НЕ нужны и не используются. Режим по умолчанию = --lan.
     iPhone и компьютер должны быть в ОДНОЙ Wi-Fi-сети (или iPhone раздаёт, комп подключён к нему).
   - Android (USB): добавь флаг -Android → поднимется --localhost + adb reverse tcp:8085 (как для эмулятора).

  Что делает (и почему Metro больше не «падает сам»):
   - watchdog-петля while($true): если Metro упал/закрылся — перезапускает его сам,
     бесконечно, пока ты сам не закроешь это окно (Ctrl+C / крестик).
   - НЕ убивает чужие порты — трогает только свой порт 8085.
   - большой heap (NODE_OPTIONS=12ГБ), чтобы Metro не падал по памяти.
   - печатает готовый URL для телефона при каждом старте.

  Запуск (для iPhone):
    npm run metro:phone                 # обычный (LAN, для iPhone)
    npm run metro:phone -- -Clear       # с чисткой кэша один раз
  Для Android по USB:
    npm run metro:phone -- -Android

  Остановка: закрыть это окно или Ctrl+C. Только так. Сам он не выключается.
#>
param(
  [int]$Port = 8085,
  [switch]$Clear,
  [switch]$Android,
  [int]$RestartDelaySeconds = 3,
  [int]$ReverseRefreshSeconds = 5,
  [switch]$Localhost
)

$ErrorActionPreference = "Continue"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$LogDir = Join-Path $ProjectRoot ".codex-tmp"
$LogFile = Join-Path $LogDir "protected-metro-phone.log"
$PidFile = Join-Path $LogDir "protected-metro-phone.pid"
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

function Write-DevLog {
  param([string]$Message)
  $stamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
  $line = "[$stamp] $Message"
  Write-Host $line
  Add-Content -LiteralPath $LogFile -Encoding UTF8 -Value $line
}

function Get-LanIp {
  $ip = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object { $_.IPAddress -notmatch '^127\.' -and $_.IPAddress -notmatch '^169\.254' -and $_.PrefixOrigin -ne 'WellKnown' } |
    Sort-Object { if ($_.InterfaceAlias -match 'Wi-Fi|Wireless|WLAN') { 0 } else { 1 } } |
    Select-Object -First 1 -ExpandProperty IPAddress
  return $ip
}

function Get-AdbPath {
  $candidates = @()
  if ($env:LOCALAPPDATA) { $candidates += (Join-Path $env:LOCALAPPDATA "Android\Sdk\platform-tools\adb.exe") }
  if ($env:ANDROID_HOME) { $candidates += (Join-Path $env:ANDROID_HOME "platform-tools\adb.exe") }
  $fromPath = Get-Command adb -ErrorAction SilentlyContinue
  if ($fromPath) { $candidates += $fromPath.Source }
  return ($candidates | Where-Object { $_ -and (Test-Path -LiteralPath $_) } | Select-Object -First 1)
}

Set-Location $ProjectRoot
Set-Content -LiteralPath $PidFile -Encoding ASCII -Value "$PID"

$lanIp = Get-LanIp
$useLan = -not $Localhost -and -not $Android   # iPhone => LAN; Android => localhost+reverse
if ($Android) { $useLan = $false }

Write-DevLog "Protected phone Metro watchdog. pid=$PID port=$Port mode=$(if ($Android) {'Android(localhost+reverse)'} elseif ($useLan) {'iPhone/LAN'} else {'localhost'}) (Ctrl+C / закрой окно чтобы остановить)"
if ($useLan -and $lanIp) {
  Write-DevLog "URL ДЛЯ iPhone (открой в dev-client / Camera-QR): exp://$lanIp`:$Port   (или http://$lanIp`:$Port)"
  Write-DevLog "iPhone и компьютер ДОЛЖНЫ быть в одной Wi-Fi сети. Сейчас IP компа: $lanIp"
} elseif ($useLan) {
  Write-DevLog "ВНИМАНИЕ: не найден LAN IP. Проверь Wi-Fi."
}

# ── Android-режим: фоновый страж adb reverse (для iPhone НЕ запускается) ──
$reverseJob = $null
if ($Android) {
  $adb = Get-AdbPath
  if ($adb) {
    try { & $adb start-server 2>$null | Out-Null } catch { }
    Write-DevLog "Android-режим: держу adb reverse tcp:$Port живым."
    $reverseJob = Start-Job -ArgumentList @($adb, $Port, $ReverseRefreshSeconds) -ScriptBlock {
      param($adbPath, $metroPort, $delaySeconds)
      while ($true) {
        foreach ($ln in @(& $adbPath devices 2>&1 | ForEach-Object { "$_" })) {
          if ($ln -match "^(\S+)\s+device\s*$") {
            $serial = $Matches[1]
            & $adbPath "-s", $serial, "reverse", "tcp:$metroPort", "tcp:$metroPort" 2>$null | Out-Null
          }
        }
        Start-Sleep -Seconds $delaySeconds
      }
    }
  } else {
    Write-DevLog "Android-режим запрошен, но adb.exe не найден."
  }
}

$restartCount = 0
try {
  while ($true) {
    $restartCount++

    Remove-Item Env:CI -ErrorAction SilentlyContinue
    $env:EXPO_PUBLIC_DISABLE_EXPO_UPDATES = "1"
    $env:NODE_OPTIONS = "--max-old-space-size=12288"

    $hostFlag = if ($useLan) { "--lan" } else { "--localhost" }
    $expoArgs = @("expo", "start", "--dev-client", $hostFlag, "--port", "$Port")
    if ($Clear -and $restartCount -eq 1) { $expoArgs += "--clear" }

    Write-DevLog "Старт Metro попытка #${restartCount}: npx $($expoArgs -join ' ')"

    try {
      & npx @expoArgs 2>&1 | ForEach-Object {
        $text = "$_"
        Write-Host $text
        Add-Content -LiteralPath $LogFile -Encoding UTF8 -Value $text
      }
      $exitCode = $LASTEXITCODE
    } catch {
      $exitCode = 1
      Write-DevLog "Metro упал с исключением: $($_.Exception.Message)"
    }

    Write-DevLog "Metro завершился (код $exitCode). Перезапуск через $RestartDelaySeconds сек… (закрой окно чтобы остановить навсегда)"
    Start-Sleep -Seconds $RestartDelaySeconds
  }
} finally {
  if ($reverseJob) {
    Stop-Job $reverseJob -ErrorAction SilentlyContinue | Out-Null
    Remove-Job $reverseJob -Force -ErrorAction SilentlyContinue
  }
  Write-DevLog "Watchdog остановлен пользователем."
}
