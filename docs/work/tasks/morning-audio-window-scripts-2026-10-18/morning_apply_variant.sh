#!/bin/bash
# Утро (координатор 02:33/02:43): перенос ГОТОВОГО ночного варианта в рабочую копию вместо перекодирования. ТОЛЬКО по «ок» владельца.
# Запуск: bash morning_apply_variant.sh <64|96> [размер_части=500] [--check-only]
# Годность (variant_valid): HEAD_REV варианта == HEAD, либо пути набора/таблиц/модулей/текстов копии приложения с тех пор не менялись;
# и в рабочей копии по ним нет правок. Не годен — строка с причиной и код 4: тогда утро идёт через morning_reencode.sh.
KBPS="$1"; PART="${2:-500}"; CHECK_ONLY=""; [ "$3" = "--check-only" ] && CHECK_ONLY=1
S=/c/Temp/claude/C--appsprojects-phraseman/129f91a4-53c5-416d-988a-0f73c489dfc8/scratchpad
V=/c/Temp/claude/variant_${KBPS}k; R=/c/appsprojects/phraseman
cd $R || exit 1
L=$S/testlogs/morning_real.log; [ -n "$CHECK_ONLY" ] || : > $L
say() { echo "[MORNING-PART] $(date +%H:%M:%S) $*" | tee -a $L; }
SET_PATHS=(app/learning_v2_bootstrap_audio_assets_v1.generated.ts app/learning_v2_factory_single_voice_v1.generated.ts
  app/learning_v2_factory_production_audio_entries_v1.generated.ts app/learning_v2_factory_lesson_audio_index_v1.generated.ts
  app/learning_v2_factory_silent_audio_v1.json content/learning-v2-course/audio/en/single-voice-v1.json
  assets/audio/learning-v2-bootstrap-v1 assets/audio/learning-v2/factory-production-v1 assets/audio/learning-v2/authoring-single-voice-v1
  modules/learning-v2/content/factory_native/generated_release)
[ -f $V/HEAD_REV.txt ] || { say "variant_valid=false reason=нет варианта $V"; exit 4; }
VREV=$(cat $V/HEAD_REV.txt); HREV=$(git rev-parse --short HEAD)
grep -q "Learning V2 bootstrap audio PASS" $S/testlogs/variant_${KBPS}k.log 2>/dev/null || { say "variant_valid=false reason=вариант не дошёл до --check набора"; exit 4; }
grep -q '"silent":0,' $S/testlogs/variant_${KBPS}k.log || { say "variant_valid=false reason=в варианте найдена тишина или аудит не прошёл"; exit 4; }
if [ "$VREV" != "$HREV" ] && ! git diff --quiet "$VREV" HEAD -- "${SET_PATHS[@]}"; then
  say "variant_valid=false reason=набор изменился с $VREV до $HREV: $(git diff --name-only "$VREV" HEAD -- "${SET_PATHS[@]}" | head -3 | tr '\n' ' ')"; exit 4; fi
dirty=$(git status --porcelain -- "${SET_PATHS[@]}" | wc -l)
[ "$dirty" -eq 0 ] || { say "variant_valid=false reason=в рабочей копии $dirty правок по путям набора"; exit 4; }
say "variant_valid=true reason=вариант $VREV, HEAD $HREV, пути набора с тех пор не менялись, рабочая копия по ним чистая"
[ -n "$CHECK_ONLY" ] && exit 0
git rev-parse HEAD > $S/morning_start_rev.txt   # для morning_rollback.sh

# шаг 0: ворота паритета на снимке HEAD (условие 2 координатора)
G=/c/Temp/claude/gate_head; rm -rf $G; mkdir -p $G
git -c core.autocrlf=false archive HEAD content scripts modules/learning-v2 app package.json | tar -x -C $G
mkdir -p $G/content/learning-v2-course/pipeline; cp -r content/learning-v2-course/pipeline/. $G/content/learning-v2-course/pipeline/ 2>/dev/null
cmd //c mklink //J "C:\\Temp\\claude\\gate_head\\node_modules" "C:\\appsprojects\\phraseman\\node_modules" > /dev/null
(cd $G && node scripts/learning_v2_release_parity_gate.mjs >> $L 2>&1) || { say "шаг 0: ворота паритета на снимке HEAD красные — стоп"; exit 1; }
say "шаг 0: ворота паритета на снимке HEAD зелёные"

# перенос: сравнение каталогов варианта и рабочей копии
for d in assets/audio/learning-v2-bootstrap-v1 assets/audio/learning-v2/factory-production-v1 assets/audio/learning-v2/authoring-single-voice-v1; do
  diff -rq "$R/$d" "$V/$d" 2>/dev/null
