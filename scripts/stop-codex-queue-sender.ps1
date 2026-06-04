param(
  [string]$StopFile = ".codex-tmp\codex-chat-queue-sender.stop"
)

$ErrorActionPreference = "Stop"

New-Item -ItemType Directory -Force (Split-Path -Parent $StopFile) | Out-Null
New-Item -ItemType File -Path $StopFile -Force | Out-Null

Get-CimInstance Win32_Process |
  Where-Object {
    $_.CommandLine -like '*codex-chat-queue-sender.ps1*' -and
    $_.CommandLine -notlike '*Get-CimInstance*'
  } |
  ForEach-Object {
    Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
  }

Write-Host "Queue sender stopped. Stop file: $StopFile"
