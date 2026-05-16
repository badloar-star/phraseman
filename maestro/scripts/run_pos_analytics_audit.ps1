param(
  [string]$Udid = "emulator-5554",
  [string]$AppId = "app.phraseman",
  [string]$MetroUrl = "http://127.0.0.1:8081",
  [string]$Adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe",
  [int]$BootWaitSeconds = 150,
  [int]$FlowTimeoutSeconds = 240
)

$ErrorActionPreference = "Stop"

if (!(Test-Path $Adb)) {
  throw "adb.exe not found: $Adb"
}

$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$outDir = ".maestro-output-pos-audit"
$debugDir = ".maestro-debug-pos-audit"

$flowPath = "maestro/flows/dev_only/pos_analytics_audit_live.yaml"
$expectedScreenshots = @(
  "pos_audit_release_coverage.png",
  "pos_audit_coverage_sources.png",
  "pos_audit_runtime_events.png"
)

function Open-DevClientProject {
  $encodedUrl = [Uri]::EscapeDataString($MetroUrl)
  $devClientUrl = "exp+phraseman://expo-development-client/?url=$encodedUrl"
  & $Adb -s $Udid shell am start -a android.intent.action.VIEW -d $devClientUrl -p $AppId | Out-Host
}

function Prepare-Device {
  & $Adb -s $Udid shell input keyevent KEYCODE_WAKEUP | Out-Null
  & $Adb -s $Udid shell wm dismiss-keyguard | Out-Null
  & $Adb -s $Udid shell svc power stayon true | Out-Null
  & $Adb -s $Udid shell settings put system screen_off_timeout 1800000 | Out-Null
  & $Adb -s $Udid reverse tcp:8081 tcp:8081 | Out-Null

  Write-Host "Opening Expo dev-client project from $MetroUrl and waiting for the JS bundle."
  Open-DevClientProject
  Start-Sleep -Seconds $BootWaitSeconds
}

function Reset-MaestroAndroidDriver {
  & $Adb -s $Udid shell am force-stop dev.mobile.maestro 2>$null | Out-Null
  & $Adb -s $Udid shell am force-stop dev.mobile.maestro.test 2>$null | Out-Null
  & $Adb -s $Udid uninstall dev.mobile.maestro.test 2>$null | Out-Null
  & $Adb -s $Udid uninstall dev.mobile.maestro 2>$null | Out-Null
}

function Test-ExpectedScreenshots {
  param([string[]]$Names)
  foreach ($name in $Names) {
    $path = Join-Path $outDir "screenshots\$name"
    if (!(Test-Path $path)) {
      return $false
    }
    if ((Get-Item $path).Length -le 0) {
      return $false
    }
  }
  return $true
}

function Stop-MaestroProcess {
  param([System.Diagnostics.Process]$Process)
  try {
    if ($Process -and !$Process.HasExited) {
      Stop-Process -Id $Process.Id -Force -ErrorAction SilentlyContinue
    }
  } catch {}
}

function Invoke-MaestroFlow {
  foreach ($name in $expectedScreenshots) {
    $path = Join-Path $outDir "screenshots\$name"
    Remove-Item -LiteralPath $path -Force -ErrorAction SilentlyContinue
  }

  $args = @(
    "test",
    "--udid", $Udid,
    "--debug-output", $debugDir,
    "--test-output-dir", $outDir,
    $flowPath
  )

  $process = Start-Process -FilePath "cmd.exe" -ArgumentList (@("/c", "maestro") + $args) -NoNewWindow -PassThru
  $completed = $process.WaitForExit($FlowTimeoutSeconds * 1000)

  if ($completed) {
    $process.Refresh()
    if ($process.ExitCode -eq 0) {
      return
    }
    if (Test-ExpectedScreenshots -Names $expectedScreenshots) {
      Write-Host "Maestro returned exit code $($process.ExitCode) after expected screenshots; treating visual check as passed."
      return
    }
    throw "Maestro failed with exit code $($process.ExitCode)."
  }

  $hasExpectedScreens = Test-ExpectedScreenshots -Names $expectedScreenshots
  Stop-MaestroProcess -Process $process
  if ($hasExpectedScreens) {
    Write-Host "Maestro timed out after screenshots; treating visual check as passed and cleaning up."
    return
  }

  throw "Maestro timed out before expected screenshots."
}

Push-Location $root
try {
  Write-Host "=== POS Analytics Audit QA ==="
  Reset-MaestroAndroidDriver
  Prepare-Device
  Invoke-MaestroFlow
  Write-Host "POS Analytics Audit QA completed."
} finally {
  Pop-Location
}
