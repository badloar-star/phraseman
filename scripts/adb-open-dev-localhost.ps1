param([string]$Serial = "")
# Перезапуск dev-client на эмуляторе с URL http://127.0.0.1:8081 (adb reverse).
# Metro на хосте — для нескольких AVD надёжнее `expo start --lan` (слушает 0.0.0.0); URL в клиенте остаётся 127.0.0.1.
$ErrorActionPreference = "Continue"
$adb = Join-Path $env:LOCALAPPDATA "Android\Sdk\platform-tools\adb.exe"
if (-not (Test-Path $adb)) {
  if ($env:ANDROID_HOME) { $adb = Join-Path $env:ANDROID_HOME "platform-tools\adb.exe" }
}
if (-not (Test-Path $adb)) {
  Write-Host "adb.exe not found."
  exit 1
}

$devices = @(& $adb devices 2>&1 | ForEach-Object { "$_" })
$emuSerialTrim = $Serial.Trim()
$serials = [System.Collections.ArrayList]::new()
if ($emuSerialTrim) {
  [void]$serials.Add($emuSerialTrim)
}
else {
  foreach ($ln in $devices) {
    $t = "$ln".Trim()
    if ($t -match '^(emulator-\d+)\s+device$') {
      [void]$serials.Add($Matches[1])
    }
  }
}
if ($serials.Count -lt 1) {
  Write-Host "No emulator in 'device' state. Start an AVD and retry."
  exit 1
}

$devHttp = "http://127.0.0.1:8081"
$enc = [Uri]::EscapeDataString($devHttp)
$pkg = "app.phraseman"
$deep = "exp+phraseman://expo-development-client/?url=$enc"

foreach ($emuSerial in ($serials | Select-Object -Unique)) {
  Write-Host "Serial: $emuSerial | bundle URL $devHttp (adb reverse tcp:8081)"
  & $adb "-s", $emuSerial, "reverse", "tcp:8081", "tcp:8081"
  try { & $adb "-s", $emuSerial, "reverse", "--list" } catch { }

  Write-Host "Opening dev-client on $emuSerial ..."
  & $adb "-s", $emuSerial, "shell", "am", "start", "-a", "android.intent.action.VIEW", "-d", $deep, "-p", $pkg
}
