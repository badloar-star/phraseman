#!/bin/bash
# Откат утреннего окна звука (координатор 03:02/03:08) одной командой: bash morning_rollback.sh [--dry-run]
# Пути набора звука возвращаются к ревизии старта окна (morning_start_rev.txt). Удаляются ТОЛЬКО свои файлы: добавленные в HEAD
# после старта окна и новые из списка самого окна; чужие неотслеживаемые не трогаются.
# Если части уже закоммичены — обратные части тем же morning_commit_parts.sh (новые → исходники → код в окно → удаления).
# --dry-run: печатает, что вернётся и что удалится, ничего не трогая.
# Параметры для репетиции на другом дереве (по умолчанию — рабочая копия):
#   ROLLBACK_REPO=<дерево>  ROLLBACK_S=<каталог списков>  ROLLBACK_START=<ревизия>  ROLLBACK_SKIP_CHECK=1  ROLLBACK_COMMIT=plain
DRY=""; [ "$1" = "--dry-run" ] && DRY=1
S0=/c/Temp/claude/C--appsprojects-phraseman/129f91a4-53c5-416d-988a-0f73c489dfc8/scratchpad
S=${ROLLBACK_S:-$S0}
REPO=${ROLLBACK_REPO:-/c/appsprojects/phraseman}
cd "$REPO" || exit 1
START=${ROLLBACK_START:-$(cat $S/morning_start_rev.txt 2>/dev/null)}
[ -n "$START" ] || { echo "[ROLLBACK] нет morning_start_rev.txt — окно не начиналось"; exit 1; }
mkdir -p $S/testlogs; L=$S/testlogs/morning_rollback.log; : > $L
say() { echo "[ROLLBACK] $(date +%H:%M:%S) $*" | tee -a $L; }
TEXT=(app/learning_v2_bootstrap_audio_assets_v1.generated.ts app/learning_v2_factory_single_voice_v1.generated.ts
  app/learning_v2_factory_production_audio_entries_v1.generated.ts app/learning_v2_factory_lesson_audio_index_v1.generated.ts
  content/learning-v2-course/audio/en/single-voice-v1.json)
DIRS=(assets/audio/learning-v2-bootstrap-v1 assets/audio/learning-v2/factory-production-v1 assets/audio/learning-v2/authoring-single-voice-v1)
say "дерево $REPO, старт окна ${START:0:9}, HEAD $(git rev-parse --short HEAD)${DRY:+ — ПРОБНЫЙ ПРОГОН, ничего не меняю}"
[ -n "$DRY" ] || cp $S/parts_new.txt $S/rb_window_new.txt 2>/dev/null   # список новых файлов окна — до того, как откат перепишет parts_new.txt
WIN_NEW=$S/rb_window_new.txt; [ -n "$DRY" ] && WIN_NEW=$S/parts_new.txt

# что вернётся: пути набора, которые отличаются от старта (в HEAD или в рабочей копии)
{ git diff --name-only "$START" -- "${TEXT[@]}" "${DIRS[@]}"; } | sort -u > $S/rb_restore.txt
# что удалится: только своё — добавленное в HEAD после старта + новые файлы окна, которых не было на старте
{ git diff --name-only --diff-filter=A "$START" HEAD -- "${DIRS[@]}"; cat "$WIN_NEW" 2>/dev/null; } | sort -u > $S/rb_remove_raw.txt
: > $S/rb_remove.txt
while read -r p; do
  [ -n "$p" ] || continue
  git cat-file -e "$START:$p" 2>/dev/null && continue   # был на старте — не удалять, а вернуть
  [ -f "$p" ] && echo "$p" >> $S/rb_remove.txt
done < $S/rb_remove_raw.txt
say "вернётся к ${START:0:9}: $(grep -vxFf $S/rb_remove.txt $S/rb_restore.txt | wc -l) путей; удалится своих файлов: $(wc -l < $S/rb_remove.txt)"
if [ -n "$DRY" ]; then
  grep -vxFf $S/rb_remove.txt $S/rb_restore.txt | head -10 | sed 's/^/[ROLLBACK]   вернуть: /'
  head -10 $S/rb_remove.txt | sed 's/^/[ROLLBACK]   удалить: /'
  say "пробный прогон окончен — ничего не изменено"; exit 0
fi

