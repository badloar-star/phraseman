# Metro + dev-client on emulator (no native rebuild). adb reverse tcp:8081 for localhost tunnel.
param(
  [switch]$Clear,
  [string]$Avd = ""
)
# adb prints "daemon..." on stderr; Stop turns native stderr into a terminating error.
$ErrorActionPreference = "Continue"
$adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
if (-not (Test-Path $adb)) {
  $adb = "$env:ANDROID_HOME\platform-tools\adb.exe"
}
if (-not (Test-Path $adb)) {
  Write-Host "adb.exe not found. Set ANDROID_HOME or install Android SDK platform-tools."
  exit 1
}

# Free Metro/Expo ports and recycle adb.
try {
  $portsFlat = @(8081, 8082, 8083, 8084, 8085, 8086, 8087, 8088, 8089, 8090, 19000, 19001 | ForEach-Object { "$_" })
  $npxCli = @("--yes", "kill-port") + $portsFlat
  & npx @npxCli 2>$null | Out-Null
} catch { }
try {
  & $adb kill-server 2>$null | Out-Null
  Start-Sleep -Milliseconds 600
  & $adb start-server 2>$null | Out-Null
} catch { }

function Invoke-AdbReverse8081All {
  param([switch]$Quiet)
  $serials = @()
  foreach ($ln in @( & $adb devices 2>&1 | ForEach-Object { "$_" } )) {
    if ($ln -match "^(\S+)\s+device\s*$") { $serials += $Matches[1] }
  }
  foreach ($serial in ($serials | Select-Object -Unique)) {
    try {
      & $adb "-s", $serial, "reverse", "tcp:8081", "tcp:8081" 2>$null | Out-Null
    } catch { }
  }
  if ((-not $Quiet) -and $serials.Count -gt 0) {
    Write-Host "adb reverse tcp:8081 tcp:8081 OK for $($serials -join ', ')"
    try { & $adb reverse --list } catch { }
  }
  elseif (-not $Quiet) {
    Write-Host "adb reverse skipped: no device in state device yet."
  }
}

function Test-AdbDeviceOnline {
  $lines = @(& $adb devices 2>&1 | ForEach-Object { "$_" })
  foreach ($ln in $lines) {
    if ($ln -match "\t(device|recovery)\s*$") { return $true }
  }
  return $false
}

$sdkRoot = Split-Path (Split-Path $adb)
$emuExe = Join-Path $sdkRoot "emulator\emulator.exe"
if (-not (Test-Path $emuExe) -and $env:ANDROID_HOME) {
  $emuExe = Join-Path $env:ANDROID_HOME "emulator\emulator.exe"
}

if (-not (Test-Path $emuExe)) {
  Write-Host "emulator.exe not found next to adb; open Android Studio Device Manager."
  exit 1
}

if (-not (Test-AdbDeviceOnline)) {
  Write-Host "No adb device/emulator online. Launching emulator (Metro only; no Gradle build)."
  try { & $adb reconnect 2>&1 | Out-Null } catch { }
  Start-Sleep -Seconds 1
  if (Test-AdbDeviceOnline) {
    Write-Host "Device detected after adb reconnect."
  } else {
    $names = @( & $emuExe -list-avds 2>$null )
    $picked = ($names | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne '' })[0]
    if ($Avd.Trim()) { $picked = $Avd.Trim() }
    if (-not $picked) {
      Write-Host "No AVD. Create one: Android Studio - Device Manager."
      exit 1
    }
    $emuArgs = @("-avd", $picked, "-gpu", "swiftshader_indirect", "-no-snapshot-load")
    Start-Process -FilePath $emuExe -ArgumentList $emuArgs -WindowStyle Normal
    Write-Host "Waiting for $picked ..."
    try { & $adb wait-for-device 2>&1 | Out-Null } catch { }
    for ($i = 0; $i -lt 180; $i++) {
      if (Test-AdbDeviceOnline) { break }
      Start-Sleep -Seconds 1
    }
    if (-not (Test-AdbDeviceOnline)) {
      Write-Host "Emulator still not ready; continuing. adb reverse retries in background."
    }
  }
}

# Expo late boot; apply reverse once a serial reaches state device.
$reverseJob = Start-Job -ArgumentList $adb -ScriptBlock {
  param($adbPath)
  function Add-Reverse {
    foreach ($ln in @( & $adbPath devices 2>&1 | ForEach-Object { "$_" } )) {
      if ($ln -match "^(\S+)\s+device\s*$") {
        $s = $Matches[1]
        & $adbPath "-s", $s, "reverse", "tcp:8081", "tcp:8081" 2>$null | Out-Null
      }
    }
    & $adbPath reverse --list 2>$null | Out-Null
  }
  for ($i = 0; $i -lt 120; $i++) {
    try {
      foreach ($ln in @( & $adbPath devices 2>&1 | ForEach-Object { "$_" } )) {
        if ($ln -match "^(\S+)\s+device\s*$") {
          Add-Reverse
          Write-Output "adb reverse tcp:8081 refreshed (device online)"
          return
        }
      }
    } catch { }
    Start-Sleep -Seconds 1
  }
}

