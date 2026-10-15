#!/bin/bash
# зачем: проверка «у задания единственный ответ» нашла две поломки, которые
# пропустили пять судей И я сам при ручном разборе. Прогоняем по всему уроку.
# Два прогона на сессию: замер показал 0/1/1 на одном тексте — верим тому,
# что повторилось.
cd /c/appsprojects/phraseman/content/learning-v2-course || exit 1
OUT=/c/Temp/claude/C--appsprojects-phraseman/082b431f-de6b-449e-83b4-842842af4125/scratchpad/single_all.log
: > "$OUT"
for n in $(seq -w 1 56); do
  s="s$n"
  [ -f "sessions/en/l01/$s/final.ru.md" ] || continue
  a=$(node pipeline/run.mjs single --session "en/l01/$s" 2>&1 | grep -oE "сломанных [0-9]+" | grep -oE "[0-9]+")
  if [ "$a" = "0" ]; then
    echo "$s: чисто" >> "$OUT"
    continue
  fi
  # первый прогон нашёл — перепроверяем, верим только повторившемуся
  b=$(node pipeline/run.mjs single --session "en/l01/$s" 2>&1 | grep -E "задание" | head -3)
  if [ -n "$b" ]; then
    echo "$s: ПОДТВЕРЖДЕНО" >> "$OUT"
    echo "$b" >> "$OUT"
  else
    echo "$s: не подтвердилось на втором прогоне (шум)" >> "$OUT"
  fi
done
echo "=== готово ===" >> "$OUT"
