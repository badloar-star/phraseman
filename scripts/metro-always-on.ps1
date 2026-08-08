<#
  metro-always-on.ps1 — «всегда живой» Metro для iPhone по Wi-Fi (порт 8085).

  ЗАЧЕМ (что реально болело у владельца):
   1. Окно Metro само исчезало — процесс падал (EMFILE / heap OOM на большом проекте),
      и без watchdog это выглядело как «оно постоянно закрывается».
   2. После каждого падения приходилось заново вводить адрес на iPhone, потому что
      адрес менялся (Wi-Fi/хотспот дают разный IP) и старая HMR-сокет-сессия не
      переподключалась.
   3. Старый protected-metro-phone.ps1 крутился в бесконечном цикле (1363 попытки
      подряд), падая мгновенно из-за `npx` в C:\Users\badlo\bin — PowerShell не может
      запустить его в пайпе. Поэтому здесь npx НЕ используется вообще: зовём
      node node_modules\expo\bin\cli напрямую.

  ЧТО ДЕЛАЕТ:
   - watchdog: Metro упал → сам поднимается, бесконечно, пока не закроешь окно;
   - защита от «шторма перезапусков»: если падает мгновенно — пауза и ожидание, а не
     1363 попытки в минуту;
   - фиксированный адрес для телефона: пишем в .expo/metro-url.txt и печатаем крупно,
     чтобы вводить один раз;
   - большой heap + UV_THREADPOOL_SIZE: убирает сами причины падений (OOM/EMFILE);
   - Watchman в PATH, если найден: нативный вотчер вместо node-краулера;
   - keep-alive: не даёт Windows усыпить машину, пока Metro работает — иначе телефон
     теряет сервер, когда ноут уходит в сон;
   - открывает firewall на порту (если запущено от админа), иначе печатает команду.

  ЗАПУСК:
    npm run metro                # обычный
    npm run metro -- -Clear      # с чисткой кэша (один раз, только первая попытка)

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

# зачем: без этого русские подсказки в окне выводятся как "?????" — консоль Windows
# по умолчанию не в UTF-8, а весь смысл этих строк в том, чтобы их можно было прочитать.
try {
  [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
  $OutputEncoding = [System.Text.Encoding]::UTF8
} catch {}

$StateDir = Join-Path $ProjectRoot ".expo"
New-Item -ItemType Directory -Force -Path $StateDir | Out-Null
$UrlFile = Join-Path $StateDir "metro-url.txt"
$LogFile = Join-Path $StateDir "metro-always-on.log"

function Say([string]$m) {
  $line = "[metro] $m"
  Write-Host $line -ForegroundColor Cyan
  Add-Content -LiteralPath $LogFile -Encoding UTF8 -Value ("[" + (Get-Date -Format "HH:mm:ss") + "] $m")
}

# зачем: IP переопределяется на КАЖДОЙ итерации, а не один раз — ноутбук может
# перепрыгнуть с домашнего Wi-Fi на хотспот телефона прямо посреди сессии, и
# устаревший REACT_NATIVE_PACKAGER_HOSTNAME тихо ломает связь без всякой ошибки.
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

# ── 1. Освободить свой порт (только свой, чужие сессии не трогаем) ──
Say "Освобождаю порт $Port (чужие порты не трогаю)..."
try {
  $owners = (Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue).OwningProcess |
    Select-Object -Unique
  foreach ($op in $owners) {
    try { Stop-Process -Id $op -Force -ErrorAction SilentlyContinue } catch {}
  }
} catch {}

# зачем: старый protected-metro-phone.ps1 мог остаться крутиться в фоне и бесконечно
# драться за тот же порт — гасим именно его, чтобы watchdog'и не воевали друг с другом.
Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
  Where-Object { $_.CommandLine -match 'protected-metro-phone\.ps1' } |
  ForEach-Object { try { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue } catch {} }
Start-Sleep -Seconds 1

# ── 2. Firewall (нужны права админа) ──
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
  [Security.Principal.WindowsBuiltInRole]::Administrator)
