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
      # зачем (владелец 2026-07-27: «максимум ОЗУ и чтобы не лагало»):
      #   -gpu host        — рисует видеокарта хоста, а не процессор (главный
      #                      источник лагов: без него Android рендерит софтварно);
      #   -memory 8192     — 8 ГБ. На машине 31 ГБ, но свободно ~6, и ставить 16
      #                      нельзя: Windows уйдёт в своп и станет МЕДЛЕННЕЕ;
      #   -cores 6         — из 24 ядер. Больше не даёт прироста, но отнимает CPU
      #                      у Metro, который собирает бандл параллельно;
      #   -no-boot-anim    — минус несколько секунд загрузки;
      #   -netdelay/-netspeed none/full — сеть без искусственных задержек.
      # зачем 2026-07-27: флаг -no-audio УБРАН. Он экономил копейки тактов, но
      # полностью глушил звук эмулятора — аудио-режимы турнира («Послушай и
      # собери фразу») стали непроходимыми: владелец не слышал ничего.
      Start-Process -FilePath $emulatorExe -ArgumentList @(
        "-avd", $pick,
        "-gpu", "host",
        "-memory", "8192",
        "-cores", "6",
        "-no-boot-anim",
        "-netdelay", "none",
        "-netspeed", "full"
      ) | Out-Null
      # зачем: `adb shell getprop` БЕЗ -s падает с «more than one device», как
      # только запущено два эмулятора — цикл ждал бы впустую. Опрашиваем каждый
      # серийник поимённо и ждём, пока хоть один догрузится.
      for ($i = 0; $i -lt 120; $i++) {
        Start-Sleep -Seconds 2
        $found = @()
        foreach ($line in @(& $adb devices 2>&1 | ForEach-Object { "$_" })) {
          if ($line -match '^(emulator-\d+)\s+device\s*$') { $found += $Matches[1] }
        }
        $ready = $false
        foreach ($cand in $found) {
          $booted = (& $adb -s $cand shell getprop sys.boot_completed 2>$null | Select-Object -First 1)
          if ("$booted".Trim() -eq "1") { $ready = $true }
        }
        if ($ready) { break }
      }
      $serials = @()
      foreach ($line in @(& $adb devices 2>&1 | ForEach-Object { "$_" })) {
        if ($line -match '^(emulator-\d+)\s+device\s*$') { $serials += $Matches[1] }
      }
      if ($serials.Count -ge 1) { Ok "Эмулятор загружен." } else { Warn "Эмулятор не поднялся." }
    }
  }
}

# ── 3. adb reverse на КАЖДЫЙ эмулятор ───────────────────────────────────────
# зачем (владелец: «два эмулятора не должны мешать друг другу»): reverse — это
# настройка КОНКРЕТНОГО устройства, а не глобальная. Один Metro спокойно кормит
# сколько угодно эмуляторов, но каждому нужен свой проброс порта; раньше его
# получал только первый, и второй показывал «Failed to download remote update».
# Эмуляторы живут на разных портах (5554, 5556, …) и друг друга не вытесняют.
$unique = @($serials | Select-Object -Unique)
foreach ($emu in $unique) {
  & $adb -s $emu reverse "tcp:$Port" "tcp:$Port" | Out-Null
  Ok "$emu — adb reverse tcp:$Port готов."
}
if ($unique.Count -gt 1) {
  Say "Эмуляторов в работе: $($unique.Count). Metro один на всех, приложение откроется на каждом."
}

if ($serials.Count -lt 1) {
  Warn "Эмулятор не найден. Запусти его и выполни: scripts\adb-open-dev-emulator.ps1"
}

Write-Host ""
Say "Запускаю Metro. Приложение откроется само через ~20 секунд."
Write-Host ""
