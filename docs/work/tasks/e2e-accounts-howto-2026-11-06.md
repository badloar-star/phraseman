# Инструкция: тестовые аккаунты и Firebase-эмуляторы для E2E (06.11)

Governance-ID: TG-3648B03E7D34
Status: Готово
Owner: «5 · ВХОД»

## Outcome

Эмуляторы Firebase подняты ТОЛЬКО на 127.0.0.1 (без выхода в локальную сеть), порт Firestore 8085 (8080 занят Open WebUI владельца); свежие тестовые аккаунты созданы после метки среза; шаги для Сверки и Эмулятора записаны без секретов.

## Scope

`docs/work/release/E2E_ACCOUNTS_HOWTO_2026-11-05.md`, `firebase.e2e.json`, `scripts/e2e/*`, `app/firebase_emulator_dev.ts` (порт Firestore из переменной, только dev).

## Architecture

Android-эмулятор достаёт loopback ПК через 10.0.2.2; приложение (dev) узнаёт порт Firestore из `EXPO_PUBLIC_FIREBASE_EMULATOR_FIRESTORE_PORT`.

## Security and privacy

Эмуляторы не слушают сеть; пароли тестовых аккаунтов в репозиторий не попадают (gitignored файл), боевой Firebase недостижим.

## Technical debt

Dev-вход принимает только `accounts-v2-e2e-*@phraseman.test`; `veteran@e2e.test` / `newbie@e2e.test` из `seed.mjs` для dev-входа не подходят.

## Verification

Порты 9099/8085 отвечают на 127.0.0.1; тест `firebase_emulator_firestore_port_2026_11_06`.

## Rollback

Остановить процесс `firebase emulators:start`, откатить коммит.
Governance-ID: TG-146D8AA51FAB
