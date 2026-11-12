#!/bin/bash
# eas_build_from_head.sh — сборки EAS (production) из ЧИСТОГО снимка ревизии, а не из общего грязного дерева.
#
# зачем (ночной выпуск 04→05.11): eas.json → cli.requireCommit=true, а общее дерево всегда содержит чужие незакоммиченные правки.
# Снимок (git archive, core.autocrlf=false) без .git + EAS_NO_VCS=1 даёт EAS ровно закоммиченное, и ни один шаг не создаёт веток.
# node_modules — junction на основные (EAS ставит зависимости сам на сервере; локально нужны для чтения конфига).
#
#   bash scripts/eas_build_from_head.sh [ревизия] [--platform android|ios|all] [--submit-ios]
# Android — production AAB (в Google Play НЕ отправляется). iOS — production; --submit-ios добавляет --auto-submit в App Store Connect
# (на ревью НЕ отправляется). Скрипт запускает сборки БЕЗ ожидания (--no-wait) и печатает ссылки; следить: npx eas build:list.
set -u
REPO=$(cd "$(dirname "$0")/.." && pwd)
REV=HEAD; PLATFORM=all; SUBMIT_IOS=0
while [ $# -gt 0 ]; do
  case "$1" in
    --platform) PLATFORM="${2:-all}"; shift 2 ;;
    --submit-ios) SUBMIT_IOS=1; shift ;;
    -*) echo "[EAS-HEAD] ✖ неизвестный флаг $1"; exit 2 ;;
    *) REV=$1; shift ;;
  esac
done
FULL=$(git -C "$REPO" rev-parse "$REV") || { echo "[EAS-HEAD] ✖ нет ревизии $REV"; exit 2; }
SHORT=${FULL:0:9}
SNAP=/c/Temp/claude/eas_head_$SHORT
LOG=/c/Temp/claude/eas_head_$SHORT.log
say() { echo "$*" | tee -a "$LOG"; }
say "[EAS-HEAD] ревизия $SHORT, платформа $PLATFORM, submit-ios=$SUBMIT_IOS, снимок $SNAP"
rm -rf "$SNAP" 2>/dev/null; mkdir -p "$SNAP" || { say "[EAS-HEAD] ✖ папка снимка"; exit 1; }
# зачем (выпуск 2.1.2, 11→12.11): прежний снимок через git clone падал на глобальном перехватчике git «creating a new branch is
# blocked» (clone создаёт refs/heads), а eas-cli при requireCommit клонирует снимок ещё раз — и падает тем же (code 128). Две попытки
# сборки сгорели по времени; прошёл только путь git archive + EAS_NO_VCS=1 (как scripts/eas_build_novcs.sh). Теперь основной скрипт
# идёт им же: в снимке нет .git, eas-cli git не трогает, ветки нигде не создаются; .easignore по-прежнему действует.
git -C "$REPO" -c core.autocrlf=false archive "$FULL" | tar -x -C "$SNAP" || { say "[EAS-HEAD] ✖ git archive ревизии"; exit 1; }
cd "$SNAP" || exit 1
SNAPW=$(cygpath -m "$SNAP")
cmd //c "mklink /J $(cygpath -w "$SNAP/node_modules") $(cygpath -w "$REPO/node_modules")" >/dev/null || { say "[EAS-HEAD] ✖ junction node_modules"; exit 1; }
node -e "const a=require('$SNAPW/app.json').expo;console.log('[EAS-HEAD] app.json version='+a.version+' runtimeVersion='+a.runtimeVersion+' versionCode='+a.android.versionCode+' buildNumber='+a.ios.buildNumber)" | tee -a "$LOG"
[ -e "$SNAP/.git" ] && { say "[EAS-HEAD] ✖ в снимке оказался .git — EAS_NO_VCS не сработает предсказуемо"; exit 1; }
export EAS_NO_VCS=1
say "[EAS-HEAD] снимок без git готов (EAS_NO_VCS=1), файлов: $(find "$SNAP" -path "$SNAP/node_modules" -prune -o -type f -print | wc -l)"
RC=0
if [ "${EAS_DRY:-0}" = "1" ]; then say "[EAS-HEAD] EAS_DRY=1 — снимок готов, сборки НЕ запускались"; exit 0; fi
# зачем: «команда | tee || RC=1» смотрит код tee, а не сборки — провал загрузки печатался, но скрипт выходил с rc=0. Код сборки берём из
# PIPESTATUS, а «принята ли сборка» — по ссылке на неё в выводе (без ссылки сборки на сервере нет).
eas_step() {
  local before after
  before=$(grep -c 'expo.dev/accounts/.*/builds/' "$LOG" 2>/dev/null || true)
  "$@" 2>&1 | tee -a "$LOG"
  local code=${PIPESTATUS[0]}
  after=$(grep -c 'expo.dev/accounts/.*/builds/' "$LOG" 2>/dev/null || true)
  if [ "$code" -ne 0 ] || [ "${after:-0}" -le "${before:-0}" ]; then say "[EAS-HEAD] ✖ сборка не принята сервером (код $code, новых ссылок нет)"; RC=1; fi
}
if [ "$PLATFORM" = "android" ] || [ "$PLATFORM" = "all" ]; then
  say "[EAS-HEAD] → android production (AAB), без отправки в Google Play"
  eas_step npx eas build --platform android --profile production --non-interactive --no-wait
fi
if [ "$PLATFORM" = "ios" ] || [ "$PLATFORM" = "all" ]; then
  if [ "$SUBMIT_IOS" = "1" ]; then
    say "[EAS-HEAD] → ios production + auto-submit в App Store Connect (без ревью)"
    eas_step npx eas build --platform ios --profile production --non-interactive --no-wait --auto-submit
  else
    say "[EAS-HEAD] → ios production, без сабмита"
    eas_step npx eas build --platform ios --profile production --non-interactive --no-wait
  fi
fi
say "[EAS-HEAD] готово rc=$RC; журнал $LOG"
exit $RC