done > $S/variant_diff.txt
grep -E "^Only in $V/" $S/variant_diff.txt | sed -E "s#^Only in $V/([^:]*): (.*)#\1/\2#" > $S/variant_add.txt
grep -E "^Only in $R/" $S/variant_diff.txt | sed -E "s#^Only in $R/([^:]*): (.*)#\1/\2#" > $S/variant_del.txt
grep -E "^Files .* differ$" $S/variant_diff.txt | sed -E "s#^Files $R/([^ ]*) and .*#\1#" > $S/variant_mod.txt
# сверка удалений: только старые хеши набора, и удалено = добавлено (в наборе)
bad=$(grep '^assets/audio/learning-v2-bootstrap-v1/' $S/variant_del.txt | sed -E 's#.*/([0-9a-f]{64})\.mp3$#\1#' | sort | comm -23 - $V/OLD_BUNDLE_HASHES.txt | wc -l)
nadd=$(grep -c '^assets/audio/learning-v2-bootstrap-v1/' $S/variant_add.txt); ndel=$(grep -c '^assets/audio/learning-v2-bootstrap-v1/' $S/variant_del.txt)
[ "$bad" -eq 0 ] && [ "$nadd" -eq "$ndel" ] || { say "сверка удалений не прошла: не из старого набора $bad, добавлено $nadd, удалено $ndel — стоп, ничего не перенесено"; exit 1; }
grep -v '^assets/audio/learning-v2-bootstrap-v1/' $S/variant_add.txt $S/variant_del.txt | grep -q . && { say "вне набора есть новые/удалённые файлы — стоп: $(grep -v '^assets/audio/learning-v2-bootstrap-v1/' $S/variant_add.txt $S/variant_del.txt | head -3 | tr '\n' ' ')"; exit 1; }
while read -r p; do mkdir -p "$(dirname "$R/$p")"; cp "$V/$p" "$R/$p"; done < <(cat $S/variant_add.txt $S/variant_mod.txt)
while read -r p; do rm "$R/$p"; done < $S/variant_del.txt
for f in app/learning_v2_bootstrap_audio_assets_v1.generated.ts app/learning_v2_factory_single_voice_v1.generated.ts app/learning_v2_factory_production_audio_entries_v1.generated.ts app/learning_v2_factory_lesson_audio_index_v1.generated.ts content/learning-v2-course/audio/en/single-voice-v1.json assets/audio/learning-v2/factory-production-v1/manifest.json; do
  cp "$V/$f" "$R/$f"; done
say "перенесено: новых $nadd, удалено $ndel, изменено $(wc -l < $S/variant_mod.txt) (+ 6 таблиц и модулей)"

# проверки в рабочей копии
for g in build_learning_v2_factory_audio_module build_learning_v2_factory_single_voice_module build_learning_v2_bootstrap_audio_pack build_learning_v2_factory_lesson_audio_index; do
  node scripts/$g.mjs --check >> $L 2>&1 || { say "$g --check упал — стоп"; exit 1; }; done
node scripts/audit_bundled_audio_silence.mjs --out "$S/AUDIO_SILENCE_morning_${KBPS}k.md" --jobs 6 >> $L 2>&1 || { say "ТИШИНА после переноса — стоп"; exit 1; }
node scripts/learning_v2_release_parity_gate.mjs >> $L 2>&1 || { say "ворота паритета после переноса красные — стоп"; exit 1; }
node scripts/guard_learning_v2_session_release.mjs >> $L 2>&1 || { say "сторож сессий красный — стоп"; exit 1; }
say "проверки после переноса зелёные: --check ×4, тишина 0, ворота, сторож"

# списки частей для morning_commit_parts.sh
grep '^assets/audio/learning-v2-bootstrap-v1/' $S/variant_add.txt > $S/parts_new.txt
cp $S/variant_mod.txt $S/parts_src.txt
printf '%s\n' content/learning-v2-course/audio/en/single-voice-v1.json assets/audio/learning-v2/factory-production-v1/manifest.json app/learning_v2_bootstrap_audio_assets_v1.generated.ts app/learning_v2_factory_single_voice_v1.generated.ts app/learning_v2_factory_production_audio_entries_v1.generated.ts app/learning_v2_factory_lesson_audio_index_v1.generated.ts > $S/parts_code.txt
grep -v -x -F -f $S/parts_code.txt $S/parts_src.txt > $S/parts_src.tmp; mv $S/parts_src.tmp $S/parts_src.txt
cp $S/variant_del.txt $S/parts_del.txt
rm -f $S/part_*; split -l "$PART" -d -a 3 $S/parts_new.txt $S/part_new_   # исходники — в часть-переключение
split -l "$PART" -d -a 3 $S/parts_del.txt $S/part_zdel_
say "части по $PART: новых $(wc -l < $S/parts_new.txt), исходников $(wc -l < $S/parts_src.txt), код 6, удалений $(wc -l < $S/parts_del.txt); дальше: bash morning_commit_parts.sh $KBPS"
