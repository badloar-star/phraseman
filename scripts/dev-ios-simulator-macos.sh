#!/bin/zsh

# Phraseman: one-click iOS Simulator + current local app build for macOS.
# Build products intentionally live in /tmp: macOS File Provider metadata in the
# repository can otherwise make codesign reject the simulator application.

set -u

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd -P)"
LOG_DIR="$HOME/Library/Logs/Phraseman"
LOG_FILE="$LOG_DIR/ios-simulator-launch.log"
DERIVED_DATA="/tmp/phraseman-ios-derived-codex"
CHECK_ONLY="${1:-}"
BUNDLE_ID="app.phraseman"
METRO_PID=""

mkdir -p "$LOG_DIR"
touch "$LOG_FILE"

timestamp() {
  date '+%Y-%m-%d %H:%M:%S'
}

say() {
  print -r -- "[$(timestamp)] $*" | tee -a "$LOG_FILE"
}

pause_on_error() {
  say "$1"
  if [[ "$CHECK_ONLY" == "--check" ]]; then
    exit 1
  fi
  print
  read -r "?Нажми Enter, чтобы закрыть окно..."
  exit 1
}

first_device_id() {
  xcrun simctl list devices available | awk -F '[()]' '/iPhone/ { print $2; exit }'
}

booted_device_id() {
  xcrun simctl list devices booted | awk -F '[()]' '/iPhone/ { print $2; exit }'
}

if [[ ! -d "$PROJECT_ROOT" || ! -f "$PROJECT_ROOT/package.json" ]]; then
  pause_on_error "Не найден проект Phraseman: $PROJECT_ROOT"
fi

if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  pause_on_error "Не найдены Node.js/npm. Установи Node.js и повтори запуск."
fi

if ! command -v xcodebuild >/dev/null 2>&1 || ! command -v xcrun >/dev/null 2>&1; then
  pause_on_error "Не найден Xcode. Установи Xcode и Command Line Tools."
fi

if [[ ! -d "$PROJECT_ROOT/ios/Phraseman.xcworkspace" ]]; then
  pause_on_error "Не найден ios/Phraseman.xcworkspace."
fi

DEVICE_ID="$(booted_device_id)"
if [[ -z "$DEVICE_ID" ]]; then
  DEVICE_ID="$(first_device_id)"
fi
if [[ -z "$DEVICE_ID" ]]; then
  pause_on_error "В Xcode не найден доступный iPhone Simulator."
fi

if [[ "$CHECK_ONLY" == "--check" ]]; then
  say "Проверка пройдена: iPhone Simulator=$DEVICE_ID"
  say "DerivedData будет храниться вне проекта: $DERIVED_DATA"
  exit 0
fi

open -a Simulator >/dev/null 2>&1 || pause_on_error "Не удалось открыть Simulator."
if [[ -z "$(booted_device_id)" ]]; then
  say "Запускаю iPhone Simulator: $DEVICE_ID"
  xcrun simctl boot "$DEVICE_ID" >>"$LOG_FILE" 2>&1 || true
fi
xcrun simctl bootstatus "$DEVICE_ID" -b >>"$LOG_FILE" 2>&1 \
  || pause_on_error "Simulator не завершил загрузку. Подробности: $LOG_FILE"

cd "$PROJECT_ROOT" || pause_on_error "Не удалось открыть проект: $PROJECT_ROOT"

say "Собираю актуальный Phraseman для iOS Simulator..."
say "DerivedData: $DERIVED_DATA"
if ! xcodebuild -quiet \
  -workspace ios/Phraseman.xcworkspace \
  -scheme Phraseman \
  -configuration Debug \
  -sdk iphonesimulator \
  -destination "platform=iOS Simulator,id=$DEVICE_ID" \
  -derivedDataPath "$DERIVED_DATA" \
  COMPILER_INDEX_STORE_ENABLE=NO \
  build >>"$LOG_FILE" 2>&1; then
  pause_on_error "Сборка iOS завершилась ошибкой. Подробности: $LOG_FILE"
fi

APP_PATH="$DERIVED_DATA/Build/Products/Debug-iphonesimulator/Phraseman.app"
if [[ ! -d "$APP_PATH" ]]; then
  pause_on_error "После сборки не найдено приложение: $APP_PATH"
fi

SIGNATURE_INFO="$(codesign -dv --verbose=4 "$APP_PATH" 2>&1 || true)"
if print -r -- "$SIGNATURE_INFO" | grep -q 'linker-signed'; then
  pause_on_error "Xcode создал неполную linker-signed сборку; установка остановлена."
fi
if ! codesign --verify --deep --strict --verbose=2 "$APP_PATH" >>"$LOG_FILE" 2>&1; then
  pause_on_error "Проверка подписи приложения не пройдена. Подробности: $LOG_FILE"
fi

say "Останавливаю старый Metro на порту 8081..."
npx --yes kill-port 8081 >>"$LOG_FILE" 2>&1 || true

say "Запускаю Metro с увеличенным лимитом памяти..."
NODE_OPTIONS=--max-old-space-size=12288 \
  npx expo start --dev-client --localhost >>"$LOG_FILE" 2>&1 &
METRO_PID="$!"

for _ in {1..120}; do
  if ! kill -0 "$METRO_PID" 2>/dev/null; then
    pause_on_error "Metro неожиданно завершился. Подробности: $LOG_FILE"
  fi
  if curl -fsS http://127.0.0.1:8081/status 2>/dev/null | grep -q 'packager-status:running'; then
    break
  fi
  sleep 1
done

if ! curl -fsS http://127.0.0.1:8081/status 2>/dev/null | grep -q 'packager-status:running'; then
  pause_on_error "Metro не запустился за 2 минуты. Подробности: $LOG_FILE"
fi

xcrun simctl terminate "$DEVICE_ID" "$BUNDLE_ID" >>"$LOG_FILE" 2>&1 || true
xcrun simctl install "$DEVICE_ID" "$APP_PATH" >>"$LOG_FILE" 2>&1 \
  || pause_on_error "Не удалось установить приложение. Подробности: $LOG_FILE"
xcrun simctl launch "$DEVICE_ID" "$BUNDLE_ID" >>"$LOG_FILE" 2>&1 \
  || pause_on_error "Не удалось запустить приложение. Подробности: $LOG_FILE"

say "Phraseman запущен. Это окно держит Metro активным."
say "Лог: $LOG_FILE"
say "Для остановки нажми Control-C."

trap '[[ -n "$METRO_PID" ]] && kill "$METRO_PID" 2>/dev/null || true' INT TERM EXIT
wait "$METRO_PID"
