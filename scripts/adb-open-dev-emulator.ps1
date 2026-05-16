param(
  [string]$Serial = "",
  [int]$Port = 8081,
  [switch]$UseReverse,
  [switch]$NoForceStop
)
# Android Emulator -> Metro.
#
# This dev build currently has 127.0.0.1:8081 baked into Android Gradle by
# plugins/withAndroidDevServer127.js, so always refresh adb reverse and open
# localhost inside the emulator to point back to the host Metro server.
$ErrorActionPreference = "Stop"
$adb = Join-Path $env:LOCALAPPDATA "Android\Sdk\platform-tools\adb.exe"
if (-not (Test-Path $adb) -and $env:ANDROID_HOME) {
  $adb = Join-Path $env:ANDROID_HOME "platform-tools\adb.exe"
}
if (-not (Test-Path $adb)) {
  Write-Host "adb.exe not found."
  exit 1
}

$emuSerialTrim = $Serial.Trim()
$serials = [System.Collections.ArrayList]::new()
if ($emuSerialTrim) {
  [void]$serials.Add($emuSerialTrim)
}
else {
  foreach ($ln in @(& $adb devices 2>&1 | ForEach-Object { "$_" })) {
    if ($ln -match '^(emulator-\d+)\s+device\s*$') {
      [void]$serials.Add($Matches[1])
    }
  }
}
if ($serials.Count -lt 1) {
  Write-Host "No emulator in device state."
  exit 1
}

$hostUrl = "127.0.0.1"
$devHttp = "http://${hostUrl}:$Port"
$enc = [Uri]::EscapeDataString($devHttp)
$pkg = "app.phraseman"
$deep = "exp+phraseman://expo-development-client/?url=$enc"

foreach ($emuSerial in ($serials | Select-Object -Unique)) {
  $avd = ""
  try { $avd = ((& $adb -s $emuSerial shell getprop ro.boot.qemu.avd_name 2>$null) | Select-Object -First 1).Trim() } catch { }
  if (-not $avd) { $avd = "unknown-avd" }

  Write-Host "Serial: $emuSerial ($avd) | refreshing adb reverse tcp:$Port -> tcp:$Port"
  & $adb -s $emuSerial reverse "tcp:$Port" "tcp:$Port" | Out-Null

  Write-Host "Serial: $emuSerial ($avd) | opening $devHttp"
  if (-not $NoForceStop) {
    & $adb -s $emuSerial shell am force-stop $pkg | Out-Null
    Start-Sleep -Milliseconds 250
  }
  & $adb -s $emuSerial shell am start -a android.intent.action.VIEW -d $deep -p $pkg
}

exit 0
