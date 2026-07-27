# metro-emulator.ps1 — Metro для Android-эмулятора (порт 8081).
#
# зачем: metro-always-on.ps1 поднимает Metro для iPhone по Wi-Fi (порт 8085,
# LAN-IP). Эмулятору это не подходит: в сборку зашит адрес 127.0.0.1:8081
# (plugins/withAndroidDevServer127.js), потому что на Windows адрес 10.0.2.2
# даёт SocketTimeout и «Failed to download remote update». Нужен ровно
# порт 8081 + adb reverse + схема exp+phraseman://.
#
# Что делает:
#   1) освобождает порт 8081 (только свой Metro, чужие процессы не трогает);
#   2) поднимает Metro (--dev-client, порт 8081);
#   3) ждёт, пока Metro реально ответит;
#   4) на КАЖДОМ запущенном эмуляторе делает adb reverse и открывает приложение;
#   5) держит окно: Metro упал — перезапускается сам, адрес не меняется.

param(
  [int]$Port = 8081,
  [switch]$Clear,
  [string]$Serial = ""
)

$ErrorActionPreference = "Continue"
$projectRoot = "C:\appsprojects\phraseman"
$pkg = "app.phraseman"

# зачем: Invoke-WebRequest на этой машине уходит в системный прокси и висит по
# таймауту, хотя Metro уже отвечает. Голый TcpClient + HTTP-запрос надёжнее и
# не зависит от настроек прокси.
function Test-MetroAlive([int]$MetroPort) {
  try {
    $client = New-Object System.Net.Sockets.TcpClient
    $connect = $client.BeginConnect("127.0.0.1", $MetroPort, $null, $null)
    if (-not $connect.AsyncWaitHandle.WaitOne(1500)) { $client.Close(); return $false }
    $client.EndConnect($connect)
    $stream = $client.GetStream()
    $stream.ReadTimeout = 3000
    $req = [Text.Encoding]::ASCII.GetBytes("GET /status HTTP/1.1`r`nHost: 127.0.0.1`r`nConnection: close`r`n`r`n")
    $stream.Write($req, 0, $req.Length)
    $reader = New-Object IO.StreamReader($stream)
    $body = $reader.ReadToEnd()
    $client.Close()
    return ($body -match "packager-status:running")
  } catch { return $false }
}

function Say($text) { Write-Host "  $text" -ForegroundColor Cyan }
function Ok($text)  { Write-Host "  $text" -ForegroundColor Green }
function Warn($text){ Write-Host "  $text" -ForegroundColor Yellow }

Write-Host ""
Write-Host "==========================================" -ForegroundColor Magenta
Write-Host " Phraseman Metro — Android-эмулятор ($Port)" -ForegroundColor Magenta
Write-Host "==========================================" -ForegroundColor Magenta
Write-Host ""

Set-Location $projectRoot
$env:EXPO_NO_TELEMETRY = "1"
# зачем: Metro на этом проекте (4700+ модулей) падал с V8 heap OOM на дефолтных
# ~4 ГБ — экран получал «Could not load bundle». 8 ГБ снимают проблему.
$env:NODE_OPTIONS = "--max-old-space-size=8192"

# ── adb ─────────────────────────────────────────────────────────────────────
$adb = Join-Path $env:LOCALAPPDATA "Android\Sdk\platform-tools\adb.exe"
if (-not (Test-Path $adb) -and $env:ANDROID_HOME) {
  $adb = Join-Path $env:ANDROID_HOME "platform-tools\adb.exe"
}
if (-not (Test-Path $adb)) { Warn "adb.exe не найден — приложение придётся открыть вручную." ; $adb = $null }

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
      Warn "Порт $Port занят процессом $($proc.ProcessName) (PID $processId) — не трогаю."
    }
  } catch { }
}
Start-Sleep -Milliseconds 500

# ── 2. Запускаем Metro в отдельном окне ─────────────────────────────────────
$expoArgs = @("expo", "start", "--dev-client", "--port", "$Port")
if ($Clear) { $expoArgs += "--clear" }

