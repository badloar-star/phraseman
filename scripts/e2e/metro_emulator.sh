#!/bin/bash
# E2E: второй сервер разработки (порт 8082) для dev-сборки, смотрящей в локальные эмуляторы (10.0.2.2 — хост ПК из Android-эмулятора).
# Работает ТОЛЬКО в dev-сборке (__DEV__): в релизной ветка вырезана, настоящий Firebase не затрагивается.
set -u
ROOT=$(cd "$(dirname "$0")/../.." && pwd)
cd "$ROOT" || exit 1
export EXPO_PUBLIC_FIREBASE_EMULATOR_HOST=10.0.2.2
echo "[E2E] dev-сервер :8082, EXPO_PUBLIC_FIREBASE_EMULATOR_HOST=$EXPO_PUBLIC_FIREBASE_EMULATOR_HOST"
exec npx expo start --dev-client --port 8082 --clear
