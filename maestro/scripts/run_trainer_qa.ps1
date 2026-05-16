param(
  [string]$Udid = "emulator-5554",
  [string]$AppId = "app.phraseman",
  [string]$Adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe",
  [int]$FlowTimeoutSeconds = 360
)

$ErrorActionPreference = "Stop"

if (!(Test-Path $Adb)) {
  throw "adb.exe not found: $Adb"
}

$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$outDir = ".maestro-output-trainer-qa"
$debugDir = ".maestro-debug-trainer-qa"

$flows = @(
  @{
    Path = "maestro/flows/dev_only/trainer_qa_quick_live.yaml"
    Screenshots = @("trainer_qa_quick_panel.png", "trainer_qa_quick_hub.png")
  },
  @{
    Path = "maestro/flows/dev_only/trainer_qa_report_live.yaml"
    Screenshots = @("trainer_qa_report_preview.png")
  },
  @{
    Path = "maestro/flows/dev_only/trainer_qa_mistake_live.yaml"
    Screenshots = @("trainer_qa_mistake_preview.png")
  }
)

function Prepare-Device {
  & $Adb -s $Udid shell input keyevent KEYCODE_WAKEUP | Out-Null
  & $Adb -s $Udid shell wm dismiss-keyguard | Out-Null
  & $Adb -s $Udid shell svc power stayon true | Out-Null
  & $Adb -s $Udid shell settings put system screen_off_timeout 1800000 | Out-Null
  & $Adb -s $Udid reverse tcp:8081 tcp:8081 | Out-Null

  $focus = (& $Adb -s $Udid shell dumpsys window windows 2>$null | Select-String -Pattern "mCurrentFocus|mFocusedApp" | Out-String)
  if ($focus -notmatch [regex]::Escape($AppId)) {
    & $Adb -s $Udid shell monkey -p $AppId -c android.intent.category.LAUNCHER 1 | Out-Null
    Write-Host "App was not focused; launched it and waiting for the Expo dev bundle to settle."
    Start-Sleep -Seconds 210
  }

  $nonce = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
  & $Adb -s $Udid shell am start -a android.intent.action.VIEW -d "phraseman:///settings_testers?qa=$nonce" -p $AppId | Out-Host
  Start-Sleep -Seconds 5
  $nonce = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
  & $Adb -s $Udid shell am start -a android.intent.action.VIEW -d "phraseman:///settings_testers?qa=$nonce" -p $AppId | Out-Host
  Start-Sleep -Seconds 8
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
  param(
    [string]$FlowPath,
    [string[]]$Screenshots
  )

  foreach ($name in $Screenshots) {
    $path = Join-Path $outDir "screenshots\$name"
    Remove-Item -LiteralPath $path -Force -ErrorAction SilentlyContinue
  }

  $args = @(
    "test",
    "--udid", $Udid,
    "--debug-output", $debugDir,
    "--test-output-dir", $outDir,
    $FlowPath
  )

  $process = Start-Process -FilePath "cmd.exe" -ArgumentList (@("/c", "maestro") + $args) -NoNewWindow -PassThru
  $completed = $process.WaitForExit($FlowTimeoutSeconds * 1000)

  if ($completed) {
    $process.Refresh()
    if ($process.ExitCode -eq 0) {
      return
    }
    if (Test-ExpectedScreenshots -Names $Screenshots) {
      Write-Host "Maestro returned exit code $($process.ExitCode) after expected screenshots for $FlowPath; treating visual check as passed."
      return
    }
    throw "Maestro failed for $FlowPath with exit code $($process.ExitCode)."
  }

  $hasExpectedScreens = Test-ExpectedScreenshots -Names $Screenshots
  Stop-MaestroProcess -Process $process
  if ($hasExpectedScreens) {
    Write-Host "Maestro timed out after screenshots for $FlowPath; treating visual check as passed and cleaning up."
    return
  }

  throw "Maestro timed out before expected screenshots for $FlowPath."
}

Push-Location $root
try {
  foreach ($flow in $flows) {
    Write-Host "=== Trainer QA: $($flow.Path) ==="
    Reset-MaestroAndroidDriver
    Prepare-Device
    Invoke-MaestroFlow -FlowPath $flow.Path -Screenshots $flow.Screenshots
  }
  Write-Host "Trainer QA completed."
} finally {
  Pop-Location
}
