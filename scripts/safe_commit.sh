#!/bin/bash
# ═══════════════════════════════════════════════════════════
# safe_commit.sh — общий безопасный коммит для параллельных сессий (Claude/Codex) в ОДНОМ рабочем дереве.
#
# зачем (координатор 13.10, опыт Ядра 05.10–13.10): общий git-индекс и общие файлы правят 10+ сессий сразу. За неделю
# повторились одни и те же аварии:
#   - `git add <файл>` забирал чужие незакоммиченные хунки (53 строки вместо 14 → HEAD перестал собираться);
#   - отложенный коммит сверял numstat за 17 минут ДО коммита — за это время соседка дописала 3 строки, вызов задвоился;
#   - временный индекс, собранный до замка, откатывал чужой свежий коммит;
#   - брошенный .git/index.lock после падения git (segfault rc=139) блокировал всех;
#   - общий индекс держал старые версии моих путей, и чужой обычный `git commit` молча возвращал старый код.
# Скрипт закрывает всё это разом:
#   1) общий замок C:/Temp/claude/git_commit.lock (mkdir; протухший > 10 мин снимается; освобождается всегда);
#   2) временный индекс строится от HEAD ВНУТРИ замка — HEAD не сдвинется до коммита;
#   3) в коммит идут только перечисленные пути (целиком) и/или хунки из patch-файлов (`git apply --cached`);
#   4) numstat сверяется с ожидаемым В МОМЕНТ КОММИТА (а не заранее): лишний путь или другое число строк → ОТКАЗ;
#   5) дерево из временного индекса ДО хуков (неизменяемый объект) + повторная сверка numstat по дереву + стоп, если в дереве
#      < 90 % путей HEAD; pre-commit/post-commit явно; `git commit-tree` + атомарный `git update-ref ветка NEW BASE`; от хуков
#      до сдвига ветки TERM/INT/HUP игнорируются; несовпадение после сдвига → откат ветки; «Unable to create …lock» → журнал
#      и ожидание до 180 с со снятием брошенного замка; прочие сбои — 3 повтора;
#   6) после коммита общий индекс синхронизируется с HEAD только по своим путям (до 180 с; брошенный пустой index.lock
#      старше 60 с снимается, если нет git.exe старше 60 с);
#   7) каждая ветка пишет строку [SAFE-COMMIT] — вся цепочка ищется одним grep.
#
# Использование:
#   bash scripts/safe_commit.sh -m <msgfile> --expect <путь>=<+>/<-> [...] [--patch <файл.patch> ...] [--] [<путь> ...]
#   bash scripts/safe_commit.sh -m <msgfile> --dry-run -- <путь> ...   # показать numstat, ничего не коммитить
# Флаги:
#   --expect P=A/D   ожидаемые добавленные/удалённые строки пути P в ИТОГОВОМ коммите (обязательно для КАЖДОГО пути;
#                    двоичный файл — P=bin). Пути — от корня репозитория, как их печатает git (скрипт работает из корня);
#   --patch F        внести в коммит только хунки из F (сделать: git diff -- файл > my.patch, вычистить чужое);
#   --wait-window    пути кода (app/ components/ modules/ functions/ hooks/ constants/) ждать окна :00–:05 / :30–:35;
#   --dry-run        собрать временный индекс, напечатать numstat и выйти без коммита.
# Окружение: SAFE_COMMIT_LOCK (путь замка, для тестов), SAFE_COMMIT_IGNORE_WINDOW=1 (не проверять окно кода),
#             SAFE_COMMIT_OLD_GIT_CHECK=skip (не проверять живые git.exe перед снятием брошенного index.lock — только для тестов),
#             SAFE_COMMIT_ALLOW_MASS_DELETE=1 (осознанно разрешить коммит, после которого в дереве < 90 % путей HEAD).
# НЕ оборачивать в timeout и не убивать: в критической секции сигналы игнорируются, kill -9 оставит замок.
# Коды выхода: 0 — коммит есть; 2 — неверный вызов; 3 — отказ сверки numstat; 4 — вне окна кода;
#              5 — patch не лёг; 6 — коммит не создан; 7 — HEAD сдвинулся / заголовок не тот.
# Сторож: tests/safe_commit_script_contract.test.ts (живой прогон во временном репозитории).
# ═══════════════════════════════════════════════════════════
# зачем (13.10): всё тело — один блок { … }: bash читает его целиком ДО запуска, поэтому замена файла, пока скрипт
# работает в другой сессии (его зовут все сессии сразу), не ломает идущий прогон — bash не дочитывает файл по смещению.
{
set -u
LOG='[SAFE-COMMIT]'
say() { echo "$LOG $*"; }

old_git_count() {
  case "${SAFE_COMMIT_OLD_GIT_CHECK:-ps}" in
    skip) echo 0; return ;;
  esac
  if ! command -v powershell.exe >/dev/null 2>&1; then say "проверка процессов: powershell нет — считаю, что старого git нет"; echo 0; return; fi
  local n
  n=$(powershell.exe -NoProfile -Command "(@(Get-Process git -ErrorAction SilentlyContinue | Where-Object { \$_.StartTime -lt (Get-Date).AddSeconds(-60) })).Count" 2>/dev/null | tr -dc '0-9')
  echo "${n:-0}"
}
# Кто держит замок: живые git.exe с возрастом и командой — чтобы по журналу было видно виновника (координатор 13.10).
log_git_holders() {
  [ "${SAFE_COMMIT_OLD_GIT_CHECK:-ps}" = skip ] && return
  command -v powershell.exe >/dev/null 2>&1 || return
  powershell.exe -NoProfile -Command "Get-CimInstance Win32_Process -Filter \"Name='git.exe'\" | ForEach-Object { '{0} age={1}s {2}' -f \$_.ProcessId, [int]((Get-Date) - \$_.CreationDate).TotalSeconds, (\$_.CommandLine -replace '\s+',' ').Substring(0, [Math]::Min(160, (\$_.CommandLine -replace '\s+',' ').Length)) }" 2>/dev/null \
    | tr -d '\r' | head -8 | while IFS= read -r line; do say "держатель? git $line"; done
}
# Снять брошенный замок: только пустой, старше 60 с и без живых git старше 60 с. Возвращает 0, если снят.
clear_stale_lock() {
  local lock="$1" age size old
  [ -e "$lock" ] || return 1
  age=$(( $(date +%s) - $(stat -c %Y "$lock" 2>/dev/null || date +%s) ))
  size=$(stat -c %s "$lock" 2>/dev/null || echo 0)
  if [ "$age" -le 60 ] || [ "$size" -ne 0 ]; then say "замок $lock: возраст ${age} с, размер ${size} байт — живой, не трогаю"; return 1; fi
  old=$(old_git_count)
  if [ "$old" -ne 0 ]; then say "замок $lock пустой, ${age} с, но живых git старше 60 с: $old — не трогаю"; log_git_holders; return 1; fi
  rm -f "$lock" && say "снят брошенный пустой замок $lock (возраст ${age} с, git старше 60 с: 0)"
}

