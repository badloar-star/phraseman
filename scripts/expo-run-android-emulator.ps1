# Эмулятор: освободить порты, при желании adb reverse, затем expo run:android.
# Metro должен принимать 10.0.2.2 → в metro.config.js server.host = 0.0.0.0
$ErrorActionPreference = "Continue"
$adb = Join-Path $env:LOCALAPPDATA "Android\Sdk\platform-tools\adb.exe"
if (-not (Test-Path $adb) -and $env:ANDROID_HOME) {
  $adb = Join-Path $env:ANDROID_HOME "platform-tools\adb.exe"
}
if (-not (Test-Path $adb)) {
  Write-Host "adb.exe not found."
  exit 1
}

try {
  $ports = 8081, 8082, 8083, 8084, 8085, 8086, 8087, 8088
  & npx --yes kill-port @ports 2>$null | Out-Null
} catch { }

foreach ($ln in @(& $adb devices 2>&1 | ForEach-Object { "$_" })) {
  if ($ln -match '^(\S+)\s+device\s*$') {
    $s = $Matches[1]
    & $adb "-s", $s, "reverse", "tcp:8081", "tcp:8081" 2>$null | Out-Null
    Write-Host "adb reverse tcp:8081 -> $s (опционально, для localhost-сценариев)"
  }
}
Write-Host 'Два эмулятора и "Loading 10.0.2.2:8081"? Сначала оставьте Metro на порту 8081, затем: npm run android:dev-localhost'

$env:JAVA_HOME = if ($env:JAVA_HOME) { $env:JAVA_HOME } else { 'C:\Program Files\Android\Android Studio\jbr' }
$env:ANDROID_HOME = if ($env:ANDROID_HOME) { $env:ANDROID_HOME } else { Join-Path $env:LOCALAPPDATA "Android\Sdk" }

$projRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projRoot
Remove-Item Env:CI -ErrorAction SilentlyContinue
$env:EXPO_PUBLIC_DISABLE_EXPO_UPDATES = '1'

Write-Host "expo run:android --variant debug (Metro :8081; без подмены JS с Expo Update-сервера)"
& npx expo run:android --variant debug