if ($isAdmin) {
  if (-not (Get-NetFirewallRule -DisplayName "Expo Metro $Port" -ErrorAction SilentlyContinue)) {
    try {
      New-NetFirewallRule -DisplayName "Expo Metro $Port" -Direction Inbound -LocalPort $Port `
        -Protocol TCP -Action Allow -Profile Any -ErrorAction Stop | Out-Null
      Say "Firewall: порт $Port открыт."
    } catch { Say ("Firewall: не смог добавить правило: " + $_.Exception.Message) }
  } else { Say "Firewall: правило для $Port уже есть." }
  try { Set-NetConnectionProfile -InterfaceAlias 'Wi-Fi' -NetworkCategory Private -ErrorAction Stop } catch {}
} else {
  Say "Без прав админа — firewall не трогаю. Если телефон не подключится, запусти в админ-PowerShell:"
  Write-Host ("    New-NetFirewallRule -DisplayName 'Expo Metro {0}' -Direction Inbound -LocalPort {0} -Protocol TCP -Action Allow -Profile Any" -f $Port) -ForegroundColor Yellow
}

# ── 3. Watchman в PATH (нативный вотчер вместо node-краулера) ──
if (-not (Get-Command watchman -ErrorAction SilentlyContinue)) {
  $wm = Get-ChildItem -Path $env:LOCALAPPDATA -Recurse -Filter watchman.exe -ErrorAction SilentlyContinue |
    Select-Object -First 1
  if ($wm) {
    $env:PATH = (Split-Path -Parent $wm.FullName) + ";" + $env:PATH
    Say "Watchman добавлен в PATH."
  }
}

# ── 4. Окружение: снимаем сами причины падений ──
Remove-Item Env:CI -ErrorAction SilentlyContinue
$env:CI = "false"
$env:EXPO_PUBLIC_DISABLE_EXPO_UPDATES = "1"
$env:EXPO_NO_TELEMETRY = "1"
$env:UV_THREADPOOL_SIZE = "128"        # зачем: лечит EMFILE при сканировании проекта
$env:NODE_OPTIONS = "--max-old-space-size=12288"  # зачем: лечит heap OOM на больших бандлах

$localExpoCli = Join-Path $ProjectRoot 'node_modules\expo\bin\cli'
if (-not (Test-Path -LiteralPath $localExpoCli)) {
  Say "ОШИБКА: нет node_modules\expo\bin\cli. Выполни npm install."
  exit 1
}

# ── 5. Keep-alive: не давать Windows усыпить машину, пока Metro жив ──
# зачем: когда ноутбук засыпает, телефон теряет сервер и приходится переподключаться
# вручную — ровно та боль, ради которой всё это делается.
# Реализация через powercfg-запрос "presentation mode" (встроенная утилита Windows),
# а не через Add-Type/P-Invoke: компиляция C# на лету ломала парсинг этого скрипта.
$keepAwakeProc = $null
try {
  $keepAwakeProc = Start-Process -FilePath "powercfg.exe" `
    -ArgumentList "/requestsoverride", "PROCESS", "node.exe", "System" `
    -WindowStyle Hidden -PassThru -Wait -ErrorAction Stop
  Say "Сон компьютера отключён на время работы Metro."
} catch {
  Say "Не удалось отключить сон (не критично, нужны права админа)."
}

# ── 6. Watchdog ──
$attempt = 0
$fastFailStreak = 0
try {
  while ($true) {
    $attempt++

    $lanIp = Get-LanIp
    if (-not $lanIp) {
      Say "Нет LAN IP — проверь Wi-Fi. Жду 10 сек и пробую снова."
      Start-Sleep -Seconds 10
      continue
    }

    $expoArgs = @("start", "--dev-client", "--port", "$Port")
    if ($Tunnel) {
      $expoArgs += "--tunnel"
      Say "Режим TUNNEL. Адрес вида exp-direct появится ниже. Телефону нужен интернет."
    } else {
      $env:REACT_NATIVE_PACKAGER_HOSTNAME = $lanIp
      $expoArgs += "--lan"
      $url = "http://{0}:{1}" -f $lanIp, $Port
      Set-Content -LiteralPath $UrlFile -Encoding UTF8 -Value $url
      Write-Host ""
      Write-Host "  ==================================================" -ForegroundColor Green
      Write-Host "   НА iPhone (Enter URL manually):" -ForegroundColor Green
      Write-Host ("      {0}" -f $url) -ForegroundColor Green
      Write-Host "   Телефон и ноутбук — в одной Wi-Fi сети." -ForegroundColor Green
      Write-Host "  ==================================================" -ForegroundColor Green
      Write-Host ""
    }

    # зачем: --clear только на ПЕРВОЙ попытке — чистить кэш при каждом авто-перезапуске
    # значит делать каждый рестарт медленным без всякой пользы.
    if ($Clear -and $attempt -eq 1) { $expoArgs += "--clear" }

    Say "Старт Metro (попытка #$attempt)"
    $startedAt = Get-Date

    # зачем: вызываем node напрямую и БЕЗ пайпа. npx из C:\Users\badlo\bin не запускается
    # в PowerShell-пайпе (ошибка «Cannot run a document in the middle of a pipeline»), а
    # обёртка в пайп ломает интерактивные клавиши Metro (r = reload, j = debugger).
    & node $localExpoCli @expoArgs
    $ranFor = (Get-Date) - $startedAt

    if ($ranFor.TotalSeconds -lt 10) {
      # зачем: мгновенный выход = ошибка конфига/порта, а не случайный краш. Без этого
      # тормоза watchdog уходил в шторм (в логе старого скрипта — 1363 попытки подряд).
      $fastFailStreak++
      if ($fastFailStreak -ge 3) {
        Say "Metro падает сразу 3 раза подряд — это ошибка настройки, а не случайный сбой."
        Say "Прочитай ошибку выше. Нажми любую клавишу чтобы попробовать снова, или закрой окно."
        [void][System.Console]::ReadKey($true)
        $fastFailStreak = 0
      } else {
        Say "Metro вышел за $([int]$ranFor.TotalSeconds) сек. Пауза 5 сек..."
        Start-Sleep -Seconds 5
      }
    } else {
      $fastFailStreak = 0
      Say "Metro проработал $([int]$ranFor.TotalSeconds) сек и упал. Поднимаю заново через 3 сек..."
      Say "На телефоне после перезапуска перезагрузи приложение — старый сокет не переподключается."
      Start-Sleep -Seconds 3
    }
  }
} finally {
  # зачем: снять запрет на сон, иначе ноутбук перестанет засыпать и после закрытия окна.
  try {
    Start-Process -FilePath "powercfg.exe" `
      -ArgumentList "/requestsoverride", "PROCESS", "node.exe" `
      -WindowStyle Hidden -Wait -ErrorAction SilentlyContinue | Out-Null
  } catch {}
  Say "Watchdog остановлен. Сон компьютера возвращён в норму."
}
