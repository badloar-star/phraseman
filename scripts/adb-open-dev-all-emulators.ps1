param(
  [int]$Port = 8081,
  [switch]$UseReverse,
  [switch]$NoForceStop
)

$ErrorActionPreference = "Stop"
$script = Join-Path $PSScriptRoot "adb-open-dev-emulator.ps1"

if ($UseReverse) {
  if ($NoForceStop) {
    & $script -Port $Port -UseReverse -NoForceStop
  } else {
    & $script -Port $Port -UseReverse
  }
} else {
  if ($NoForceStop) {
    & $script -Port $Port -NoForceStop
  } else {
    & $script -Port $Port
  }
}
