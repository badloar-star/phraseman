#!/bin/bash
# Выкладка Firebase ТОЛЬКО из чистой выгрузки HEAD (координатор 15.10, сухой прогон выкладки 17.10).
#
# зачем: `firebase deploy` собирает functions/ из рабочего дерева как есть. 15.10 там лежали незакоммиченные правки Codex
# (content_factory/v2_activity_session_projection.ts входит в замыкание набора default) — выкладка из дерева увезла бы их в прод.
# Здесь сборка и выкладка идут из копии ровно одного коммита: git archive HEAD → временная папка вне репо.
#
# По умолчанию СУХОЙ ПРОГОН: выгрузка + сборка functions + проверка паритета рантайма + печать команды. Ничего не выкладывает.
# Выкладка — только с явным --execute (решение владельца; 17.10 выкладывает владелец). --force запрещён всегда.
#
#   bash scripts/deploy_from_clean_head.sh --only "functions:default:legacyBonusConvertMine,functions:default:onboardingLevelRecord"
#   bash scripts/deploy_from_clean_head.sh --only "firestore:rules"
#   bash scripts/deploy_from_clean_head.sh --only "<…>" --execute          ← только по слову владельца
#
# Цели --only: firestore:rules | firestore:indexes | functions:default | functions:default:<имя> | hosting:admin | hosting:knowlywww.
# Голое «functions» (все кодовые базы, включая content Codex) отклоняется.
set -u
PROJECT=phraseman-ea0b3
ROOT=$(cd "$(dirname "$0")/.." && pwd)
ONLY=""; EXECUTE=0
while [ $# -gt 0 ]; do
  case "$1" in
    --only) ONLY="${2:-}"; shift 2 ;;
    --execute) EXECUTE=1; shift ;;
    --force|-f) echo "[DEPLOY-CLEAN] ОТКАЗ: --force запрещён (удаляет функции без вопроса; их зовут старые сборки)"; exit 2 ;;
    *) echo "[DEPLOY-CLEAN] ОТКАЗ: неизвестный аргумент «$1»"; exit 2 ;;
  esac
done
[ -n "$ONLY" ] || { echo "[DEPLOY-CLEAN] ОТКАЗ: нужен --only \"<цели через запятую>\""; exit 2; }
IFS=',' read -r -a TARGETS <<< "$ONLY"
for t in "${TARGETS[@]}"; do
  if ! [[ "$t" =~ ^(firestore:rules|firestore:indexes|functions:default|functions:default:[A-Za-z0-9_]+|hosting:admin|hosting:knowlywww)$ ]]; then
    echo "[DEPLOY-CLEAN] ОТКАЗ: цель «$t» не из разрешённого списка (см. шапку скрипта)"; exit 2
  fi
done

cd "$ROOT" || exit 1
SHA=$(git rev-parse HEAD); SHORT=${SHA:0:9}
X=${DEPLOY_CLEAN_DIR:-/c/Temp/claude/deploy_clean_$SHORT}
echo "[DEPLOY-CLEAN] HEAD=$SHORT цели=$ONLY режим=$([ $EXECUTE -eq 1 ] && echo ВЫКЛАДКА || echo 'сухой прогон') папка=$X"
DIRTY=$(git status --porcelain -- functions/ firestore.rules firestore.indexes.json admin/v2 knowly-www | wc -l)
echo "[DEPLOY-CLEAN] грязных путей в рабочем дереве (в выкладку НЕ попадут): $DIRTY"

# 1) выгрузка HEAD: только то, что нужно сборке functions, правилам и хостингам
# functions-* — прочие кодовые базы firebase.json: CLI проверяет их папки, сами они не собираются и не выкладываются.
PATHS=(functions functions-admin functions-content functions-english-test modules shared content/arena-multilingual tests scripts app components constants specs knowly-www admin/v2
  package.json package-lock.json app.config.js app.json tsconfig.json firebase.json .firebaserc firestore.rules firestore.indexes.json storage.rules
  legal terms.html privacy.html admin/oauth-privacy.html)
