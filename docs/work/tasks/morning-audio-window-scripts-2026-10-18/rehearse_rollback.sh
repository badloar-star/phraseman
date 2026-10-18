#!/bin/bash
# Репетиция отката (координатор 03:08) в одноразовом клоне: фиктивное окно → --dry-run → откат → проверка → удаление клона.
S0=/c/Temp/claude/C--appsprojects-phraseman/129f91a4-53c5-416d-988a-0f73c489dfc8/scratchpad
C=/c/Temp/claude/rb_clone; CS=/c/Temp/claude/rb_clone_lists
rm -rf $C $CS; mkdir -p $CS
# без веток (хук владельца запрещает создавать ветки): пустое хранилище + alternates на объекты основного + отсоединённый HEAD
SRC_HEAD=$(git -C /c/appsprojects/phraseman rev-parse HEAD)
git init -q $C || exit 1
cd $C || exit 1
echo "C:/appsprojects/phraseman/.git/objects" > .git/objects/info/alternates
git config core.sparseCheckout true
MSYS_NO_PATHCONV=1 git sparse-checkout set --no-cone app/learning_v2_bootstrap_audio_assets_v1.generated.ts app/learning_v2_factory_single_voice_v1.generated.ts \
  app/learning_v2_factory_production_audio_entries_v1.generated.ts app/learning_v2_factory_lesson_audio_index_v1.generated.ts \
  content/learning-v2-course/audio/en/single-voice-v1.json assets/audio/learning-v2-bootstrap-v1/ assets/audio/learning-v2/factory-production-v1/ assets/audio/learning-v2/authoring-single-voice-v1/
git -c core.autocrlf=false checkout -q --detach "$SRC_HEAD" || exit 1
START=$(git rev-parse HEAD); echo "[REHEARSAL] клон на ${START:0:9}, файлов в наборе $(ls assets/audio/learning-v2-bootstrap-v1 | wc -l)"
B=assets/audio/learning-v2-bootstrap-v1
mapfile -t F < <(ls $B | head -4)
# фиктивное окно: часть-коммит = новый файл + подмена файла 1 + удаление файла 3 + правка модуля набора
printf 'fake-new' > $B/ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0001.mp3
printf 'fake-reencoded-1' > $B/${F[0]}
git rm -q $B/${F[2]}
echo "// rehearsal" >> app/learning_v2_bootstrap_audio_assets_v1.generated.ts
A=assets/audio/learning-v2/authoring-single-voice-v1; mapfile -t AF < <(ls $A | head -2)
printf 'fake-src-64k' > $A/${AF[0]}
echo ' ' >> content/learning-v2-course/audio/en/single-voice-v1.json
git add -A -- $B app $A content && git -c user.name=rehearsal -c user.email=r@local commit --no-verify -q -m "rehearsal: часть окна" || exit 1
echo "[REHEARSAL] часть-коммит $(git rev-parse --short HEAD)"
# незакоммиченный хвост окна: подмена файла 2 + новый файл окна (в списке окна) + чужая приманка (НЕ в списке)
printf 'fake-reencoded-2' > $B/${F[1]}
printf 'fake-src-64k-2' > $A/${AF[1]}
printf 'bait-src' > $A/zz_foreign_bait_src_untracked.mp3
printf 'fake-new-2' > $B/ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0002.mp3
printf 'bait' > $B/zz_foreign_bait_untracked.mp3
printf '%s\n' "$B/ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0001.mp3" "$B/ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0002.mp3" > $CS/parts_new.txt
export ROLLBACK_REPO=$C ROLLBACK_S=$CS ROLLBACK_START=$START ROLLBACK_SKIP_CHECK=1 ROLLBACK_COMMIT=${MODE:-plain}
echo "[REHEARSAL] --- пробный прогон"; bash $S0/morning_rollback.sh --dry-run | grep ROLLBACK
before=$(git status --porcelain | wc -l); echo "[REHEARSAL] после --dry-run изменений в клоне: $before (ожидаю те же 4: M, ??, ??, ??)"
echo "[REHEARSAL] --- откат (режим ${MODE:-plain})"; bash $S0/morning_rollback.sh | grep ROLLBACK
if [ "${MODE:-plain}" = lists ]; then
  # как safe_commit: индекс от HEAD + ТОЛЬКО пути из списков частей
  git read-tree HEAD && git sparse-checkout reapply 2>/dev/null
  cat $CS/parts_new.txt $CS/parts_src.txt $CS/parts_code.txt | while read -r p; do [ -e "$p" ] && git add -- "$p"; done
  while read -r p; do git rm -q --cached --ignore-unmatch -- "$p"; done < $CS/parts_del.txt
  git -c user.name=rehearsal -c user.email=r@local commit --no-verify -q -m "rehearsal: обратные части по спискам" && echo "[REHEARSAL] обратные части по спискам: $(git rev-parse --short HEAD) (новых $(wc -l < $CS/parts_new.txt), исходников $(wc -l < $CS/parts_src.txt), удалений $(wc -l < $CS/parts_del.txt))"
  git ls-files --error-unmatch $B/zz_foreign_bait_untracked.mp3 >/dev/null 2>&1 && { echo "[REHEARSAL] ✗ приманка попала в коммит"; ok_bait=0; }
fi
ok=1
git diff --quiet $START HEAD -- app content assets || { echo "[REHEARSAL] ✗ HEAD отличается от старта по путям набора:"; git diff --name-status $START HEAD -- app content assets | head -5; ok=0; }
git diff --quiet -- app content assets || { echo "[REHEARSAL] ✗ рабочее дерево клона отличается от HEAD:"; git diff --stat -- app content assets | tail -3; git diff -- app content assets | head -12 | cat -A | cut -c1-120; ok=0; }
[ -f $A/zz_foreign_bait_src_untracked.mp3 ] && echo "[REHEARSAL] ✓ приманка в исходниках цела" || { echo "[REHEARSAL] ✗ приманка в исходниках удалена"; ok=0; }
[ -f $B/zz_foreign_bait_untracked.mp3 ] && echo "[REHEARSAL] ✓ приманка цела" || { echo "[REHEARSAL] ✗ приманка удалена"; ok=0; }
others=$(git ls-files --others -- $B | grep -v zz_foreign_bait | wc -l); [ "$others" -eq 0 ] || { echo "[REHEARSAL] ✗ остались свои неотслеживаемые: $others"; ok=0; }
[ -f $B/${F[2]} ] && echo "[REHEARSAL] ✓ удалённый в окне файл возвращён" || { echo "[REHEARSAL] ✗ удалённый файл не вернулся"; ok=0; }
echo "[REHEARSAL] итог ok=$ok"
[ "$KEEP" = 1 ] || { cd /c/Temp/claude && rm -rf $C $CS && echo "[REHEARSAL] клон удалён"; }
