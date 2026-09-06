#!/bin/bash
# зачем: владелец просил после урока 1 самостоятельно взяться за урок 2.
# Пишем первую главу (сессии 1-8) подряд, не застревая: не вышла — идём
# дальше и возвращаемся на следующем круге. Переживает лимит токенов.
cd /c/appsprojects/phraseman/content/learning-v2-course || exit 1
LOG=/c/Temp/claude/C--appsprojects-phraseman/082b431f-de6b-449e-83b4-842842af4125/scratchpad/lesson2.log
say(){ echo "$(date +%H:%M) $*" >> "$LOG"; }

say "=== УРОК 2, глава 1: старт ==="
for round in 1 2 3; do
  left=0
  for n in 1 2 3 4 5 6 7 8; do
    s=$(printf "s%02d" "$n")
    if [ -f "sessions/en/l02/$s/final.ru.md" ]; then
      continue
    fi
    left=$((left + 1))
    say "$s: круг $round, пишу"
    node pipeline/run.mjs full --session "en/l02/$s" >> "$LOG" 2>&1
    if [ -f "sessions/en/l02/$s/final.ru.md" ]; then
      node pipeline/build_release.mjs --session "en/l02/$s" >> "$LOG" 2>&1
      say "$s: ГОТОВА"
    else
      say "$s: не вышла на круге $round — вернусь позже"
      sleep 300
    fi
  done
  if [ "$left" -eq 0 ]; then
    say "=== глава 1 урока 2 готова ==="
    break
  fi
  say "--- круг $round закончен, незакрытых: $left ---"
done
say "=== работа по главе 1 завершена ==="
