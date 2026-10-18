#!/bin/bash
# Коммит частей утреннего перекодирования по спискам morning_reencode.sh: новые файлы набора → исходники → код (в окно) → удаления.
# Останавливается на первой неудаче; каждая часть — строка [MORNING-PART] со временем. Запуск: bash morning_commit_parts.sh <64|96>
KBPS="$1"; S=/c/Temp/claude/C--appsprojects-phraseman/129f91a4-53c5-416d-988a-0f73c489dfc8/scratchpad
cd /c/appsprojects/phraseman || exit 1
L=$S/testlogs/morning_parts.log
total=$(ls $S/part_* 2>/dev/null | wc -l); n=0
commit_part() {
  local list="$1" title="$2"; n=$((n+1))
  printf '%s\n\nУтреннее перекодирование звука Learning V2 в %s кбит/с по «ок» владельца (координатор 18.10), часть %s из %s.\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>\n' "$title" "$KBPS" "$n" "$((total+1))" > $S/msg_part.txt
  local t0=$(date +%s)
  bash $S/bulk_commit.sh $S/msg_part.txt "$list" >> $L 2>&1; local rc=$?
  echo "[MORNING-PART] $(date +%H:%M:%S) $n/$((total+1)) $(basename $list) путей $(wc -l < $list) rc=$rc за $(( $(date +%s) - t0 )) с HEAD $(git rev-parse --short HEAD)" | tee -a $L
  return $rc
}
for f in $S/part_new_* $S/part_src_*; do [ -e "$f" ] || continue
  commit_part "$f" "content(learning-v2): звук ${KBPS} кбит/с — $(case $f in *new*) echo 'новые файлы набора';; *) echo 'исходники';; esac) ($(basename $f))" || exit 1; done
WAITWIN=1 commit_part $S/parts_code.txt "content(learning-v2): звук ${KBPS} кбит/с — таблицы и модули набора" || exit 1
for f in $S/part_zdel_*; do [ -e "$f" ] || continue
  PHRASEMAN_ALLOW_MASS_DELETION=1 commit_part "$f" "content(learning-v2): звук ${KBPS} кбит/с — удаление старых файлов набора ($(basename $f))" || exit 1; done
echo "[MORNING-PART] части закоммичены, HEAD $(git rev-parse --short HEAD)" | tee -a $L
# условие 4 координатора: после последней части — ворота паритета и аудит тишины ещё раз
node scripts/learning_v2_release_parity_gate.mjs >> $L 2>&1; g=$?
node scripts/audit_bundled_audio_silence.mjs --out "$S/AUDIO_SILENCE_after_parts_${KBPS}k.md" --jobs 6 >> $L 2>&1; a=$?
echo "[MORNING-PART] итог: ворота паритета rc=$g, аудит тишины rc=$a ($(grep -o '"silent":[0-9]*' $L | tail -1)), остаток звука V2 в рабочей копии: $(git status --porcelain -- assets/audio/learning-v2-bootstrap-v1 assets/audio/learning-v2/factory-production-v1 | wc -l) путей" | tee -a $L
