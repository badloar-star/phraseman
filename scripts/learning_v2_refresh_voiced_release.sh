#!/bin/bash
# Обновить выпуск Learning V2 под свежую озвучку Codex одной командой (координатор 15.10 ночь, «все готовые»).
#
# зачем: Codex озвучивает занятия «один голос на задание» и коммитит content/learning-v2-course/audio/en/single-voice-v1.json
# каждые несколько минут. Чтобы новое озвученное занятие дошло до человека, нужно пять шагов в строгом порядке — руками
# их путают (так 15.10 набор собрали по таблице 20.09 под старые тексты). Здесь — ровно этот порядок:
#   1) тексты приложения пересобираются из content/learning-v2-course/release по ОДНОМУ занятию — только те, что
#      озвучены в файле Codex; урок 1 s01–s15 (уже выпущенные и принятые) НЕ трогаются;
#   2) таблица назначенных голосов и записей (app/learning_v2_factory_single_voice_v1.generated.ts);
#   3) потолок — ТОЛЬКО сторожем доступности (сколько занятий подряд реально собирается);
#   4) набор звука в сборку (assets/audio/learning-v2-bootstrap-v1 + модуль) под этот потолок;
#   5) сторож полноты: у каждого задания ≤ потолка есть запись назначенного голоса и файл в наборе.
# Тяжёлые шаги (3, 5) — через светофор: запускать после `bash .claude/semaphore/slot.sh acquire "..."`.
# Ничего не коммитит и прод не трогает. Подъём потолка выше выпущенного — только словом владельца
# (квитанции прослушивания или его одобрение) и только коммитом; ворота learning_v2_ceiling_committed_gate это стерегут. Итог — последняя строка «[V2-REFRESH] …», код 0/1.
set -u
cd "$(dirname "$0")/.." || exit 1
LOG="[V2-REFRESH]"
# --cap N: потолок не выше N (координатор 15.10 ночь: сторож насчитывает 145, выпуск решает владелец — урок 1 = 56).
# Предел только уменьшает потолок и никогда не открывает несобирающееся (tests/learning_v2_bundle_availability.test.ts).
CAP=""
while [ $# -gt 0 ]; do
  case "$1" in
    --cap) CAP="${2:-}"; shift 2 ;;
    *) echo "$LOG неизвестный аргумент: $1 (есть только --cap N)"; exit 2 ;;
  esac
done
if [ -n "$CAP" ] && ! [[ "$CAP" =~ ^[1-9][0-9]*$ ]]; then echo "$LOG --cap ждёт целое > 0, получено «$CAP»"; exit 2; fi
say() { echo "$LOG $*"; }

sessions=$(node -e '
const a = require("./content/learning-v2-course/audio/en/single-voice-v1.json").assignments;
const set = new Set(Object.keys(a).map((k) => k.split("/").slice(0, 2).join("/")));
console.log([...set].sort().join(" "));')
rebuilt=0; skipped=0; failed=0
for coordinate in $sessions; do
  lesson=${coordinate%%/*}; session=${coordinate##*/}
  if [ "$lesson" = l01 ] && [ "${session#s}" -le 15 ]; then skipped=$((skipped + 1)); continue; fi
  if out=$(node scripts/build_learning_v2_factory_native_manifest.mjs --session "en/$coordinate" 2>&1); then
    rebuilt=$((rebuilt + 1))
  else
    failed=$((failed + 1)); say "rebuild FAIL $coordinate: $(echo "$out" | grep -m1 -E 'Error' | cut -c1-200)"
  fi
done
say "тексты: пересобрано $rebuilt, оставлено как есть (l01 s01–s15) $skipped, отказов $failed"

node scripts/build_learning_v2_factory_single_voice_module.mjs | tail -1 || { say "FAIL таблица голосов"; exit 1; }

LEARNING_V2_AVAILABILITY_CAP="$CAP" PHRASEMAN_ALLOW_SOURCE_WRITES=1 UPDATE_LEARNING_V2_AVAILABILITY=1 npm run test:one -- tests/learning_v2_bundle_availability.test.ts > /tmp/v2_refresh_availability.log 2>&1
grep -o '\[V2-AVAILABILITY\] artifact written.*' /tmp/v2_refresh_availability.log || { say "FAIL потолок не записан (см. /tmp/v2_refresh_availability.log)"; exit 1; }

node scripts/build_learning_v2_bootstrap_audio_pack.mjs | tail -1 || { say "FAIL набор звука"; exit 1; }

npm run test:one -- tests/learning_v2_released_audio_completeness_guard.test.ts > /tmp/v2_refresh_complete.log 2>&1
summary=$(grep -o '\[V2-AUDIO-COMPLETE\] {.*' /tmp/v2_refresh_complete.log | head -1)
echo "$summary"
if grep -q "Tests:.*1 passed" /tmp/v2_refresh_complete.log && ! grep -q "Tests:.*failed" /tmp/v2_refresh_complete.log; then
  say "PASS $(grep -o 'CONTIGUOUS_CEILING_V1 = [0-9]*' app/learning_v2_bundle_availability_v1.generated.ts)"
  exit 0
fi
grep -o '\[V2-AUDIO-COMPLETE\] gap .*' /tmp/v2_refresh_complete.log | head -20
say "FAIL сторож полноты (см. /tmp/v2_refresh_complete.log)"
exit 1
