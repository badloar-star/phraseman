# Снимает PNG с эмулятора сразу после сценария, совпадающего с падающими smoke
# (состояние «после _precondition, до assert tab-home»). Скрин = то, что видел бы тест.
$ErrorActionPreference = "Stop"
$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
$Out = Join-Path $Root "docs\reports\maestro-screenshots-2026-04-26"
New-Item -ItemType Directory -Force -Path $Out | Out-Null

$Adb = Join-Path $env:LOCALAPPDATA "Android\Sdk\platform-tools\adb.exe"
if (-not (Test-Path $Adb)) {
  Write-Error "adb not found: $Adb"
  exit 1
}
$Udid = "emulator-5554"
# Во временный .png (одно расширение) — иначе cmd-редирект дал 01...png.png
$Tmp1 = Join-Path $env:TEMP "maestro-cap-$(Get-Date -Format 'HHmmss')-1.png"
$Png1 = Join-Path $Out "01-after-precondition.png"
$Png2 = Join-Path $Out "02-same-moment-repeat.png"
$Png3 = Join-Path $Out "03-same-moment-represents-all-three-failed-smoke.png"

Set-Location $Root
$Maestro = "C:\maestro\bin\maestro.bat"
if (-not (Test-Path $Maestro)) {
  $Maestro = (Get-Command maestro -ErrorAction SilentlyContinue).Source
  if (-not $Maestro) { Write-Error "Maestro CLI not found."; exit 1 }
}
# cmd /c: стабильный exit code после maestro.bat
$cmdline = "cd /d ""$Root"" & ""$Maestro"" test maestro/flows/debug/capture_after_precondition_for_report.yaml"
cmd /c $cmdline
$maestroExit = $LASTEXITCODE
if ($maestroExit -ne 0) { Write-Error "Maestro exit $maestroExit"; exit $maestroExit }

# После launchApp + dismiss + precondition приложение ещё догружает/рисует UI с 10.0.2.2:8081
Start-Sleep -Seconds 45

cmd /c """$Adb"" -s $Udid exec-out screencap -p > ""$Tmp1"""
if (-not (Test-Path $Tmp1)) { Write-Error "Screenshot not written: $Tmp1"; exit 1 }
Move-Item -Path $Tmp1 -Destination $Png1 -Force
$len = (Get-Item $Png1).Length
if ($len -lt 5000) { Write-Error "Screenshot file too small ($len bytes) — not a valid PNG?"; exit 1 }

$Tmp2 = Join-Path $env:TEMP "maestro-cap-$(Get-Date -Format 'HHmmss')-2.png"
Start-Sleep -Milliseconds 400
cmd /c """$Adb"" -s $Udid exec-out screencap -p > ""$Tmp2"""
Move-Item -Path $Tmp2 -Destination $Png2 -Force
Copy-Item -Path $Png1 -Destination $Png3 -Force

Write-Host "OK: $Png1 ($len bytes), $Png2, $Png3"
