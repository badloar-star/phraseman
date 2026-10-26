#!/bin/bash
# ota_final_check.sh — финальная проверка Ревизора перед публикацией OTA (runtime — OTA_RUNTIME, по умолчанию 2.0.3). ТОЛЬКО ЧТЕНИЕ, ничего не публикует.
#
# зачем (координатор 25.10, правило сборки после 04ec8cd30): 🟢 Ревизора даётся только по ТОМУ ЖЕ хэшу, из которого собран dist-ota.
# Одна команда на 95 %: полный tsc этой ревизии, флаги по умолчанию против снимка (docs/work/release/ota_flag_baseline_2026-10-25.json),
# runtimeVersion = OTA_RUNTIME, натив без изменений с OTA_NATIVE_BASE, dev-строки в собранных бандлах (по карте) и тождество бандлов dist-ota с проверенными.
#
# Вход: снимок, собранный scripts/ota_from_head.sh (по умолчанию /c/Temp/claude/ota_head: .snapshot_head, dist-ios, dist-android, dist-ota).
# Запуск (тяжёлое — tsc — через светофор):
#   bash .claude/semaphore/slot.sh run --wait=3600 "OTA final check" -- bash scripts/ota_final_check.sh <полный-или-короткий-хэш> [снимок]
# Код выхода: 0 — все пункты зелёные; 1 — есть красный (печатается какой); 2 — неверный вызов.
set -u
REPO=$(cd "$(dirname "$0")/.." && pwd)
REV_IN=${1:-}
SNAP=${2:-/c/Temp/claude/ota_head}
[ -n "$REV_IN" ] || { echo "[OTA-FINAL] ✖ укажи хэш сборки"; exit 2; }
REV=$(git -C "$REPO" rev-parse "$REV_IN" 2>/dev/null) || { echo "[OTA-FINAL] ✖ нет ревизии $REV_IN"; exit 2; }
LOGD=/c/Temp/claude/ota_final_$(date +%m%d_%H%M); mkdir -p "$LOGD"
# зачем (координатор 26.10: полная 2.0.3 (145) в магазинах — обновления по воздуху теперь только для неё): runtime и натив-база сборки
# не вшиты, а заданы здесь; для 2.0.2 (сборка 144, 009c40c97) — OTA_RUNTIME=2.0.2 OTA_NATIVE_BASE=009c40c97.
OTA_RUNTIME=${OTA_RUNTIME:-2.0.3}
OTA_NATIVE_BASE=${OTA_NATIVE_BASE:-b60fa6ea3}
FAIL=0
ok()   { echo "[OTA-FINAL] ✅ $*"; }
bad()  { echo "[OTA-FINAL] 🔴 $*"; FAIL=1; }
note() { echo "[OTA-FINAL] ⚠️ $*"; }
echo "[OTA-FINAL] ревизия ${REV:0:9}, снимок $SNAP, журналы $LOGD"

# 0) снимок — именно эта ревизия
[ -f "$SNAP/.snapshot_head" ] || { bad "в снимке нет .snapshot_head — собран не ota_from_head.sh"; exit 1; }
SNAP_REV=$(tr -d '[:space:]' < "$SNAP/.snapshot_head")
[ "$SNAP_REV" = "$REV" ] && ok "снимок = ревизия ${REV:0:9}" || { bad "снимок ${SNAP_REV:0:9} ≠ ревизия ${REV:0:9} — проверять нечего, пересобери"; exit 1; }
SNAPW=$(cygpath -m "$SNAP")

# 1) runtimeVersion = OTA_RUNTIME, app.config.js не переопределяет
RT=$(node -e "console.log(require('$SNAPW/app.json').expo.runtimeVersion)")
[ "$RT" = "$OTA_RUNTIME" ] && ok "runtimeVersion = $OTA_RUNTIME" || bad "runtimeVersion = $RT, ждали $OTA_RUNTIME"
if [ -f "$SNAP/app.config.js" ] && grep -qE "runtimeVersion" "$SNAP/app.config.js"; then bad "app.config.js упоминает runtimeVersion — проверь, не переопределяет ли"; else ok "app.config.js не трогает runtimeVersion"; fi
DEPS=$(git -C "$REPO" diff "$OTA_NATIVE_BASE" "$REV" -- package.json package-lock.json app.json eas.json plugins patches | grep -cE '^[+-][^+-]')
[ "$DEPS" = "0" ] && ok "натив/зависимости без изменений с $OTA_NATIVE_BASE (сборка runtime $OTA_RUNTIME)" || bad "изменены package/app.json/eas/plugins/patches с $OTA_NATIVE_BASE ($DEPS строк) — OTA может не подойти к магазинной сборке runtime $OTA_RUNTIME"

