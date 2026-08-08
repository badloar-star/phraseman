# metro-emulator-open.ps1 — ждёт Metro и открывает приложение на эмуляторе.
#
# зачем: Metro занимает основное окно (`call npx` в .bat), поэтому открыть
# приложение он уже не может — этот скрипт .bat запускает ФОНОМ. Он ждёт, пока
# Metro начнёт отвечать, и только тогда шлёт deep link.
#
# Схема ровно exp+phraseman:// (не phraseman://) и адрес 127.0.0.1 — так же,
# как в scripts/adb-open-dev-emulator.ps1: в сборку зашит 127.0.0.1:8081
# (plugins/withAndroidDevServer127.js), а 10.0.2.2 на Windows даёт SocketTimeout.

param([int]$Port = 8081)

$ErrorActionPreference = "Continue"
$pkg = "app.phraseman"

# зачем: Invoke-WebRequest на этой машине уходит в системный прокси и висит по
# таймауту, хотя Metro уже отвечает. Голый TcpClient надёжнее.
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

# /status сообщает только, что процесс Metro слушает порт. На холодном старте
# Android-бандл в этот момент ещё не собран, и слишком ранний deep link стабильно
# отправлял первый запуск Expo Dev Client на экран ошибки. Получаем manifest,
# извлекаем реальный launchAsset и дочитываем бандл до конца перед запуском app.
function Wait-MetroAndroidBundle([int]$MetroPort, [int]$TimeoutSeconds = 600) {
  $handler = $null
  $http = $null
  $manifestResponse = $null
  $bundleResponse = $null
  $bundleStream = $null

  try {
    Add-Type -AssemblyName System.Net.Http
    $handler = New-Object System.Net.Http.HttpClientHandler
    $handler.UseProxy = $false
    $http = New-Object System.Net.Http.HttpClient($handler)
    $http.Timeout = [TimeSpan]::FromSeconds($TimeoutSeconds)

    $manifestRequest = New-Object System.Net.Http.HttpRequestMessage(
      [System.Net.Http.HttpMethod]::Get,
      "http://127.0.0.1:$MetroPort/"
    )
    [void]$manifestRequest.Headers.TryAddWithoutValidation("expo-platform", "android")
    [void]$manifestRequest.Headers.TryAddWithoutValidation("accept", "application/expo+json")

    $manifestResponse = $http.SendAsync(
      $manifestRequest,
      [System.Net.Http.HttpCompletionOption]::ResponseContentRead
    ).GetAwaiter().GetResult()
    if (-not $manifestResponse.IsSuccessStatusCode) { return $false }

    $manifestText = $manifestResponse.Content.ReadAsStringAsync().GetAwaiter().GetResult()
    $manifest = $manifestText | ConvertFrom-Json
    $bundleUrl = "$($manifest.launchAsset.url)"
    if (-not $bundleUrl.StartsWith("http://127.0.0.1:$MetroPort/")) { return $false }

    $bundleResponse = $http.GetAsync(
      $bundleUrl,
      [System.Net.Http.HttpCompletionOption]::ResponseHeadersRead
    ).GetAwaiter().GetResult()
    if (-not $bundleResponse.IsSuccessStatusCode) { return $false }

    $bundleStream = $bundleResponse.Content.ReadAsStreamAsync().GetAwaiter().GetResult()
    $buffer = New-Object byte[] 65536
    [long]$totalBytes = 0
    while (($read = $bundleStream.Read($buffer, 0, $buffer.Length)) -gt 0) {
      $totalBytes += $read
    }
    return ($totalBytes -gt 0)
  } catch {
    return $false
  } finally {
    if ($bundleStream) { $bundleStream.Dispose() }
    if ($bundleResponse) { $bundleResponse.Dispose() }
    if ($manifestResponse) { $manifestResponse.Dispose() }
    if ($http) { $http.Dispose() }
    elseif ($handler) { $handler.Dispose() }
  }
}

$adb = Join-Path $env:LOCALAPPDATA "Android\Sdk\platform-tools\adb.exe"
if (-not (Test-Path $adb) -and $env:ANDROID_HOME) {
  $adb = Join-Path $env:ANDROID_HOME "platform-tools\adb.exe"
}
if (-not (Test-Path $adb)) { exit 0 }

# Ждём Metro до 5 минут (первая сборка проекта долгая).
$ready = $false
for ($i = 0; $i -lt 150; $i++) {
  Start-Sleep -Seconds 2
  if (Test-MetroAlive $Port) { $ready = $true; break }
}
if (-not $ready) { exit 0 }

Write-Host "  Metro запущен. Собираю первый Android-бандл перед открытием приложения..." -ForegroundColor Cyan
$bundleReady = Wait-MetroAndroidBundle $Port
if (-not $bundleReady) {
  Write-Host "  Android-бандл не собрался. Приложение автоматически не открываю, чтобы не показать ложную первую ошибку." -ForegroundColor Yellow
  exit 0
}
Write-Host "  Android-бандл готов. Открываю Phraseman." -ForegroundColor Green

$deep = "exp+phraseman://expo-development-client/?url=" +
        [Uri]::EscapeDataString("http://127.0.0.1:$Port")

foreach ($line in @(& $adb devices 2>&1 | ForEach-Object { "$_" })) {
  if ($line -match '^(emulator-\d+)\s+device\s*$') {
    $emu = $Matches[1]
    # reverse мог слететь, пока эмулятор переподключался — ставим заново.
    & $adb -s $emu reverse "tcp:$Port" "tcp:$Port" | Out-Null
    & $adb -s $emu shell am force-stop $pkg | Out-Null
    Start-Sleep -Milliseconds 400
    & $adb -s $emu shell am start -a android.intent.action.VIEW -d $deep -p $pkg | Out-Null
  }
}
