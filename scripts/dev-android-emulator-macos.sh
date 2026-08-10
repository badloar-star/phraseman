#!/bin/zsh

# Phraseman: one-click Android emulator + current local app build for macOS.
# The Desktop .command launcher delegates here so the implementation stays versioned.

set -u

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd -P)"
LOG_DIR="$HOME/Library/Logs/Phraseman"
LOG_FILE="$LOG_DIR/android-emulator-launch.log"
CHECK_ONLY="${1:-}"

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

find_android_sdk() {
  local candidate
  local -a candidates
  candidates=(
    "${ANDROID_HOME:-}"
    "${ANDROID_SDK_ROOT:-}"
    "$HOME/Library/Android/sdk"
    "$HOME/Android/Sdk"
    "/usr/local/share/android-sdk"
    "/opt/homebrew/share/android-sdk"
  )
  for candidate in "${candidates[@]}"; do
    if [[ -n "$candidate" && -x "$candidate/platform-tools/adb" && -x "$candidate/emulator/emulator" ]]; then
      print -r -- "$candidate"
      return 0
    fi
  done
  return 1
}

if [[ ! -d "$PROJECT_ROOT" || ! -f "$PROJECT_ROOT/package.json" ]]; then
  pause_on_error "Не найден проект Phraseman: $PROJECT_ROOT"
fi

if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  pause_on_error "Не найдены Node.js/npm. Установи Node.js и повтори запуск."
fi

SDK_ROOT="$(find_android_sdk || true)"
if [[ -z "$SDK_ROOT" ]]; then
  say "Android SDK или Emulator не найден."
  say "Установи Android Studio, затем в Device Manager создай Android Virtual Device."
  if [[ "$CHECK_ONLY" == "--check" ]]; then
    pause_on_error "Проверка остановлена: Android SDK пока не установлен."
  fi
  open "https://developer.android.com/studio" >/dev/null 2>&1 || true
  pause_on_error "Открыта страница установки Android Studio. После установки снова запусти этот ярлык."
fi

export ANDROID_HOME="$SDK_ROOT"
export ANDROID_SDK_ROOT="$SDK_ROOT"
export PATH="$SDK_ROOT/platform-tools:$SDK_ROOT/emulator:$PATH"

ADB="$SDK_ROOT/platform-tools/adb"
EMULATOR="$SDK_ROOT/emulator/emulator"

AVD_LIST="$($EMULATOR -list-avds 2>>"$LOG_FILE" || true)"
if [[ -z "${AVD_LIST//[[:space:]]/}" ]]; then
  if [[ -d "/Applications/Android Studio.app" ]]; then
    open -a "Android Studio" >/dev/null 2>&1 || true
  fi
  pause_on_error "В Android Studio нет эмулятора. Создай его: Tools → Device Manager → Add device."
fi

if [[ "$CHECK_ONLY" == "--check" ]]; then
  say "Проверка пройдена: SDK=$SDK_ROOT"
  say "Доступные эмуляторы: ${AVD_LIST//$'\n'/, }"
  exit 0
fi

mkdir -p "$HOME/.android"
touch "$HOME/.android/repositories.cfg"

"$ADB" start-server >>"$LOG_FILE" 2>&1 || pause_on_error "Не удалось запустить adb. Подробности: $LOG_FILE"

SERIAL="$($ADB devices | awk '$1 ~ /^emulator-/ && $2 == "device" { print $1; exit }')"
if [[ -z "$SERIAL" ]]; then
  AVD_NAME="$(print -r -- "$AVD_LIST" | awk 'NF { print; exit }')"
  say "Запускаю Android-эмулятор: $AVD_NAME"
  nohup "$EMULATOR" -avd "$AVD_NAME" -gpu auto -no-boot-anim >>"$LOG_FILE" 2>&1 &

  say "Жду загрузку Android..."
  for _ in {1..240}; do
    SERIAL="$($ADB devices | awk '$1 ~ /^emulator-/ && $2 == "device" { print $1; exit }')"
    if [[ -n "$SERIAL" ]]; then
      BOOTED="$($ADB -s "$SERIAL" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')"
      [[ "$BOOTED" == "1" ]] && break
    fi
    sleep 1
  done
fi

if [[ -z "$SERIAL" ]]; then
  pause_on_error "Эмулятор не появился в adb за 4 минуты. Подробности: $LOG_FILE"
fi

BOOTED="$($ADB -s "$SERIAL" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')"
if [[ "$BOOTED" != "1" ]]; then
  pause_on_error "Android не завершил загрузку за 4 минуты. Подробности: $LOG_FILE"
fi

say "Android готов: $SERIAL"

if [[ -d "/Applications/Android Studio.app/Contents/jbr/Contents/Home" ]]; then
  export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
elif JAVA_HOME_DETECTED="$(/usr/libexec/java_home 2>/dev/null)"; then
  export JAVA_HOME="$JAVA_HOME_DETECTED"
else
  pause_on_error "Не найдена Java. Android Studio устанавливает подходящую Java автоматически."
fi

cd "$PROJECT_ROOT" || pause_on_error "Не удалось открыть проект: $PROJECT_ROOT"

say "Останавливаю старый Metro на порту 8081..."
npx --yes kill-port 8081 >>"$LOG_FILE" 2>&1 || true
"$ADB" -s "$SERIAL" reverse tcp:8081 tcp:8081 >>"$LOG_FILE" 2>&1 || true

unset CI
export EXPO_PUBLIC_DISABLE_EXPO_UPDATES=1

say "Собираю и запускаю актуальный Phraseman на $SERIAL..."
say "Окно оставь открытым: в нём работает Metro. Лог: $LOG_FILE"
exec npx expo run:android --variant debug
