#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════════════════════
# dev-mac-restart.sh — перезапуск дев-окружения на macOS.
#
# Зачем: скрипты в package.json (bundler / dev / android) написаны под
# PowerShell и на маке не работают. Этот — работает.
#
#   ./scripts/dev-mac-restart.sh            # Metro с чисткой кеша + reload
#   ./scripts/dev-mac-restart.sh --no-clear # без чистки кеша (быстрее)
#   ./scripts/dev-mac-restart.sh --ios      # для iOS-симулятора
# ════════════════════════════════════════════════════════════════════════════
set -uo pipefail
cd "$(dirname "$0")/.."

CLEAR="--clear"
PLATFORM="android"
for arg in "$@"; do
  case "$arg" in
    --no-clear) CLEAR="" ;;
    --ios)      PLATFORM="ios" ;;
    --android)  PLATFORM="android" ;;
  esac
done

echo "▸ снимаю залипшие порты"
npx kill-port 8081 8082 8083 8084 8085 8086 8087 8088 19000 19001 >/dev/null 2>&1 || true

if command -v watchman >/dev/null 2>&1; then
  echo "▸ сбрасываю watchman (иначе новые файлы могут не попасть в граф Metro)"
  watchman watch-del-all >/dev/null 2>&1 || true
fi

if [ -n "$CLEAR" ]; then
  echo "▸ чищу кеш Metro и haste-map"
  rm -rf "${TMPDIR:-/tmp}"/metro-* "${TMPDIR:-/tmp}"/haste-map-* 2>/dev/null || true
fi

if [ "$PLATFORM" = "android" ]; then
  if command -v adb >/dev/null 2>&1; then
    echo "▸ пробрасываю порт в эмулятор"
    adb reverse tcp:8081 tcp:8081 >/dev/null 2>&1 || echo "  (устройство не подключено — пропускаю)"
    # перезагрузку бандла шлём с задержкой, когда Metro уже поднялся
    ( sleep 12; adb shell input keyevent 82 >/dev/null 2>&1 || true ) &
  else
    echo "  adb не найден в PATH — открой меню разработчика вручную (Cmd+M → Reload)"
  fi
fi

echo "▸ поднимаю Metro"
exec npx cross-env CI=false expo start --dev-client --lan --port 8081 $CLEAR
