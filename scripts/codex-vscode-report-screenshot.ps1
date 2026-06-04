param(
  [string]$TargetTitle = "phraseman",
  [string]$ReportsDir = "docs\reports",
  [string]$ReportPath = "",
  [string]$OutputPath = ".codex-tmp\codex-vscode-report-screenshot.png",
  [int]$OpenDelayMilliseconds = 1600
)

$ErrorActionPreference = "Stop"

if (-not $ReportPath) {
  if (-not (Test-Path -LiteralPath $ReportsDir)) {
    throw "Reports directory not found: $ReportsDir"
  }

  $latest = Get-ChildItem -LiteralPath $ReportsDir -File -Filter "*.md" |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1

  if (-not $latest) {
    throw "No markdown reports found in: $ReportsDir"
  }

  $ReportPath = $latest.FullName
}

$resolvedReport = (Resolve-Path -LiteralPath $ReportPath).Path
Start-Process -FilePath "code" -ArgumentList @("-r", $resolvedReport) -WindowStyle Hidden
Start-Sleep -Milliseconds $OpenDelayMilliseconds

$captureScript = Join-Path $PSScriptRoot "codex-vscode-window-screenshot.ps1"
& $env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe `
  -NoProfile `
  -ExecutionPolicy Bypass `
  -File $captureScript `
  -TargetTitle $TargetTitle `
  -OutputPath $OutputPath | Out-Null

Write-Host (Resolve-Path -LiteralPath $OutputPath)
Write-Host "Report: $resolvedReport"
