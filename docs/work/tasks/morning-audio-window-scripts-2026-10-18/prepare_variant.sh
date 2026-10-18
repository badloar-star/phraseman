#!/bin/bash
# Ночная подготовка варианта перекодирования ВНЕ рабочей копии (координатор 02:33): снимок HEAD → --root копия → аудит тишины.
# Запуск: bash prepare_variant.sh <64|96>. Рабочую копию и набор не трогает.
KBPS="$1"; S=/c/Temp/claude/C--appsprojects-phraseman/129f91a4-53c5-416d-988a-0f73c489dfc8/scratchpad
T=/c/Temp/claude/variant_${KBPS}k; L=$S/testlogs/variant_${KBPS}k.log; : > $L
say() { echo "[VARIANT-$KBPS] $(date +%H:%M:%S) $*" | tee -a $L; }
cd /c/appsprojects/phraseman || exit 1
HEADREV=$(git rev-parse --short HEAD); rm -rf $T; mkdir -p $T; t0=$(date +%s)
git -c core.autocrlf=false archive HEAD app assets/audio/learning-v2-bootstrap-v1 assets/audio/learning-v2 content scripts modules constants package.json | tar -x -C $T || { say "снимок не снят"; exit 1; }
cmd //c mklink //J "$(cygpath -w $T)\node_modules" "C:\appsprojects\phraseman\node_modules" > /dev/null
echo "$HEADREV" > $T/HEAD_REV.txt
# скрипт перекодирования — из рабочей копии (журнал пропуска уже сжатых может быть ещё не в HEAD), поведение то же
cp scripts/learning_v2_reencode_bundle_audio_64k.mjs $T/scripts/
grep -oE 'contentHash: "[0-9a-f]{64}"' $T/app/learning_v2_bootstrap_audio_assets_v1.generated.ts | grep -oE '[0-9a-f]{64}' | sort -u > $T/OLD_BUNDLE_HASHES.txt
say "снимок HEAD $HEADREV за $(( $(date +%s) - t0 )) с, старый набор $(wc -l < $T/OLD_BUNDLE_HASHES.txt) хешей"
t0=$(date +%s); node $T/scripts/learning_v2_reencode_bundle_audio_64k.mjs --root $T --kbps "$KBPS" >> $L 2>&1; rc=$?
say "перекодирование rc=$rc за $(( $(date +%s) - t0 )) с"; [ $rc -eq 0 ] || exit 1
t0=$(date +%s); node $T/scripts/audit_bundled_audio_silence.mjs --out "$S/AUDIO_SILENCE_variant_${KBPS}k.md" --jobs 6 >> $L 2>&1; rc=$?
say "аудит тишины rc=$rc за $(( $(date +%s) - t0 )) с $(grep -o '"silent":[0-9]*,"quiet":[0-9]*' $L | tail -1)"
say "набор: $(ls $T/assets/audio/learning-v2-bootstrap-v1 | wc -l) файлов, $(du -sm $T/assets/audio/learning-v2-bootstrap-v1 | cut -f1) МБ; $(grep -o 'Learning V2 bootstrap audio PASS ([^)]*)' $L | tail -1)"
