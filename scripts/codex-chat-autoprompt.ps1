param(
  [int]$IntervalSeconds = 300,
  [string]$TargetTitle = "Codex",
  [string]$PromptPath = "",
  [string]$StopFile = ".codex-tmp\codex-chat-autoprompt.stop",
  [switch]$SendImmediately
)

$ErrorActionPreference = "Stop"

$DefaultPrompt = @"
дальше
"@

function Get-PromptText {
  param([string]$Path)

  if ($Path -and (Test-Path -LiteralPath $Path)) {
    return (Get-Content -LiteralPath $Path -Raw)
  }

  return $DefaultPrompt
}

function Ensure-StopDirectory {
  param([string]$Path)

  $dir = Split-Path -Parent $Path
  if ($dir -and -not (Test-Path -LiteralPath $dir)) {
    New-Item -ItemType Directory -Path $dir -Force | Out-Null
  }
}

function Send-ToChatWindow {
  param(
    [string]$WindowTitle,
    [string]$Text
  )

  Add-Type -AssemblyName System.Windows.Forms
  $shell = New-Object -ComObject WScript.Shell

  $activated = $shell.AppActivate($WindowTitle)
  if (-not $activated) {
    $stamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[$stamp] Window not found: '$WindowTitle'. Skipping send."
    return $false
  }

  Start-Sleep -Milliseconds 500
  Set-Clipboard -Value $Text
  Start-Sleep -Milliseconds 200
  [System.Windows.Forms.SendKeys]::SendWait("^v")
  Start-Sleep -Milliseconds 120
  [System.Windows.Forms.SendKeys]::SendWait("{ENTER}")

  $sentAt = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
  Write-Host "[$sentAt] Sent prompt to '$WindowTitle'."
  return $true
}

Ensure-StopDirectory -Path $StopFile

Write-Host "Codex chat autoprompt started."
Write-Host "Target window title: $TargetTitle"
Write-Host "Interval seconds: $IntervalSeconds"
Write-Host "Stop file: $StopFile"
Write-Host "Create the stop file or press Ctrl+C to stop."
Write-Host ""
Write-Host "Important: keep the correct chat window available. The script sends Ctrl+V and Enter to the matched window."

if ($SendImmediately) {
  $prompt = Get-PromptText -Path $PromptPath
  Send-ToChatWindow -WindowTitle $TargetTitle -Text $prompt | Out-Null
}

while ($true) {
  for ($remaining = $IntervalSeconds; $remaining -gt 0; $remaining--) {
    if (Test-Path -LiteralPath $StopFile) {
      Write-Host "Stop file detected. Exiting."
      exit 0
    }
    Start-Sleep -Seconds 1
  }

  if (Test-Path -LiteralPath $StopFile) {
    Write-Host "Stop file detected. Exiting."
    exit 0
  }

  $prompt = Get-PromptText -Path $PromptPath
  Send-ToChatWindow -WindowTitle $TargetTitle -Text $prompt | Out-Null
}
