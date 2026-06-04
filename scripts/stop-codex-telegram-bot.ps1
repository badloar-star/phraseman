$ErrorActionPreference = "Stop"

$processes = @(Get-CimInstance Win32_Process | Where-Object {
  $_.CommandLine -like "*codex-telegram-prompt-queue-bot.ps1*" -and
  $_.CommandLine -notlike "*Get-CimInstance*"
})

foreach ($process in $processes) {
  Stop-Process -Id $process.ProcessId -Force -ErrorAction SilentlyContinue
}

Write-Host "Stopped Telegram bot processes: $($processes.Count)"
