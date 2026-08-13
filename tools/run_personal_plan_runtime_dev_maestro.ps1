param(
  [string]$Flow = "maestro\flows\personal_plans\runtime_dev_smoke.yaml",
  [string]$Maestro = "C:\maestro\bin\maestro.bat",
  [string]$ResultsDir = "maestro-results"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $Maestro)) {
  throw "Maestro CLI not found: $Maestro"
}

if (-not (Test-Path -LiteralPath $Flow)) {
  throw "Maestro flow not found: $Flow"
}

if (-not (Test-Path -LiteralPath $ResultsDir)) {
  New-Item -ItemType Directory -Path $ResultsDir | Out-Null
}

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$logPath = Join-Path $ResultsDir "personal_plan_runtime_dev_smoke_$stamp.log"

function Write-Step([string]$Message) {
  Write-Host ""
  Write-Host "== $Message =="
}

function Resolve-Adb {
  $candidates = @()
  if ($env:LOCALAPPDATA) {
    $candidates += (Join-Path $env:LOCALAPPDATA "Android\Sdk\platform-tools\adb.exe")
  }
  if ($env:ANDROID_HOME) {
    $candidates += (Join-Path $env:ANDROID_HOME "platform-tools\adb.exe")
  }
  $fromPath = Get-Command adb -ErrorAction SilentlyContinue
  if ($fromPath) {
    $candidates += $fromPath.Source
  }
  return $candidates | Where-Object { $_ -and (Test-Path -LiteralPath $_) } | Select-Object -First 1
}

Write-Step "Maestro syntax"
& $Maestro check-syntax $Flow 2>&1 | Tee-Object -FilePath $logPath

$adb = Resolve-Adb
if ($adb) {
  Write-Step "ADB devices"
  & $adb devices 2>&1 | Tee-Object -FilePath $logPath -Append
} else {
  "ADB_NOT_FOUND" | Tee-Object -FilePath $logPath -Append
}

Write-Step "Maestro live test"
& $Maestro test $Flow 2>&1 | Tee-Object -FilePath $logPath -Append
$exitCode = $LASTEXITCODE

Write-Step "Result"
"exitCode=$exitCode" | Tee-Object -FilePath $logPath -Append
"log=$logPath" | Tee-Object -FilePath $logPath -Append

exit $exitCode
