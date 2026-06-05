param(
  [switch]$DryRun,
  [switch]$IncludeCodexLogs,
  [int]$StaleProcessMinutes = 10,
  [int]$KeepNewestCodexRuntimePairs = 2,
  [switch]$Loop,
  [int]$LoopMinutes = 2
)

$ErrorActionPreference = 'Continue'

if ($Loop) {
  while ($true) {
    & $PSCommandPath -StaleProcessMinutes $StaleProcessMinutes
    Start-Sleep -Seconds ([Math]::Max(60, $LoopMinutes * 60))
  }
  exit 0
}

$ProjectRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$UserCodex = Join-Path $env:USERPROFILE '.codex'
$CodeLogs = Join-Path $env:APPDATA 'Code\logs'
$Now = Get-Date
$Stamp = $Now.ToString('yyyyMMdd-HHmmss')

function Write-Step($Message) {
  Write-Output ("[cleanup] " + $Message)
}

function Test-UnderRoot($Path, $Root) {
  $resolvedPath = (Resolve-Path -LiteralPath $Path -ErrorAction SilentlyContinue).Path
  $resolvedRoot = (Resolve-Path -LiteralPath $Root -ErrorAction SilentlyContinue).Path
  if (-not $resolvedPath -or -not $resolvedRoot) { return $false }
  return $resolvedPath.StartsWith($resolvedRoot, [System.StringComparison]::OrdinalIgnoreCase)
}

function Remove-SafePath($Path, $AllowedRoot, $Label) {
  if (-not (Test-Path -LiteralPath $Path)) { return }
  if (-not (Test-UnderRoot $Path $AllowedRoot)) {
    Write-Step "skip outside allowed root: $Label"
    return
  }
  if ($DryRun) {
    Write-Step "dry-run remove $Label"
    return
  }
  Remove-Item -LiteralPath $Path -Recurse -Force -ErrorAction SilentlyContinue
  Write-Step "removed $Label"
}

function Move-SafePath($Path, $AllowedRoot, $Destination, $Label) {
  if (-not (Test-Path -LiteralPath $Path)) { return }
  if (-not (Test-UnderRoot $Path $AllowedRoot)) {
    Write-Step "skip outside allowed root: $Label"
    return
  }
  if ($DryRun) {
    Write-Step "dry-run archive $Label"
    return
  }
  New-Item -ItemType Directory -Path (Split-Path -Parent $Destination) -Force | Out-Null
  Move-Item -LiteralPath $Path -Destination $Destination -Force -ErrorAction SilentlyContinue
  Write-Step "archived $Label"
}

function Convert-ProcessCreationDate($Process) {
  if ($Process.CreationDate -is [datetime]) {
    return $Process.CreationDate
  }
  try {
    return [Management.ManagementDateTimeConverter]::ToDateTime($Process.CreationDate)
  } catch {
    return $Now
  }
}

function Stop-ProcessSafe($Process, $Label) {
  if ($DryRun) {
    Write-Step ("dry-run stop process " + $Label + " " + $Process.Name + " " + $Process.ProcessId)
    return
  }
  Stop-Process -Id $Process.ProcessId -Force -ErrorAction SilentlyContinue
  Write-Step ("stopped " + $Label + " " + $Process.Name + " " + $Process.ProcessId)
}

Write-Step "project root: $ProjectRoot"

$ProjectTempDirs = @(
  '.codex-tmp',
  ' .codex-tmp',
  '.logs',
  '.artifacts',
  '.codex-logs',
  '.expo',
  'tmp',
  'coverage',
  'dist',
  'android\.gradle',
  'android\app\build'
)

foreach ($dir in $ProjectTempDirs) {
  Remove-SafePath (Join-Path $ProjectRoot $dir) $ProjectRoot $dir
}

if (-not $DryRun) {
  Push-Location $ProjectRoot
  try {
    git clean -fd -- docs/reports | ForEach-Object { Write-Step $_ }
  } finally {
    Pop-Location
  }
} else {
  Write-Step "dry-run git clean -fd -- docs/reports"
}

$CodexTmp = Join-Path $UserCodex '.tmp'
if (Test-Path -LiteralPath $CodexTmp) {
  Get-ChildItem -LiteralPath $CodexTmp -Force -ErrorAction SilentlyContinue |
    Where-Object {
      $_.Name -match '^(plugins|plugins-clone-|plugins\.sha|app-server-remote-plugin-sync|bundled-marketplaces)' -or
      $_.Name -like '*.disabled-*'
    } |
    ForEach-Object {
      Remove-SafePath $_.FullName $CodexTmp ("global codex tmp " + $_.Name)
    }
}

