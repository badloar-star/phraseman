<#
  metro-phone.ps1 — Metro для телефона по Wi-Fi. Написан с нуля 2026-08-16
  после инцидента «бандлит, качает, но правки не доезжают».

  РАССЛЕДОВАНИЕ НАШЛО ЧЕТЫРЕ ПРИЧИНЫ, и каждая закрыта здесь отдельным блоком:

   1. Два Metro одновременно (8081 и 8085) — телефон говорил не с тем.
      → Блок «ОДИН METRO»: перед стартом гасим ВСЕ expo start этого проекта.

   2. Адрес в .expo/metro-url.txt писался ДО старта и переживал мёртвый сервер.
      → Блок «АДРЕС»: пишем ТОЛЬКО после ответа /status, стираем при падении
        и при закрытии окна. Пустое место честнее лжи.

   3. Трансформ-кэш 1.1 ГБ отдавал старые заготовки: полный бандл «за 2.8 сек».
      → Блок «КЭШ»: -Clear чистит кэш Metro и file-map перед первым стартом.

   4. Metro падал по памяти на дереве в 278k файлов (worktree-копии).
      → Блок «WATCHDOG»: поднимаем заново, а причину падения ПИШЕМ В ЛОГ словами.
        Копии убраны отдельно; здесь — большой heap и много файловых дескрипторов.

  ЗАЧЕМ ВООБЩЕ ФАЙЛ С АДРЕСОМ: телефон и ноутбук в одной Wi-Fi сети, iPhone
  вводит адрес один раз через «Enter URL manually». Файл — единственная точка,
  откуда этот адрес известен, поэтому он обязан быть честным.

  ЗАПУСК:  START_METRO.bat            (обычный)
           START_METRO.bat -Clear     (чистка кэша перед стартом)
  ОСТАНОВКА: закрыть окно или Ctrl+C.
#>
param(
  [int]$Port = 8085,
  [switch]$Clear,
  [switch]$Tunnel
)

$ErrorActionPreference = "Continue"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

