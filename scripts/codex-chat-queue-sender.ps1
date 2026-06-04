param(
  [int]$IntervalSeconds = 300,
  [string]$TargetTitle = "Codex",
  [string]$QueuePath = ".codex-tmp\codex-prompt-queue.txt",
  [string]$PromptPath = ".codex-tmp\codex-next-prompt.txt",
  [string]$StopFile = ".codex-tmp\codex-chat-queue-sender.stop",
  [string]$StatusPath = "",
  [string]$LastPromptHashPath = ".codex-tmp\codex-chat-queue-sender-last-prompt.sha256",
  [string]$QueueToken = "__CODEX_NEXT_PROMPT__",
  [string]$DefaultPrompt = "",
  [string[]]$AllowedProcessNames = @("Code", "Code - Insiders"),
  [bool]$RequireActiveTargetWindow = $true,
  [bool]$ClickInputBeforeSend = $true,
  [double]$InputClickXRatio = 0.52,
  [int]$InputClickBottomOffset = 155,
  [switch]$SendImmediately,
  [switch]$SendDefaultWhenQueueEmpty,
  [switch]$AllowRepeatedTokenPrompt
)

$ErrorActionPreference = "Stop"

function TextFromCodepoints {
  param([int[]]$Codepoints)

  $chars = foreach ($codepoint in $Codepoints) { [char]$codepoint }
  return [string]::Concat($chars)
}

if (-not $DefaultPrompt) {
  $DefaultPrompt = TextFromCodepoints @(0x0434, 0x0430, 0x043B, 0x044C, 0x0448, 0x0435)
}

function Ensure-WindowAutomation {
  Add-Type -AssemblyName System.Windows.Forms

  if (-not ("CodexWindowTools" -as [type])) {
    Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class CodexWindowTools {
  [DllImport("user32.dll")]
  public static extern bool SetForegroundWindow(IntPtr hWnd);
  [DllImport("user32.dll")]
  public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll", CharSet = CharSet.Unicode)]
  public static extern int GetWindowText(IntPtr hWnd, System.Text.StringBuilder text, int count);
  [DllImport("user32.dll")]
  public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
  [DllImport("user32.dll")]
  public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
  [DllImport("user32.dll")]
  public static extern bool SetCursorPos(int x, int y);
  [DllImport("user32.dll")]
  public static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint dwData, UIntPtr dwExtraInfo);
  public const uint MOUSEEVENTF_LEFTDOWN = 0x0002;
  public const uint MOUSEEVENTF_LEFTUP = 0x0004;
  [StructLayout(LayoutKind.Sequential)]
  public struct RECT {
    public int Left;
    public int Top;
    public int Right;
    public int Bottom;
  }
}
"@
  }
}

function Ensure-ParentDirectory {
  param([string]$Path)

  $dir = Split-Path -Parent $Path
  if ($dir -and -not (Test-Path -LiteralPath $dir)) {
    New-Item -ItemType Directory -Path $dir -Force | Out-Null
  }
}

function Pop-QueuedPrompt {
  param([string]$Path)

  Ensure-ParentDirectory -Path $Path
  if (-not (Test-Path -LiteralPath $Path)) {
    return $null
  }

  $lines = [System.Collections.Generic.List[string]]::new()
  foreach ($line in [System.IO.File]::ReadAllLines((Resolve-Path -LiteralPath $Path))) {
    if ($line.Trim().Length -gt 0) {
      $lines.Add($line)
    }
  }

  if ($lines.Count -eq 0) {
    Clear-Content -LiteralPath $Path
    return $null
  }

  $next = $lines[0]
  $lines.RemoveAt(0)
  [System.IO.File]::WriteAllLines((Resolve-Path -LiteralPath $Path), $lines.ToArray())
  return $next
}

function Get-QueueCount {
  param([string]$Path)

  if (-not (Test-Path -LiteralPath $Path)) {
    return 0
  }

  return @([System.IO.File]::ReadAllLines((Resolve-Path -LiteralPath $Path)) | Where-Object { $_.Trim().Length -gt 0 }).Count
}

function Push-QueuedPromptFront {
  param(
    [string]$Path,
    [string]$Text
  )

  Ensure-ParentDirectory -Path $Path
  $existing = @()
  if (Test-Path -LiteralPath $Path) {
    $existing = @([System.IO.File]::ReadAllLines((Resolve-Path -LiteralPath $Path)) | Where-Object { $_.Trim().Length -gt 0 })
  }
  $all = @($Text) + $existing
  if (Test-Path -LiteralPath $Path) {
    [System.IO.File]::WriteAllLines((Resolve-Path -LiteralPath $Path), $all)
  } else {
    [System.IO.File]::WriteAllLines((Join-Path (Get-Location) $Path), $all)
  }
}

