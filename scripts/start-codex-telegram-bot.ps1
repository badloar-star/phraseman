param(
  [string]$BotToken = $env:TELEGRAM_BOT_TOKEN,
  [string]$AllowedChatId = $env:TELEGRAM_ALLOWED_CHAT_ID,
  [string]$TargetTitle = "phraseman",
  [string]$QueuePath = ".codex-tmp\codex-prompt-queue.txt",
  [string]$PromptPath = ".codex-tmp\codex-next-prompt.txt",
  [string]$ScreenshotPath = ".codex-tmp\codex-vscode-report-screenshot.png"
)

$ErrorActionPreference = "Stop"

if (-not $BotToken) {
  throw "Bot token is required. Pass -BotToken or set TELEGRAM_BOT_TOKEN."
}

Get-CimInstance Win32_Process |
  Where-Object {
    $_.CommandLine -like "*codex-telegram-prompt-queue-bot.ps1*" -and
    $_.CommandLine -notlike "*Get-CimInstance*"
  } |
  ForEach-Object {
    Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
  }

Start-Sleep -Seconds 1

$pwsh = Join-Path $env:SystemRoot "System32\WindowsPowerShell\v1.0\powershell.exe"
$script = (Resolve-Path ".\scripts\codex-telegram-prompt-queue-bot.ps1").Path
$tmp = (Resolve-Path ".codex-tmp").Path
$logOut = Join-Path $tmp "codex-telegram-bot-active.out.log"
$logErr = Join-Path $tmp "codex-telegram-bot-active.err.log"

Remove-Item -LiteralPath $logOut, $logErr -ErrorAction SilentlyContinue

$argList = @(
  "-NoProfile",
  "-ExecutionPolicy",
  "Bypass",
  "-File",
  $script,
  "-BotToken",
  $BotToken,
  "-TargetTitle",
  $TargetTitle,
  "-QueuePath",
  $QueuePath,
  "-PromptPath",
  $PromptPath,
  "-ScreenshotPath",
  $ScreenshotPath
)

if ($AllowedChatId) {
  $argList += @("-AllowedChatId", $AllowedChatId)
}

$process = Start-Process `
  -FilePath $pwsh `
  -ArgumentList $argList `
  -WindowStyle Hidden `
  -PassThru `
  -RedirectStandardOutput $logOut `
  -RedirectStandardError $logErr

Start-Sleep -Seconds 1
Write-Host "Started Telegram bot PID: $($process.Id)"
Write-Host "Target title: $TargetTitle"
Write-Host "Allowed chat id: $AllowedChatId"
Write-Host "Log out: $logOut"
Write-Host "Log err: $logErr"
