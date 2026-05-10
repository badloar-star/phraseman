# Проброс 127.0.0.1:8081 внутри эмулятора на порт Metro на хосте (дополнительно к 10.0.2.2).
# Без ошибки при отсутствии adb — Expo всё равно стартанёт.
$ErrorActionPreference = "Continue"
$adb = Join-Path ${env:LOCALAPPDATA} "Android\Sdk\platform-tools\adb.exe"
if (-not (Test-Path $adb) -and $env:ANDROID_HOME) {
  $adb = Join-Path $env:ANDROID_HOME "platform-tools\adb.exe"
}
if (-not (Test-Path $adb)) { exit 0 }

$lines = @( & $adb devices 2>&1 | ForEach-Object { "$_".Trim() } )
foreach ($ln in $lines) {
  if ($ln -match "^(\S+)\s+device$") {
    $serial = $Matches[1]
    try {
      & $adb "-s", $serial, "reverse", "tcp:8081", "tcp:8081" | Out-Null
      Write-Host "adb reverse 8081 -> $serial OK"
    } catch {
      Write-Host "adb reverse failed for $serial"
    }
  }
}
exit 0