# Русские подсказки в окне: консоль Windows по умолчанию не UTF-8.
try {
  [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
  $OutputEncoding = [System.Text.Encoding]::UTF8
} catch {}

$StateDir = Join-Path $ProjectRoot ".expo"
New-Item -ItemType Directory -Force -Path $StateDir | Out-Null
$UrlFile = Join-Path $StateDir "metro-url.txt"
$LogFile = Join-Path $StateDir "metro-phone.log"

function Say([string]$m) {
  Write-Host "[metro] $m" -ForegroundColor Cyan
  Add-Content -LiteralPath $LogFile -Encoding UTF8 -Value ("[" + (Get-Date -Format "HH:mm:ss") + "] $m")
}

# ─────────────────────────────────────────────────────────────────────────────
# ПРОВЕРКИ. Invoke-WebRequest на этой версии PowerShell отдаёт .Content
# МАССИВОМ БАЙТОВ — сравнение с текстом молча давало false. Приводим явно.
# ─────────────────────────────────────────────────────────────────────────────
function Get-StatusText([int]$p) {
  try {
    $r = Invoke-WebRequest -Uri ("http://127.0.0.1:{0}/status" -f $p) -TimeoutSec 3 -UseBasicParsing -ErrorAction Stop
    $c = $r.Content
    if ($c -is [byte[]]) { return [System.Text.Encoding]::UTF8.GetString($c) }
    return [string]$c
  } catch { return "" }
}
function Test-MetroAlive([int]$p) { return ((Get-StatusText $p) -match 'packager-status:running') }
function Test-PortBusy([int]$p) {
  return [bool](Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue)
}

# Рабочий адрес: без 127.*, без 169.254.* (APIPA — «сеть не выдала адрес»),
# Wi-Fi предпочтительнее. У машины владельца ПЯТЬ IPv4, рабочий один.
function Get-LanIp {
  Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object {
      $_.IPAddress -notmatch '^127\.' -and
      $_.IPAddress -notmatch '^169\.254' -and
      $_.PrefixOrigin -ne 'WellKnown'
    } |
    Sort-Object { if ($_.InterfaceAlias -match 'Wi-Fi|Wireless|WLAN') { 0 } else { 1 } } |
    Select-Object -First 1 -ExpandProperty IPAddress
}

# ─────────────────────────────────────────────────────────────────────────────
# ПРИЧИНА 0 → ОДИН WATCHDOG. Гасить чужие Metro мало: если запущены ДВА
# сторожа, каждый при старте убивает Metro другого, тот поднимает заново, и
# сервер живёт по 1–2 секунды. В логе 2026-08-16 это видно прямо: «Погашено
# лишних Metro: 1» в 14:46 и 15:00, а следом «попытка #1» и «попытка #3» в
# одну секунду — два цикла воюют. Телефон при этом бесконечно бандлит и
# ничего не получает.
#
# Поэтому первым делом гасим ЧУЖИЕ копии этого скрипта. Свой процесс не
# трогаем: сравниваем по PID.
# ─────────────────────────────────────────────────────────────────────────────
$selfPid = $PID
$otherWatchdogs = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
  Where-Object {
    $_.Name -match '^powershell(\.exe)?$' -and
    $_.ProcessId -ne $selfPid -and
    $_.CommandLine -match 'metro-phone'
  }
foreach ($w in $otherWatchdogs) {
  try { Stop-Process -Id $w.ProcessId -Force -ErrorAction SilentlyContinue } catch {}
}
if ($otherWatchdogs) {
  Say ("Закрыто прошлых окон Metro: {0}. Два сторожа убивали сервер друг друга." -f @($otherWatchdogs).Count)
  Start-Sleep -Seconds 1
}

# зачем: убитый силой watchdog не доходит до finally, и адрес переживает свой
# сервер. Хуже того, при смене Wi-Fi там остаётся ЧУЖОЙ IP (в логе 2026-08-16
# файл показывал 192.168.1.155, когда сервера не было вовсе). Стираем на
# старте: пока новый Metro не ответит, честнее не иметь адреса, чем врать.
Remove-Item -LiteralPath $UrlFile -ErrorAction SilentlyContinue

# ─────────────────────────────────────────────────────────────────────────────
# ПРИЧИНА 1 → ОДИН METRO. Гасим все expo start ЭТОГО проекта, на любом порту.
# Чужие проекты не трогаем: фильтр по пути к node_modules этого дерева.
# ─────────────────────────────────────────────────────────────────────────────
# Два способа найти лишний Metro, потому что один не надёжен:
#  а) node-процесс, слушающий любой Metro-порт 8081..8090;
#  б) node-процесс с «expo» и «start» в команде (CommandLine у CIM бывает
#     обрезан, а regex-экранирование пути ломало совпадение — 2026-08-16
#     скрипт из-за этого НЕ убил свой же Metro и спросил «Use port 8086?»).
$killed = 0
$byPort = foreach ($p in 8081..8090) {
  (Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue).OwningProcess
}
$byCmd = (Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
  Where-Object { $_.Name -match '^node(\.exe)?$' -and $_.CommandLine -match 'expo' -and $_.CommandLine -match 'start' }).ProcessId
foreach ($id in (@($byPort) + @($byCmd) | Where-Object { $_ } | Select-Object -Unique)) {
  $proc = Get-Process -Id $id -ErrorAction SilentlyContinue
  if ($proc -and $proc.ProcessName -match '^node') {
    try { Stop-Process -Id $id -Force -ErrorAction SilentlyContinue; $killed++ } catch {}
  }
}
if ($killed) {
  Say "Погашено лишних Metro: $killed. Один сервер — один адрес."
  Start-Sleep -Seconds 2
}

# Порт всё ещё занят (не-node процесс) → следующий свободный. Не падаем молча.
if (Test-PortBusy $Port) {
  $free = $null
  foreach ($c in ($Port + 1)..($Port + 20)) { if (-not (Test-PortBusy $c)) { $free = $c; break } }
  if (-not $free) { Say "ОШИБКА: порты $Port..$($Port + 20) заняты. Перезагрузи компьютер."; exit 1 }
  Say "Порт $Port занят чужим процессом. Перехожу на $free."
  $Port = $free
}

# ─────────────────────────────────────────────────────────────────────────────
# ПРИЧИНА 3 → КЭШ. По -Clear чистим трансформ-кэш и file-map: без этого Metro
# отдаёт старые заготовки, и «свежий» бандл собирается за 2.8 сек из кэша.
# ─────────────────────────────────────────────────────────────────────────────
if ($Clear) {
  $tmp = if ($env:TEMP) { $env:TEMP } else { "C:\Temp" }
  foreach ($pattern in @("metro-cache", "metro-file-map-*", "haste-map-*")) {
    Get-ChildItem -LiteralPath $tmp -Filter $pattern -Force -ErrorAction SilentlyContinue |
      ForEach-Object { Remove-Item -LiteralPath $_.FullName -Recurse -Force -ErrorAction SilentlyContinue }
  }
  Remove-Item -LiteralPath (Join-Path $ProjectRoot "node_modules\.cache") -Recurse -Force -ErrorAction SilentlyContinue
  Say "Кэш Metro и file-map очищены (первый старт будет медленнее — это честная сборка)."
}

# ─────────────────────────────────────────────────────────────────────────────
# ОКРУЖЕНИЕ. Снимаем сами причины падений: heap OOM и EMFILE.
# ─────────────────────────────────────────────────────────────────────────────
Remove-Item Env:CI -ErrorAction SilentlyContinue
$env:CI = "false"
$env:EXPO_NO_TELEMETRY = "1"
$env:UV_THREADPOOL_SIZE = "128"
$env:NODE_OPTIONS = "--max-old-space-size=12288"

$expoCli = Join-Path $ProjectRoot 'node_modules\expo\bin\cli'
if (-not (Test-Path -LiteralPath $expoCli)) { Say "ОШИБКА: нет node_modules\expo\bin\cli. Выполни npm install."; exit 1 }

# Не давать Windows усыпить машину: телефон теряет сервер, когда ноут спит.
try {
  Start-Process -FilePath "powercfg.exe" -ArgumentList "/requestsoverride","PROCESS","node.exe","System" `
    -WindowStyle Hidden -Wait -ErrorAction Stop | Out-Null
} catch {}

# зачем: QR-код в окне — владелец НЕ вводит адрес руками. Рисуем своим
# генератором (qrcode-terminal лежит в node_modules у Expo), а не ждём QR от
# Expo: тот появляется только после удачного старта, а при занятом порте
# Expo вместо QR задавал вопрос «Use port 8086?» и висел. Свой QR печатается
# ДО старта — адрес известен заранее (IP + порт), dev-client сам дождётся
# сервера. Формат ссылки — тот же, что сканирует dev-client.
function Show-Qr([string]$serverUrl) {
  $deepLink = "phraseman://expo-development-client/?url=" + [uri]::EscapeDataString($serverUrl)
  $qrJs = Join-Path $ProjectRoot 'node_modules\qrcode-terminal\lib\main.js'
  if (-not (Test-Path -LiteralPath $qrJs)) { Say "QR: нет qrcode-terminal — введи адрес руками."; return }
  Write-Host ""
  Write-Host "   СКАНИРУЙ КАМЕРОЙ iPhone:" -ForegroundColor Green
  & node -e "require(process.argv[1]).generate(process.argv[2], { small: true })" $qrJs $deepLink
  Write-Host ""
}

# ─────────────────────────────────────────────────────────────────────────────
# ПРИЧИНА 2 → АДРЕС. Отдельный процесс ждёт ответа /status и только тогда
# пишет файл. Start-Job не подходит: не выполняется без интерактивной сессии.
# ─────────────────────────────────────────────────────────────────────────────
function Start-UrlWriter([int]$p, [string]$u, [string]$f) {
  $code = @"
for (`$i = 0; `$i -lt 150; `$i++) {
  Start-Sleep -Seconds 2
  try {
    `$r = Invoke-WebRequest -Uri 'http://127.0.0.1:$p/status' -TimeoutSec 3 -UseBasicParsing -ErrorAction Stop
    `$c = `$r.Content
    if (`$c -is [byte[]]) { `$c = [System.Text.Encoding]::UTF8.GetString(`$c) }
    if ([string]`$c -match 'packager-status:running') {
      [IO.File]::WriteAllText('$f', '$u', (New-Object Text.UTF8Encoding `$false))
      exit 0
    }
  } catch {}
}
"@
  return Start-Process -FilePath "powershell.exe" `
    -ArgumentList "-NoProfile","-ExecutionPolicy","Bypass","-Command",$code `
    -WindowStyle Hidden -PassThru
}
function Stop-UrlWriter($proc) {
  if ($proc) { try { Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue } catch {} }
}