EXIST=()
for p in "${PATHS[@]}"; do [ -n "$(git ls-tree --name-only HEAD -- "$p")" ] && EXIST+=("$p"); done
for nm in "$X/node_modules" "$X/functions/node_modules"; do
  if [ -e "$nm" ]; then cmd //c "rmdir $(cygpath -w "$nm")" > /dev/null 2>&1; fi
  if [ -e "$nm" ]; then echo "[DEPLOY-CLEAN] ОТКАЗ: не снять ссылку $nm — папку не трогаю"; exit 1; fi
done
cmd //c "rmdir /s /q $(cygpath -w "$X")" > /dev/null 2>&1
mkdir -p "$X"
# Выгрузка через временный индекс (общий индекс не трогается) — тот же путь, что у scripts/build_rehearsal.sh.
TMP_INDEX="$X.index"
rm -f "$TMP_INDEX"
GIT_INDEX_FILE="$TMP_INDEX" git read-tree "$SHA" || { echo "[DEPLOY-CLEAN] ОТКАЗ: read-tree"; exit 1; }
git ls-tree -r --name-only "$SHA" -- "${EXIST[@]}" | GIT_INDEX_FILE="$TMP_INDEX" git checkout-index --prefix="$(cygpath -m "$X")/" --stdin \
  || { echo "[DEPLOY-CLEAN] ОТКАЗ: checkout-index"; rm -f "$TMP_INDEX"; exit 1; }
rm -f "$TMP_INDEX"
echo "[DEPLOY-CLEAN] выгружено файлов: $(find "$X" -type f | wc -l)"

# зачем (Сайт 18.10, репетиция R103-0/R111): параметры функций (defineString — адреса писем, версии ключей восстановления…) лежат в
# functions/.env и functions/.env.<проект>; они в .gitignore, в выгрузке HEAD их нет — CLI без терминала падает «no value for the
# following environment variables». Копируем ровно эти два файла из рабочего дерева: это настройки, не секреты (секреты — Secret
# Manager), и обычный `firebase deploy` из рабочего дерева берёт те же файлы. Значения в журнал не пишем — только имена ключей.
if printf '%s\n' "${TARGETS[@]}" | grep -q '^functions'; then
  for envf in functions/.env "functions/.env.$(node -e "process.stdout.write(JSON.parse(require('fs').readFileSync(process.argv[1],'utf8')).projects.default)" "$(cygpath -w "$ROOT/.firebaserc")")"; do
    [ -f "$ROOT/$envf" ] || { echo "[DEPLOY-CLEAN] ОТКАЗ: нет $envf в рабочем дереве — параметры функций не задать"; exit 1; }
    cp "$ROOT/$envf" "$X/$envf"
    echo "[DEPLOY-CLEAN] параметры функций из рабочего дерева: $envf ($(grep -cE '^[A-Z0-9_]+=' "$ROOT/$envf") ключей: $(grep -oE '^[A-Z0-9_]+' "$ROOT/$envf" | tr '\n' ' '))"
  done
fi

# 2) зависимости — ссылки на основное дерево (только чтение; Cloud Build ставит пакеты сам по package-lock функций)
cmd //c "mklink /J $(cygpath -w "$X/node_modules") $(cygpath -w "$ROOT/node_modules")" > /dev/null
cmd //c "mklink /J $(cygpath -w "$X/functions/node_modules") $(cygpath -w "$ROOT/functions/node_modules")" > /dev/null
[ -f "$X/functions/node_modules/typescript/package.json" ] || { echo "[DEPLOY-CLEAN] ОТКАЗ: functions/node_modules"; exit 1; }

# 3) сборка functions, как predeploy (контекст поддержки — режим архива: .git нет, коммит задан явно)
export PHRASEMAN_SUPPORT_RELEASE_ARCHIVE=1 PHRASEMAN_SUPPORT_RELEASE_COMMIT="$SHA"
cd "$X" || exit 1
if printf '%s\n' "${TARGETS[@]}" | grep -q '^functions'; then
  npm --prefix functions run build > "$X.build.log" 2>&1 || { echo "[DEPLOY-CLEAN] FAIL сборка functions — $X.build.log"; tail -15 "$X.build.log"; exit 1; }
  node scripts/functions_runtime_parity_gate.mjs > "$X.parity.log" 2>&1 || { echo "[DEPLOY-CLEAN] FAIL паритет рантайма — $X.parity.log"; tail -10 "$X.parity.log"; exit 1; }
  echo "[DEPLOY-CLEAN] сборка functions и паритет рантайма — OK"
