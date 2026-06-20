# Metro for Android emulators. The Android dev build is configured for
# http://127.0.0.1:8081, so refresh adb reverse before starting Metro.
$ErrorActionPreference = "Continue"
$env:CI = "false"
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $repoRoot

try {
  $ports = 8081, 8082, 8083, 8084, 8085, 8086, 8087, 8088, 8089, 8090, 19000, 19001
  & npx --yes kill-port @ports 2>$null | Out-Null
} catch { }

try {
  & (Join-Path $PSScriptRoot "adb-reverse-metro.ps1")
} catch { }

npx expo start --dev-client --lan --port 8081
