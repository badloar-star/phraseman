# Metro для Android-эмулятора: освободить порты, adb reverse, затем Expo (Metro = бандлер JS).
$ErrorActionPreference = "Continue"
$env:CI = "false"
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $repoRoot
try {
  $ports = 8081, 8082, 8083, 8084, 8085, 8086, 8087, 8088, 8089, 8090, 19000, 19001
  & npx --yes kill-port @ports 2>$null | Out-Null
} catch { }
& (Join-Path $PSScriptRoot "adb-reverse-metro.ps1")
npx expo start --dev-client --lan --port 8081
