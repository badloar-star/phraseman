param([string]$Serial = "")
# Перезапуск dev-client на эмуляторе с URL http://127.0.0.1:8081 (adb reverse).
# LAN-IP с хоста на эмуляторе часто даёт timeout.
$ErrorActionPreference = "Stop"
$adb = Join-Path $env:LOCALAPPDATA "Android\Sdk\platform-tools\adb.exe"
if (-not (Test-Path $adb)) {
  if ($env:ANDROID_HOME) { $adb = Join-Path $env:ANDROID_HOME "platform-tools\adb.exe" }
}
if (-not (Test-Path $adb)) {
  Write-Host "adb.exe not found."
  exit 1
}

$devices = @(& $adb devices 2>&1 | ForEach-Object { "$_" })
$emuSerial = $Serial.Trim()
if (-not $emuSerial) {
  foreach ($ln in $devices) {
    if ($ln -match '^(emulator-\d+)\s+device\s*$') {
      $emuSerial = $Matches[1]
      break
    }
  }
}
if (-not $emuSerial) {
  Write-Host "No emulator in 'device' state. Start an AVD and retry."
  exit 1
}

Write-Host "Serial: $emuSerial"
& $adb "-s", $emuSerial, "reverse", "tcp:8081", "tcp:8081"
& $adb "-s", $emuSerial, "reverse", "--list"

$devHttp = "http://127.0.0.1:8081"
$enc = [Uri]::EscapeDataString($devHttp)
$pkg = "app.phraseman"
$deep = "exp+phraseman://expo-development-client/?url=$enc"

Write-Host "Opening dev-client bundle URL: $devHttp"
& $adb "-s", $emuSerial, "shell", "am", "start", "-a", "android.intent.action.VIEW", "-d", $deep, "-p", $pkg
