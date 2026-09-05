#!/bin/bash
# зачем: владелец ушёл спать и просил продолжать автоматически даже если
# кончатся токены. Конвейер сам ждёт лимит до 3 часов, но недельный лимит
# (10+ часов) он не ждёт — выходит. Обёртка переживает и это: не смогла
# написать сессию — ждёт 20 минут и пробует снова, и так пока не выйдет.
cd /c/appsprojects/phraseman/content/learning-v2-course || exit 1
LOG=/c/Temp/claude/C--appsprojects-phraseman/082b431f-de6b-449e-83b4-842842af4125/scratchpad/night.log
say(){ echo "$(date +%H:%M) $*" >> "$LOG"; }

say "=== обёртка с ожиданием лимита запущена ==="
for n in $(seq 47 56); do
  s=$(printf "s%02d" $n)
  [ -f "sessions/en/l01/$s/final.ru.md" ] && { say "$s: уже готова"; continue; }
  try=0
  while [ $try -lt 40 ]; do        # 40 попыток × 20 мин ≈ 13 часов ожидания
    try=$((try+1))
    say "$s: попытка $try"
    node pipeline/run.mjs full --session en/l01/$s >> "$LOG" 2>&1
    if [ -f "sessions/en/l01/$s/final.ru.md" ]; then
      node pipeline/build_release.mjs --session en/l01/$s >> "$LOG" 2>&1
      say "$s: ГОТОВА"
      break
    fi
    # не получилось: лимит или другая беда — ждём и пробуем снова
    if grep -qE "лимит сбрасывается через|hit your limit|usage limit" "$LOG"; then
      say "$s: упёрлись в лимит, жду 20 минут"
    else
      say "$s: не создалась (причина не лимит), жду 20 минут и пробую снова"
    fi
    sleep 1200
  done
  [ -f "sessions/en/l01/$s/final.ru.md" ] || say "$s: СДАЮСЬ после $try попыток — нужен разбор утром"
done
node pipeline/build_mockup.mjs >> "$LOG" 2>&1
say "=== УРОК 1 ЗАКОНЧЕН ==="