ROOT=$(git rev-parse --show-toplevel 2>/dev/null) || { say "отказ: не git-репозиторий (cwd=$(pwd))"; exit 2; }
cd "$ROOT" || exit 2

MSG=''; DRY=0; WAIT_WINDOW=0
declare -a PATHS=() PATCHES=()
declare -A EXPECT=()
while [ $# -gt 0 ]; do
  case "$1" in
    -m) MSG="${2:-}"; shift 2 ;;
    --expect)
      spec="${2:-}"; shift 2
      p="${spec%=*}"; v="${spec##*=}"
      if [ -z "$p" ] || ! [[ "$v" =~ ^([0-9]+/[0-9]+|bin)$ ]]; then say "отказ: --expect '$spec' — нужно путь=добавлено/удалено (или путь=bin)"; exit 2; fi
      if [ "$v" = bin ]; then EXPECT["$p"]='- -'; else EXPECT["$p"]="${v%/*} ${v#*/}"; fi ;;
    --patch) PATCHES+=("${2:-}"); shift 2 ;;
    --dry-run) DRY=1; shift ;;
    --wait-window) WAIT_WINDOW=1; shift ;;
    --) shift; while [ $# -gt 0 ]; do PATHS+=("$1"); shift; done ;;
    -*) say "отказ: неизвестный флаг $1"; exit 2 ;;
    *) PATHS+=("$1"); shift ;;
  esac
done
say "вход: msg=${MSG:-нет} пути=${#PATHS[@]} патчи=${#PATCHES[@]} ожиданий=${#EXPECT[@]} dry=$DRY wait_window=$WAIT_WINDOW"

