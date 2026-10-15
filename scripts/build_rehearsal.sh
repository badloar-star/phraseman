#!/bin/bash
# Репетиция сборки EAS из чистого HEAD одной командой (координатор 15.10; главный предохранитель перед сборкой).
#
# зачем: 15.10 репетиция нашла две поломки, которые local release:precheck НЕ ловил (там исходники курса и node_modules на месте):
#   1) строгая сверка V2 на сервере EAS без исходников → eas-build-post-install ОТКАЗ;
#   2) рантайм импортировал JSON из content/, невидимого на чистой машине → бандл не собирался.
# Здесь — ровно то, что получит EAS: файлы HEAD минус .easignore, переменные профиля production, гейты post-install, экспорт android.
#
# Запуск из корня репо:  bash scripts/build_rehearsal.sh            (папка по умолчанию C:/Temp/claude/build_rehearsal)
#                        REHEARSAL_DIR=/c/Temp/x bash scripts/build_rehearsal.sh
# Итог — последняя строка: «[REHEARSAL] PASS …» / «[REHEARSAL] FAIL …», код выхода 0 / 1. Логи — в $REHEARSAL_DIR.logs/.
#
# Отличия от EAS (честно): node_modules — junction на основное дерево (только чтение, lockfile тот же, без npm ci);
# экспорт без Watchman (через junction Watchman не видит node_modules). Секреты EAS (EXPO_PUBLIC_RC_*) здесь не подставляются —
# проверка версии без них = WARN, а не FAIL. Репо не меняется: общий индекс не трогается (временный GIT_INDEX_FILE).
set -u
ROOT=$(cd "$(dirname "$0")/.." && pwd)
X=${REHEARSAL_DIR:-/c/Temp/claude/build_rehearsal}
LOG=${X}.logs
mkdir -p "$LOG"
: > "$LOG/summary.txt"
mem() { powershell -NoProfile -Command "[math]::Round((Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory/1024)" 2>/dev/null | tr -d '\r'; }
say() { echo "[REHEARSAL] $*" | tee -a "$LOG/summary.txt"; }
fail=0; warn=0

cd "$ROOT" || exit 1
HEADSHA=$(git rev-parse --short HEAD)
say "HEAD=$HEADSHA dir=$X logs=$LOG free=$(mem)МБ $(date +%T)"

# 0) зачем (координатор 15.10 ночь): репетиция собирает HEAD, а EAS — РАБОЧУЮ папку. Если в ней потолок V2 / набор звука /
# таблица голосов отличаются от закоммиченных (незакоммиченный прогон сторожа переписывал потолок на 145), зелёная
# репетиция ничего не доказывает о реальной сборке. Стоп сразу, с понятным логом.
if node scripts/learning_v2_ceiling_committed_gate.mjs > "$LOG/ceiling_gate.log" 2>&1; then
  say "ceiling_committed=PASS ($(grep -o 'потолок [0-9]*' "$LOG/ceiling_gate.log" | head -1))"
else
  say "ceiling_committed=FAIL: $(grep -m1 'отличается' "$LOG/ceiling_gate.log" | cut -c1-200)"
  say "FAIL HEAD=$HEADSHA (рабочая папка ≠ HEAD по потолку V2 — EAS собрал бы не то) $(date +%T)"
  exit 1
fi

# 1) выгрузка: сначала снять junction (rmdir без /s удаляет только ссылку, не цель), потом папку целиком
if [ -e "$X/node_modules" ]; then cmd //c "rmdir $(cygpath -w "$X/node_modules")" > /dev/null 2>&1; fi
if [ -e "$X/node_modules" ]; then say "FAIL: не удалось снять junction $X/node_modules — папку не трогаю"; exit 1; fi
cmd //c "rmdir /s /q $(cygpath -w "$X")" > /dev/null 2>&1
mkdir -p "$X"
node scripts/build_rehearsal_files.mjs > "$LOG/files.txt" 2> "$LOG/files.err" || { say "FAIL: список файлов ($(cat "$LOG/files.err"))"; exit 1; }
cat "$LOG/files.err" | tee -a "$LOG/summary.txt"
TMP_INDEX="$LOG/rehearsal.index"
rm -f "$TMP_INDEX"
GIT_INDEX_FILE="$TMP_INDEX" git read-tree HEAD || { say "FAIL: read-tree"; exit 1; }
GIT_INDEX_FILE="$TMP_INDEX" git checkout-index --prefix="$(cygpath -m "$X")/" --stdin < "$LOG/files.txt" 2> "$LOG/checkout.err" \
  || { say "FAIL: checkout-index ($(head -3 "$LOG/checkout.err"))"; exit 1; }
