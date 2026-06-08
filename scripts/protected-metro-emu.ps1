param(
  [int]$Port = 8081,
  [switch]$Clear,
  [switch]$Fast,
  [switch]$Headless,
  [string]$Avd = "",
  [string]$Gpu = "",
  [int]$RestartDelaySeconds = 4,
  [int]$ReverseRefreshSeconds = 8,
  [switch]$NoEmulatorLaunch,
  [switch]$NoOpenDevClient,
  [switch]$NoKillExisting
)

$ErrorActionPreference = "Continue"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$LogDir = Join-Path $ProjectRoot ".codex-tmp"
$LogFile = Join-Path $LogDir "protected-metro-emu.log"
$PidFile = Join-Path $LogDir "protected-metro-emu.pid"
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

function Write-DevLog {
  param([string]$Message)
  $stamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
  $line = "[$stamp] $Message"
  Write-Host $line
  Add-Content -LiteralPath $LogFile -Encoding UTF8 -Value $line
}

function Get-AdbPath {
  $candidates = @()
  if ($env:LOCALAPPDATA) { $candidates += (Join-Path $env:LOCALAPPDATA "Android\Sdk\platform-tools\adb.exe") }
  if ($env:ANDROID_HOME) { $candidates += (Join-Path $env:ANDROID_HOME "platform-tools\adb.exe") }
  $fromPath = Get-Command adb -ErrorAction SilentlyContinue
  if ($fromPath) { $candidates += $fromPath.Source }
  return ($candidates | Where-Object { $_ -and (Test-Path -LiteralPath $_) } | Select-Object -First 1)
}

function Get-EmulatorPath {
  param([string]$AdbPath)
  $candidates = @()
  if ($AdbPath) {
    $sdkRoot = Split-Path (Split-Path $AdbPath)
    $candidates += (Join-Path $sdkRoot "emulator\emulator.exe")
  }
  if ($env:ANDROID_HOME) { $candidates += (Join-Path $env:ANDROID_HOME "emulator\emulator.exe") }
  return ($candidates | Where-Object { $_ -and (Test-Path -LiteralPath $_) } | Select-Object -First 1)
}

function Get-DeviceSerials {
  param([string]$AdbPath)
  $serials = @()
  if (-not $AdbPath) { return $serials }
  foreach ($ln in @(& $AdbPath devices 2>&1 | ForEach-Object { "$_" })) {
    if ($ln -match "^(\S+)\s+device\s*$") { $serials += $Matches[1] }
  }
  return @($serials | Select-Object -Unique)
}

function Refresh-AdbReverse {
  param([string]$AdbPath, [int]$MetroPort)
  if (-not $AdbPath) { return }
  foreach ($serial in (Get-DeviceSerials -AdbPath $AdbPath)) {
    try {
      & $AdbPath "-s", $serial, "reverse", "tcp:$MetroPort", "tcp:$MetroPort" 2>$null | Out-Null
    } catch { }
  }
}

