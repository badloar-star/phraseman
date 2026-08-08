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
