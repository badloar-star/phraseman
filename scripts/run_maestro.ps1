param(
  [Parameter(Mandatory = $true, Position = 0)]
  [string]$FlowPath,

  [string]$Udid = $env:MAESTRO_UDID,

  [switch]$NoReinstallDriver,

  [string]$DebugOutput,

  [ValidateSet("NOOP", "JUNIT", "HTML", "HTML-DETAILED")]
  [string]$Format = "NOOP",

  [string]$Output
)

$maestroCandidates = @(
  (Join-Path $env:USERPROFILE ".maestro\bin\maestro.bat"),
  (Join-Path $env:LOCALAPPDATA "maestro\bin\maestro.bat"),
  (Join-Path $env:LOCALAPPDATA "Programs\Maestro\bin\maestro.bat"),
  "C:\maestro\bin\maestro.bat"
)

$cmd = Get-Command maestro -ErrorAction SilentlyContinue
if ($cmd -and $cmd.Source) {
  $maestro = $cmd.Source
} else {
  $maestro = $maestroCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
}

if (-not $maestro) {
  Write-Error "Maestro CLI not found. Checked PATH and: $($maestroCandidates -join ', '). Install Maestro CLI and run again."
  exit 1
}

$sdkRoot = if ($env:ANDROID_HOME) { $env:ANDROID_HOME } else { $env:ANDROID_SDK_ROOT }
$adbCandidates = @()
if ($sdkRoot) {
  $adbCandidates += (Join-Path $sdkRoot "platform-tools\adb.exe")
}
$adbCandidates += "adb"
$adb = $adbCandidates | Where-Object {
  if ($_ -eq "adb") {
    [bool](Get-Command adb -ErrorAction SilentlyContinue)
  } else {
    Test-Path $_
  }
} | Select-Object -First 1

function Get-ConnectedAndroidDevices {
  if (-not $adb) {
    return @()
  }

  $lines = & $adb devices 2>$null
  if ($LASTEXITCODE -ne 0) {
    return @()
  }

  return @(
    $lines |
      Select-String -Pattern "^(\S+)\s+device\b" |
      ForEach-Object { $_.Matches[0].Groups[1].Value }
  )
}

function Get-MaestroBusyDevices {
  return @(
    Get-CimInstance Win32_Process -Filter "name='java.exe'" -ErrorAction SilentlyContinue |
      Where-Object { $_.CommandLine -match "maestro\.cli\.AppKt" } |
      ForEach-Object {
        [regex]::Matches($_.CommandLine, "emulator-\d+") |
          ForEach-Object { $_.Value }
      } |
      Select-Object -Unique
  )
}

function Select-FreeDevice {
  $devices = @(Get-ConnectedAndroidDevices)
  if ($devices.Count -eq 0) {
    return $null
  }

  $busy = @(Get-MaestroBusyDevices)
  $free = @($devices | Where-Object { $busy -notcontains $_ })
  if ($free.Count -gt 0) {
    return $free[0]
  }

  return $devices[0]
}

function Enable-MetroReverse {
  param([string]$DeviceId)

  if (-not $adb -or -not $DeviceId) {
    return
  }

  $onlineDevices = @(Get-ConnectedAndroidDevices)
  if ($onlineDevices -notcontains $DeviceId) {
    Write-Error "Android device '$DeviceId' is not online. Online devices: $($onlineDevices -join ', ')"
    exit 1
  }

  & $adb -s $DeviceId wait-for-device | Out-Null
  & $adb -s $DeviceId reverse tcp:8081 tcp:8081 | Out-Null
  if ($LASTEXITCODE -ne 0) {
    Write-Warning "Failed to configure adb reverse for $DeviceId. Dev-client may not reach Metro on 127.0.0.1:8081."
  }
}

if (-not $Udid) {
  $Udid = Select-FreeDevice
  if ($Udid) {
    Write-Host "Using Android device: $Udid"
  }
}

$resolved = Resolve-Path -LiteralPath $FlowPath -ErrorAction SilentlyContinue
$target = if ($resolved) { $resolved.Path } else { $FlowPath }

function Invoke-MaestroFlow {
  param([string]$Path)

  if ($Udid) {
    Enable-MetroReverse -DeviceId $Udid
  }

  $maestroArgs = @("test")
  if ($NoReinstallDriver) {
    $maestroArgs += "--no-reinstall-driver"
  }
  if ($Udid) {
    $maestroArgs += @("--udid", $Udid)
  }
  if ($DebugOutput) {
    $maestroArgs += @("--debug-output", $DebugOutput)
  }
  if ($Format -ne "NOOP") {
    $maestroArgs += @("--format", $Format)
  }
  if ($Output) {
    $maestroArgs += @("--output", $Output)
  }
  $maestroArgs += $Path

  & $maestro @maestroArgs
  $script:LastMaestroExitCode = if ($null -ne $LASTEXITCODE) { $LASTEXITCODE } else { 1 }
}

if (Test-Path -LiteralPath $target -PathType Container) {
  $ymls = @(Get-ChildItem -Path $target -Recurse -File -Filter *.yaml -ErrorAction SilentlyContinue)
  if ($ymls.Count -eq 0) {
    Write-Error "No .yaml flows under: $target"
    exit 1
  }

  $exit = 0
  foreach ($f in ($ymls | Sort-Object FullName)) {
    Invoke-MaestroFlow -Path $f.FullName
    $code = $script:LastMaestroExitCode
    if ($code -ne 0) {
      $exit = $code
    }
  }
  exit $exit
}

Invoke-MaestroFlow -Path $FlowPath
$code = $script:LastMaestroExitCode
exit $code
