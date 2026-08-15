#!/usr/bin/env bash
#
# Смоук-тест MAX Voice одной командой (МАКС ПЛАН §9).
#
#   bash scripts/max_voice_smoke.sh
#
# Что делает: проверяет окружение → ставит зависимости → временно включает
# dev-премиум и голосовой гейт → собирает и запускает приложение на iOS-симуляторе
# → прогоняет Maestro-флоу .maestro/max_voice_smoke.yaml → складывает скриншоты и
# логи в tmp/smoke_artifacts/.
#
# Зачем скрипт, а не список команд в README: смоук трогает app/config.ts
# (dev-премиум), и его ОБЯЗАТЕЛЬНО нужно вернуть назад — инвариант
# `FORCE_PREMIUM_DEV_INTENT = false` в коммите защищён тестом
# tests/force_premium_prod_guard.test.ts. Ручной прогон рискует оставить правку
# в рабочей копии; здесь откат висит на trap и проверяется в конце.
#
# Ничего не коммитит и не пушит.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

ARTIFACTS="tmp/smoke_artifacts"
CONFIG_FILE="app/config.ts"
CONFIG_BACKUP="tmp/.config.ts.smoke_backup"
LOG="$ARTIFACTS/run.log"

SIMULATOR_NAME="${SIMULATOR_NAME:-iPhone 16 Pro}"
APP_ID="app.phraseman"

# ── Вывод ────────────────────────────────────────────────────────────────────
step() { printf '\n\033[1;36m▸ %s\033[0m\n' "$*"; }
ok()   { printf '\033[1;32m  ✓ %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m  ! %s\033[0m\n' "$*"; }
die()  { printf '\n\033[1;31m✗ %s\033[0m\n\n' "$*" >&2; exit 1; }

# ── Откат правки config.ts при ЛЮБОМ выходе ─────────────────────────────────
CONFIG_PATCHED=0
restore_config() {
  if [ "$CONFIG_PATCHED" = "1" ] && [ -f "$CONFIG_BACKUP" ]; then
    cp "$CONFIG_BACKUP" "$CONFIG_FILE"
    rm -f "$CONFIG_BACKUP"
    CONFIG_PATCHED=0
    printf '\033[1;32m  ✓ app/config.ts возвращён в исходное состояние\033[0m\n'
  fi
}
trap restore_config EXIT INT TERM

mkdir -p "$ARTIFACTS"
: > "$LOG"

# ── 1. Проверка окружения ───────────────────────────────────────────────────
step "Проверяю окружение"

[ "$(uname -s)" = "Darwin" ] || die "Этот скрипт нужно запускать на macOS (нужен Xcode и iOS-симулятор)."

command -v xcrun >/dev/null 2>&1 || die "Не найден xcrun. Установи Xcode и Command Line Tools: xcode-select --install"
ok "xcrun есть"

if ! xcrun simctl list >/dev/null 2>&1; then
  die "xcrun simctl не работает. Обычно чинится так:
     sudo xcode-select -s /Applications/Xcode.app/Contents/Developer"
fi
ok "iOS-симуляторы доступны"

command -v node >/dev/null 2>&1 || die "Не найден node."
ok "node $(node -v)"

MAESTRO_BIN=""
if command -v maestro >/dev/null 2>&1; then
  MAESTRO_BIN="maestro"
elif [ -x "$HOME/.maestro/bin/maestro" ]; then
  MAESTRO_BIN="$HOME/.maestro/bin/maestro"
fi
if [ -z "$MAESTRO_BIN" ]; then
  die "Не найден maestro. Установить:
     curl -Ls https://get.maestro.mobile.dev | bash
     затем открыть новый терминал (или добавить \$HOME/.maestro/bin в PATH)."
fi
ok "maestro: $MAESTRO_BIN"

[ -f ".maestro/max_voice_smoke.yaml" ] || die "Не найден .maestro/max_voice_smoke.yaml — репозиторий неполный?"
ok "флоу смоук-теста на месте"

# ── 2. Зависимости ──────────────────────────────────────────────────────────
step "Проверяю зависимости"
if [ ! -d "node_modules/react-native-webrtc" ] || [ ! -d "node_modules/react-native-incall-manager" ]; then
  warn "Нативные пакеты MAX Voice не установлены — ставлю (это разово, пара минут)"
  npm install 2>&1 | tee -a "$LOG" | tail -5
else
  ok "react-native-webrtc и react-native-incall-manager на месте"
fi

# ── 3. Временно включаем dev-премиум ────────────────────────────────────────
step "Временно включаю dev-премиум (иначе сервер откажет в минте сессии)"

if ! grep -q 'const FORCE_PREMIUM_DEV_INTENT = false;' "$CONFIG_FILE"; then
  if grep -q 'const FORCE_PREMIUM_DEV_INTENT = true;' "$CONFIG_FILE"; then
    warn "FORCE_PREMIUM_DEV_INTENT уже true — оставляю как есть, откатывать не буду"
  else
    die "Не нашёл ожидаемую строку FORCE_PREMIUM_DEV_INTENT в $CONFIG_FILE — файл изменился, останавливаюсь, чтобы ничего не сломать."
  fi