git checkout "$START" -- "${TEXT[@]}" "${DIRS[@]}" || { say "checkout не прошёл — стоп"; exit 1; }
while read -r p; do rm -f "$p"; done < $S/rb_remove.txt
say "пути набора возвращены к ${START:0:9}, удалено своих файлов $(wc -l < $S/rb_remove.txt)"
if [ -z "$ROLLBACK_SKIP_CHECK" ]; then
  for g in build_learning_v2_factory_audio_module build_learning_v2_factory_single_voice_module build_learning_v2_bootstrap_audio_pack build_learning_v2_factory_lesson_audio_index; do
    node scripts/$g.mjs --check >> $L 2>&1 || { say "$g --check упал после возврата — стоп, звать Ядро"; exit 1; }; done
fi
if git diff --quiet HEAD -- "${TEXT[@]}" "${DIRS[@]}" && [ -z "$(git ls-files --others --exclude-standard -- "${DIRS[@]}" | grep -xFf $S/rb_remove_raw.txt)" ]; then
  say "закоммиченных частей не было — рабочая копия возвращена, откат готов"; exit 0
fi
# зачем (репетиция 18.10 поймала): «все неотслеживаемые в каталоге набора» включали чужой файл-приманку, и он уехал в обратный
# коммит. Возвращаемые «новые» — только неотслеживаемые файлы, которые БЫЛИ на старте окна (их удалили части окна).
git -c core.quotepath=false ls-files --others --exclude-standard -- "${DIRS[@]}" | while read -r p; do
  git cat-file -e "$START:$p" 2>/dev/null && echo "$p"; done > $S/rb_restored_untracked.txt
say "вернувшиеся файлы старта (не в HEAD): $(wc -l < $S/rb_restored_untracked.txt); чужие неотслеживаемые не трогаются"
if [ "$ROLLBACK_COMMIT" = "plain" ]; then
  # только для репетиции в одноразовом хранилище: обычный коммит вместо частей safe_commit
  git add -u -- "${TEXT[@]}" "${DIRS[@]}" && { [ -s $S/rb_restored_untracked.txt ] && git add --pathspec-from-file=$S/rb_restored_untracked.txt || true; } \
    && git -c user.name=rehearsal -c user.email=r@local commit --no-verify -q -m "rehearsal: откат окна к ${START:0:9}" && say "обратный коммит (репетиция) $(git rev-parse --short HEAD)"; exit $?
fi
# списки обратных частей — сравнение (индекс + рабочее дерево) с HEAD: checkout <старт> кладёт возвращённое прямо в индекс,
# поэтому «??» из status их не видит; плюс вернувшиеся неотслеживаемые файлы старта. Чужие неотслеживаемые сюда не попадают.
BD=assets/audio/learning-v2-bootstrap-v1; FD=assets/audio/learning-v2/factory-production-v1; AD=assets/audio/learning-v2/authoring-single-voice-v1
{ git -c core.quotepath=false diff --name-only --diff-filter=A HEAD -- $BD; grep "^$BD/" $S/rb_restored_untracked.txt; } | sort -u > $S/parts_new.txt
{ git -c core.quotepath=false diff --name-only --diff-filter=AM HEAD -- $FD $AD | grep '\.mp3$'; grep -E "^($FD|$AD)/.*\.mp3$" $S/rb_restored_untracked.txt; \
  git -c core.quotepath=false diff --name-only --diff-filter=M HEAD -- $BD; } | sort -u > $S/parts_src.txt
printf '%s\n' "${TEXT[@]}" $FD/manifest.json > $S/parts_code.txt
{ git -c core.quotepath=false diff --name-only --diff-filter=D HEAD -- $BD $FD; } | sort -u > $S/parts_del.txt
if [ "$ROLLBACK_COMMIT" = "lists" ]; then say "списки: новых $(wc -l < $S/parts_new.txt), исходников $(wc -l < $S/parts_src.txt), удалений $(wc -l < $S/parts_del.txt) — только списки (репетиция)"; exit 0; fi
rm -f $S/part_*; split -l 500 -d -a 3 $S/parts_new.txt $S/part_new_   # исходники — в часть-переключение
split -l 500 -d -a 3 $S/parts_del.txt $S/part_zdel_
say "обратные части: новых $(wc -l < $S/parts_new.txt), исходников $(wc -l < $S/parts_src.txt), удалений $(wc -l < $S/parts_del.txt) — коммит"
bash $S0/morning_commit_parts.sh "откат-к-${START:0:9}"