rm -f "$TMP_INDEX"
say "выгружено файлов: $(find "$X" -type f | wc -l)"

# 2) node_modules — junction на основное дерево (только чтение)
cmd //c "mklink /J $(cygpath -w "$X/node_modules") $(cygpath -w "$ROOT/node_modules")" > /dev/null
[ -f "$X/node_modules/expo/package.json" ] || { say "FAIL: junction node_modules"; exit 1; }

# 3) eas-build-post-install, как на EAS production android
cd "$X" || exit 1
node scripts/release_keys_gate.mjs > "$LOG/post_install.log" 2>&1; rc=$?
[ $rc -eq 0 ] && say "release_keys(static)=PASS" || { say "release_keys(static)=FAIL ($rc)"; fail=1; }
export EAS_BUILD=true EAS_BUILD_PROFILE=production EAS_BUILD_PLATFORM=android CI=1
export EXPO_PUBLIC_STORE_RELEASE=1 EXPO_PUBLIC_AI_DIALOG_ENABLED=true EXPO_PUBLIC_EXPLAIN_ENABLED=true
for g in scripts/eas_production_version_gate.mjs scripts/learning_v2_plan_b_gates.mjs scripts/store_route_reachability.mjs; do
  echo "--- $g" >> "$LOG/post_install.log"
  node "$g" > "$LOG/gate.tmp" 2>&1; rc=$?
  cat "$LOG/gate.tmp" >> "$LOG/post_install.log"
  if [ $rc -eq 0 ]; then say "$g=PASS"
  elif [ "$g" = scripts/eas_production_version_gate.mjs ] && grep -q "EXPO_PUBLIC_RC_[A-Z]* is missing for production build" "$LOG/gate.tmp"; then
    say "$g=WARN (нет секрета EAS: $(grep -o 'EXPO_PUBLIC_RC_[A-Z]*' "$LOG/gate.tmp" | head -1) — на сервере берётся из окружения production)"; warn=1
  else say "$g=FAIL ($rc): $(grep -m1 -E 'Error|ОТКАЗ|FAIL' "$LOG/gate.tmp" | cut -c1-200)"; fail=1; fi
done
rm -f "$LOG/gate.tmp"

# 4) стор-экспорт android (через светофор; 4 преобразователя — память ПК)
grep -q "REHEARSAL_WATCH" metro.config.js || printf "\n// REHEARSAL_WATCH (только временная копия репетиции): node_modules — junction, сборщик не обходит ссылку сам.\nconfig.watchFolders = [...(config.watchFolders || []), '%s'];\n" "$(cygpath -m "$ROOT/node_modules")" >> metro.config.js
start=$(date +%s)
bash "$ROOT/.claude/semaphore/slot.sh" run "репетиция сборки — экспорт android" -- \
  env PHRASEMAN_NO_WATCHMAN=1 PHRASEMAN_METRO_MAX_WORKERS=4 npx expo export --platform android --output-dir dist-rehearsal > "$LOG/export.log" 2>&1
rc=$?
secs=$(( $(date +%s) - start ))
bundle=$(ls dist-rehearsal/_expo/static/js/android/*.hbc 2>/dev/null | head -1)
if [ $rc -eq 0 ] && [ -n "$bundle" ]; then say "export android=PASS (${secs} с, $(( $(stat -c %s "$bundle") / 1048576 )) МБ)"
else say "export android=FAIL ($rc, ${secs} с): $(grep -m1 -E 'Unable to resolve|Cannot find module|Error:' "$LOG/export.log" | cut -c1-240)"; fail=1; fi

# итог одной строкой
if [ $fail -ne 0 ]; then say "FAIL HEAD=$HEADSHA — см. $LOG/summary.txt"; exit 1; fi
say "PASS HEAD=$HEADSHA$([ $warn -ne 0 ] && echo ' (WARN: секреты EAS не проверены локально)') $(date +%T)"
exit 0
