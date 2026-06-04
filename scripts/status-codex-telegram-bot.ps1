param(
  [string]$OutLogPath = ".codex-tmp\codex-telegram-bot-active.out.log",
  [string]$ErrLogPath = ".codex-tmp\codex-telegram-bot-active.err.log",
  [int]$Tail = 20
)

$ErrorActionPreference = "Stop"

Write-Host "Codex Telegram bot status"
Write-Host "========================="

$processes = @(Get-CimInstance Win32_Process | Where-Object {
  $_.CommandLine -like "*codex-telegram-prompt-queue-bot.ps1*" -and
  $_.CommandLine -notlike "*Get-CimInstance*" -and
  $_.CommandLine -notlike "*status-codex-telegram-bot.ps1*"
})

Write-Host ""
Write-Host "Processes: $($processes.Count)"
foreach ($process in $processes) {
  Write-Host "  PID $($process.ProcessId): $($process.CommandLine)"
}

if (Test-Path -LiteralPath $OutLogPath) {
  Write-Host ""
  Write-Host "Out log tail:"
  Get-Content -LiteralPath $OutLogPath -Encoding UTF8 -Tail $Tail
}

if (Test-Path -LiteralPath $ErrLogPath) {
  Write-Host ""
  Write-Host "Err log tail:"
  Get-Content -LiteralPath $ErrLogPath -Encoding UTF8 -Tail $Tail
}
