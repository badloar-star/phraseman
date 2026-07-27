# metro-emulator-prepare.ps1 — подготовка эмулятора ПЕРЕД запуском Metro.
#
# зачем: Metro должен работать в ОСНОВНОМ окне (как в START_METRO.bat через
# `call npx`) — запуск его отдельным процессом (Start-Process npx.cmd) на этой
# машине молча умирает и порт остаётся пустым. Поэтому всё, что нужно сделать
# вокруг Metro, вынесено сюда и выполняется ДО него:
#   1) освобождает порт 8081 (чужие процессы не трогает);
#   2) поднимает эмулятор, если он закрыт, и ждёт загрузки Android;
#   3) ставит adb reverse tcp:8081 (в сборку зашит 127.0.0.1:8081 —
#      plugins/withAndroidDevServer127.js; адрес 10.0.2.2 на Windows даёт
#      SocketTimeout и «Failed to download remote update»).
#
# Приложение открывается ПОСЛЕ старта Metro — этим занимается
# metro-emulator-open.ps1, который .bat запускает фоном.

param([int]$Port = 8081)

$ErrorActionPreference = "Continue"

function Say($text)  { Write-Host "  $text" -ForegroundColor Cyan }
function Ok($text)   { Write-Host "  $text" -ForegroundColor Green }
function Warn($text) { Write-Host "  $text" -ForegroundColor Yellow }

Write-Host ""
Write-Host "==========================================" -ForegroundColor Magenta
Write-Host " Phraseman Metro - Android-эмулятор ($Port)" -ForegroundColor Magenta
Write-Host "==========================================" -ForegroundColor Magenta
Write-Host ""

# ── adb ─────────────────────────────────────────────────────────────────────
$adb = Join-Path $env:LOCALAPPDATA "Android\Sdk\platform-tools\adb.exe"
if (-not (Test-Path $adb) -and $env:ANDROID_HOME) {
  $adb = Join-Path $env:ANDROID_HOME "platform-tools\adb.exe"
}
if (-not (Test-Path $adb)) {
  Warn "adb.exe не найден — эмулятор придётся подключить вручную."
  exit 0
}

# ── 1. Освобождаем порт ─────────────────────────────────────────────────────
Say "Освобождаю порт $Port (чужие процессы не трогаю)..."
$owners = (Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue).OwningProcess |
  Sort-Object -Unique
foreach ($processId in $owners) {
  try {
    $proc = Get-Process -Id $processId -ErrorAction Stop
    if ($proc.ProcessName -match 'node|expo') {
      Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
      Ok "Остановил старый Metro (PID $processId)."
    } else {
      Warn "Порт занят процессом $($proc.ProcessName) (PID $processId) — не трогаю."
    }
  } catch { }
}

# ── 2. Эмулятор ─────────────────────────────────────────────────────────────
$serials = @()
foreach ($line in @(& $adb devices 2>&1 | ForEach-Object { "$_" })) {
  if ($line -match '^(emulator-\d+)\s+device\s*$') { $serials += $Matches[1] }
}

if ($serials.Count -lt 1) {
  $emulatorExe = Join-Path $env:LOCALAPPDATA "Android\Sdk\emulator\emulator.exe"
  if (Test-Path $emulatorExe) {
    $avds = @(& $emulatorExe -list-avds 2>$null | ForEach-Object { "$_".Trim() } | Where-Object { $_ })
    $pick = $avds | Where-Object { $_ -eq "phraseman_pixel8" } | Select-Object -First 1
    if (-not $pick) { $pick = $avds | Select-Object -First 1 }
    if ($pick) {
      Say "Эмулятор не запущен — поднимаю «$pick» (это ~1 минута)..."
      Start-Process -FilePath $emulatorExe `
        -ArgumentList @("-avd", $pick, "-gpu", "host", "-no-boot-anim") | Out-Null
      for ($i = 0; $i -lt 120; $i++) {
        Start-Sleep -Seconds 2
        $booted = (& $adb shell getprop sys.boot_completed 2>$null | Select-Object -First 1)
        if ("$booted".Trim() -eq "1") { break }
      }
      $serials = @()
      foreach ($line in @(& $adb devices 2>&1 | ForEach-Object { "$_" })) {
        if ($line -match '^(emulator-\d+)\s+device\s*$') { $serials += $Matches[1] }
      }
      if ($serials.Count -ge 1) { Ok "Эмулятор загружен." } else { Warn "Эмулятор не поднялся." }
    }
  }
}

# ── 3. adb reverse ──────────────────────────────────────────────────────────
foreach ($emu in ($serials | Select-Object -Unique)) {
  & $adb -s $emu reverse "tcp:$Port" "tcp:$Port" | Out-Null
  Ok "$emu — adb reverse tcp:$Port готов."
}

if ($serials.Count -lt 1) {
  Warn "Эмулятор не найден. Запусти его и выполни: scripts\adb-open-dev-emulator.ps1"
}

Write-Host ""
Say "Запускаю Metro. Приложение откроется само через ~20 секунд."
Write-Host ""
