#!/usr/bin/env bash
# revisor_freeze.sh — «одна кнопка» заморозки выпуска (Ревизор, 05.11.2026).
#
# зачем (координатор 05.11): на 01:30 (заморозка) и 02:10 (пять сторожей) прогнать на ЧИСТОЙ копии закоммиченного HEAD
# tsc приложения + functions и сторожей сборки одной командой, не вспоминая ключи. Копия: git archive (LF) + git-индекс
# (git init; git add -A) — сторожам нужен `git grep`/`git ls-files`; клон ветки не годится (хук запрещает создавать ветки).
#
# Запуск:  bash docs/work/release/revisor_freeze.sh [REV] [--full]
#   REV      коммит (по умолчанию HEAD)
#   --full   после сторожей ещё полный jest (--maxWorkers=2) и node --test (долго, ~40–60 мин)
# Результат: C:/Temp/claude/revisor_freeze/<REV>/SUMMARY.txt (+ tsc_app.txt, tsc_fn.txt, guards.txt, ...). Код выхода 0 = всё зелёное.
# Тяжёлое идёт через семафор .claude/semaphore/slot.sh; jest с --maxWorkers=2 (память ПК делят эмулятор и Metro).
set -u
REPO="${REPO:-/c/appsprojects/phraseman}"
REV_ARG="${1:-HEAD}"; [ "${REV_ARG}" = "--full" ] && REV_ARG=HEAD
FULL=0; for a in "$@"; do [ "$a" = "--full" ] && FULL=1; done
cd "$REPO" || exit 2
SHA="$(git rev-parse --short "$REV_ARG")" || exit 2
OUT="${OUT_ROOT:-/c/Temp/claude/revisor_freeze}/$SHA"
D="$OUT/copy"
WIN_D="$(cygpath -w "$D" 2>/dev/null || echo "$D")"
SLOT="bash $REPO/.claude/semaphore/slot.sh run --wait=1500"
mkdir -p "$OUT"
SUM="$OUT/SUMMARY.txt"
echo "REVISOR FREEZE rev=$SHA start=$(date +%H:%M) full=$FULL" > "$SUM"
FAIL=0
note() { echo "$*" | tee -a "$SUM"; }

# 1. чистая копия + git-индекс
cmd //c "rmdir \"$WIN_D\\node_modules\"" >/dev/null 2>&1
cmd //c "rmdir \"$WIN_D\\functions\\node_modules\"" >/dev/null 2>&1
rm -rf "$D"; mkdir -p "$D"
git -c core.autocrlf=false -c core.eol=lf archive "$SHA" | tar -x -C "$D" || { note "ARCHIVE_FAIL"; exit 2; }
cmd //c "mklink /J \"$WIN_D\\node_modules\" \"$(cygpath -w "$REPO/node_modules")\"" >/dev/null
cmd //c "mklink /J \"$WIN_D\\functions\\node_modules\" \"$(cygpath -w "$REPO/functions/node_modules")\"" >/dev/null
( cd "$D" && git init -q 2>/dev/null && git add -A >/dev/null 2>&1 )
note "COPY_OK $(date +%H:%M)"
cd "$D" || exit 2

# 2. tsc приложения и functions
$SLOT "Ревизор: tsc app $SHA" -- bash -c "NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false > '$OUT/tsc_app.txt' 2>&1; echo EXIT=\$? >> '$OUT/tsc_app.txt'"
E_APP=$(grep -c 'error TS' "$OUT/tsc_app.txt"); note "TSC_APP errors=$E_APP $(tail -1 "$OUT/tsc_app.txt")"; [ "$E_APP" != "0" ] && FAIL=1
( cd functions && $SLOT "Ревизор: tsc functions $SHA" -- bash -c "NODE_OPTIONS=--max-old-space-size=6144 npx tsc --noEmit --pretty false > '$OUT/tsc_fn.txt' 2>&1; echo EXIT=\$? >> '$OUT/tsc_fn.txt'" )
E_FN=$(grep -c 'error TS' "$OUT/tsc_fn.txt"); note "TSC_FUNCTIONS errors=$E_FN $(tail -1 "$OUT/tsc_fn.txt")"; [ "$E_FN" != "0" ] && FAIL=1

# 3. сторожа сборки (+ прогресс классики, звёзды/монеты)
GUARDS="tests/progress_preservation_owner_lock_2026_11_04.test.ts tests/firestore_rules_security.test.ts tests/pm230_firestore_rules_least_privilege.test.ts tests/energy_state_v2.test.ts tests/classic_courses_pack_2026_11_04.test.ts tests/classic_courses_progress_preserved.test.ts tests/rune_balance_snapshot_preservation_contract.test.ts"
$SLOT "Ревизор: сторожа $SHA" -- bash -c "npx jest $GUARDS --maxWorkers=2 --no-coverage --no-watchman > '$OUT/guards.txt' 2>&1; echo EXIT=\$? >> '$OUT/guards.txt'"
grep -E '^(PASS|FAIL)' "$OUT/guards.txt" | sed 's/ (.*//' | while read -r l; do note "GUARD $l"; done
grep -q '^FAIL' "$OUT/guards.txt" && FAIL=1
node --test tests/rank_gates_since_release_cut_guard.test.mjs > "$OUT/rank_gates.txt" 2>&1; RC=$?; note "GUARD rank_gates (без RELEASE_CUT) exit=$RC"; [ "$RC" != "0" ] && FAIL=1
RELEASE_CUT=1 node --test tests/rank_gates_since_release_cut_guard.test.mjs > "$OUT/rank_gates_cut.txt" 2>&1; RC=$?
note "GUARD rank_gates (RELEASE_CUT=1) exit=$RC  (красный = срез RANK_GATES_NEW_USERS_SINCE_MS ещё не сделан; после среза 02:15 должен быть 0)"

# 4. по желанию — полный прогон
if [ "$FULL" = "1" ]; then
  $SLOT "Ревизор: полный jest $SHA" -- bash -c "npx jest --maxWorkers=2 --no-coverage --no-watchman --silent > '$OUT/jest_full.txt' 2>&1; echo EXIT=\$? >> '$OUT/jest_full.txt'"
  note "JEST_FULL $(grep -E '^Test Suites:' "$OUT/jest_full.txt")  $(grep -E '^Tests:' "$OUT/jest_full.txt")"
  $SLOT "Ревизор: node --test $SHA" -- bash -c "node --test tests/*.test.mjs tests/*.test.cjs > '$OUT/node_test.txt' 2>&1; echo EXIT=\$? >> '$OUT/node_test.txt'"
  note "NODE_TEST $(tail -1 "$OUT/node_test.txt")"
fi

note "VERDICT $([ "$FAIL" = "0" ] && echo GREEN || echo RED) rev=$SHA end=$(date +%H:%M)"
exit "$FAIL"
