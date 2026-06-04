param(
  [string]$TargetTitle = "phraseman",
  [string]$OutputPath = ".codex-tmp\codex-vscode-report-screenshot.png"
)

$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Windows.Forms

if (-not ("CodexScreenshotWindowTools" -as [type])) {
  Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class CodexScreenshotWindowTools {
  [StructLayout(LayoutKind.Sequential)]
  public struct RECT {
    public int Left;
    public int Top;
    public int Right;
    public int Bottom;
  }

  [DllImport("user32.dll")]
  public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

  [DllImport("user32.dll")]
  public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);

  [DllImport("user32.dll")]
  public static extern bool SetForegroundWindow(IntPtr hWnd);
}
"@
}

$dir = Split-Path -Parent $OutputPath
if ($dir -and -not (Test-Path -LiteralPath $dir)) {
  New-Item -ItemType Directory -Path $dir -Force | Out-Null
}

$candidate = Get-Process |
  Where-Object { $_.MainWindowHandle -ne 0 -and $_.MainWindowTitle -like "*$TargetTitle*" } |
  Select-Object -First 1

if (-not $candidate) {
  throw "Window not found by title fragment: $TargetTitle"
}

[CodexScreenshotWindowTools]::ShowWindow($candidate.MainWindowHandle, 9) | Out-Null
Start-Sleep -Milliseconds 200
[CodexScreenshotWindowTools]::SetForegroundWindow($candidate.MainWindowHandle) | Out-Null
Start-Sleep -Milliseconds 600

$rect = New-Object CodexScreenshotWindowTools+RECT
if (-not [CodexScreenshotWindowTools]::GetWindowRect($candidate.MainWindowHandle, [ref]$rect)) {
  throw "Could not read window rectangle."
}

$width = [Math]::Max(1, $rect.Right - $rect.Left)
$height = [Math]::Max(1, $rect.Bottom - $rect.Top)

$bitmap = New-Object System.Drawing.Bitmap $width, $height
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
try {
  $graphics.CopyFromScreen($rect.Left, $rect.Top, 0, 0, $bitmap.Size)
  $bitmap.Save((Join-Path (Get-Location) $OutputPath), [System.Drawing.Imaging.ImageFormat]::Png)
} finally {
  $graphics.Dispose()
  $bitmap.Dispose()
}

Write-Host (Resolve-Path -LiteralPath $OutputPath)
