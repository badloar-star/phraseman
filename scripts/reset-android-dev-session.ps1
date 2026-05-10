# Порты, лёгкий кэш, перезагрузка эмуляторов, reverse, Metro --lan --clear, затем открытие dev-client на всех AVD.

param(

  [switch] $NoMetro

)



$ErrorActionPreference = "Continue"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

Set-Location $repoRoot

Remove-Item Env:CI -ErrorAction SilentlyContinue



$ports = 8081, 8082, 8083, 8084, 8085, 8086, 8087, 8088, 8089, 8090, 19000, 19001

try {

  & npx --yes kill-port @ports 2>$null | Out-Null

} catch { }

Write-Host "kill-port: done"



Remove-Item -Recurse -Force (Join-Path $repoRoot ".expo\cache") -ErrorAction SilentlyContinue

Remove-Item -Recurse -Force (Join-Path $repoRoot "node_modules\.cache") -ErrorAction SilentlyContinue

Write-Host "cache: .expo/cache + node_modules/.cache cleared (if existed)"



$adb = Join-Path ${env:LOCALAPPDATA} "Android\Sdk\platform-tools\adb.exe"

if (-not (Test-Path $adb) -and $env:ANDROID_HOME) {

  $adb = Join-Path $env:ANDROID_HOME "platform-tools\adb.exe"

}



function Get-DeviceSerials {

  param([string]$AdbPath)

  $list = @()

  if (-not (Test-Path $AdbPath)) { return $list }

  $lines = @( & $AdbPath devices 2>&1 | ForEach-Object { "$_".Trim() } )

  foreach ($ln in $lines) {

    if ($ln -match "^(\S+)\s+device$") {

      $list += $Matches[1]

    }

  }

  return $list

}



function ReverseAll {

  param([string]$AdbPath)

  foreach ($s in (Get-DeviceSerials -AdbPath $AdbPath)) {

    & $AdbPath "-s", $s, "reverse", "tcp:8081", "tcp:8081" 2>&1 | Out-Null

    Write-Host "reverse 8081: $s"

  }

}



if (Test-Path $adb) {

  ReverseAll -AdbPath $adb



  $emuSerials = @( (Get-DeviceSerials -AdbPath $adb) | Where-Object { $_ -match "^emulator-" } )

  foreach ($s in $emuSerials) {

    Write-Host "reboot: $s"

    & $adb "-s", $s, "reboot" 2>&1 | Out-Null

  }



  if ($emuSerials.Count -gt 0) {

    $deadline = (Get-Date).AddSeconds(180)

    while ((Get-Date) -lt $deadline) {

      $now = @( Get-DeviceSerials -AdbPath $adb )

      $all = $true

      foreach ($need in $emuSerials) {

        if ($now -notcontains $need) { $all = $false; break }

      }

      if ($all) {

        Write-Host "emulators: back online"

        break

      }

      Start-Sleep -Seconds 4

    }

    Start-Sleep -Seconds 6

  }



  ReverseAll -AdbPath $adb

} else {

  Write-Host "adb not found; skip emulator reboot / reverse"

}



if (-not $NoMetro) {

  # --lan: Metro слушает 0.0.0.0 — на Windows с двумя эмуляторами и adb reverse это убирает «unexpected end of stream» чаще, чем --localhost.

  $metroCmd = "Set-Location '$($repoRoot -replace "'", "''")'; `$env:CI='false'; npx expo start --dev-client --lan --port 8081 --clear"

  Start-Process -FilePath "powershell.exe" -ArgumentList @(

    "-NoProfile", "-ExecutionPolicy", "Bypass", "-NoExit", "-Command", $metroCmd

  ) | Out-Null

  Write-Host "Metro: новое окно (--lan --clear). Ждём :8081…"



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



  if ($ready -and (Test-Path $adb)) {

    Start-Sleep -Seconds 2

    & (Join-Path $PSScriptRoot "adb-reverse-metro.ps1")

    try {

      & (Join-Path $PSScriptRoot "adb-open-dev-localhost.ps1")

    } catch {

      Write-Host "adb-open-dev-localhost: $($_.Exception.Message)"

    }

  } elseif (-not $ready) {

    Write-Host "Metro не поднялся на :8081 вовремя — проверь окно Metro, потом: npm run android:dev-localhost"

  }

}



Write-Host "reset-android-dev-session: done"

exit 0


