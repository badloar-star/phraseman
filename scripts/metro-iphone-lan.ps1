<#
  metro-iphone-lan.ps1 - single working Metro launch for iPhone (default port 8085).

  WHY: reproduces the recipe that actually worked 2026-06-21 after a long fight.
  User device is ALWAYS iPhone (never Android, no adb).
  When internet is shared from ANOTHER phone (hotspot 172.20.10.x) or any Wi-Fi, the
  working path is LAN on the CURRENT laptop IP + open firewall on 8085, NOT tunnel and
  NOT localhost:
   - tunnel breaks if the phone has no real internet (empty hotspot);
   - USB to iPhone gives no localhost (no usbmuxd / Apple Mobile Device Support here);
   - so: Metro --lan on the laptop IP, phone enters http://<IP>:8085 manually.

  Steps (each one fixes a real problem we hit):
   1. Kill old Metro/watchdog (protected-metro-phone etc) and free port 8085.
   2. Get the CURRENT LAN IP dynamically (it changes: 192.168.68.101 then 172.20.10.2).
   3. Open firewall for 8085 + set Wi-Fi to Private (if admin; else print the admin command).
   4. Add Watchman to PATH (native watcher -> fixes EMFILE on build, hot reload works).
   5. Big heap (NODE_OPTIONS 12GB) + UV_THREADPOOL_SIZE=128 -> fixes OOM and EMFILE.
   6. Start Metro --dev-client --lan --port 8085 with REACT_NATIVE_PACKAGER_HOSTNAME=<IP>,
      print ready-to-type http://<IP>:8085 for manual entry in the dev-client on iPhone.

  Run:
    npm run metro:iphone
    npm run metro:iphone -- -Clear   # clear cache once
    npm run metro:iphone -- -Tunnel  # force tunnel (needs real internet on the phone)

  Stop: close the window / Ctrl+C.

  RULE: if the phone STILL fails instantly after firewall is open -> the sharing phone has
  client isolation on its hotspot; then enable mobile data on the SHARING phone (so the
  hotspot has real internet) and run: npm run metro:iphone -- -Tunnel
#>
param(
  [int]$Port = 8085,
  [switch]$Clear,
  [switch]$Tunnel
)

$ErrorActionPreference = "Continue"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

function Say([string]$m) { Write-Host ("[metro-iphone] " + $m) }

# 1. Kill old Metro/watchdog and free the port
Say "Cleaning old Metro/watchdog and freeing port $Port..."
Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
  Where-Object { $_.CommandLine -match 'protected-metro-phone\.ps1|expo[\\/].*bin[\\/].*cli.* start|@expo[\\/]ngrok|expo start' } |
  ForEach-Object { try { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue } catch {} }
try {
  $listener = (Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue).OwningProcess | Select-Object -Unique
  foreach ($op in $listener) { try { Stop-Process -Id $op -Force -ErrorAction SilentlyContinue } catch {} }
} catch {}
Start-Sleep -Seconds 2

# 2. Current LAN IP (dynamic - it changes between networks)
$lanIp = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
  Where-Object { $_.IPAddress -notmatch '^127\.' -and $_.IPAddress -notmatch '^169\.254' -and $_.PrefixOrigin -ne 'WellKnown' } |
  Sort-Object { if ($_.InterfaceAlias -match 'Wi-Fi|Wireless|WLAN') { 0 } else { 1 } } |
  Select-Object -First 1 -ExpandProperty IPAddress
if (-not $lanIp) { Say "WARNING: no LAN IP found. Check Wi-Fi."; $lanIp = "127.0.0.1" }
Say "Current laptop LAN IP: $lanIp"

# 3. Firewall + Wi-Fi Private (needs admin)
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if ($isAdmin) {
  if (-not (Get-NetFirewallRule -DisplayName "Expo Metro $Port" -ErrorAction SilentlyContinue)) {
    try {
      New-NetFirewallRule -DisplayName "Expo Metro $Port" -Direction Inbound -LocalPort $Port -Protocol TCP -Action Allow -Profile Any -ErrorAction Stop | Out-Null
      Say "Firewall: opened inbound TCP $Port."
    } catch { Say ("Firewall: could not add rule: " + $_.Exception.Message) }
  } else { Say "Firewall: rule for $Port already exists." }
  try { Set-NetConnectionProfile -InterfaceAlias 'Wi-Fi' -NetworkCategory Private -ErrorAction Stop; Say "Wi-Fi profile -> Private." } catch {}
} else {
  Say "NO admin rights - skipping firewall."
  Say "If the phone cannot connect, open an ADMIN PowerShell and paste:"
  Write-Host ("    New-NetFirewallRule -DisplayName 'Expo Metro {0}' -Direction Inbound -LocalPort {0} -Protocol TCP -Action Allow -Profile Any" -f $Port) -ForegroundColor Yellow
  Write-Host  "    Set-NetConnectionProfile -InterfaceAlias 'Wi-Fi' -NetworkCategory Private" -ForegroundColor Yellow
}

# 3.5 Watchman in PATH (native watcher -> fixes EMFILE on rebuild -> hot reload reaches phone)
if (-not (Get-Command watchman -ErrorAction SilentlyContinue)) {
  $wm = Get-ChildItem -Path $env:LOCALAPPDATA -Recurse -Filter watchman.exe -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($wm) {
    $env:PATH = (Split-Path -Parent $wm.FullName) + ";" + $env:PATH
    Say ("Watchman found, added to PATH: " + $wm.FullName)
  } else {
    Say "Watchman NOT found - Metro may crash with EMFILE. Install: winget install facebook.watchman --skip-dependencies"
  }
} else { Say "Watchman already in PATH." }

# 4 + 5. Launch Metro
Remove-Item Env:CI -ErrorAction SilentlyContinue
$env:CI = "false"
$env:EXPO_PUBLIC_DISABLE_EXPO_UPDATES = "1"
$env:EXPO_NO_TELEMETRY = "1"
$env:UV_THREADPOOL_SIZE = "128"
$env:NODE_OPTIONS = "--max-old-space-size=12288"

$expoArgs = @("expo", "start", "--dev-client", "--port", "$Port")
if ($Tunnel) {
  $expoArgs += "--tunnel"
  Say "TUNNEL mode. URL appears in log as exp://<...>.exp.direct (phone needs internet)."
} else {
  $env:REACT_NATIVE_PACKAGER_HOSTNAME = $lanIp
  $expoArgs += "--lan"
  Write-Host ""
  Write-Host "  =====================================================" -ForegroundColor Green
  Write-Host  ("  ON iPhone enter manually (Enter URL manually):") -ForegroundColor Green
  Write-Host  ("     http://{0}:{1}" -f $lanIp, $Port) -ForegroundColor Green
  Write-Host  ("  iPhone must be on the SAME network as the laptop.") -ForegroundColor Green
  Write-Host "  =====================================================" -ForegroundColor Green
  Write-Host ""
}
if ($Clear) { $expoArgs += "--clear" }

Say ("Start: npx " + ($expoArgs -join ' '))
& npx @expoArgs