fi

# 4) сайт (выкладка сайта и политики, координатор 17.10): каркас сайта + политика в страницах = канон legal/*.json
# зачем: страницы политики генерирует legal:sync; если в коммите страница разошлась с JSON, на сайт уехал бы не тот текст.
# Синк гоняем в чистой копии (он идемпотентен) и сверяем, что ни одна страница не поменялась.
if printf '%s
' "${TARGETS[@]}" | grep -q '^hosting:knowlywww$'; then
  node scripts/verify_website_surface_contract.mjs --root knowly-www > "$X.site.log" 2>&1 || { echo "[DEPLOY-CLEAN] FAIL каркас сайта — $X.site.log"; tail -10 "$X.site.log"; exit 1; }
  echo "[DEPLOY-CLEAN] каркас сайта — OK"
  LEGAL_PAGES=(knowly-www/legal/terms/index.html knowly-www/legal/privacy/index.html knowly-www/legal/privacy-ios/index.html knowly-www/legal/data-deletion/index.html)
  for f in "${LEGAL_PAGES[@]}"; do [ -f "$f" ] || { echo "[DEPLOY-CLEAN] FAIL нет страницы политики $f"; exit 1; }; cp "$f" "$f.head"; done
  node scripts/sync-legal-html.mjs > "$X.legal.log" 2>&1 || { echo "[DEPLOY-CLEAN] FAIL legal:sync — $X.legal.log"; tail -10 "$X.legal.log"; exit 1; }
  DRIFT=0
  for f in "${LEGAL_PAGES[@]}"; do
    # сравниваем текст без \r: выгрузка идёт с autocrlf, синк переносит часть \r из JSON — это не расхождение текста
    if ! cmp -s <(tr -d '\015' < "$f") <(tr -d '\015' < "$f.head"); then echo "[DEPLOY-CLEAN] FAIL политика: $f в коммите расходится с legal/*.json (нужен npm run legal:sync + коммит)"; DRIFT=1; fi
    rm -f "$f.head"
  done
  [ $DRIFT -eq 0 ] || exit 1
  echo "[DEPLOY-CLEAN] страницы политики = legal/*.json — OK ($(grep -o 'October [0-9]*, 2026' knowly-www/legal/privacy/index.html | head -1))"
fi

CMD=(firebase deploy --only "$ONLY" --project "$PROJECT")
if [ $EXECUTE -ne 1 ]; then
  # проверка самим Firebase CLI без выкладки (для хостинга — сверка конфига и файлов; ничего не публикует)
  "${CMD[@]}" --dry-run > "$X.dryrun.log" 2>&1 || { echo "[DEPLOY-CLEAN] FAIL firebase --dry-run — $X.dryrun.log"; tail -15 "$X.dryrun.log"; exit 1; }
  echo "[DEPLOY-CLEAN] firebase --dry-run — OK ($X.dryrun.log)"
  echo "[DEPLOY-CLEAN] PASS сухой прогон HEAD=$SHORT. Выкладка (только по слову владельца): bash scripts/deploy_from_clean_head.sh --only \"$ONLY\" --execute"
  echo "[DEPLOY-CLEAN] Команда, которая выполнится в $X: ${CMD[*]}"
  exit 0
fi
echo "[DEPLOY-CLEAN] ВЫКЛАДКА из $X: ${CMD[*]}"
echo "[DEPLOY-CLEAN] Если CLI спросит про УДАЛЕНИЕ функций — отвечать «N»."
"${CMD[@]}"
rc=$?
echo "[DEPLOY-CLEAN] firebase deploy exit=$rc"
exit $rc
