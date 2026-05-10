# Сборка + установка dev APK без запуска Metro (Metro уже должен быть в другом терминале, например npm run bundler).
# Не вызывает kill-port — чтобы не оборвать работающий на :8081 бандлер.
$ErrorActionPreference = "Continue"
$adb = Join-Path $env:LOCALAPPDATA "Android\Sdk\platform-tools\adb.exe"
if (-not (Test-Path $adb) -and $env:ANDROID_HOME) {
  $adb = Join-Path $env:ANDROID_HOME "platform-tools\adb.exe"
}

if ((Test-Path $adb)) {
  foreach ($ln in @(& $adb devices 2>&1 | ForEach-Object { "$_" })) {
    if ($ln -match '^(\S+)\s+device\s*$') {
      $s = $Matches[1]
      & $adb "-s", $s, "reverse", "tcp:8081", "tcp:8081" 2>$null | Out-Null
      Write-Host "adb reverse tcp:8081 -> $s"
    }
  }
} else {
  Write-Host "adb.exe not found, skip reverse"
}

$env:JAVA_HOME = if ($env:JAVA_HOME) { $env:JAVA_HOME } else { 'C:\Program Files\Android\Android Studio\jbr' }
$env:ANDROID_HOME = if ($env:ANDROID_HOME) { $env:ANDROID_HOME } else { Join-Path $env:LOCALAPPDATA "Android\Sdk" }

$projRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projRoot
Remove-Item Env:CI -ErrorAction SilentlyContinue

Write-Host "expo run:android --no-bundler (Metro в другом окне на :8081)"
& npx expo run:android --no-bundler
