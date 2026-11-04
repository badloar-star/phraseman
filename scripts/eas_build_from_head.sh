#!/bin/bash
# eas_build_from_head.sh — сборки EAS (production) из ЧИСТОГО снимка ревизии, а не из общего грязного дерева.
#
# зачем (ночной выпуск 04→05.11): eas.json → cli.requireCommit=true, а общее дерево всегда содержит чужие незакоммиченные правки.
# Снимок (git archive, core.autocrlf=false) + временный .git с одним коммитом этой ревизии даёт EAS чистое дерево; в сборку попадает
# ровно закоммиченное. node_modules — junction на основные (EAS ставит зависимости сам на сервере; локально нужны для чтения конфига).
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
rm -rf "$SNAP" && mkdir -p "$SNAP" || { say "[EAS-HEAD] ✖ папка снимка"; exit 1; }
git -C "$REPO" -c core.autocrlf=false archive "$FULL" | tar -x -C "$SNAP" || { say "[EAS-HEAD] ✖ git archive"; exit 1; }
SNAPW=$(cygpath -m "$SNAP")
cmd //c "mklink /J $(cygpath -w "$SNAP/node_modules") $(cygpath -w "$REPO/node_modules")" >/dev/null || { say "[EAS-HEAD] ✖ junction node_modules"; exit 1; }
cd "$SNAP" || exit 1
node -e "const a=require('$SNAPW/app.json').expo;console.log('[EAS-HEAD] app.json version='+a.version+' versionCode='+a.android.versionCode+' buildNumber='+a.ios.buildNumber)" | tee -a "$LOG"
# временный .git с одним коммитом этой ревизии (объекты — из основного репозитория по alternates), индекс чистый
git init -q && printf '%s\n' "$(cygpath -m "$REPO/.git/objects")" > .git/objects/info/alternates && git config core.autocrlf false \
  && git update-ref --no-deref HEAD "$FULL" && git reset -q "$FULL" || { say "[EAS-HEAD] ✖ временный .git"; exit 1; }
DIRTY=$(git status --porcelain | wc -l)
say "[EAS-HEAD] грязных путей во временном дереве: $DIRTY (должно быть 0 или только игнорируемое)"
RC=0
if [ "${EAS_DRY:-0}" = "1" ]; then say "[EAS-HEAD] EAS_DRY=1 — снимок и временный git готовы, сборки НЕ запускались"; exit 0; fi
if [ "$PLATFORM" = "android" ] || [ "$PLATFORM" = "all" ]; then
  say "[EAS-HEAD] → android production (AAB), без отправки в Google Play"
  npx eas build --platform android --profile production --non-interactive --no-wait 2>&1 | tee -a "$LOG" || RC=1
fi
if [ "$PLATFORM" = "ios" ] || [ "$PLATFORM" = "all" ]; then
  if [ "$SUBMIT_IOS" = "1" ]; then
    say "[EAS-HEAD] → ios production + auto-submit в App Store Connect (без ревью)"
    npx eas build --platform ios --profile production --non-interactive --no-wait --auto-submit 2>&1 | tee -a "$LOG" || RC=1
  else
    say "[EAS-HEAD] → ios production, без сабмита"
    npx eas build --platform ios --profile production --non-interactive --no-wait 2>&1 | tee -a "$LOG" || RC=1
  fi
fi
say "[EAS-HEAD] готово rc=$RC; журнал $LOG"
exit $RC
