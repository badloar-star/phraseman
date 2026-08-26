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

function Set-ReactNativeDebugServerHost([string]$Serial, [int]$MetroPort) {
  $pkg = "app.phraseman"
  $prefsPath = "shared_prefs/app.phraseman_preferences.xml"
  $hostValue = "127.0.0.1:$MetroPort"
  $remoteTemp = "/data/local/tmp/phraseman-rn-devprefs-$($Serial -replace '[^A-Za-z0-9_.-]', '_').xml"
  $localTemp = Join-Path ([IO.Path]::GetTempPath()) "phraseman-rn-devprefs-$([Guid]::NewGuid().ToString('N')).xml"

  try {
    # React Native reads debug_http_host before Expo Dev Launcher handles the
    # deep link. Without this persisted value it falls back to 10.0.2.2 and the
    # large Metro response is corrupted on this Windows host. Stop the app so
    # SharedPreferences cannot overwrite the file while it is being updated.
    & $adb -s $Serial shell am force-stop $pkg | Out-Null
    $xmlText = (@(& $adb -s $Serial exec-out run-as $pkg cat $prefsPath 2>$null | ForEach-Object { "$_" }) -join "`n").Trim()
    if (-not $xmlText.StartsWith("<?xml")) {
      $xmlText = "<?xml version='1.0' encoding='utf-8' standalone='yes' ?><map />"
    }

    $doc = New-Object System.Xml.XmlDocument
    $doc.PreserveWhitespace = $true
    $doc.LoadXml($xmlText)
    $map = $doc.SelectSingleNode('/map')
    if (-not $map) { throw "Android preferences XML has no map root" }

    $node = $doc.SelectSingleNode("/map/string[@name='debug_http_host']")
    if (-not $node) {
      $node = $doc.CreateElement('string')
      $node.SetAttribute('name', 'debug_http_host')
      [void]$map.AppendChild($node)
    }
    $node.InnerText = $hostValue

    $settings = New-Object System.Xml.XmlWriterSettings
    $settings.Encoding = New-Object System.Text.UTF8Encoding($false)
    $settings.Indent = $false
    $writer = [System.Xml.XmlWriter]::Create($localTemp, $settings)
    try { $doc.Save($writer) } finally { $writer.Dispose() }

    & $adb -s $Serial push $localTemp $remoteTemp 2>$null | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "adb push failed" }
    & $adb -s $Serial shell run-as $pkg mkdir -p shared_prefs | Out-Null
    & $adb -s $Serial shell run-as $pkg cp $remoteTemp $prefsPath | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "run-as preferences copy failed" }

    $verified = (@(& $adb -s $Serial exec-out run-as $pkg cat $prefsPath 2>$null | ForEach-Object { "$_" }) -join "`n")
    if ($verified -notmatch ('<string name="debug_http_host">' + [regex]::Escape($hostValue) + '</string>')) {
      throw "debug_http_host verification failed"
    }
    Ok "$Serial — React Native dev-server закреплён на $hostValue."
    return $true
  } catch {
    Warn "$Serial — не удалось закрепить React Native dev-server: $($_.Exception.Message)"
    return $false
  } finally {
    Remove-Item -LiteralPath $localTemp -Force -ErrorAction SilentlyContinue
    & $adb -s $Serial shell rm -f $remoteTemp 2>$null | Out-Null
  }
}

function Get-ConnectedEmulatorSerials {
  $result = @()
  foreach ($line in @(& $adb devices 2>&1 | ForEach-Object { "$_" })) {
    if ($line -match '^(emulator-\d+)\s+device\s*$') { $result += $Matches[1] }
  }
  return @($result | Select-Object -Unique)
}

function Test-EmulatorReady([string]$Serial) {
  # sys.boot_completed alone flips too early after Quick Boot. The first app
  # launch used to happen while Android was still unlocking the user and
  # finishing Package Manager work, which sent Expo Dev Client to its error UI.
  $sysBoot = "$(& $adb -s $Serial shell getprop sys.boot_completed 2>$null | Select-Object -First 1)".Trim()
  $devBoot = "$(& $adb -s $Serial shell getprop dev.bootcomplete 2>$null | Select-Object -First 1)".Trim()
  $bootAnim = "$(& $adb -s $Serial shell getprop init.svc.bootanim 2>$null | Select-Object -First 1)".Trim()
  $provisioned = "$(& $adb -s $Serial shell settings get global device_provisioned 2>$null | Select-Object -First 1)".Trim()
  $setupComplete = "$(& $adb -s $Serial shell settings get secure user_setup_complete 2>$null | Select-Object -First 1)".Trim()
  $userState = @(& $adb -s $Serial shell dumpsys user 2>$null | ForEach-Object { "$_" }) -join "`n"
  $packagePath = "$(& $adb -s $Serial shell pm path app.phraseman 2>$null | Select-Object -First 1)".Trim()

  return (
    $sysBoot -eq "1" -and
    $devBoot -eq "1" -and
    $bootAnim -eq "stopped" -and
    $provisioned -eq "1" -and
    $setupComplete -eq "1" -and
    $userState -match 'State: RUNNING_UNLOCKED' -and
    $packagePath -match '^package:'
  )
}

function Wait-ForReadyEmulators([int]$TimeoutSeconds = 240) {
  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  $stableChecks = @{}

  while ((Get-Date) -lt $deadline) {
    $ready = @()
    foreach ($serial in @(Get-ConnectedEmulatorSerials)) {
      if (Test-EmulatorReady $serial) {
        $stableChecks[$serial] = 1 + [int]$stableChecks[$serial]
        # Require three consecutive complete checks. This is a condition-based
        # settle window, not a guessed fixed delay, and filters transient ADB
        # readiness during Quick Boot restore.
        if ($stableChecks[$serial] -ge 3) { $ready += $serial }
      } else {
        $stableChecks[$serial] = 0
      }
    }
    if ($ready.Count -gt 0) { return @($ready | Select-Object -Unique) }
    Start-Sleep -Seconds 2
  }

  return @()
}

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
$serials = @(Get-ConnectedEmulatorSerials)

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
    }
  }
}

# Всегда проверяем полную готовность — в том числе если adb уже успел показать
# `device` до запуска этого скрипта. Раньше этот путь пропускал ожидание целиком.
Say "Жду полной готовности Android и установленного Phraseman..."
$readySerials = Wait-ForReadyEmulators
$serials = @($readySerials)
if ($serials.Count -ge 1) {
  Ok "Android полностью готов."
} else {
  Warn "Android не сообщил полную готовность за 4 минуты. Приложение автоматически не открываю."
}

# ── 3. adb reverse на КАЖДЫЙ эмулятор ───────────────────────────────────────
# зачем (владелец: «два эмулятора не должны мешать друг другу»): reverse — это
# настройка КОНКРЕТНОГО устройства, а не глобальная. Один Metro спокойно кормит
# сколько угодно эмуляторов, но каждому нужен свой проброс порта; раньше его
# получал только первый, и второй показывал «Failed to download remote update».
# Эмуляторы живут на разных портах (5554, 5556, …) и друг друга не вытесняют.
$unique = @($serials | Select-Object -Unique)
foreach ($emu in $unique) {
  [void](Set-ReactNativeDebugServerHost $emu $Port)
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
Say "Запускаю Metro. Сначала соберу Android-бандл, затем открою приложение."
Write-Host ""
