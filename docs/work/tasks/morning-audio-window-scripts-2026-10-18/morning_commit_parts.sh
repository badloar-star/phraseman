#!/bin/bash
# Коммит частей утреннего окна звука по спискам (morning_apply_variant.sh / morning_reencode.sh / morning_rollback.sh).
# Порядок (Ревизор 03:26 — на каждом шаге таблица = файлы):
#   1) part_new_*  — новые файлы набора, части по 500 (на них ещё нет ссылок);
#   2) ОДНА часть-переключение — все изменённые исходники (authoring-single-voice-v1 + factory-production-v1) + обе таблицы
#      + 4 модуля набора, в окно кода: исходники, таблицы и модули меняются атомарно;
#   3) part_zdel_* — удаления старых файлов набора, части по 500 (на них уже нет ссылок).
# PHRASEMAN_ALLOW_WIDE_COMMIT=1 — только в окружении команды коммита части (разрешение координатора 03:26), не глобально.
# Останавливается на первой неудаче; каждая часть — строка [MORNING-PART]. Запуск: bash morning_commit_parts.sh <64|96|метка>
KBPS="$1"; S=/c/Temp/claude/C--appsprojects-phraseman/129f91a4-53c5-416d-988a-0f73c489dfc8/scratchpad
cd /c/appsprojects/phraseman || exit 1
L=$S/testlogs/morning_parts.log
cat $S/parts_src.txt $S/parts_code.txt 2>/dev/null | sort -u > $S/part_flip.txt
total=$(( $(ls $S/part_new_* $S/part_zdel_* 2>/dev/null | wc -l) + 1 )); n=0
commit_part() {
  local list="$1" title="$2"; n=$((n+1))
  printf '%s\n\nУтреннее окно звука Learning V2 (%s) по «ок» владельца, координатор 18.10: часть %s из %s, путей %s.\nПорядок: новые файлы набора → переключение (исходники + таблицы + модули атомарно) → удаления; на каждом шаге таблица = файлы.\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>\n' "$title" "$KBPS" "$n" "$total" "$(wc -l < "$list")" > $S/msg_part.txt
  local t0=$(date +%s)
  PHRASEMAN_ALLOW_WIDE_COMMIT=1 bash $S/bulk_commit.sh $S/msg_part.txt "$list" >> $L 2>&1; local rc=$?
  echo "[MORNING-PART] $(date +%H:%M:%S) $n/$total $(basename $list) путей $(wc -l < $list) rc=$rc за $(( $(date +%s) - t0 )) с HEAD $(git rev-parse --short HEAD)" | tee -a $L
  return $rc
}
for f in $S/part_new_*; do [ -e "$f" ] || continue
  commit_part "$f" "content(learning-v2): звук ${KBPS} — новые файлы набора ($(basename $f))" || exit 1; done
WAITWIN=1 commit_part $S/part_flip.txt "content(learning-v2): звук ${KBPS} — переключение: исходники, таблицы голосов и модули набора" || exit 1
for f in $S/part_zdel_*; do [ -e "$f" ] || continue
  PHRASEMAN_ALLOW_MASS_DELETION=1 commit_part "$f" "content(learning-v2): звук ${KBPS} — удаление старых файлов набора ($(basename $f))" || exit 1; done
echo "[MORNING-PART] части закоммичены, HEAD $(git rev-parse --short HEAD)" | tee -a $L
# условие 4 координатора: после последней части — ворота паритета, сторож V2 «файлы таблицы закоммичены», аудит тишины
node scripts/learning_v2_release_parity_gate.mjs >> $L 2>&1; g=$?
c=0; [ -f scripts/check_learning_v2_single_voice_committed.mjs ] && { node scripts/check_learning_v2_single_voice_committed.mjs >> $L 2>&1; c=$?; }
node scripts/audit_bundled_audio_silence.mjs --only-prefix assets/audio/learning-v2-bootstrap-v1/ --out "$S/AUDIO_SILENCE_after_parts_${KBPS}.md" --jobs 6 >> $L 2>&1; a=$?
echo "[MORNING-PART] итог: ворота паритета rc=$g, сторож V2 исходников rc=$c, аудит тишины rc=$a ($(grep -o '"silent":[0-9]*' $L | tail -1)), остаток звука V2 в рабочей копии: $(git status --porcelain -- assets/audio/learning-v2-bootstrap-v1 assets/audio/learning-v2/factory-production-v1 assets/audio/learning-v2/authoring-single-voice-v1 | wc -l) путей" | tee -a $L
