#!/bin/bash
# ota_from_head.sh — подготовка обновления по воздуху на 2.0.2 из HEAD ОДНОЙ командой, до публикации (публикует координатор).
#
# зачем (решение владельца 25.10 через координатора: одно обновление по воздуху на 2.0.2 из HEAD при недельном лимите 95 %; аудит
# docs/work/release/OTA_COMPAT_AUDIT_2026-10-25.md): повторяет ПРОВЕРЕННУЮ схему OTA-2 — обычный `eas update` на этой машине падал.
#   1) снимок ревизии (git archive, core.autocrlf=false) в чистую папку;   2) npm ci;
#   3) release:precheck в снимке (временный .git без ветки) — пропускает ТОЛЬКО красный PARITY-GATE (решение владельца);
#   4) eas env:pull production → .env.ota.pulled (ключи входа и покупок; значения не печатаются);
#   5) экспорт iOS и Android ОТДЕЛЬНО: TMP/TEMP=C:\Temp\claude\ota_tmp, --max-workers 1, куча 8 ГБ, STORE_RELEASE=1, AI_DIALOG, EXPLAIN;
#   6) dev-строки в бандле каждой платформы (scripts/store_bundle_dev_strings_gate.mjs, с картой);
#   7) склейка dist-ota + проверки (scripts/ota_merge_dist.cjs): ничего не потеряно, 3 пакета .dpk, ключи production в бандлах;
#   8) печать команды публикации. СКРИПТ НЕ ПУБЛИКУЕТ.
#
# Запуск (тяжёлое — через светофор):
#   bash .claude/semaphore/slot.sh run --wait=3600 "OTA из HEAD" -- bash scripts/ota_from_head.sh [ревизия]
set -u
REPO=$(cd "$(dirname "$0")/.." && pwd)
REV=${1:-HEAD}
FULL=$(git -C "$REPO" rev-parse "$REV") || { echo "[OTA-HEAD] ✖ нет ревизии $REV"; exit 2; }
SHORT=${FULL:0:9}
SNAP=/c/Temp/claude/ota_head
LOGD=/c/Temp/claude/ota_head_logs_$(date +%m%d_%H%M)
mkdir -p "$LOGD"
LOG="$LOGD/ota_from_head.log"
say() { echo "$*" | tee -a "$LOG"; }
step_fail() { say "[OTA-HEAD] ✖ СТОП на шаге «$1». Журналы: $LOGD"; exit 1; }
START=$(date +%s)
say "[OTA-HEAD] ревизия $SHORT ($REV), снимок $SNAP, журналы $LOGD"

# 1) снимок
rm -rf "$SNAP" && mkdir -p "$SNAP" || step_fail "папка снимка"
git -C "$REPO" -c core.autocrlf=false archive "$FULL" | tar -x -C "$SNAP" || step_fail "git archive"
echo "$FULL" > "$SNAP/.snapshot_head"
SNAPW=$(cygpath -m "$SNAP")
node -e "const a=require('$SNAPW/app.json').expo;console.log('[OTA-HEAD] app.json version='+a.version+' runtimeVersion='+a.runtimeVersion+' versionCode='+a.android.versionCode)" | tee -a "$LOG"
RT=$(node -e "console.log(require('$SNAPW/app.json').expo.runtimeVersion)")
[ "$RT" = "2.0.2" ] || step_fail "runtimeVersion = $RT, а не 2.0.2"

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
    say "[OTA-HEAD] precheck: красный только PARITY-GATE (по решению владельца не стоп)"
  else
    grep -aE "ОТКАЗ|не прошло" "$LOGD/precheck.txt" | tail -5 | tee -a "$LOG"; step_fail "release:precheck"
  fi
else say "[OTA-HEAD] precheck: всё зелёное"; fi

# 4) окружение production из EAS (значения не печатаем)
EAS_NO_VCS=1 eas env:pull --environment production --path .env.ota.pulled --non-interactive > "$LOGD/env_pull.log" 2>&1 || step_fail "eas env:pull"
say "[OTA-HEAD] env production: ключей $(grep -cE '^EXPO_PUBLIC_[A-Z0-9_]+=' .env.ota.pulled)"
set -a; . ./.env.ota.pulled; set +a
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

# 8) команда публикации — для координатора, скрипт её не запускает
say "[OTA-HEAD] ГОТОВО за $(( $(date +%s) - START )) с. dist-ota: $SNAP/dist-ota"
say "[OTA-HEAD] Публикация (только координатор, при 95 % и 🟢 Ревизора; message без пробелов):"
say "  cd $SNAP && EAS_NO_VCS=1 eas update --branch production --environment production --platform all --skip-bundler --input-dir dist-ota --message 2.0.2-OTA3_from_${SHORT} --non-interactive"
