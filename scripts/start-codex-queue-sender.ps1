param(
  [string]$TargetTitle = "phraseman",
  [int]$IntervalSeconds = 300,
  [string]$QueuePath = ".codex-tmp\codex-prompt-queue.txt",
  [string]$PromptPath = ".codex-tmp\codex-next-prompt.txt",
  [string]$StopFile = ".codex-tmp\codex-chat-queue-sender.stop",
  [string]$LastPromptHashPath = ".codex-tmp\codex-chat-queue-sender-last-prompt.sha256",
  [string]$QueueToken = "__CODEX_NEXT_PROMPT__",
  [switch]$SendImmediately,
  [switch]$AllowRepeatedTokenPrompt,
  [switch]$ReplaceExisting
)

$ErrorActionPreference = "Stop"

if ($ReplaceExisting) {
  Get-CimInstance Win32_Process |
    Where-Object {
      $_.CommandLine -like '*codex-chat-queue-sender.ps1*' -and
      $_.CommandLine -like "*$QueuePath*" -and
      $_.CommandLine -notlike '*Get-CimInstance*'
    } |
    ForEach-Object {
      Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
    }
}

Start-Sleep -Seconds 1
Remove-Item -LiteralPath $StopFile -ErrorAction SilentlyContinue

$pwsh = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
$script = (Resolve-Path '.\scripts\codex-chat-queue-sender.ps1').Path
$tmp = (Resolve-Path '.codex-tmp').Path
$logOut = Join-Path $tmp 'codex-chat-queue-sender-active.out.log'
$logErr = Join-Path $tmp 'codex-chat-queue-sender-active.err.log'

Remove-Item -LiteralPath $logOut, $logErr -ErrorAction SilentlyContinue

$argList = @(
  '-NoProfile',
  '-ExecutionPolicy',
  'Bypass',
  '-File',
  $script,
  '-TargetTitle',
  $TargetTitle,
  '-IntervalSeconds',
  [string]$IntervalSeconds,
  '-QueuePath',
  $QueuePath,
  '-PromptPath',
  $PromptPath,
  '-StopFile',
  $StopFile,
  '-LastPromptHashPath',
  $LastPromptHashPath,
  '-QueueToken',
  $QueueToken
)

if ($SendImmediately) {
  $argList += '-SendImmediately'
}

if ($AllowRepeatedTokenPrompt) {
  $argList += '-AllowRepeatedTokenPrompt'
}

$process = Start-Process `
  -FilePath $pwsh `
  -ArgumentList $argList `
  -WindowStyle Hidden `
  -PassThru `
  -RedirectStandardOutput $logOut `
  -RedirectStandardError $logErr

Start-Sleep -Seconds 1
Write-Host "Started queue sender PID: $($process.Id)"
Write-Host "Target title: $TargetTitle"
Write-Host "Queue path: $QueuePath"
Write-Host "Prompt path: $PromptPath"
Write-Host "Last prompt hash path: $LastPromptHashPath"
Write-Host "Log out: $logOut"
Write-Host "Log err: $logErr"