Say ("Запускаю Metro: npx " + ($expoArgs -join " "))
$metro = Start-Process -FilePath "npx.cmd" -ArgumentList $expoArgs `
  -WorkingDirectory $projectRoot -PassThru -WindowStyle Minimized

# ── 3. Ждём, пока Metro ответит ─────────────────────────────────────────────
Say "Жду, пока Metro поднимется..."
$ready = $false
for ($i = 0; $i -lt 90; $i++) {
  Start-Sleep -Seconds 2
  try {
    if (Test-MetroAlive $Port) { $ready = $true; break }
  } catch { }
}
if (-not $ready) {
  Warn "Metro не ответил за 3 минуты. Смотри его окно — там текст ошибки."
  Write-Host ""
  Write-Host "Нажми любую клавишу, чтобы закрыть." -ForegroundColor Yellow
  $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
  exit 1
}
Ok "Metro работает: http://127.0.0.1:$Port"

# ── 4. Подключаем эмуляторы ─────────────────────────────────────────────────
if ($adb) {
  $serials = @()
  if ($Serial.Trim()) {
    $serials += $Serial.Trim()
  } else {
    foreach ($line in @(& $adb devices 2>&1 | ForEach-Object { "$_" })) {
      if ($line -match '^(emulator-\d+)\s+device\s*$') { $serials += $Matches[1] }
    }
  }

  # зачем: раньше скрипт просто ругался «нет эмулятора» и заканчивался — владелец
  # должен был вручную открывать Device Manager. Поднимаем сам и ждём загрузки.
  if ($serials.Count -lt 1) {
    $emulatorExe = Join-Path $env:LOCALAPPDATA "Android\Sdk\emulator\emulator.exe"
    if (Test-Path $emulatorExe) {
      $avds = @(& $emulatorExe -list-avds 2>$null | ForEach-Object { "$_".Trim() } | Where-Object { $_ })
      $pick = $avds | Where-Object { $_ -eq "phraseman_pixel8" } | Select-Object -First 1
      if (-not $pick) { $pick = $avds | Select-Object -First 1 }
      if ($pick) {
        Say "Эмулятор не запущен — поднимаю «$pick»..."
        Start-Process -FilePath $emulatorExe `
          -ArgumentList @("-avd", $pick, "-gpu", "host", "-no-boot-anim") -WindowStyle Normal | Out-Null
        for ($i = 0; $i -lt 90; $i++) {
          Start-Sleep -Seconds 2
          $booted = (& $adb shell getprop sys.boot_completed 2>$null | Select-Object -First 1)
          if ("$booted".Trim() -eq "1") { break }
        }
        foreach ($line in @(& $adb devices 2>&1 | ForEach-Object { "$_" })) {
          if ($line -match '^(emulator-\d+)\s+device\s*$') { $serials += $Matches[1] }
        }
        if ($serials.Count -ge 1) { Ok "Эмулятор загружен." }
      }
    }
  }
  if ($serials.Count -lt 1) {
    Warn "Ни один эмулятор не запущен. Запусти его и выполни:"
    Write-Host "    powershell -File scripts\adb-open-dev-emulator.ps1" -ForegroundColor Yellow
  }

  # зачем: адрес 127.0.0.1 внутри эмулятора смотрит на сам эмулятор, поэтому
  # без adb reverse Metro недостижим. 10.0.2.2 на Windows даёт SocketTimeout —
  # см. plugins/withAndroidDevServer127.js.
  $deep = "exp+phraseman://expo-development-client/?url=" +
          [Uri]::EscapeDataString("http://127.0.0.1:$Port")

  foreach ($emu in ($serials | Select-Object -Unique)) {
    Say "$emu — ставлю adb reverse tcp:$Port и открываю приложение..."
    & $adb -s $emu reverse "tcp:$Port" "tcp:$Port" | Out-Null
    & $adb -s $emu shell am force-stop $pkg | Out-Null
    Start-Sleep -Milliseconds 300
    & $adb -s $emu shell am start -a android.intent.action.VIEW -d $deep -p $pkg | Out-Null
    Ok "$emu — приложение запущено."
  }
}

Write-Host ""
Ok "Готово. Первая сборка бандла занимает ~40 секунд."
Write-Host ""
Write-Host "  Это окно следит за Metro: если он упадёт — подниму заново." -ForegroundColor DarkGray
Write-Host "  Закрыть — Ctrl+C или закрыть окно." -ForegroundColor DarkGray
Write-Host ""

# ── 5. Watchdog ─────────────────────────────────────────────────────────────
while ($true) {
  Start-Sleep -Seconds 10
  $alive = $false
  try {
    if (Test-MetroAlive $Port) { $alive = $true }
  } catch { }

  if (-not $alive) {
    Warn ("[" + (Get-Date -Format "HH:mm:ss") + "] Metro не отвечает — перезапускаю...")
    try { if ($metro -and -not $metro.HasExited) { Stop-Process -Id $metro.Id -Force -ErrorAction SilentlyContinue } } catch { }
    Start-Sleep -Seconds 2
    $metro = Start-Process -FilePath "npx.cmd" -ArgumentList $expoArgs `
      -WorkingDirectory $projectRoot -PassThru -WindowStyle Minimized
    for ($i = 0; $i -lt 60; $i++) {
      Start-Sleep -Seconds 2
      try {
        if (Test-MetroAlive $Port) { Ok "Metro снова работает."; break }
      } catch { }
    }
  }
}