if ($IncludeCodexLogs -and (Test-Path -LiteralPath $UserCodex)) {
  $Archive = Join-Path $UserCodex ("archived-heavy-runtime-" + $Stamp)
  foreach ($name in @('logs_2.sqlite', 'logs_2.sqlite-shm', 'logs_2.sqlite-wal')) {
    $path = Join-Path $UserCodex $name
    $dest = Join-Path $Archive $name
    Move-SafePath $path $UserCodex $dest ("codex log db " + $name)
  }
}

$CodexLogDb = Join-Path $UserCodex 'logs_2.sqlite'
if (Test-Path -LiteralPath $CodexLogDb) {
  $logSizeMb = [Math]::Round(((Get-Item -LiteralPath $CodexLogDb).Length / 1MB), 1)
  Write-Step "codex log db size: ${logSizeMb} MB"
  if (-not $IncludeCodexLogs -and $logSizeMb -gt 150) {
    Write-Step "codex log db is large; run with -IncludeCodexLogs after Codex/VS Code restart to archive it"
  }
}

if (Test-Path -LiteralPath $CodeLogs) {
  Get-ChildItem -LiteralPath $CodeLogs -Directory -Force -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending |
    Select-Object -Skip 2 |
    ForEach-Object {
      Remove-SafePath $_.FullName $CodeLogs ("VS Code log " + $_.Name)
    }
}

$Cutoff = $Now.AddMinutes(-1 * $StaleProcessMinutes)
$RuntimeProcesses = Get-CimInstance Win32_Process |
  Where-Object {
    ($_.Name -eq 'codex.exe' -and $_.CommandLine -match 'app-server') -or
    ($_.Name -eq 'node_repl.exe') -or
    ($_.Name -eq 'node.exe' -and $_.CommandLine -match 'jest|jest-worker\\build\\workers\\processChild\.js|mcp-server')
  }

$StdioCodexServers = @($RuntimeProcesses |
  Where-Object { $_.Name -eq 'codex.exe' -and $_.CommandLine -match 'app-server --listen stdio://' } |
  Sort-Object @{ Expression = { Convert-ProcessCreationDate $_ }; Descending = $true })
$NodeRepls = @($RuntimeProcesses | Where-Object { $_.Name -eq 'node_repl.exe' })
$ActiveStdioParents = @{}
foreach ($server in $StdioCodexServers) {
  $ActiveStdioParents[[int]$server.ParentProcessId] = $true
}

Write-Step ("codex stdio app servers: " + $StdioCodexServers.Count + "; node_repl hosts: " + $NodeRepls.Count)
$ProtectedServerIds = @{}
$StdioCodexServers |
  Select-Object -First ([Math]::Max(1, $KeepNewestCodexRuntimePairs)) |
  ForEach-Object { $ProtectedServerIds[[int]$_.ProcessId] = $true }

foreach ($server in $StdioCodexServers) {
  $created = Convert-ProcessCreationDate $server
  if ($created -ge $Cutoff -or $ProtectedServerIds.ContainsKey([int]$server.ProcessId)) {
    continue
  }
  Stop-ProcessSafe $server 'stale codex stdio app-server'
}

foreach ($nodeRepl in $NodeRepls) {
  $created = Convert-ProcessCreationDate $nodeRepl
  if ($created -ge $Cutoff) {
    continue
  }
  if ($ActiveStdioParents.ContainsKey([int]$nodeRepl.ProcessId)) {
    $hasProtectedChild = $StdioCodexServers |
      Where-Object { [int]$_.ParentProcessId -eq [int]$nodeRepl.ProcessId -and $ProtectedServerIds.ContainsKey([int]$_.ProcessId) } |
      Select-Object -First 1
    if ($hasProtectedChild) {
      continue
    }
  }
  Stop-ProcessSafe $nodeRepl 'stale node_repl host'
}

$RuntimeProcesses |
  Where-Object { $_.Name -eq 'node.exe' -and $_.CommandLine -match 'jest|jest-worker\\build\\workers\\processChild\.js|mcp-server' } |
  ForEach-Object {
    $created = Convert-ProcessCreationDate $_
    if ($created -lt $Cutoff) {
      Stop-ProcessSafe $_ 'stale node helper'
    }
  }

Write-Step "done"
