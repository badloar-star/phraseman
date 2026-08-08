# Стартує вікно AVD із більш передбачуваним рендерингом GPU.
# Якщо емулятор «не показує вікно», чорний екран або в лозі Qt: UpdateLayeredWindowIndirect failed — спробуйте
# режим swiftshader_indirect замість апаратного GPU.
#
# Запуск:  .\scripts\start-android-emulator.ps1
#          .\scripts\start-android-emulator.ps1 -Avd Pixel_8_Pro -GpuMode host
#
param(
  [string]$Avd = "Pixel_8",
  [ValidateSet("swiftshader_indirect", "host", "angle_indirect")]
  [string]$GpuMode = "host",
  [int]$Port = 8081,
  [switch]$NoReverse
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

# зачем: без adb reverse эмулятор не видит Metro и приложение вечно висит на
# "Bundling NN%". Этот dev-билд имеет 127.0.0.1:8081 зашитый в Gradle
# (plugins/withAndroidDevServer127.js), поэтому localhost внутри эмулятора
# обязан быть проброшен на хост. Раньше скрипт только поднимал AVD, и reverse
# приходилось ставить вручную — забыл поставить = приложение уходит на
# 10.0.2.2 и обрывается на середине бандла (Connection reset).
if ($NoReverse) {
  Write-Host "Skipping adb reverse (-NoReverse)."
  return
}
if (-not (Test-Path $adb)) {
  Write-Host "adb.exe not found; set adb reverse tcp:$Port manually once the AVD boots."
  return
}

Write-Host "Waiting for emulator to finish booting (up to 180s)..."
$booted = $false
$serial = ""
$deadline = (Get-Date).AddSeconds(180)
while ((Get-Date) -lt $deadline) {
  foreach ($ln in @(& $adb devices 2>$null | ForEach-Object { "$_" })) {
    if ($ln -match '^(emulator-\d+)\s+device\s*$') {
      $candidate = $Matches[1]
      $bootFlag = ""
      try {
        $bootFlag = ((& $adb -s $candidate shell getprop sys.boot_completed 2>$null) | Select-Object -First 1).Trim()
      } catch { }
      if ($bootFlag -eq "1") {
        $serial = $candidate
        $booted = $true
        break
      }
    }
  }
  if ($booted) { break }
  Start-Sleep -Seconds 3
}

if (-not $booted) {
  Write-Host "Emulator did not report boot completion in time."
  Write-Host "Once it boots run: adb reverse tcp:$Port tcp:$Port"
  return
}

& $adb -s $serial reverse "tcp:$Port" "tcp:$Port" | Out-Null
if ($LASTEXITCODE -eq 0) {
  Write-Host "adb reverse tcp:$Port -> tcp:$Port OK ($serial)"
} else {
  Write-Host "adb reverse failed for $serial; run it manually: adb -s $serial reverse tcp:$Port tcp:$Port"
}