$proj = Split-Path -Parent $PSScriptRoot
Set-Location $proj
Remove-Item Env:CI -ErrorAction SilentlyContinue

Invoke-AdbReverse8081All

try {
  npx --yes kill-port 8081 2>$null | Out-Null
} catch { }

# Эмулятор → Metro: http://127.0.0.1:8081 + adb reverse на каждый запущенный AVD (10.0.2.2 на Windows часто висит со вторым эмулятором).
$emuSerialLaunchList = [System.Collections.ArrayList]::new()
foreach ($ln in @( & $adb devices 2>&1 | ForEach-Object { "$_" } )) {
  if ($ln -match '^(emulator-\d+)\s+device\s*$') {
    [void]$emuSerialLaunchList.Add($Matches[1])
  }
}

$launchDevJob = $null
if ($emuSerialLaunchList.Count -gt 0) {
  Write-Host ('Emulators {0}: opening bundle URL http://127.0.0.1:8081 (adb reverse, Metro --lan).' -f ($emuSerialLaunchList -join ', '))
  $adbArg = $adb
  # PowerShell serialization: строка с разделителем надёжнее, чем [string[]] в -ArgumentList.
  $serArg = (($emuSerialLaunchList | Select-Object -Unique | ForEach-Object { "$_" }) -join '|')
  $launchDevJob = Start-Job -ArgumentList @($adbArg, $serArg) -ScriptBlock {
    param($adbPath, $serialListJoined)
    $ErrorActionPreference = "Continue"
    $serials = $serialListJoined -split '\|' | ForEach-Object { $_.Trim() } | Where-Object { $_ }
    $pkg = "app.phraseman"
    $devHttp = "http://127.0.0.1:8081"
    $enc = [Uri]::EscapeDataString($devHttp)
    $deep1 = "phraseman://expo-development-client/?url=$enc"
    $deep2 = "exp+phraseman://expo-development-client/?url=$enc"

    $ready = $false
    for ($i = 0; $i -lt 160; $i++) {
      try {
        $t = Test-NetConnection -ComputerName 127.0.0.1 -Port 8081 -WarningAction SilentlyContinue -ErrorAction SilentlyContinue
        if ($t.TcpTestSucceeded) {
          $ready = $true
          break
        }
      } catch { }
      Start-Sleep -Seconds 1
    }

    if (-not $ready) {
      Write-Output "Metro did not open on host port 8081."
      return
    }

    foreach ($serial in $serials) {
      for ($r = 0; $r -lt 3; $r++) {
        & $adbPath "-s", $serial, "reverse", "tcp:8081", "tcp:8081" 2>&1 | Out-Null
        Start-Sleep -Milliseconds 400
      }

      & $adbPath "-s", $serial, "shell", "am", "start", "-a", "android.intent.action.VIEW", "-d", $deep1, "-p", $pkg 2>&1 | Out-Null
      Start-Sleep -Milliseconds 400
      & $adbPath "-s", $serial, "shell", "am", "start", "-a", "android.intent.action.VIEW", "-d", $deep2, "-p", $pkg 2>&1 | Out-Null
      Write-Output "Opened dev launcher $serial (127.0.0.1:8081 + reverse)."
    }
  }
}

Remove-Item Env:REACT_NATIVE_PACKAGER_HOSTNAME -ErrorAction SilentlyContinue

# Совпадает с npm run android / dev — при следующем native prebuild без «подмены из облака» в конфиге.
$env:EXPO_PUBLIC_DISABLE_EXPO_UPDATES = '1'

$expoArgs = @('start', '--dev-client', '--lan', '--port', '8081')
if ($Clear) { $expoArgs += '--clear' }
npx expo @expoArgs

if ($launchDevJob) {
  try {
    Wait-Job $launchDevJob -Timeout 190 | Out-Null
    Receive-Job -Job $launchDevJob -ErrorAction SilentlyContinue | ForEach-Object { Write-Host $_ }
  } finally {
    Remove-Job $launchDevJob -Force -ErrorAction SilentlyContinue
  }
}

if ($reverseJob) {
  Receive-Job -Job $reverseJob -Wait -AutoRemoveJob | ForEach-Object { Write-Host $_ }
}