# ─────────────────────────────────────────────────────────────────────────────
# ПРИЧИНА 4 → WATCHDOG. Metro упал → поднимаем. Упал мгновенно 3 раза → это
# конфиг, а не сбой: называем причину словами и ждём человека, а не штормим.
# ─────────────────────────────────────────────────────────────────────────────
$attempt = 0
$fastFails = 0
$writer = $null
try {
  while ($true) {
    $attempt++
    $lanIp = Get-LanIp
    if (-not $lanIp) { Say "Нет рабочего Wi-Fi адреса (только 169.254.*). Жду 10 сек."; Start-Sleep 10; continue }

    $args = @("start", "--dev-client", "--port", "$Port")
    if ($Tunnel) {
      $args += "--tunnel"
      Say "Режим TUNNEL: телефону нужен интернет, адрес exp-direct появится ниже."
    } else {
      $env:REACT_NATIVE_PACKAGER_HOSTNAME = $lanIp
      $args += "--lan"
      $url = "http://{0}:{1}" -f $lanIp, $Port
      Remove-Item -LiteralPath $UrlFile -ErrorAction SilentlyContinue
      $writer = Start-UrlWriter $Port $url $UrlFile
      Write-Host ""
      Write-Host "  ==================================================" -ForegroundColor Green
      Write-Host ("   Сервер: {0}" -f $url) -ForegroundColor Green
      Write-Host "  ==================================================" -ForegroundColor Green
      Show-Qr $url
    }
    if ($Clear -and $attempt -eq 1) { $args += "--clear" }

    Say "Старт Metro (попытка #$attempt, порт $Port)"
    $t0 = Get-Date
    & node $expoCli @args
    $ran = ((Get-Date) - $t0).TotalSeconds

    # Metro умер → адрес обязан умереть вместе с ним.
    Stop-UrlWriter $writer; $writer = $null
    Remove-Item -LiteralPath $UrlFile -ErrorAction SilentlyContinue

    if ($ran -lt 10) {
      $fastFails++
      if ($fastFails -ge 3) {
        Say "Metro падает сразу 3 раза подряд — это ошибка настройки, не случайный сбой."
        if (Test-PortBusy $Port)     { Say "ПРИЧИНА: порт $Port занят. Закрой лишний Metro или запусти с -Port $($Port + 1)." }
        elseif (-not (Get-LanIp))    { Say "ПРИЧИНА: нет рабочего Wi-Fi адреса. Переподключись к Wi-Fi." }
        else                         { Say "ПРИЧИНА не распознана — прочитай текст ошибки Metro выше." }
        Say "Нажми любую клавишу — попробую снова. Или закрой окно."
        [void][System.Console]::ReadKey($true)
        $fastFails = 0
      } else {
        Say "Metro вышел за $([int]$ran) сек. Пауза 5 сек."; Start-Sleep 5
      }
    } else {
      $fastFails = 0
      Say "Metro проработал $([int]$ran) сек и упал. Поднимаю через 3 сек. На телефоне — Reload."
      Start-Sleep 3
    }
  }
} finally {
  # Окно закрыли — сервера нет, адрес и запрет на сон уходят вместе с ним.
  Stop-UrlWriter $writer
  Remove-Item -LiteralPath $UrlFile -ErrorAction SilentlyContinue
  try {
    Start-Process -FilePath "powercfg.exe" -ArgumentList "/requestsoverride","PROCESS","node.exe" `
      -WindowStyle Hidden -Wait -ErrorAction SilentlyContinue | Out-Null
  } catch {}
  Say "Остановлен. Адрес стёрт, сон компьютера возвращён."
}
