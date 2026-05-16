# Install latest debug APK on all connected adb devices/emulators.
# Useful with multiple emulators: expo run:android can install on only one
# device, while this copies the already built app-debug.apk to every adb device.
# Optional: -Build -> run gradlew assembleDebug first.
# Optional: -OpenDev -> open dev-client on all emulators via 10.0.2.2.
param(
  [switch] $Build,
  [switch] $OpenDev
)

$ErrorActionPreference = "Stop"
$adb = Join-Path $env:LOCALAPPDATA "Android\Sdk\platform-tools\adb.exe"
if (-not (Test-Path $adb) -and $env:ANDROID_HOME) {
  $adb = Join-Path $env:ANDROID_HOME "platform-tools\adb.exe"
}
if (-not (Test-Path $adb)) {
  Write-Error "adb.exe not found"
}

$projRoot = Split-Path -Parent $PSScriptRoot
$apk = Join-Path $projRoot "android\app\build\outputs\apk\debug\app-debug.apk"

if ($Build -or -not (Test-Path $apk)) {
  $env:JAVA_HOME = if ($env:JAVA_HOME) { $env:JAVA_HOME } else { 'C:\Program Files\Android\Android Studio\jbr' }
  $androidDir = Join-Path $projRoot "android"
  Push-Location $androidDir
  try {
    Write-Host "Building assembleDebug..."
    & .\gradlew.bat assembleDebug --no-daemon
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  } finally {
    Pop-Location
  }
}

if (-not (Test-Path $apk)) {
  Write-Error "APK not found: $apk"
}

$serials = @()
foreach ($ln in @(& $adb devices 2>&1 | ForEach-Object { "$_" })) {
  if ($ln -match '^(\S+)\s+device\s*$') {
    $serials += $Matches[1]
  }
}

if ($serials.Count -eq 0) {
  Write-Host "No devices (adb devices empty). Start emulators or connect phones, then run again."
  exit 2
}

foreach ($s in $serials) {
  Write-Host "Installing on $s ..."
  & $adb "-s", $s, "install", "-r", $apk
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

  # Optional fallback for explicit localhost/reverse workflows.
  & $adb "-s", $s, "reverse", "tcp:8081", "tcp:8081" 2>$null | Out-Null
  Write-Host "adb -s $s reverse tcp:8081 (optional fallback)"
}

Write-Host "OK: $($serials.Count) device(s). Start Metro: npm run metro:emu"

if ($OpenDev) {
  $openPs1 = Join-Path $PSScriptRoot "adb-open-dev-all-emulators.ps1"
  Write-Host "Opening dev-client (10.0.2.2 URL) on all emulators ..."
  & $openPs1
}