# 2) флаги по умолчанию против снимка
node - "$SNAPW" "$(cygpath -m "$REPO")" > "$LOGD/flags.txt" 2>&1 <<'JS'
const fs = require('fs');
const [snap, repo] = process.argv.slice(2);
const base = JSON.parse(fs.readFileSync(repo + '/docs/work/release/ota_flag_baseline_2026-10-25.json', 'utf8'));
const s = fs.readFileSync(snap + '/app/remote_flags.ts', 'utf8');
const i = s.indexOf('const DEFAULT_FLAGS'); const j = s.indexOf('};', i);
const now = {}; for (const m of s.slice(i, j).matchAll(/^\s*([a-z0-9_]+)\s*:\s*(true|false)\s*,/gm)) now[m[1]] = m[2] === 'true';
let fail = 0;
for (const [k, v] of Object.entries(base.defaults)) {
  if (!(k in now)) { console.log(`RED  ${k}: был ${v}, флаг пропал`); fail++; continue; }
  if (now[k] !== v) {
    if (base.either.includes(k)) console.log(`NOTE ${k}: ${v} → ${now[k]} (допустимо: решение координатора)`);
    else { console.log(`RED  ${k}: снимок ${v}, сейчас ${now[k]}`); fail++; }
  } else if (base.either.includes(k)) console.log(`NOTE ${k} = ${now[k]} (решение координатора: склейка или выкл)`);
}
for (const k of Object.keys(now)) if (!(k in base.defaults)) { console.log(`RED  новый флаг ${k} = ${now[k]} — нет в снимке, нужен ревью`); fail++; }
for (const k of base.mustBeAbsent) if (new RegExp(`['\\s]${k}['\\s:]`).test(s.replace(/\/\/.*$/gm, ''))) { console.log(`RED  ${k} снова в remote_flags`); fail++; }
const ws = fs.readFileSync(snap + '/app/phrase_workshop_flag.ts', 'utf8');
if (!/PHRASE_WORKSHOP_ENABLED_IN_RELEASE\s*=\s*false/.test(ws)) { console.log('RED  PHRASE_WORKSHOP_ENABLED_IN_RELEASE не false'); fail++; }
const pv = fs.readFileSync(snap + '/app/paywall_control_visibility.ts', 'utf8');
if (!/closeVisible:\s*true/.test(pv) || !/restoreVisible:\s*true/.test(pv)) { console.log('RED  «закрыть»/«восстановить» в окне Plus не жёсткое true'); fail++; }
console.log(fail ? `FLAGS_RED ${fail}` : 'FLAGS_OK');
process.exit(fail ? 1 : 0);
JS
if [ $? -eq 0 ]; then ok "флаги = снимок ($(grep -c . "$LOGD/flags.txt") строк журнала)"; else bad "флаги расходятся со снимком:"; grep -E "^RED" "$LOGD/flags.txt" | sed 's/^/    /'; fi
grep -E "^NOTE" "$LOGD/flags.txt" | sed 's/^/    /'

