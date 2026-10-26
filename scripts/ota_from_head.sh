#!/bin/bash
# ota_from_head.sh — подготовка обновления по воздуху (runtime — OTA_RUNTIME, по умолчанию 2.0.3) из HEAD ОДНОЙ командой, до публикации (публикует координатор).
#
# зачем (решение владельца 25.10 через координатора: одно обновление по воздуху на 2.0.2 из HEAD при недельном лимите 95 %; аудит
# docs/work/release/OTA_COMPAT_AUDIT_2026-10-25.md): повторяет ПРОВЕРЕННУЮ схему OTA-2 — обычный `eas update` на этой машине падал.
#   1) снимок ревизии (git archive, core.autocrlf=false) в чистую папку;   2) npm ci;
#   3) release:precheck в снимке (временный .git без ветки). Красный PARITY-GATE пропускается ТОЛЬКО с флагом
#      --allow-parity-gate (решение координатора 25.10: для OTA он не блокирует — это сверка уже выпущенных экранов 2.0.2;
#      новые экраны OTA проходят склейку «макет | эмулятор» до включения своего флага); без флага — стоп;
#   4) eas env:pull production → .env.ota.pulled (ключи входа и покупок; значения не печатаются);
#   5) экспорт iOS и Android ОТДЕЛЬНО: TMP/TEMP=C:\Temp\claude\ota_tmp, --max-workers 1, куча 8 ГБ, STORE_RELEASE=1, AI_DIALOG, EXPLAIN;
#   6) dev-строки в бандле каждой платформы (scripts/store_bundle_dev_strings_gate.mjs, с картой);
#   7) склейка dist-ota + проверки (scripts/ota_merge_dist.cjs): ничего не потеряно, 3 пакета .dpk, ключи production в бандлах;
#   8) печать команды публикации. СКРИПТ НЕ ПУБЛИКУЕТ.
#
# Запуск (тяжёлое — через светофор):
#   bash .claude/semaphore/slot.sh run --wait=3600 "OTA из HEAD" -- bash scripts/ota_from_head.sh [ревизия] [--allow-parity-gate]
set -u
REPO=$(cd "$(dirname "$0")/.." && pwd)
REV=HEAD
ALLOW_PARITY=0
for ARG in "$@"; do
  case "$ARG" in
    --allow-parity-gate) ALLOW_PARITY=1 ;;
    -*) echo "[OTA-HEAD] ✖ неизвестный флаг $ARG"; exit 2 ;;
    *) REV=$ARG ;;
  esac
done
FULL=$(git -C "$REPO" rev-parse "$REV") || { echo "[OTA-HEAD] ✖ нет ревизии $REV"; exit 2; }
SHORT=${FULL:0:9}
# зачем (координатор 26.10: в магазинах полная 2.0.3 (145) — заплатки по воздуху только для неё): runtime и метка публикации заданы
# здесь, а не вшиты; для 2.0.2 — OTA_RUNTIME=2.0.2. Метка: <runtime>-OTA<N>_from_<хэш>, N — следующий номер для этого runtime.
OTA_RUNTIME=${OTA_RUNTIME:-2.0.3}
OTA_LABEL=${OTA_LABEL:-${OTA_RUNTIME}-OTA1}
SNAP=/c/Temp/claude/ota_head
LOGD=/c/Temp/claude/ota_head_logs_$(date +%m%d_%H%M)
mkdir -p "$LOGD"
LOG="$LOGD/ota_from_head.log"
say() { echo "$*" | tee -a "$LOG"; }
step_fail() { say "[OTA-HEAD] ✖ СТОП на шаге «$1». Журналы: $LOGD"; exit 1; }
START=$(date +%s)
say "[OTA-HEAD] ревизия $SHORT ($REV), снимок $SNAP, журналы $LOGD, allow-parity-gate=$ALLOW_PARITY"

# 1) снимок
rm -rf "$SNAP" && mkdir -p "$SNAP" || step_fail "папка снимка"
git -C "$REPO" -c core.autocrlf=false archive "$FULL" | tar -x -C "$SNAP" || step_fail "git archive"
echo "$FULL" > "$SNAP/.snapshot_head"
SNAPW=$(cygpath -m "$SNAP")
node -e "const a=require('$SNAPW/app.json').expo;console.log('[OTA-HEAD] app.json version='+a.version+' runtimeVersion='+a.runtimeVersion+' versionCode='+a.android.versionCode)" | tee -a "$LOG"
RT=$(node -e "console.log(require('$SNAPW/app.json').expo.runtimeVersion)")
[ "$RT" = "$OTA_RUNTIME" ] || step_fail "runtimeVersion = $RT, а не $OTA_RUNTIME"

# 2) зависимости
cd "$SNAP" || step_fail "cd снимок"
say "[OTA-HEAD] npm ci…"
npm ci --include=dev --no-audit --no-fund > "$LOGD/npm_ci.log" 2>&1 || step_fail "npm ci"

# 3) precheck во временном .git без ветки (объекты — из основного репозитория; ветка не создаётся — хук владельца)
git init -q && printf '%s\n' "$(cygpath -m "$REPO/.git/objects")" > .git/objects/info/alternates && git config core.autocrlf false \
  && git update-ref --no-deref HEAD "$FULL" && git reset -q "$FULL" || step_fail "временный .git"