else
  cp "$CONFIG_FILE" "$CONFIG_BACKUP"
  CONFIG_PATCHED=1
  # sed -i '' — синтаксис BSD sed (macOS), не GNU.
  sed -i '' 's/const FORCE_PREMIUM_DEV_INTENT = false;/const FORCE_PREMIUM_DEV_INTENT = true;/' "$CONFIG_FILE"
  grep -q 'const FORCE_PREMIUM_DEV_INTENT = true;' "$CONFIG_FILE" || die "Не удалось пропатчить $CONFIG_FILE"
  ok "dev-премиум включён на время прогона (вернётся автоматически в конце)"
fi

# ── 4. Симулятор ────────────────────────────────────────────────────────────
step "Поднимаю симулятор: $SIMULATOR_NAME"

DEVICE_ID="$(xcrun simctl list devices available -j \
  | node -e '
    let raw = "";
    process.stdin.on("data", (c) => (raw += c));
    process.stdin.on("end", () => {
      const want = process.argv[1];
      const data = JSON.parse(raw).devices || {};
      const all = Object.values(data).flat();
      // Точное совпадение имени, иначе первый доступный iPhone — лишь бы
      // смоук поехал, а не упёрся в отсутствие конкретной модели.
      const exact = all.find((d) => d.name === want && d.isAvailable !== false);
      const anyIphone = all.find((d) => /iPhone/.test(d.name) && d.isAvailable !== false);
      const picked = exact || anyIphone;
      process.stdout.write(picked ? picked.udid : "");
    });
  ' "$SIMULATOR_NAME")"

[ -n "$DEVICE_ID" ] || die "Не нашёл ни одного доступного iPhone-симулятора. Открой Xcode → Settings → Platforms и поставь iOS runtime."
ok "симулятор: $DEVICE_ID"

xcrun simctl boot "$DEVICE_ID" >/dev/null 2>&1 || true
open -a Simulator --args -CurrentDeviceUDID "$DEVICE_ID" >/dev/null 2>&1 || true
xcrun simctl bootstatus "$DEVICE_ID" -b >/dev/null 2>&1 || true
ok "симулятор загружен"

# ── 5. Сборка и установка ───────────────────────────────────────────────────
step "Собираю приложение (первый раз с WebRTC — долго, 10–25 минут; дальше быстрее)"
warn "Логи сборки: $LOG"

# EXPO_PUBLIC_* вшиваются в бандл на этапе сборки — именно поэтому гейт
# голосовой линии включается здесь, а не в рантайме.
set +e
EXPO_PUBLIC_MAX_VOICE_ENABLED=true \
EXPO_PUBLIC_DISABLE_EXPO_UPDATES=1 \
CI=false \
  npx expo run:ios --device "$DEVICE_ID" >>"$LOG" 2>&1
BUILD_STATUS=$?
set -e

if [ $BUILD_STATUS -ne 0 ]; then
  printf '\n\033[1;31m✗ Сборка упала (код %s). Последние 40 строк лога:\033[0m\n\n' "$BUILD_STATUS"
  tail -40 "$LOG"
  die "Полный лог: $LOG — покажи его ассистенту, он разберёт ошибку."
fi
ok "приложение собрано и установлено"

# ── 6. Прогон Maestro ───────────────────────────────────────────────────────
step "Прогоняю смоук-флоу"

# Пишем системный лог симулятора параллельно — если звонок не поднимется,
# причина (сеть/permissions/webrtc) будет видна именно здесь.
xcrun simctl spawn "$DEVICE_ID" log stream --level debug \
  --predicate "processImagePath CONTAINS 'Phraseman'" \
  > "$ARTIFACTS/simulator.log" 2>&1 &
LOG_PID=$!
cleanup_logstream() { kill "$LOG_PID" >/dev/null 2>&1 || true; }
trap 'cleanup_logstream; restore_config' EXIT INT TERM

set +e
"$MAESTRO_BIN" test .maestro/max_voice_smoke.yaml \
  --format junit --output "$ARTIFACTS/maestro_report.xml" \
  2>&1 | tee "$ARTIFACTS/maestro.log"
MAESTRO_STATUS=${PIPESTATUS[0]}
set -e

cleanup_logstream

# ── 7. Итог ─────────────────────────────────────────────────────────────────
step "Готово"

SHOTS=$(ls -1 "$ARTIFACTS"/*.png 2>/dev/null | wc -l | tr -d ' ')
ok "скриншотов снято: $SHOTS"
ok "артефакты: $ARTIFACTS/"

if [ "$MAESTRO_STATUS" -ne 0 ]; then
  warn "Флоу завершился с ошибкой (код $MAESTRO_STATUS) — это нормальный результат смоука,"
  warn "он показывает, ГДЕ именно сломалось. Скриншоты до места падения уже сняты."
fi

cat <<EOF

────────────────────────────────────────────────────────────────────────
Что теперь: покажи ассистенту содержимое папки

    $ARTIFACTS/

Там: скриншоты каждого шага (01..12), maestro.log, simulator.log, run.log.
Ассистент прочитает их сам и скажет, что прошло, а что нет.
────────────────────────────────────────────────────────────────────────

EOF

exit 0
