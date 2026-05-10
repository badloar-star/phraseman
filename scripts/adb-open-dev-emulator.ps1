param([string]$Serial = "")
# Эмулятор → Metro: http://127.0.0.1:8081 + adb reverse tcp:8081 (см. npm run metro:emu).
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

foreach ($emuSerial in ($serials | Select-Object -Unique)) {
  Write-Host "Serial: $emuSerial | URL http://127.0.0.1:8081 (adb reverse) | Metro: npm run metro:emu"

  & $adb "-s", $emuSerial, "reverse", "tcp:8081", "tcp:8081" | Out-Null

  $devHttp = "http://127.0.0.1:8081"
  $enc = [Uri]::EscapeDataString($devHttp)
  $pkg = "app.phraseman"
  $deep = "exp+phraseman://expo-development-client/?url=$enc"

  & $adb "-s", $emuSerial, "shell", "am", "start", "-a", "android.intent.action.VIEW", "-d", $deep, "-p", $pkg
}
