# Metro на :8081 + adb reverse на все эмуляторы + deeplink на 127.0.0.1 (не 10.0.2.2 — на Windows часто SocketTimeout).
$ErrorActionPreference = "Continue"
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $repoRoot
Remove-Item Env:CI -ErrorAction SilentlyContinue

try {
  $ports = 8081, 8082, 8083, 8084, 8085, 8086, 8087, 8088
  & npx --yes kill-port @ports 2>$null | Out-Null
} catch { }

& (Join-Path $PSScriptRoot "adb-reverse-metro.ps1")

$metroPs1 = @"
Set-Location '$($repoRoot -replace "'", "''")'
`$env:CI = 'false'
npx expo start --dev-client --lan --port 8081
"@

Write-Host "Starting Metro in new window ..."
Start-Process -FilePath "powershell.exe" -ArgumentList @(
  "-NoProfile", "-ExecutionPolicy", "Bypass", "-NoExit", "-Command", $metroPs1
) | Out-Null

Write-Host "Waiting for Metro on 127.0.0.1:8081 ..."
$ready = $false
for ($i = 0; $i -lt 180; $i++) {
  try {
    $t = Test-NetConnection -ComputerName 127.0.0.1 -Port 8081 -WarningAction SilentlyContinue -ErrorAction SilentlyContinue
    if ($t.TcpTestSucceeded) {
      $ready = $true
      break
    }
  } catch { }
  Start-Sleep -Seconds 1
}
if (-not $ready) {
  Write-Host "Metro did not open on :8081 in time. Fix errors in the Metro window, then run: npm run android:dev-localhost"
  exit 1
}

Start-Sleep -Seconds 2
& (Join-Path $PSScriptRoot "adb-reverse-metro.ps1")
& (Join-Path $PSScriptRoot "adb-open-dev-localhost.ps1")
Write-Host "Done. Keep the Metro window open while you work."