# 3) dev-строки по карте в бандлах платформ и тождество dist-ota
for P in ios android; do
  if [ ! -d "$SNAP/dist-$P" ]; then bad "нет $SNAP/dist-$P"; continue; fi
  if node "$REPO/scripts/store_bundle_dev_strings_gate.mjs" --dir "$SNAP/dist-$P" > "$LOGD/devstrings_$P.txt" 2>&1; then ok "dev-строки $P: $(grep -aE 'OK' "$LOGD/devstrings_$P.txt" | tail -1 | cut -c1-120)"; else bad "dev-строки $P:"; tail -4 "$LOGD/devstrings_$P.txt" | sed 's/^/    /'; fi
  A=$(find "$SNAP/dist-$P" -name '*.hbc' -exec md5sum {} \; | cut -d' ' -f1)
  B=$(find "$SNAP/dist-ota" -path "*/$P/*" -name '*.hbc' -exec md5sum {} \; 2>/dev/null | cut -d' ' -f1)
  [ -n "$A" ] && [ "$A" = "$B" ] && ok "dist-ota $P = проверенный бандл" || bad "dist-ota $P не совпадает с dist-$P (или бандла нет)"
  M=$(find "$SNAP/dist-ota" -path "*/$P/*" -name '*.hbc' -exec grep -c -a -E 'dev_vip_override|HUB-LIFECYCLE' {} \; 2>/dev/null | awk '{s+=$1} END {print (NR ? s : "?")}')
  [ "$M" = "0" ] && ok "маркеры dev в dist-ota $P: 0" || bad "маркеры dev в dist-ota $P: $M"
done
if find "$SNAP/dist-ota" -name '*.map' | grep -q .; then bad "в dist-ota остались .map — карты не публикуем"; else ok "в dist-ota нет .map"; fi

# 4) полный tsc этой ревизии (в снимке — та же ревизия, node_modules из npm ci)
( cd "$SNAP" && NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit -p . > "$LOGD/tsc.txt" 2>&1 ); TSC=$?
# зачем (прогон 25.10 на репетиции): ota_from_head.sh ставит только корневые node_modules — у functions/ в снимке своих нет, и tsc
# даёт сотни «Cannot find module firebase-functions». Сервер в OTA не едет: вердикт — по ошибкам кода приложения; functions — заметкой.
# Связывать functions/node_modules в снимок НЕ будем: ota_from_head.sh делает rm -rf снимка, ссылка утащила бы настоящие модули.
APP_ERR=$(grep 'error TS' "$LOGD/tsc.txt" | grep -vE '^(functions|functions-content|scripts)/' | tee "$LOGD/tsc_app.txt" | wc -l)
SRV_ERR=$(grep 'error TS' "$LOGD/tsc.txt" | grep -cE '^(functions|functions-content|scripts)/')
# зачем (вопрос координатора 26.10 «exit 2 при 0 ошибок?»): tsc --noEmit отдаёт 0 — ошибок нет, 2 — ошибки найдены (здесь — только
# functions/scripts без своих node_modules). Любой другой код (134 — нехватка памяти, 127 — нет npx) значит, что проверка не дошла
# до конца и ошибок в журнале нет вовсе — это НЕ «0 ошибок», а провал. И exit 2 без единой найденной ошибки — тоже провал: причину не видно.
if [ "$TSC" -ne 0 ] && [ "$TSC" -ne 2 ]; then bad "tsc не дошёл до конца (exit $TSC) — 0 ошибок в журнале ничего не значит:"; tail -5 "$LOGD/tsc.txt" | sed 's/^/    /'
elif [ "$TSC" -eq 2 ] && [ "$APP_ERR" -eq 0 ] && [ "$SRV_ERR" -eq 0 ]; then bad "tsc exit 2, но ни одной ошибки в журнале — причина неясна, смотри $LOGD/tsc.txt"
elif [ "$APP_ERR" -eq 0 ]; then ok "tsc приложения: 0 ошибок (exit $TSC: $([ "$TSC" -eq 0 ] && echo 'ошибок нет нигде' || echo "ошибки только в functions/scripts — $SRV_ERR"))"
else bad "tsc приложения: $APP_ERR ошибок:"; head -10 "$LOGD/tsc_app.txt" | sed 's/^/    /'; fi
[ "$SRV_ERR" -gt 0 ] && note "tsc functions/scripts в снимке: $SRV_ERR (нет functions/node_modules — сервер в OTA не едет; сервер проверяется отдельно перед выкладкой)"

echo
if [ $FAIL -eq 0 ]; then echo "[OTA-FINAL] 🟢 ВСЁ ЗЕЛЁНОЕ — ревизия ${REV:0:9} готова к публикации (журналы $LOGD)"; else echo "[OTA-FINAL] 🔴 ЕСТЬ КРАСНОЕ — не публиковать (журналы $LOGD)"; fi
exit $FAIL
