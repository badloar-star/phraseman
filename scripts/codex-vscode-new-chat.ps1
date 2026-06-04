param(
  [string]$TargetTitle = "phraseman",
  [string]$CommandTitle = "Codex: New Thread in Codex Sidebar"
)

$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Windows.Forms

if (-not ("CodexWindowTools" -as [type])) {
  Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class CodexWindowTools {
  [DllImport("user32.dll")]
  public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

  [DllImport("user32.dll")]
  public static extern bool SetForegroundWindow(IntPtr hWnd);
}
"@
}

$shell = New-Object -ComObject WScript.Shell
$activated = $shell.AppActivate($TargetTitle)

if (-not $activated) {
  $candidate = Get-Process |
    Where-Object { $_.MainWindowHandle -ne 0 -and $_.MainWindowTitle -like "*$TargetTitle*" } |
    Select-Object -First 1

  if ($candidate) {
    [CodexWindowTools]::ShowWindow($candidate.MainWindowHandle, 9) | Out-Null
    Start-Sleep -Milliseconds 200
    $activated = [CodexWindowTools]::SetForegroundWindow($candidate.MainWindowHandle)
  }
}

if (-not $activated) {
  throw "VS Code window not found by title fragment: $TargetTitle"
}

Start-Sleep -Milliseconds 500
[System.Windows.Forms.SendKeys]::SendWait("^+p")
Start-Sleep -Milliseconds 500
Set-Clipboard -Value $CommandTitle
Start-Sleep -Milliseconds 150
[System.Windows.Forms.SendKeys]::SendWait("^v")
Start-Sleep -Milliseconds 150
[System.Windows.Forms.SendKeys]::SendWait("{ENTER}")

Write-Host "New Codex chat command sent: $CommandTitle"
