param(
  [string]$TaskName = 'PhrasemanSafeDevWatchdog',
  [int]$IntervalMinutes = 15,
  [int]$MaxN8nMcpProcesses = 0
)

$ErrorActionPreference = 'Stop'

$ScriptPath = Join-Path $PSScriptRoot 'safe-dev-watchdog.ps1'
if (-not (Test-Path -LiteralPath $ScriptPath)) {
  throw "Watchdog script not found: $ScriptPath"
}

$powershell = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
$argument = "-NoProfile -ExecutionPolicy Bypass -File `"$ScriptPath`" -MaxN8nMcpProcesses $MaxN8nMcpProcesses"

$action = New-ScheduledTaskAction -Execute $powershell -Argument $argument
$trigger = New-ScheduledTaskTrigger `
  -Once `
  -At (Get-Date).AddMinutes(1) `
  -RepetitionInterval (New-TimeSpan -Minutes $IntervalMinutes) `
  -RepetitionDuration (New-TimeSpan -Days 3650)
$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -MultipleInstances IgnoreNew `
  -ExecutionTimeLimit (New-TimeSpan -Minutes 10)

Register-ScheduledTask `
  -TaskName $TaskName `
  -Action $action `
  -Trigger $trigger `
  -Settings $settings `
  -Description 'Safely clears Phraseman dev caches and limits runaway n8n-mcp processes.' `
  -Force | Out-Null

Write-Host "Installed scheduled task: $TaskName"
Write-Host "Interval minutes: $IntervalMinutes"
Write-Host "Watchdog script: $ScriptPath"
