param(
  [string]$QueuePath = ".codex-tmp\codex-prompt-queue.txt",
  [string]$PromptPath = ".codex-tmp\codex-next-prompt.txt",
  [string]$StopPath = ".codex-tmp\codex-chat-queue-sender.stop",
  [string]$LastPromptHashPath = ".codex-tmp\codex-chat-queue-sender-last-prompt.sha256",
  [string]$QueueToken = "__CODEX_NEXT_PROMPT__",
  [string]$OutLogPath = ".codex-tmp\codex-chat-queue-sender-active.out.log",
  [string]$ErrLogPath = ".codex-tmp\codex-chat-queue-sender-active.err.log",
  [int]$Tail = 20
)

$ErrorActionPreference = "Stop"

function Get-LineCount([string]$Path) {
  if (-not (Test-Path -LiteralPath $Path)) {
    return 0
  }

  return @(Get-Content -LiteralPath $Path -Encoding UTF8).Count
}

function Get-TextLength([string]$Path) {
  if (-not (Test-Path -LiteralPath $Path)) {
    return 0
  }

  return (Get-Content -LiteralPath $Path -Raw -Encoding UTF8).Trim().Length
}

function Get-QueueTokenStats([string]$Path, [string]$Token) {
  if (-not (Test-Path -LiteralPath $Path)) {
    return @{ Token = 0; Literal = 0 }
  }

  $tokenCount = 0
  $literalCount = 0
  foreach ($line in Get-Content -LiteralPath $Path -Encoding UTF8) {
    $trimmed = $line.Trim()
    if (-not $trimmed) {
      continue
    }
    if ($trimmed -eq $Token) {
      $tokenCount++
    } else {
      $literalCount++
    }
  }

  return @{ Token = $tokenCount; Literal = $literalCount }
}

Write-Host "Codex chat queue sender status"
Write-Host "================================"

$processes = @(Get-CimInstance Win32_Process | Where-Object {
  $_.CommandLine -like "*codex-chat-queue-sender.ps1*" -and
  $_.CommandLine -notlike "*Get-CimInstance*" -and
  $_.CommandLine -notlike "*status-codex-queue-sender.ps1*"
})

Write-Host ""
Write-Host "Processes: $($processes.Count)"
foreach ($process in $processes) {
  Write-Host "  PID $($process.ProcessId): $($process.CommandLine)"
}

Write-Host ""
Write-Host "Queue file: $QueuePath"
Write-Host "Queue count: $(Get-LineCount $QueuePath)"
$queueStats = Get-QueueTokenStats -Path $QueuePath -Token $QueueToken
Write-Host "Queue token count: $($queueStats.Token)"
Write-Host "Queue literal count: $($queueStats.Literal)"
Write-Host "Next prompt file: $PromptPath"
Write-Host "Next prompt length: $(Get-TextLength $PromptPath)"
if (Test-Path -LiteralPath $LastPromptHashPath) {
  $lastHash = (Get-Content -LiteralPath $LastPromptHashPath -Raw -Encoding UTF8).Trim()
  if ($lastHash.Length -gt 12) {
    $lastHash = $lastHash.Substring(0, 12)
  }
  Write-Host "Last token prompt hash: $lastHash"
} else {
  Write-Host "Last token prompt hash: none"
}
Write-Host "Stop file present: $(Test-Path -LiteralPath $StopPath)"

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
