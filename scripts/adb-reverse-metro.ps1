# Legacy localhost fallback: map 127.0.0.1:8081 inside each Android device to
# Metro on the host. Missing adb is not fatal because Metro can still start.
$ErrorActionPreference = "Continue"

$adbCandidates = @()
if ($env:LOCALAPPDATA) {
  $adbCandidates += (Join-Path $env:LOCALAPPDATA "Android\Sdk\platform-tools\adb.exe")
}
if ($env:ANDROID_HOME) {
  $adbCandidates += (Join-Path $env:ANDROID_HOME "platform-tools\adb.exe")
}
$adbFromPath = Get-Command adb -ErrorAction SilentlyContinue
if ($adbFromPath) {
  $adbCandidates += $adbFromPath.Source
}

$adb = $adbCandidates | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1
if (-not $adb) {
  Write-Host "adb.exe not found; skipping adb reverse."
  exit 0
}

$lines = @(& $adb devices 2>&1 | ForEach-Object { "$_".Trim() })
$serials = @(
  foreach ($ln in $lines) {
    if ($ln -match "^(\S+)\s+device$") {
      $Matches[1]
    }
  }
)

if ($serials.Count -lt 1) {
  Write-Host "No Android device in device state; skipping adb reverse."
  exit 0
}

foreach ($serial in ($serials | Select-Object -Unique)) {
  try {
    & $adb -s $serial reverse "tcp:8081" "tcp:8081" | Out-Null
    Write-Host "adb reverse tcp:8081 -> tcp:8081 OK ($serial)"
  } catch {
    Write-Host "adb reverse failed for $serial"
  }
}

exit 0