function Resolve-QueuedPrompt {
  param([string]$QueuedText)

  if ($QueuedText.Trim() -ne $QueueToken) {
    return $QueuedText
  }

  if ($PromptPath -and (Test-Path -LiteralPath $PromptPath)) {
    $text = (Get-Content -LiteralPath $PromptPath -Raw -Encoding UTF8).Trim()
    if ($text) {
      return $text
    }
  }

  return $DefaultPrompt
}

function Get-StringSha256 {
  param([string]$Text)

  $sha = [System.Security.Cryptography.SHA256]::Create()
  try {
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($Text)
    $hash = $sha.ComputeHash($bytes)
    return ([System.BitConverter]::ToString($hash)).Replace("-", "").ToLowerInvariant()
  } finally {
    $sha.Dispose()
  }
}

function Get-LastPromptHash {
  if ($LastPromptHashPath -and (Test-Path -LiteralPath $LastPromptHashPath)) {
    return (Get-Content -LiteralPath $LastPromptHashPath -Raw -Encoding UTF8).Trim()
  }

  return ""
}

function Set-LastPromptHash {
  param([string]$Hash)

  if (-not $LastPromptHashPath) {
    return
  }

  Ensure-ParentDirectory -Path $LastPromptHashPath
  Set-Content -LiteralPath $LastPromptHashPath -Value $Hash -Encoding UTF8
}

function Write-SenderStatus {
  param(
    [string]$Status,
    [string]$Message,
    [int]$QueueRemaining = -1
  )

  if (-not $StatusPath) {
    return
  }

  Ensure-ParentDirectory -Path $StatusPath
  $payload = [ordered]@{
    status = $Status
    message = $Message
    queuePath = $QueuePath
    targetTitle = $TargetTitle
    queueRemaining = $QueueRemaining
    updatedAt = (Get-Date).ToUniversalTime().ToString("o")
  }
  $payload | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $StatusPath -Encoding UTF8
}

function Test-SafeForegroundWindow {
  param([string]$WindowTitle)

  Ensure-WindowAutomation
  $handle = [CodexWindowTools]::GetForegroundWindow()
  if ($handle -eq [IntPtr]::Zero) {
    return @{ Safe = $false; Reason = "no foreground window" }
  }

  $titleBuilder = New-Object System.Text.StringBuilder 1024
  [void][CodexWindowTools]::GetWindowText($handle, $titleBuilder, $titleBuilder.Capacity)
  $title = $titleBuilder.ToString()

  [uint32]$processId = 0
  [void][CodexWindowTools]::GetWindowThreadProcessId($handle, [ref]$processId)
  $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
  $processName = if ($process) { $process.ProcessName } else { "" }
  $processOk = $AllowedProcessNames -contains $processName
  $titleOk = $title -like "*$WindowTitle*"

  if (-not $processOk -or -not $titleOk) {
    return @{
      Safe = $false
      Reason = "foreground mismatch: process='$processName', title='$title'"
    }
  }

  return @{ Safe = $true; Reason = "foreground verified: process='$processName', title='$title'" }
}

