param(
  [int]$MaxN8nMcpProcesses = 0,
  [int]$TempMinAgeMinutes = 45,
  [int]$LogKeepDays = 14
)

$ErrorActionPreference = 'Continue'

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$LogDir = Join-Path $ProjectRoot '.logs'
$LogFile = Join-Path $LogDir 'safe-dev-watchdog.log'

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

function Write-WatchdogLog {
  param([string]$Message)

  $stamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
  Add-Content -LiteralPath $LogFile -Encoding UTF8 -Value "[$stamp] $Message"
}

function Test-PathUnderPrefix {
  param(
    [string]$Path,
    [string[]]$Prefixes
  )

  $fullPath = [System.IO.Path]::GetFullPath($Path)
  foreach ($prefix in $Prefixes) {
    $fullPrefix = [System.IO.Path]::GetFullPath($prefix)
    if ($fullPath.StartsWith($fullPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
      return $true
    }
  }

  return $false
}

function Remove-SafePath {
  param(
    [string]$Path,
    [string[]]$AllowedPrefixes,
    [int]$MinAgeMinutes = 0
  )

  if (-not (Test-Path -LiteralPath $Path)) {
    return
  }

  $fullPath = [System.IO.Path]::GetFullPath($Path)
  if (-not (Test-PathUnderPrefix -Path $fullPath -Prefixes $AllowedPrefixes)) {
    Write-WatchdogLog "SKIP outside allowed prefixes: $fullPath"
    return
  }

  try {
    $item = Get-Item -LiteralPath $fullPath -Force -ErrorAction Stop
    if ($MinAgeMinutes -gt 0 -and $item.LastWriteTime -gt (Get-Date).AddMinutes(-$MinAgeMinutes)) {
      Write-WatchdogLog "SKIP too new: $fullPath"
      return
    }

    Remove-Item -LiteralPath $fullPath -Recurse -Force -ErrorAction Stop
    Write-WatchdogLog "REMOVED $fullPath"
  } catch {
    Write-WatchdogLog "BUSY/FAILED $fullPath :: $($_.Exception.Message)"
  }
}

function Limit-N8nMcpProcesses {
  param([int]$MaxProcesses)

  $all = Get-CimInstance Win32_Process | Select-Object ProcessId,ParentProcessId,Name,CommandLine,CreationDate
  $matched = @($all | Where-Object {
    $_.ProcessId -ne $PID -and
    $_.Name -notin @('Code.exe', 'codex.exe') -and
    $_.CommandLine -match 'n8n-mcp|stdio-wrapper\.js'
  })

  if ($matched.Count -le $MaxProcesses) {
    Write-WatchdogLog "n8n-mcp OK count=$($matched.Count) limit=$MaxProcesses"
    return
  }

  $targetIds = New-Object 'System.Collections.Generic.HashSet[int]'
  foreach ($p in $matched) {
    [void]$targetIds.Add([int]$p.ProcessId)
  }

  $changed = $true
  while ($changed) {
    $changed = $false
    foreach ($p in $all) {
      if ($p.ProcessId -eq $PID -or $p.Name -in @('Code.exe', 'codex.exe')) {
        continue
      }

      if ($targetIds.Contains([int]$p.ParentProcessId) -and $targetIds.Add([int]$p.ProcessId)) {
        $changed = $true
      }
    }
  }

  $stopped = 0
  foreach ($id in $targetIds) {
    try {
      Stop-Process -Id $id -Force -ErrorAction Stop
      $stopped++
    } catch {
      # Parent processes often exit first and take children with them.
    }
  }

  Write-WatchdogLog "n8n-mcp reset count=$($matched.Count) limit=$MaxProcesses stopped=$stopped"
}

Write-WatchdogLog 'START'

$allowedPrefixes = @(
  'C:\Temp\',
  (Join-Path $ProjectRoot ''),
  "$env:APPDATA\Code\",
  "$env:LOCALAPPDATA\npm-cache\"
)

$safeTargets = @(
  @{ Path = 'C:\Temp\eas-cli-nodejs'; Age = $TempMinAgeMinutes },
  @{ Path = 'C:\Temp\metro-cache'; Age = $TempMinAgeMinutes },
  @{ Path = 'C:\Temp\jest'; Age = $TempMinAgeMinutes },
  @{ Path = 'C:\Temp\tsx-badlo'; Age = $TempMinAgeMinutes },
  @{ Path = 'C:\Temp\node-compile-cache'; Age = $TempMinAgeMinutes },
  @{ Path = (Join-Path $ProjectRoot '.codex-tmp'); Age = $TempMinAgeMinutes },
  @{ Path = (Join-Path $ProjectRoot 'tmp'); Age = $TempMinAgeMinutes },
  @{ Path = (Join-Path $ProjectRoot 'qa-artifacts'); Age = $TempMinAgeMinutes },
  @{ Path = (Join-Path $ProjectRoot 'android\app\build'); Age = 180 },
  @{ Path = "$env:APPDATA\Code\Cache"; Age = $TempMinAgeMinutes },
  @{ Path = "$env:APPDATA\Code\CachedData"; Age = $TempMinAgeMinutes },
  @{ Path = "$env:APPDATA\Code\Code Cache"; Age = $TempMinAgeMinutes },
  @{ Path = "$env:APPDATA\Code\GPUCache"; Age = $TempMinAgeMinutes },
  @{ Path = "$env:APPDATA\Code\Crashpad"; Age = $TempMinAgeMinutes },
  @{ Path = "$env:LOCALAPPDATA\npm-cache\_cacache"; Age = 180 }
)

foreach ($target in $safeTargets) {
  Remove-SafePath -Path $target.Path -AllowedPrefixes $allowedPrefixes -MinAgeMinutes $target.Age
}

Limit-N8nMcpProcesses -MaxProcesses $MaxN8nMcpProcesses

try {
  Get-ChildItem -LiteralPath $LogDir -Filter 'safe-dev-watchdog*.log' -File -ErrorAction SilentlyContinue |
    Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-$LogKeepDays) } |
    Remove-Item -Force -ErrorAction SilentlyContinue
} catch {
  Write-WatchdogLog "LOG cleanup failed :: $($_.Exception.Message)"
}

Write-WatchdogLog 'END'
