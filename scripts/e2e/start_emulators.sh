#!/bin/bash
# E2E: Firebase Emulator Suite (Auth + Firestore [+ Functions]) на demo-проекте — НИЧЕГО не уходит в боевую базу.
#   bash scripts/e2e/start_emulators.sh                    # Auth 9099 + Firestore 8080 (+ UI 4000)
#   WITH_FUNCTIONS=1 bash scripts/e2e/start_emulators.sh   # + Functions 5001 (нужен собранный functions/lib из чистого HEAD)
# Затем в другом окне: node scripts/e2e/seed.mjs (ветеран + новичок) и bash scripts/e2e/metro_emulator.sh
# Проект demo-phraseman: префикс demo- физически не позволяет эмуляторам обращаться к настоящему проекту.
set -u
ROOT=$(cd "$(dirname "$0")/../.." && pwd)
cd "$ROOT" || exit 1
ONLY="auth,firestore"
if [ "${WITH_FUNCTIONS:-0}" = "1" ]; then
  ONLY="auth,firestore,functions"
  echo "[E2E] Functions-эмулятор требует собранный functions/lib; собирай из чистого HEAD отдельно (docs/work/e2e/README.md)"
fi
echo "[E2E] старт эмуляторов: $ONLY (проект demo-phraseman), данные в .e2e-emulator-data (не коммитится)"
# зачем (06.11): конфиг firebase.e2e.json — Auth 9099 и Firestore 8085 ТОЛЬКО на 127.0.0.1 (порт 8080 на ПК занят Open WebUI владельца, в локальную сеть эмуляторы не выставляются);
# Android-эмулятор достаёт их через 10.0.2.2, приложению порт Firestore сообщает EXPO_PUBLIC_FIREBASE_EMULATOR_FIRESTORE_PORT=8085 (metro_emulator.sh).
exec npx firebase emulators:start --config firebase.e2e.json --only "$ONLY" --project demo-phraseman --import ".e2e-emulator-data" --export-on-exit ".e2e-emulator-data"
