#!/bin/zsh

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd -P)"
exec /bin/zsh "$PROJECT_ROOT/START_IPHONE_METRO.command" "$@"

: <<'LEGACY_IMPLEMENTATION'

# Phraseman — Metro в режиме LAN с QR-кодом для реального iPhone.
# Сканируешь QR обычной Камерой iPhone → приложение открывается в дев-билде.
# Требования:
#   • iPhone и Mac в ОДНОЙ Wi-Fi сети;
#   • на iPhone установлен development build Phraseman (Expo Go не подойдёт —
#     в проекте есть нативные модули).
#
# Опции:  --clear   очистить кэш Metro
#         --port=8081

set -u

# Запуск из Finder даёт урезанный PATH — восстанавливаем типовые пути.
export PATH="/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:$PATH"
if [[ -s "$HOME/.nvm/nvm.sh" ]]; then
  source "$HOME/.nvm/nvm.sh" >/dev/null 2>&1 || true
fi

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd -P)"
LOG_DIR="$HOME/Library/Logs/Phraseman"
LOG_FILE="$LOG_DIR/lan-qr.log"
PORT="${PHRASEMAN_METRO_PORT:-8081}"
CLEAR_CACHE=0

for arg in "$@"; do
  case "$arg" in
    --clear)   CLEAR_CACHE=1 ;;
    --port=*)  PORT="${arg#--port=}" ;;
  esac
done

mkdir -p "$LOG_DIR"
touch "$LOG_FILE"

say() { print -r -- "[$(date '+%H:%M:%S')] $*" | tee -a "$LOG_FILE"; }

die() {
  say "$1"
  print
  read -r "?Нажми Enter, чтобы закрыть окно..."
  exit 1
}

clear
print '────────────────────────────────────────────────'
print '  Phraseman — Metro (LAN) с QR-кодом для iPhone'
print '────────────────────────────────────────────────'
print

[[ -f "$PROJECT_ROOT/package.json" ]] || die "Не найден проект: $PROJECT_ROOT"
command -v node >/dev/null 2>&1 || die "Не найден Node.js. Установи его и повтори."

# ── Локальный Wi-Fi адрес Mac ───────────────────────────────────────────────
LAN_IP=""
DEFAULT_IF="$(route -n get default 2>/dev/null | awk '/interface:/{print $2}')"
if [[ -n "$DEFAULT_IF" ]]; then
  LAN_IP="$(ipconfig getifaddr "$DEFAULT_IF" 2>/dev/null || true)"
fi
if [[ -z "$LAN_IP" ]]; then
  for iface in en0 en1 en2 en3 en4 en5; do
    LAN_IP="$(ipconfig getifaddr "$iface" 2>/dev/null || true)"
    [[ -n "$LAN_IP" ]] && break
  done
fi
[[ -n "$LAN_IP" ]] || die "Mac не подключён к Wi-Fi (нет локального IP). Подключись к той же сети, что и iPhone."

# ── Свободный порт (старый Metro не убиваем) ────────────────────────────────
port_busy() { lsof -nP -iTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1; }

START_PORT="$PORT"
while port_busy "$PORT"; do
  PORT=$((PORT + 1))
  if (( PORT > START_PORT + 20 )); then
    die "Не нашёл свободный порт рядом с $START_PORT."
  fi
done
if [[ "$PORT" != "$START_PORT" ]]; then
  say "Порт $START_PORT занят — беру $PORT."
fi

say "Wi-Fi адрес Mac: $LAN_IP"
print
print "  1. iPhone должен быть в той же Wi-Fi сети, что и Mac."
print "  2. Наведи обычную Камеру iPhone на QR-код ниже → «Открыть в Phraseman»."
print "  3. Если QR не срабатывает — открой на iPhone вручную:"
print "        exp+phraseman://expo-development-client/?url=http%3A%2F%2F$LAN_IP%3A$PORT"
print "     или в дев-клиенте вбей адрес:  http://$LAN_IP:$PORT"
print
print '  Остановить: Ctrl+C в этом окне.'
print '────────────────────────────────────────────────'
print

cd "$PROJECT_ROOT" || die "Не удалось перейти в $PROJECT_ROOT"

if [[ ! -d node_modules ]]; then
  say "Нет node_modules — ставлю зависимости (один раз, это займёт пару минут)..."
  npm install || die "npm install завершился с ошибкой."
fi

# Принудительно LAN (не localhost и не tunnel) — иначе телефон не достучится.
export REACT_NATIVE_PACKAGER_HOSTNAME="$LAN_IP"
export EXPO_NO_TELEMETRY=1
export CI=false
export NODE_OPTIONS="--max-old-space-size=12288"

EXPO_ARGS=(start --dev-client --lan --port "$PORT")
if (( CLEAR_CACHE )); then
  EXPO_ARGS+=(--clear)
  say "Запускаю Metro в режиме LAN (с очисткой кэша)..."
else
  say "Запускаю Metro в режиме LAN..."
fi
print

npx expo "${EXPO_ARGS[@]}"

STATUS=$?
print
say "Metro остановлен (код $STATUS)."
read -r "?Нажми Enter, чтобы закрыть окно..."
LEGACY_IMPLEMENTATION
