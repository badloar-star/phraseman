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
#   5) обычный `git commit` с хуками (pre-commit работает), повтор при падении git, проверка родителя и заголовка;
#   6) после коммита общий индекс синхронизируется с HEAD только по своим путям, с повторами при занятом index.lock;
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
# Окружение: SAFE_COMMIT_LOCK (путь замка, для тестов), SAFE_COMMIT_IGNORE_WINDOW=1 (не проверять окно кода).
# Коды выхода: 0 — коммит есть; 2 — неверный вызов; 3 — отказ сверки numstat; 4 — вне окна кода;
#              5 — patch не лёг; 6 — коммит не создан; 7 — HEAD сдвинулся / заголовок не тот.
# Сторож: tests/safe_commit_script_contract.test.ts (живой прогон во временном репозитории).
# ═══════════════════════════════════════════════════════════
set -u
LOG='[SAFE-COMMIT]'
say() { echo "$LOG $*"; }

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
cleanup() { rm -f "$TMP_INDEX"; rmdir "$LOCK" 2>/dev/null; }
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

# 5) Коммит с хуками; повтор при падении git (segfault rc=139 бывал), но только если HEAD не сдвинулся.
SUBJECT=$(head -1 "$MSG")
rc=1
for attempt in 1 2 3; do
  GIT_INDEX_FILE="$TMP_INDEX" git commit -q -F "$MSG"; rc=$?
  NOW=$(git rev-parse HEAD)
  if [ "$NOW" != "$BASE" ] && [ "$(git log -1 --format=%s)" = "$SUBJECT" ]; then rc=0; break; fi
  if [ "$NOW" != "$BASE" ]; then say "отказ: HEAD сдвинулся на ${NOW:0:9} чужим коммитом во время попытки $attempt"; exit 7; fi
  say "коммит не создан (попытка $attempt, rc=$rc) — повтор через 3 с"
  sleep 3
done
if [ "$rc" -ne 0 ]; then say "отказ: коммит не создан после 3 попыток (rc=$rc; хуки?)"; exit 6; fi
HEAD_NEW=$(git rev-parse HEAD)
PARENT=$(git rev-parse HEAD^)
if [ "$PARENT" != "$BASE" ]; then say "ТРЕВОГА: родитель ${PARENT:0:9} ≠ база ${BASE:0:9}"; exit 7; fi
POST=$(git -c core.quotepath=false show --numstat --no-renames --format= HEAD)
while IFS=$'\t' read -r a d p; do
  [ -z "$p" ] && continue
  [ "$a $d" = "${EXPECT[$p]:-}" ] || say "ТРЕВОГА: в коммите $p +$a/-$d не совпал с ожиданием — проверь git show"
done <<< "$POST"
say "коммит ${HEAD_NEW:0:9} родитель_ok=yes заголовок_ok=yes"

# 6) Общий индекс: синхронизировать с HEAD только свои пути, с повторами при занятом index.lock.
OWN=("${!EXPECT[@]}")
for attempt in $(seq 1 20); do
  if git reset -q -- "${OWN[@]}" 2>/dev/null; then say "общий индекс синхронизирован по своим путям (попытка $attempt)"; break; fi
  if [ -e .git/index.lock ]; then
    age=$(( $(date +%s) - $(stat -c %Y .git/index.lock 2>/dev/null || date +%s) ))
    if [ "$age" -gt 120 ] && [ ! -s .git/index.lock ]; then rm -f .git/index.lock && say "снят брошенный пустой index.lock (возраст ${age} с)"; continue; fi
    say "index.lock занят (возраст ${age} с) — жду"
  fi
  sleep 3
  [ "$attempt" -eq 20 ] && say "WARN: общий индекс не синхронизирован — выполни: git reset -q -- ${OWN[*]}"
done
git show --stat --oneline HEAD | head -20
exit 0
