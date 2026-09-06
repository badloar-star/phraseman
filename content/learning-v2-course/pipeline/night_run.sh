#!/bin/bash
# зачем: владелец просил писать без остановок до утра. Обёртка переживает
# лимит токенов, не застревает на трудной сессии (идёт дальше и возвращается
# позже) и пишет в лог каждый шаг. Имена переменных латиницей: с кириллицей
# bash молча ломался и цикл завершался мгновенно.
cd /c/appsprojects/phraseman/content/learning-v2-course || exit 1
LOG=/c/Temp/claude/C--appsprojects-phraseman/082b431f-de6b-449e-83b4-842842af4125/scratchpad/night.log
say(){ echo "$(date +%H:%M) $*" >> "$LOG"; }

say "=== обёртка запущена (правила: home/at work, скрепка) ==="
for round in 1 2 3; do
  left=0
  for n in 47 48 49 50 51 52 53 54 55 56; do
    s=$(printf "s%02d" "$n")
    if [ -f "sessions/en/l01/$s/final.ru.md" ]; then
      continue
    fi
    left=$((left + 1))
    say "$s: круг $round, пишу"
    node pipeline/run.mjs full --session "en/l01/$s" >> "$LOG" 2>&1
    if [ -f "sessions/en/l01/$s/final.ru.md" ]; then
      node pipeline/build_release.mjs --session "en/l01/$s" >> "$LOG" 2>&1
      say "$s: ГОТОВА"
    else
      say "$s: не вышла на круге $round — вернусь позже"
      sleep 300
    fi
  done
  if [ "$left" -eq 0 ]; then
    say "=== все сессии 47-56 готовы ==="
    break
  fi
  say "--- круг $round закончен, незакрытых: $left ---"
done
node pipeline/build_mockup.mjs >> "$LOG" 2>&1
say "=== УРОК 1: работа обёртки завершена ==="