say "[OTA-HEAD] release:precheck…"
node scripts/release_precheck.mjs > "$LOGD/precheck.txt" 2>&1; PRC=$?
rm -rf .git
if [ $PRC -ne 0 ]; then
  if grep -q "не прошло гейтов — 1\." "$LOGD/precheck.txt" && grep -q "\[PARITY-GATE\] ОТКАЗ" "$LOGD/precheck.txt"; then
    if [ "$ALLOW_PARITY" -ne 1 ]; then
      say "[OTA-HEAD] precheck: красный PARITY-GATE, флага --allow-parity-gate нет — стоп (пропуск только осознанный)"
      step_fail "release:precheck (PARITY-GATE)"
    fi
    say "[OTA-HEAD] precheck: красный только PARITY-GATE — ПРОПУЩЕН флагом --allow-parity-gate (решение координатора 25.10)"
    grep -aE "^\[PARITY-GATE\] строк=|^\[PARITY-GATE\] по причинам" "$LOGD/precheck.txt" | sed 's/^/  /' | tee -a "$LOG"
  else
    grep -aE "ОТКАЗ|не прошло" "$LOGD/precheck.txt" | tail -5 | tee -a "$LOG"; step_fail "release:precheck"
  fi
else say "[OTA-HEAD] precheck: всё зелёное"; fi

# 4) окружение production из EAS (значения не печатаем)
EAS_NO_VCS=1 eas env:pull --environment production --path .env.ota.pulled --non-interactive > "$LOGD/env_pull.log" 2>&1 || step_fail "eas env:pull"
say "[OTA-HEAD] env production: ключей $(grep -cE '^EXPO_PUBLIC_[A-Z0-9_]+=' .env.ota.pulled)"
set -a; . ./.env.ota.pulled; set +a
# зачем (Ревизор 25.10): ключи production не должны лежать в снимке дольше нужного. `eas update --skip-bundler` их не читает —
# они уже вшиты в бандл на экспорте; склейка сверяет их и после неё файл не нужен. trap стирает его и при падении любого шага.
wipe_env() { [ -f "$SNAP/.env.ota.pulled" ] && rm -f "$SNAP/.env.ota.pulled" && say "[OTA-HEAD] .env.ota.pulled стёрт ($1)"; return 0; }
trap 'wipe_env exit' EXIT
export EXPO_PUBLIC_STORE_RELEASE=1 EXPO_PUBLIC_AI_DIALOG_ENABLED=true EXPO_PUBLIC_EXPLAIN_ENABLED=true
export NODE_OPTIONS=--max-old-space-size=8192 CI=1
mkdir -p /c/Temp/claude/ota_tmp && export TMP='C:\Temp\claude\ota_tmp' TEMP='C:\Temp\claude\ota_tmp'

# 5) экспорт по платформам отдельно; 6) dev-строки каждой платформы (по карте)
for PLAT in ios android; do
  say "[OTA-HEAD] экспорт $PLAT…"
  T0=$(date +%s)
  npx expo export --platform "$PLAT" --output-dir "dist-$PLAT" --max-workers 1 --source-maps > "$LOGD/export_$PLAT.log" 2>&1 || { tail -5 "$LOGD/export_$PLAT.log" | tee -a "$LOG"; step_fail "экспорт $PLAT"; }
  say "[OTA-HEAD] экспорт $PLAT — $(( $(date +%s) - T0 )) с"
  node scripts/store_bundle_dev_strings_gate.mjs --dir "dist-$PLAT" > "$LOGD/devstrings_$PLAT.txt" 2>&1 || { tail -5 "$LOGD/devstrings_$PLAT.txt" | tee -a "$LOG"; step_fail "dev-строки $PLAT"; }
  say "[OTA-HEAD] dev-строки $PLAT: $(grep -aE 'OK|ОТКАЗ' "$LOGD/devstrings_$PLAT.txt" | tail -1 | cut -c1-160)"
done

# 7) склейка и проверки
node "$REPO/scripts/ota_merge_dist.cjs" "$SNAPW" 2>&1 | tee -a "$LOG"; [ "${PIPESTATUS[0]}" -eq 0 ] || step_fail "склейка dist-ota"
wipe_env "после склейки"

# 8) команда публикации — для координатора, скрипт её не запускает
say "[OTA-HEAD] ГОТОВО за $(( $(date +%s) - START )) с. dist-ota: $SNAP/dist-ota"
say "[OTA-HEAD] Публикация (только координатор, при 95 % и 🟢 Ревизора; message без пробелов):"
# --channel, а не --branch (координатор 25.10, как OTA-1/OTA-2). Проверено чтением `eas channel:view production` 25.10: канал
# production целиком (branchMappingLogic "true") ведёт в единственную ветку production — публикация та же, но канал идёт за
# сборками, если его когда-нибудь перенаправят.
say "[OTA-HEAD] После публикации удалить снимок: rm -rf $SNAP (в нём бандлы и временные файлы сборки)"
say "  cd $SNAP && EAS_NO_VCS=1 eas update --channel production --environment production --platform all --skip-bundler --input-dir dist-ota --message ${OTA_LABEL}_from_${SHORT} --non-interactive"