function Start-EmulatorIfNeeded {
  param([string]$AdbPath)
  if ($NoEmulatorLaunch -or -not $AdbPath) { return }
  if ((Get-DeviceSerials -AdbPath $AdbPath).Count -gt 0) { return }

  $emuExe = Get-EmulatorPath -AdbPath $AdbPath
  if (-not $emuExe) {
    Write-DevLog "emulator.exe not found; Metro protection will still run."
    return
  }

  $availableAvds = @(& $emuExe -list-avds 2>$null | ForEach-Object { "$_".Trim() } | Where-Object { $_ })
  $preferredAvds = if ($Fast) { @("Small_Phone", "Pixel_8", "Pixel_8_Pro", "Pixel_Fold") } else { @("Pixel_Fold", "Pixel_8_Pro", "Small_Phone", "Pixel_8") }
  $picked = ($preferredAvds | Where-Object { $availableAvds -contains $_ } | Select-Object -First 1)
  if ($Avd.Trim()) { $picked = $Avd.Trim() }
  if (-not $picked) { $picked = $availableAvds | Select-Object -First 1 }
  if (-not $picked) {
    Write-DevLog "No Android AVD found; Metro protection will still run."
    return
  }

  $gpuMode = if ($Gpu.Trim()) { $Gpu.Trim() } elseif ($Fast) { "host" } else { "swiftshader_indirect" }
  $emuArgs = @("-avd", $picked, "-gpu", $gpuMode, "-no-snapshot-load", "-no-boot-anim", "-no-audio")
  if ($Headless) { $emuArgs += "-no-window" }
  $windowStyle = if ($Headless) { "Hidden" } else { "Normal" }
  Write-DevLog "Starting emulator $picked."
  Start-Process -FilePath $emuExe -ArgumentList $emuArgs -WindowStyle $windowStyle | Out-Null

  for ($i = 0; $i -lt 180; $i++) {
    if ((Get-DeviceSerials -AdbPath $AdbPath).Count -gt 0) {
      Write-DevLog "Android device is online."
      return
    }
    Start-Sleep -Seconds 1
  }
  Write-DevLog "Emulator was launched, but adb device is not online yet."
}

function Open-DevClient {
  param([string]$AdbPath, [int]$MetroPort)
  if ($NoOpenDevClient -or -not $AdbPath) { return }

  $ready = $false
  for ($i = 0; $i -lt 180; $i++) {
    try {
      $tcp = Test-NetConnection -ComputerName 127.0.0.1 -Port $MetroPort -WarningAction SilentlyContinue -ErrorAction SilentlyContinue
      if ($tcp.TcpTestSucceeded) {
        $ready = $true
        break
      }
    } catch { }
    Start-Sleep -Seconds 1
  }
  if (-not $ready) { return }

  $devHttp = "http://127.0.0.1:$MetroPort"
  $enc = [Uri]::EscapeDataString($devHttp)
  $pkg = "app.phraseman"
  $deepLinks = @(
    "phraseman://expo-development-client/?url=$enc",
    "exp+phraseman://expo-development-client/?url=$enc"
  )

  foreach ($serial in (Get-DeviceSerials -AdbPath $AdbPath)) {
    Refresh-AdbReverse -AdbPath $AdbPath -MetroPort $MetroPort
    foreach ($deep in $deepLinks) {
      try {
        & $AdbPath "-s", $serial, "shell", "am", "start", "-a", "android.intent.action.VIEW", "-d", $deep, "-p", $pkg 2>&1 | Out-Null
        Start-Sleep -Milliseconds 350
      } catch { }
    }
    Write-DevLog "Opened dev client on $serial -> $devHttp."
  }
}

Set-Location $ProjectRoot
Set-Content -LiteralPath $PidFile -Encoding ASCII -Value "$PID"
Write-DevLog "Protected Metro watchdog started. pid=$PID port=$Port"

$adb = Get-AdbPath
if ($adb) {
  Write-DevLog "adb: $adb"
  try { & $adb start-server 2>$null | Out-Null } catch { }
} else {
  Write-DevLog "adb.exe not found; server protection continues without emulator linking."
}

Start-EmulatorIfNeeded -AdbPath $adb
if (-not $NoKillExisting) {
  try { & npx --yes kill-port $Port 19000 19001 2>$null | Out-Null } catch { }
}

