#!/bin/bash
# Прогон тестов Арены без jest: компиляция + свой крошечный прогонщик.
# Запуск: bash tools/arena_tests/run.sh (из корня репозитория)
set -u
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export ARENA_REPO="$(cd "$HERE/../.." && pwd)"
export ARENA_BUILD_DIR="$ARENA_REPO/.arena-test-build/"
export NODE_PATH="$ARENA_REPO/node_modules:$ARENA_REPO/functions/node_modules"

cd "$ARENA_REPO" || exit 1

if [ "${ARENA_SKIP_BUILD:-0}" != "1" ]; then
  # Всегда собираем с нуля: иначе удалённый или переименованный тест остаётся
  # в outDir и продолжает создавать ложные зелёные/красные результаты.
  node -e "require('fs').rmSync(process.env.ARENA_BUILD_DIR,{recursive:true,force:true})"
  ./node_modules/.bin/tsc -p "$HERE/tsconfig.json" > /tmp/arena_tsc.txt 2>&1 || true
  # Ошибки «Cannot find name describe/it/expect» ожидаемы: эти имена даёт
  # прогонщик во время выполнения, а не типы.
  unexpected=$(grep -vE "Cannot find name '(describe|it|test|expect|beforeEach|afterEach|beforeAll|afterAll|jest)'" /tmp/arena_tsc.txt \
    | grep -E "^(tests|functions|modules|app|components|hooks)/.*error TS" | head -20 || true)
  if [ -n "$unexpected" ]; then
    echo "$unexpected"
    exit 1
  fi
fi

total=0; suites=0; bad=0
for f in "$ARENA_BUILD_DIR"tests/arena_*.test.js "$ARENA_BUILD_DIR"functions/src/arena_*.test.js; do
  [ -e "$f" ] || continue
  out=$(node -e "require('$HERE/mockshim.js');require('$HERE/rootshim.js');const h=require('$HERE/jestlite.js');require('$f');h.report().then((bad)=>process.exit(bad?1:0));" 2>&1)
  last=$(echo "$out" | tail -1)
  n=$(echo "$last" | sed -n 's/^\([0-9]*\) passed.*/\1/p')
  if echo "$last" | grep -q "0 failed" && [ -n "$n" ]; then
    total=$((total+n)); suites=$((suites+1))
  else
    bad=$((bad+1)); echo "FAIL $(basename "$f")"; echo "$out" | tail -12
  fi
done
echo "SUITES=$suites ASSERTIONS=$total FAILED_SUITES=$bad"
[ "$bad" -eq 0 ]
