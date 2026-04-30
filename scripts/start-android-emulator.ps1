# Стартує вікно AVD із більш передбачуваним рендерингом GPU.
# Якщо емулятор «не показує вікно», чорний екран або в лозі Qt: UpdateLayeredWindowIndirect failed — спробуйте
# режим swiftshader_indirect (за замовчуванням) замість апаратного GPU.
#
# Запуск:  .\scripts\start-android-emulator.ps1
#          .\scripts\start-android-emulator.ps1 -Avd Pixel_8_Pro -GpuMode host
#
param(
  [string]$Avd = "Pixel_8",
  [ValidateSet("swiftshader_indirect", "host", "angle_indirect")]
  [string]$GpuMode = "swiftshader_indirect"
)

$ErrorActionPreference = "Stop"
$sdk = Join-Path $env:LOCALAPPDATA "Android\Sdk"
$emuExe = Join-Path $sdk "emulator\emulator.exe"
if (-not (Test-Path $emuExe)) {
  if ($env:ANDROID_HOME -and (Test-Path (Join-Path $env:ANDROID_HOME "emulator\emulator.exe"))) {
    $sdk = $env:ANDROID_HOME
    $emuExe = Join-Path $sdk "emulator\emulator.exe"
  } else {
    Write-Host "emulator.exe not found under LOCALAPPDATA\Android\Sdk or ANDROID_HOME."
    exit 1
  }
}

$adb = Join-Path $sdk "platform-tools\adb.exe"

$already = @()
if (Test-Path $adb) {
  $already = (@(& $adb devices) | Where-Object { $_ -match "emulator-\d+\tdevice$" })
}
if ($already.Count -gt 0) {
  Write-Host "Emulator already connected (adb devices shows device). Close old AVD window or restart adb if you do not see it."
}

$argsList = @(
  "-avd", $Avd,
  "-gpu", $GpuMode,
  "-no-snapshot-load"
)

Write-Host "Starting: $Avd, GPU=$GpuMode"
Start-Process -FilePath $emuExe -ArgumentList $argsList -WindowStyle Normal
