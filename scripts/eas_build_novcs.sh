#!/bin/bash
# eas_build_novcs.sh — запасной путь сборок EAS без git: чистый экспорт ревизии (git archive) + EAS_NO_VCS=1.
# зачем (ночной выпуск 04→05.11): eas-cli при requireCommit клонирует проект через git; если клон снимка падает/виснет —
# экспорт HEAD в пустую папку и сборка из неё без VCS (в сборку попадает ровно закоммиченное; ветки не создаются).
#   bash scripts/eas_build_novcs.sh [ревизия] [--platform android|ios|all] [--submit-ios]
set -u
REPO=$(cd "$(dirname "$0")/.." && pwd)
REV=HEAD; PLATFORM=all; SUBMIT_IOS=0
while [ $# -gt 0 ]; do
  case "$1" in
    --platform) PLATFORM="${2:-all}"; shift 2 ;;
    --submit-ios) SUBMIT_IOS=1; shift ;;
    -*) echo "[EAS-NOVCS] ✖ неизвестный флаг $1"; exit 2 ;;
    *) REV=$1; shift ;;
  esac
done
FULL=$(git -C "$REPO" rev-parse "$REV") || { echo "[EAS-NOVCS] ✖ нет ревизии $REV"; exit 2; }
SHORT=${FULL:0:9}
SNAP=/c/Temp/claude/eas_novcs_$SHORT
LOG=/c/Temp/claude/eas_novcs_$SHORT.log
say() { echo "$*" | tee -a "$LOG"; }
say "[EAS-NOVCS] ревизия $SHORT, платформа $PLATFORM, submit-ios=$SUBMIT_IOS, папка $SNAP"
rm -rf "$SNAP" 2>/dev/null; mkdir -p "$SNAP" || { say "[EAS-NOVCS] ✖ папка"; exit 1; }
git -C "$REPO" -c core.autocrlf=false archive "$FULL" | tar -x -C "$SNAP" || { say "[EAS-NOVCS] ✖ git archive"; exit 1; }
cmd //c "mklink /J $(cygpath -w "$SNAP/node_modules") $(cygpath -w "$REPO/node_modules")" >/dev/null || { say "[EAS-NOVCS] ✖ junction node_modules"; exit 1; }
cd "$SNAP" || exit 1
node -e "const a=require('$(cygpath -m "$SNAP")/app.json').expo;console.log('[EAS-NOVCS] app.json version='+a.version+' versionCode='+a.android.versionCode+' buildNumber='+a.ios.buildNumber)" | tee -a "$LOG"
export EAS_NO_VCS=1
RC=0
if [ "${EAS_DRY:-0}" = "1" ]; then say "[EAS-NOVCS] EAS_DRY=1 — папка готова, сборки НЕ запускались"; exit 0; fi
if [ "$PLATFORM" = "android" ] || [ "$PLATFORM" = "all" ]; then
  say "[EAS-NOVCS] → android production (AAB), без отправки в Google Play"
  npx eas build --platform android --profile production --non-interactive --no-wait 2>&1 | tee -a "$LOG" || RC=1
fi
if [ "$PLATFORM" = "ios" ] || [ "$PLATFORM" = "all" ]; then
  if [ "$SUBMIT_IOS" = "1" ]; then
    say "[EAS-NOVCS] → ios production + auto-submit в App Store Connect (без ревью)"
    npx eas build --platform ios --profile production --non-interactive --no-wait --auto-submit 2>&1 | tee -a "$LOG" || RC=1
  else
    say "[EAS-NOVCS] → ios production, без сабмита"
    npx eas build --platform ios --profile production --non-interactive --no-wait 2>&1 | tee -a "$LOG" || RC=1
  fi
fi
say "[EAS-NOVCS] готово rc=$RC; журнал $LOG"
exit $RC
