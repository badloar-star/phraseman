# E2E на локальных эмуляторах Firebase (demo-phraseman)

Governance-ID: TG-BBBE2E1922A7

1. Окно 1: `bash scripts/e2e/start_emulators.sh` (Auth 9099, Firestore 8080, UI 4000; данные в `.e2e-emulator-data`).
2. Окно 2: `node scripts/e2e/seed.mjs` — создаёт `veteran@e2e.test` (уроки 1–9 пройдены, открыто 10) и `newbie@e2e.test` (пустой); пароль — `E2E_PASSWORD` или `e2e-local-emulator-only`.
3. Окно 3: `bash scripts/e2e/metro_emulator.sh` — dev-сервер :8082 с `EXPO_PUBLIC_FIREBASE_EMULATOR_HOST=10.0.2.2` (dev-сборка на эмуляторе Android смотрит на порт 8082).
4. Functions-эмулятор (`WITH_FUNCTIONS=1`) требует собранный `functions/lib` — собирать из чистого HEAD во временной папке; без него вызовы callable идут «вникуда» (приложение должно оставаться рабочим, сценарии без сервера).

Релизный/preview APK и Firebase Test Lab ходят в ПРОД — на них только тестовый аккаунт и без удаления аккаунта/покупок.
Сидинг отказывается трогать боевое: адреса эмуляторов по умолчанию 127.0.0.1, проект demo-phraseman (префикс demo- не даёт эмулятору обратиться к настоящему проекту).
