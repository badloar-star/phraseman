param([string]$Serial = "")
# Opens dev-client with http://10.0.2.2:8081 (emulator -> host). Use: npm run metro:dev (Metro --lan).
$ErrorActionPreference = "Stop"
$adb = Join-Path $env:LOCALAPPDATA "Android\Sdk\platform-tools\adb.exe"
if (-not (Test-Path $adb) -and $env:ANDROID_HOME) {
  $adb = Join-Path $env:ANDROID_HOME "platform-tools\adb.exe"
}
if (-not (Test-Path $adb)) {
  Write-Host "adb.exe not found."
  exit 1
}

$emuSerial = $Serial.Trim()
if (-not $emuSerial) {
  foreach ($ln in @(& $adb devices 2>&1 | ForEach-Object { "$_" })) {
    if ($ln -match '^(emulator-\d+)\s+device\s*$') {
      $emuSerial = $Matches[1]
      break
    }
  }
}
if (-not $emuSerial) {
  Write-Host "No emulator in device state."
  exit 1
}

Write-Host "Serial: $emuSerial | URL http://10.0.2.2:8081 | Metro: npm run metro:dev"

$devHttp = "http://10.0.2.2:8081"
$enc = [Uri]::EscapeDataString($devHttp)
$pkg = "app.phraseman"
$deep = "exp+phraseman://expo-development-client/?url=$enc"

& $adb "-s", $emuSerial, "shell", "am", "start", "-a", "android.intent.action.VIEW", "-d", $deep, "-p", $pkg
