#!/bin/bash
# Утро (координатор 18.10): перекодирование звука V2 → проверки → списки частей коммита. ЗАПУСК ТОЛЬКО ПО «ок» ВЛАДЕЛЬЦА.
# Запуск: bash morning_reencode.sh <64|96> [размер_части=500]
# Коммит частей — отдельно: bash morning_commit_parts.sh (по спискам, которые пишет этот скрипт).
KBPS="$1"; PART="${2:-500}"
[ "$KBPS" = 64 ] || [ "$KBPS" = 96 ] || { echo "[MORNING] нужен битрейт 64 или 96"; exit 2; }
S=/c/Temp/claude/C--appsprojects-phraseman/129f91a4-53c5-416d-988a-0f73c489dfc8/scratchpad
cd /c/appsprojects/phraseman || exit 1
L=$S/testlogs/morning_real.log; : > $L
say() { echo "[MORNING] $(date +%H:%M:%S) $*" | tee -a $L; }
step() { local n="$1"; shift; local t0=$(date +%s); "$@" >> $L 2>&1; local rc=$?; say "$n rc=$rc за $(( $(date +%s) - t0 )) с"; return $rc; }
say "старт HEAD $(git rev-parse --short HEAD), битрейт $KBPS"
git rev-parse HEAD > $S/morning_start_rev.txt   # для morning_rollback.sh
# шаг 0 — ворота паритета на СНИМКЕ HEAD (рабочая копия может нести чужие черновики фабрики)
G=/c/Temp/claude/gate_head; rm -rf $G; mkdir -p $G
git -c core.autocrlf=false archive HEAD content scripts modules/learning-v2 app package.json | tar -x -C $G
mkdir -p $G/content/learning-v2-course/pipeline; cp -r content/learning-v2-course/pipeline/. $G/content/learning-v2-course/pipeline/ 2>/dev/null
cmd //c mklink //J "C:\\Temp\\claude\\gate_head\\node_modules" "C:\\appsprojects\\phraseman\\node_modules" > /dev/null
step "0. ворота паритета ДО перекодирования (снимок HEAD)" bash -c "cd $G && node scripts/learning_v2_release_parity_gate.mjs" || { say "ворота красные до старта — стоп"; exit 1; }
# список старых хешей набора — единственное, что разрешено удалить (условие 3 координатора)
grep -oE 'contentHash: "[0-9a-f]{64}"' app/learning_v2_bootstrap_audio_assets_v1.generated.ts | grep -oE '[0-9a-f]{64}' | sort -u > $S/old_bundle_hashes.txt
say "старый набор: $(wc -l < $S/old_bundle_hashes.txt) хешей"
step "1. перекодирование" node scripts/learning_v2_reencode_bundle_audio_64k.mjs --kbps "$KBPS" || exit 1
step "2. аудит тишины" node scripts/audit_bundled_audio_silence.mjs --only-prefix assets/audio/learning-v2-bootstrap-v1/ --out "$S/AUDIO_SILENCE_morning_${KBPS}k.md" --jobs 6 || { say "ТИШИНА найдена — стоп, ничего не коммитить"; exit 1; }
step "3. ворота паритета" node scripts/learning_v2_release_parity_gate.mjs || exit 1
step "4. сторож выпуска сессий" node scripts/guard_learning_v2_session_release.mjs || exit 1
# списки частей: новые файлы набора → исходники → таблицы и модули (код, в окно) → удаления старых файлов набора
# новые файлы набора — только те, чей хеш есть в НОВОМ модуле набора (чужие неотслеживаемые в каталоге не берём; репетиция отката 18.10)
grep -oE 'contentHash: "[0-9a-f]{64}"' app/learning_v2_bootstrap_audio_assets_v1.generated.ts | grep -oE '[0-9a-f]{64}' | sort -u > $S/new_bundle_hashes.txt
git -c core.quotepath=false status --porcelain --untracked-files=all -- assets/audio/learning-v2-bootstrap-v1 | awk '$1=="??"{print $2}' \
  | while read -r p; do h=$(basename "$p" .mp3); grep -qx "$h" $S/new_bundle_hashes.txt && echo "$p"; done > $S/parts_new.txt
git -c core.quotepath=false status --porcelain -- assets/audio/learning-v2/factory-production-v1 assets/audio/learning-v2/authoring-single-voice-v1 content/learning-v2-course/audio | awk '$1=="M" && $2 ~ /\.mp3$/{print $2}' > $S/parts_src.txt
printf '%s\n' content/learning-v2-course/audio/en/single-voice-v1.json assets/audio/learning-v2/factory-production-v1/manifest.json app/learning_v2_bootstrap_audio_assets_v1.generated.ts app/learning_v2_factory_single_voice_v1.generated.ts app/learning_v2_factory_production_audio_entries_v1.generated.ts app/learning_v2_factory_lesson_audio_index_v1.generated.ts > $S/parts_code.txt
git -c core.quotepath=false status --porcelain -- assets/audio/learning-v2-bootstrap-v1 | awk '$1=="D"{print $2}' > $S/parts_del.txt
# условие 3: удаляем только старые хеши набора, и удалено = добавлено
bad=$(sed -E 's#.*/([0-9a-f]{64})\.mp3$#\1#' $S/parts_del.txt | sort | comm -23 - $S/old_bundle_hashes.txt | wc -l)
[ "$bad" -eq 0 ] || { say "в удалении $bad путей не из старого набора — стоп"; exit 1; }
[ "$(wc -l < $S/parts_del.txt)" -eq "$(wc -l < $S/parts_new.txt)" ] || { say "удалено $(wc -l < $S/parts_del.txt) ≠ добавлено $(wc -l < $S/parts_new.txt) — стоп"; exit 1; }
rm -f $S/part_*.txt; i=0
split -l "$PART" -d -a 3 $S/parts_new.txt $S/part_new_   # исходники — в одну часть-переключение (morning_commit_parts.sh)
split -l "$PART" -d -a 3 $S/parts_del.txt $S/part_zdel_
say "части по $PART: новых $(wc -l < $S/parts_new.txt), исходников $(wc -l < $S/parts_src.txt), код 6 путей, удалений $(wc -l < $S/parts_del.txt); файлов частей $(ls $S/part_* | wc -l) + 1 код"