if [ ${#PATHS[@]} -eq 0 ] && [ ${#PATCHES[@]} -eq 0 ]; then say "отказ: нечего коммитить (нет путей и патчей)"; exit 2; fi
if [ "$DRY" -eq 0 ]; then
  if [ -z "$MSG" ] || [ ! -s "$MSG" ]; then say "отказ: нет файла сообщения (-m '$MSG')"; exit 2; fi
  if [ ${#EXPECT[@]} -eq 0 ]; then say "отказ: нет ни одного --expect — без сверки numstat коммит запрещён"; exit 2; fi
fi
for f in "${PATCHES[@]}"; do [ -s "$f" ] || { say "отказ: patch '$f' пуст или не найден"; exit 2; }; done

# Окно коммитов кода (правило ночи R1: код — только :00–:05 и :30–:35; документы, тесты, скрипты — в любое время).
is_code_path() { [[ "$1" =~ ^(app|components|modules|functions|hooks|constants)/ ]]; }
touches_code=0
for p in "${PATHS[@]}" "${!EXPECT[@]}"; do is_code_path "$p" && touches_code=1; done
in_window() { local m=$((10#$(date +%M))); { [ $m -le 5 ] || { [ $m -ge 30 ] && [ $m -le 35 ]; }; }; }
if [ "$DRY" -eq 0 ] && [ "$touches_code" -eq 1 ] && [ "${SAFE_COMMIT_IGNORE_WINDOW:-0}" != "1" ]; then
  if ! in_window; then
    if [ "$WAIT_WINDOW" -eq 1 ]; then
      say "окно кода: сейчас $(date +%H:%M), жду :00/:30"
      until in_window; do sleep 15; done
      say "окно кода открыто в $(date +%H:%M:%S)"
    else
      say "отказ: пути кода вне окна :00–:05/:30–:35 (сейчас $(date +%H:%M)); --wait-window чтобы дождаться"; exit 4
    fi
  else
    say "окно кода: $(date +%H:%M) — открыто"
  fi
fi

# 1) Замок.
LOCK="${SAFE_COMMIT_LOCK:-C:/Temp/claude/git_commit.lock}"
mkdir -p "$(dirname "$LOCK")" 2>/dev/null
waited=0
until mkdir "$LOCK" 2>/dev/null; do
  if [ -n "$(find "$LOCK" -maxdepth 0 -mmin +10 2>/dev/null)" ]; then
    say "замок старше 10 мин — снимаю ($LOCK)"; rmdir "$LOCK" 2>/dev/null; continue
  fi
  sleep 2; waited=$((waited + 2))
  [ $((waited % 60)) -eq 0 ] && say "жду замок ${waited} с"
done
TMP_INDEX="$ROOT/.git/safe_commit_index_$$"
cleanup() { rm -f "$TMP_INDEX" "$TMP_INDEX.cerr"; rmdir "$LOCK" 2>/dev/null; }
trap cleanup EXIT
say "замок взят через ${waited} с"

# 2) Временный индекс от HEAD внутри замка.
BASE=$(git rev-parse HEAD) || { say "отказ: нет HEAD"; exit 6; }
GIT_INDEX_FILE="$TMP_INDEX" git read-tree HEAD || { say "отказ: read-tree HEAD не удался"; exit 6; }
say "база HEAD=${BASE:0:9}"

# 3) Только свои пути и хунки.
for p in "${PATHS[@]}"; do
  if [ -e "$p" ]; then
    GIT_INDEX_FILE="$TMP_INDEX" git update-index --add -- "$p" || { say "отказ: update-index '$p'"; exit 6; }
    say "путь целиком: $p"
  else
    GIT_INDEX_FILE="$TMP_INDEX" git update-index --remove -- "$p" 2>/dev/null && say "путь удалён: $p" || say "путь '$p' нет ни на диске, ни в HEAD — пропуск"
  fi
done
for f in "${PATCHES[@]}"; do
  if GIT_INDEX_FILE="$TMP_INDEX" git apply --cached --whitespace=nowarn "$f" 2>"$TMP_INDEX.err"; then
    say "patch лёг: $f"
  else
    say "отказ: patch '$f' не лёг на HEAD — $(head -c 300 "$TMP_INDEX.err" | tr '\n' ' ')"; rm -f "$TMP_INDEX.err"; exit 5
  fi
  rm -f "$TMP_INDEX.err"
done

# 4) Сверка numstat в момент коммита: каждый путь итогового diff должен быть ожидаем и совпасть.
NUMSTAT=$(GIT_INDEX_FILE="$TMP_INDEX" git -c core.quotepath=false diff --cached --numstat --no-renames HEAD)
if [ -z "$NUMSTAT" ]; then say "отказ: итоговый diff пуст — всё уже в HEAD?"; exit 3; fi
fail=0; declare -A SEEN=()
while IFS=$'\t' read -r a d p; do
  [ -z "$p" ] && continue
  SEEN["$p"]=1
  if [ "$DRY" -eq 1 ]; then say "dry numstat: $p +$a/-$d"; continue; fi
  want="${EXPECT[$p]:-}"
  if [ -z "$want" ]; then say "ОТКАЗ: в коммит попадает неожиданный путь $p (+$a/-$d)"; fail=1; continue; fi
  if [ "$a $d" != "$want" ]; then say "ОТКАЗ: $p numstat +$a/-$d, ожидалось +${want% *}/-${want#* } — чужие хунки или файл изменился"; fail=1
  else say "numstat совпал: $p +$a/-$d"; fi
done <<< "$NUMSTAT"
if [ "$DRY" -eq 1 ]; then say "dry-run: коммит не делался"; exit 0; fi
for p in "${!EXPECT[@]}"; do
  [ -n "${SEEN[$p]:-}" ] || { say "ОТКАЗ: ожидался путь $p, но изменений в нём нет"; fail=1; }
done
if [ "$fail" -ne 0 ]; then say "отказ: сверка numstat не прошла — коммит НЕ сделан, HEAD=${BASE:0:9}"; exit 3; fi

# 5) Коммит: дерево → хуки → commit-tree → атомарный сдвиг ветки.
# зачем (🔴 координатор 13.10, коммит ba4405cd5 «удалить весь репозиторий», 50 785 файлов): `timeout … safe_commit.sh` послал TERM
# bash'у, `trap cleanup EXIT` удалил временный индекс, а дочерний `git commit` был жив — git перечитывает индекс ПОСЛЕ pre-commit,
# индекса нет → пустое дерево. Теперь: (1) дерево пишется из индекса ДО хуков и дальше живёт как неизменяемый объект;
# (2) numstat BASE..TREE сверяется ещё раз по объекту; (3) жёсткий стоп, если в дереве < 90 % путей HEAD; (4) от хуков до сдвига
# ветки TERM/INT/HUP игнорируются (дети наследуют); (5) хук изменил/удалил индекс → отказ; (6) ветка сдвигается
# `git update-ref <ветка> NEW BASE` — только если она всё ещё на BASE; (7) после сдвига numstat не совпал → откат ветки и отказ.
SUBJECT=$(head -1 "$MSG")
rc=1
TREE=$(GIT_INDEX_FILE="$TMP_INDEX" git write-tree 2>"$TMP_INDEX.cerr"); rc=$?
if [ "$rc" -ne 0 ] || [ -z "$TREE" ]; then say "отказ: write-tree не удался (rc=$rc): $(tr '\n' ' ' < "$TMP_INDEX.cerr" | head -c 200)"; exit 6; fi
say "дерево ${TREE:0:9} записано из временного индекса (до хуков)"
TREE_NUMSTAT=$(git -c core.quotepath=false diff --numstat --no-renames "$BASE" "$TREE")
tfail=0; declare -A TSEEN=()
while IFS=$'\t' read -r a d p; do
  [ -z "$p" ] && continue
  TSEEN["$p"]=1
  [ "$a $d" = "${EXPECT[$p]:-}" ] || { say "ОТКАЗ: в дереве $p +$a/-$d — не совпало с ожиданием (дерево ≠ сверка индекса)"; tfail=1; }
done <<< "$TREE_NUMSTAT"
for p in "${!EXPECT[@]}"; do [ -n "${TSEEN[$p]:-}" ] || { say "ОТКАЗ: в дереве нет изменений ожидаемого пути $p"; tfail=1; }; done
if [ "$tfail" -ne 0 ]; then say "отказ: сверка дерева не прошла — коммит НЕ сделан, HEAD=${BASE:0:9}"; exit 3; fi
BASE_PATHS=$(git ls-tree -r --name-only "$BASE" | wc -l | tr -dc '0-9'); TREE_PATHS=$(git ls-tree -r --name-only "$TREE" | wc -l | tr -dc '0-9')
say "сверка дерева: пути $TREE_PATHS из $BASE_PATHS в HEAD"
if [ $(( ${TREE_PATHS:-0} * 10 )) -lt $(( ${BASE_PATHS:-0} * 9 )) ]; then
  if [ "${SAFE_COMMIT_ALLOW_MASS_DELETE:-0}" = "1" ]; then say "ВНИМАНИЕ: в дереве < 90 % путей HEAD — разрешено SAFE_COMMIT_ALLOW_MASS_DELETE=1"
  else say "ОТКАЗ: в дереве $TREE_PATHS путей из $BASE_PATHS (< 90 %) — массовое удаление, коммит НЕ сделан"; exit 3; fi
fi

# Критическая секция: TERM/INT/HUP не прерывают — иначе cleanup снимет индекс и замок из-под живых детей.
# `trap ''` (игнор, а не обработчик): игнор наследуют дети — timeout шлёт TERM всей группе процессов, включая git.
say "критическая секция: TERM/INT/HUP игнорируются до сдвига ветки"
trap '' TERM INT HUP
export SAFE_COMMIT_SELF_PID=$$
HOOKS_DIR=$(git rev-parse --git-path hooks 2>/dev/null)
HP=$(git config --get core.hooksPath 2>/dev/null) && [ -n "$HP" ] && HOOKS_DIR="$HP"
if [ -n "$HOOKS_DIR" ] && [ -x "$HOOKS_DIR/pre-commit" ]; then
  say "хук pre-commit: $HOOKS_DIR/pre-commit"
  GIT_INDEX_FILE="$TMP_INDEX" "$HOOKS_DIR/pre-commit"; hrc=$?
  if [ "$hrc" -ne 0 ]; then say "отказ: pre-commit вернул $hrc — коммит НЕ сделан, HEAD=${BASE:0:9}"; exit 6; fi
  if [ ! -s "$TMP_INDEX" ]; then say "ОТКАЗ: временный индекс исчез/пуст после pre-commit — коммит НЕ сделан"; exit 6; fi
  TREE_AFTER=$(GIT_INDEX_FILE="$TMP_INDEX" git write-tree 2>/dev/null)
  if [ "$TREE_AFTER" != "$TREE" ]; then say "ОТКАЗ: pre-commit изменил индекс (дерево ${TREE_AFTER:0:9} ≠ ${TREE:0:9}) — коммит НЕ сделан"; exit 6; fi
  say "pre-commit прошёл, дерево не изменилось"
else
  say "хук pre-commit: нет ($HOOKS_DIR)"
fi
NEW=$(git commit-tree "$TREE" -p "$BASE" -F "$MSG" 2>"$TMP_INDEX.cerr"); rc=$?
if [ "$rc" -ne 0 ] || [ -z "$NEW" ]; then say "отказ: commit-tree не удался (rc=$rc): $(tr '\n' ' ' < "$TMP_INDEX.cerr" | head -c 200)"; exit 6; fi
REF=$(git symbolic-ref -q HEAD || echo HEAD)
say "объект коммита ${NEW:0:9} создан; сдвиг $REF ${BASE:0:9} → ${NEW:0:9} (атомарно, только с ${BASE:0:9})"
# Ошибка про замок ветки → ждём до 180 с (10×18 с), снимая брошенный по правилу 60 с; любая другая ошибка → 3 быстрые попытки.
lock_waits=0; quick=0; rc=1
while :; do
  git update-ref -m "commit: $SUBJECT" "$REF" "$NEW" "$BASE" 2>"$TMP_INDEX.cerr"; rc=$?
  cat "$TMP_INDEX.cerr" >&2
  [ "$rc" -eq 0 ] && break
  NOW=$(git rev-parse HEAD)
  if [ "$NOW" != "$BASE" ]; then say "отказ: HEAD сдвинулся на ${NOW:0:9} чужим коммитом — объект ${NEW:0:9} брошен, ветка не тронута"; exit 7; fi
  lock_path=$(grep -o "Unable to create '[^']*'" "$TMP_INDEX.cerr" | head -1 | sed "s/Unable to create '//; s/'$//")
  # зачем (13.10, 6eba48fbf): при падении git (rc=139) замок своего временного индекса снимается сразу — он только наш.
  if [ -e "$TMP_INDEX.lock" ] && { [ "$rc" -eq 139 ] || [ "$lock_path" = "$TMP_INDEX.lock" ]; }; then
    rm -f "$TMP_INDEX.lock" && say "снят замок своего временного индекса после падения git (rc=$rc) — повтор"
    own_lock_clears=$(( ${own_lock_clears:-0} + 1 ))
    if [ "$own_lock_clears" -le 5 ]; then sleep 2; continue; fi
    say "свой замок снимался уже $own_lock_clears раз — дальше обычные правила"
  fi
  if [ -n "$lock_path" ]; then
    lock_waits=$((lock_waits + 1))
    say "коммит не создан: rc=$rc, занят замок '$lock_path' (временный индекс: $TMP_INDEX) — ожидание $lock_waits/10"
    say "текст ошибки: $(tr '\n' ' ' < "$TMP_INDEX.cerr" | head -c 300)"
    log_git_holders
    [ "$lock_waits" -ge 10 ] && break
    clear_stale_lock "$lock_path" || sleep 18
  else
    quick=$((quick + 1))
    say "коммит не создан (попытка $quick, rc=$rc): $(tr '\n' ' ' < "$TMP_INDEX.cerr" | head -c 200)"
    [ "$quick" -ge 3 ] && break
    sleep 3
  fi
done
rm -f "$TMP_INDEX.cerr"
if [ "$rc" -ne 0 ]; then trap - TERM INT HUP; say "отказ: коммит не создан (rc=$rc; ожиданий замка $lock_waits, быстрых попыток $quick)"; exit 6; fi
HEAD_NEW=$(git rev-parse HEAD)
PARENT=$(git rev-parse HEAD^)
if [ "$HEAD_NEW" != "$NEW" ] || [ "$PARENT" != "$BASE" ]; then trap - TERM INT HUP; say "ТРЕВОГА: после сдвига HEAD=${HEAD_NEW:0:9}, родитель ${PARENT:0:9} (ждали ${NEW:0:9} от ${BASE:0:9})"; exit 7; fi
POST=$(git -c core.quotepath=false show --numstat --no-renames --format= HEAD)
pfail=0
while IFS=$'\t' read -r a d p; do
  [ -z "$p" ] && continue
  [ "$a $d" = "${EXPECT[$p]:-}" ] || { say "ТРЕВОГА: в коммите $p +$a/-$d не совпал с ожиданием"; pfail=1; }
done <<< "$POST"
if [ "$pfail" -ne 0 ]; then
  if git update-ref -m "safe_commit: откат несовпавшего коммита" "$REF" "$BASE" "$NEW"; then say "ОТКАТ: ветка возвращена на ${BASE:0:9}, коммит ${NEW:0:9} снят"; else say "ТРЕВОГА: откат не удался — проверь git log"; fi
  trap - TERM INT HUP; exit 7
fi
trap - TERM INT HUP
if [ -n "$HOOKS_DIR" ] && [ -x "$HOOKS_DIR/post-commit" ]; then "$HOOKS_DIR/post-commit" || say "post-commit вернул $? — коммит уже есть, продолжаю"; fi
say "коммит ${HEAD_NEW:0:9} родитель_ok=yes заголовок_ok=yes"

# 6) Общий индекс: синхронизировать с HEAD только свои пути, с повторами при занятом index.lock.
# зачем (координатор 13.10, опыт Дизайна 3956faba6): ожидание было ~60 с при пороге снятия 120 с — окна не пересекались,
# скрипт выходил с WARN. Брошенные замки оставляет оборванный git diff опроса Codex. Теперь: ждём до 180 с; пустой замок
# старше 60 с снимаем, только если нет ни одного git.exe старше 60 с (тот же признак, что у сторожа координатора).
OWN=("${!EXPECT[@]}")
SYNC_DEADLINE=$(( $(date +%s) + 180 ))
attempt=0
while :; do
  attempt=$((attempt + 1))
  if git reset -q -- "${OWN[@]}" 2>/dev/null; then say "общий индекс синхронизирован по своим путям (попытка $attempt)"; break; fi
  if [ -e .git/index.lock ]; then
    clear_stale_lock .git/index.lock && continue
  else
    say "git reset не прошёл без index.lock (попытка $attempt) — повтор"
  fi
  if [ "$(date +%s)" -ge "$SYNC_DEADLINE" ]; then say "WARN: общий индекс не синхронизирован за 180 с — выполни: git reset -q -- ${OWN[*]}"; break; fi
  sleep 3
done
git show --stat --oneline HEAD | head -20
exit 0
}