$restartCount = 0
while ($true) {
  $restartCount++
  Refresh-AdbReverse -AdbPath $adb -MetroPort $Port

  Remove-Item Env:CI -ErrorAction SilentlyContinue
  $env:EXPO_PUBLIC_DISABLE_EXPO_UPDATES = "1"
  $env:NODE_OPTIONS = "--max-old-space-size=12288"

  $expoArgs = if ($Fast) {
    @("expo", "start", "--dev-client", "--localhost", "--port", "$Port", "--no-dev", "--minify")
  } else {
    @("expo", "start", "--dev-client", "--lan", "--port", "$Port")
  }
  if ($Clear -and $restartCount -eq 1) { $expoArgs += "--clear" }

  Write-DevLog "Starting Metro attempt #${restartCount}: npx $($expoArgs -join ' ')"
  $reverseJob = Start-Job -ArgumentList @($adb, $Port, $ReverseRefreshSeconds) -ScriptBlock {
    param($adbPath, $metroPort, $delaySeconds)
    if (-not $adbPath) { return }
    while ($true) {
      foreach ($ln in @(& $adbPath devices 2>&1 | ForEach-Object { "$_" })) {
        if ($ln -match "^(\S+)\s+device\s*$") {
          $serial = $Matches[1]
          & $adbPath "-s", $serial, "reverse", "tcp:$metroPort", "tcp:$metroPort" 2>$null | Out-Null
        }
      }
      Start-Sleep -Seconds $delaySeconds
    }
  }

  $clientJob = Start-Job -ArgumentList @($adb, $Port, $NoOpenDevClient.IsPresent) -ScriptBlock {
    param($adbPath, $metroPort, $skipOpen)
    if ($skipOpen -or -not $adbPath) { return }
    Start-Sleep -Seconds 2
    $ready = $false
    for ($i = 0; $i -lt 180; $i++) {
      try {
        $tcp = Test-NetConnection -ComputerName 127.0.0.1 -Port $metroPort -WarningAction SilentlyContinue -ErrorAction SilentlyContinue
        if ($tcp.TcpTestSucceeded) {
          $ready = $true
          break
        }
      } catch { }
      Start-Sleep -Seconds 1
    }
    if (-not $ready) { return }

    $devHttp = "http://127.0.0.1:$metroPort"
    $enc = [Uri]::EscapeDataString($devHttp)
    $pkg = "app.phraseman"
    $deepLinks = @(
      "phraseman://expo-development-client/?url=$enc",
      "exp+phraseman://expo-development-client/?url=$enc"
    )
    $serials = @()
    foreach ($ln in @(& $adbPath devices 2>&1 | ForEach-Object { "$_" })) {
      if ($ln -match "^(\S+)\s+device\s*$") { $serials += $Matches[1] }
    }
    foreach ($serial in ($serials | Select-Object -Unique)) {
      & $adbPath "-s", $serial, "reverse", "tcp:$metroPort", "tcp:$metroPort" 2>$null | Out-Null
      foreach ($deep in $deepLinks) {
        & $adbPath "-s", $serial, "shell", "am", "start", "-a", "android.intent.action.VIEW", "-d", $deep, "-p", $pkg 2>&1 | Out-Null
        Start-Sleep -Milliseconds 350
      }
      Write-Output "Opened dev client on $serial -> $devHttp."
    }
  }

  try {
    & npx @expoArgs 2>&1 | ForEach-Object {
      $text = "$_"
      Write-Host $text
      Add-Content -LiteralPath $LogFile -Encoding UTF8 -Value $text
    }
    $exitCode = $LASTEXITCODE
  } catch {
    $exitCode = 1
    Write-DevLog "Metro threw: $($_.Exception.Message)"
  } finally {
    Receive-Job $clientJob -ErrorAction SilentlyContinue | ForEach-Object { Write-DevLog "$_" }
    Stop-Job $reverseJob -ErrorAction SilentlyContinue | Out-Null
    Remove-Job $reverseJob -Force -ErrorAction SilentlyContinue
    Stop-Job $clientJob -ErrorAction SilentlyContinue | Out-Null
    Remove-Job $clientJob -Force -ErrorAction SilentlyContinue
  }

  Write-DevLog "Metro exited with code $exitCode. Restarting in $RestartDelaySeconds seconds."
  Start-Sleep -Seconds $RestartDelaySeconds
}
