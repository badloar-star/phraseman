#!/bin/bash
# Обёртка: длинный список путей из файла → safe_commit.sh тем же процессом (source), без предела длины командной строки Windows.
# Аргументы: $1 = файл сообщения, $2 = файл со списком путей (по одному на строку). Ожидания numstat считаются здесь же.
cd /c/appsprojects/phraseman || exit 1
MSGFILE="$1"; LIST="$2"
args=(-m "$MSGFILE" ${WAITWIN:+--wait-window})
paths=()
while IFS= read -r p; do
  [ -z "$p" ] && continue
  # зачем (утро 18.10, ≈14 тыс. mp3): у mp3 numstat всегда «бинарный» — два вызова git на путь съедали минуты на часть
  case "$p" in *.mp3) args+=(--expect "$p=bin"); paths+=("$p"); continue;; esac
  if git ls-files --error-unmatch -- "$p" >/dev/null 2>&1; then
    stat=$(git -c core.quotepath=false diff --numstat --no-renames HEAD -- "$p" | head -1)
    a=$(printf '%s' "$stat" | cut -f1); d=$(printf '%s' "$stat" | cut -f2)
  else
    stat=$(git -c core.quotepath=false diff --no-index --numstat /dev/null "$p" 2>/dev/null | head -1)
    a=$(printf '%s' "$stat" | cut -f1); d=0
  fi
  if [ -z "$stat" ]; then echo "[BULK] нет изменений: $p — пропуск"; continue; fi
  if [ "$a" = "-" ]; then args+=(--expect "$p=bin"); else args+=(--expect "$p=$a/$d"); fi
  paths+=("$p")
done < "$LIST"
echo "[BULK] путей: ${#paths[@]}"
set -- "${args[@]}" -- "${paths[@]}"
source scripts/safe_commit.sh
