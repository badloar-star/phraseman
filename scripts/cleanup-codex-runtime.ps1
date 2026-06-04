param(
  [switch]$DryRun,
  [switch]$IncludeCodexLogs,
  [int]$StaleProcessMinutes = 90
)

$ErrorActionPreference = 'Continue'

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

if (Test-Path -LiteralPath $CodeLogs) {
  Get-ChildItem -LiteralPath $CodeLogs -Directory -Force -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending |
    Select-Object -Skip 2 |
    ForEach-Object {
      Remove-SafePath $_.FullName $CodeLogs ("VS Code log " + $_.Name)
    }
}

$Cutoff = $Now.AddMinutes(-1 * $StaleProcessMinutes)
Get-CimInstance Win32_Process |
  Where-Object {
    ($_.Name -eq 'codex.exe' -and $_.CommandLine -match 'app-server --listen stdio://') -or
    ($_.Name -eq 'node_repl.exe') -or
    ($_.Name -eq 'node.exe' -and $_.CommandLine -match 'jest|mcp-server')
  } |
  ForEach-Object {
    $created = $null
    if ($_.CreationDate -is [datetime]) {
      $created = $_.CreationDate
    } else {
      try {
        $created = [Management.ManagementDateTimeConverter]::ToDateTime($_.CreationDate)
      } catch {
        $created = $Now
      }
    }
    if ($created -ge $Cutoff) {
      return
    }
    if ($DryRun) {
      Write-Step ("dry-run stop process " + $_.Name + " " + $_.ProcessId)
    } else {
      Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
      Write-Step ("stopped stale process " + $_.Name + " " + $_.ProcessId)
    }
  }

Write-Step "done"