function Send-ToChatWindow {
  param(
    [string]$WindowTitle,
    [string]$Text
  )

  Ensure-WindowAutomation
  $shell = New-Object -ComObject WScript.Shell

  $candidate = Get-Process |
    Where-Object {
      $_.MainWindowHandle -ne 0 -and
      $_.MainWindowTitle -like "*$WindowTitle*" -and
      ($AllowedProcessNames -contains $_.ProcessName)
    } |
    Select-Object -First 1

  $activated = $false
  if ($candidate) {
    $activated = [CodexWindowTools]::SetForegroundWindow($candidate.MainWindowHandle)
    if (-not $activated) {
      $activated = $shell.AppActivate([int]$candidate.Id)
    }
  }

  if (-not $activated) {
    $stamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $allowed = $AllowedProcessNames -join ", "
    Write-Host "[$stamp] VS Code target window not found: '$WindowTitle'. Allowed processes: $allowed."
    Write-SenderStatus -Status "paused" -Message "VS Code target window not found: $WindowTitle" -QueueRemaining (Get-QueueCount -Path $QueuePath)
    return $false
  }

  Start-Sleep -Milliseconds 500
  if ($RequireActiveTargetWindow) {
    $guard = Test-SafeForegroundWindow -WindowTitle $WindowTitle
    if (-not $guard.Safe) {
      $stamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
      Write-Host "[$stamp] Unsafe foreground window. $($guard.Reason)"
      Write-SenderStatus -Status "paused" -Message $guard.Reason -QueueRemaining (Get-QueueCount -Path $QueuePath)
      return $false
    }
  }

  if ($ClickInputBeforeSend) {
    $rect = New-Object CodexWindowTools+RECT
    if ([CodexWindowTools]::GetWindowRect($candidate.MainWindowHandle, [ref]$rect)) {
      $width = [Math]::Max(1, $rect.Right - $rect.Left)
      $height = [Math]::Max(1, $rect.Bottom - $rect.Top)
      $xRatio = [Math]::Min(0.95, [Math]::Max(0.05, $InputClickXRatio))
      $x = [int]($rect.Left + ($width * $xRatio))
      $y = [int]($rect.Bottom - [Math]::Min([Math]::Max(40, $InputClickBottomOffset), [Math]::Max(40, $height - 40)))
      [void][CodexWindowTools]::SetCursorPos($x, $y)
      Start-Sleep -Milliseconds 80
      [CodexWindowTools]::mouse_event([CodexWindowTools]::MOUSEEVENTF_LEFTDOWN, 0, 0, 0, [UIntPtr]::Zero)
      Start-Sleep -Milliseconds 60
      [CodexWindowTools]::mouse_event([CodexWindowTools]::MOUSEEVENTF_LEFTUP, 0, 0, 0, [UIntPtr]::Zero)
      Start-Sleep -Milliseconds 250
      Write-Host "Focused likely Codex input at x=$x y=$y; window=$($rect.Left),$($rect.Top),$($rect.Right),$($rect.Bottom); bottomOffset=$InputClickBottomOffset."
    }
  }

  Set-Clipboard -Value $Text
  Start-Sleep -Milliseconds 200
  [System.Windows.Forms.SendKeys]::SendWait("^v")
  Start-Sleep -Milliseconds 120
  [System.Windows.Forms.SendKeys]::SendWait("{ENTER}")

  $sentAt = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
  Write-Host "[$sentAt] Sent prompt to '$WindowTitle'. Length: $($Text.Length)"
  Write-SenderStatus -Status "sent" -Message "Prompt sent to $WindowTitle" -QueueRemaining (Get-QueueCount -Path $QueuePath)
  return $true
}

function Tick {
  $queued = Pop-QueuedPrompt -Path $QueuePath
  if ($queued) {
    $queuedWasToken = $queued.Trim() -eq $QueueToken
    $promptText = Resolve-QueuedPrompt -QueuedText $queued
    if (-not $promptText) {
      Push-QueuedPromptFront -Path $QueuePath -Text $queued
      $stamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
      Write-Host "[$stamp] Prompt token could not be resolved. Prompt returned to queue."
      return
    }

    $promptHash = Get-StringSha256 -Text $promptText
    if ($queuedWasToken -and -not $AllowRepeatedTokenPrompt -and $promptHash -eq (Get-LastPromptHash)) {
      Push-QueuedPromptFront -Path $QueuePath -Text $queued
      $stamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
      Write-Host "[$stamp] Prompt unchanged. Waiting for .codex-next-prompt update."
      return
    }

    try {
      $sent = Send-ToChatWindow -WindowTitle $TargetTitle -Text $promptText
      if ($sent -and $queuedWasToken) {
        Set-LastPromptHash -Hash $promptHash
      }
      if (-not $sent) {
        Push-QueuedPromptFront -Path $QueuePath -Text $queued
      }
    } catch {
      Push-QueuedPromptFront -Path $QueuePath -Text $queued
      $stamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
      $message = $_.Exception.Message
      Write-Host ("[{0}] Send failed, prompt returned to queue: {1}" -f $stamp, $message)
    }
    Write-Host "Queue remaining: $(Get-QueueCount -Path $QueuePath)"
    return
  }

  if ($SendDefaultWhenQueueEmpty) {
    Send-ToChatWindow -WindowTitle $TargetTitle -Text $DefaultPrompt | Out-Null
    return
  }

  $stamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
  Write-Host "[$stamp] Queue empty. Nothing sent."
}

Ensure-ParentDirectory -Path $QueuePath
Ensure-ParentDirectory -Path $StopFile

Write-Host "Codex chat queue sender started."
Write-Host "Target window title: $TargetTitle"
Write-Host "Queue path: $QueuePath"
Write-Host "Prompt path: $PromptPath"
Write-Host "Queue token: $QueueToken"
Write-Host "Last prompt hash path: $LastPromptHashPath"
Write-Host "Allow repeated token prompt: $AllowRepeatedTokenPrompt"
Write-Host "Interval seconds: $IntervalSeconds"
Write-Host "Stop file: $StopFile"
Write-Host "Create the stop file or press Ctrl+C to stop."
Write-Host ""
Write-Host "Important: this sends Ctrl+V and Enter to the matched window."

if ($SendImmediately) {
  Tick
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

  Tick
}
