# Task packet: Account V2 — Пакет 6D: E2E на Firebase Emulator Suite + Android-эмуляторе (3 тестовых аккаунта)

Governance-ID: TG-52A880319166
Status: Done (SPEC+SECURITY APPROVE)
Owner: Claude session (Account V2, /loop)

## Outcome

Решение координатора (по поручению владельца): проверка «на 3 аккаунтах» без паролей владельца — на локальном Firebase Emulator Suite и dev-сборке на Android-эмуляторе с 3 тестовыми аккаунтами, созданными там же. Реальные аккаунты владельца — после релиза.

1. P3 хвосты 6C: (а) битая метка + erased_empty V + остатки линии V — проверять isEmpty(plan V) перед выбором V-1; (б) стабильно падающее стирание не должно навсегда блокировать защёлку (потолок попыток / отдельная ветка manifest_mismatch с логом); (в) аноним снимает ключ только при успешном ack.
2. Конфиг эмулятора: в `firebase.json` секция `emulators.auth` (порт 9099) — только локально, прод не затрагивается.
3. Dev-only подключение приложения к эмуляторам: при `__DEV__` И явной переменной окружения (например `EXPO_PUBLIC_FIREBASE_EMULATOR_HOST=10.0.2.2`) — `connectAuthEmulator`/Firestore/Functions на эмуляторы; без переменной — ничего не меняется; в релизной сборке код недостижим. Найти, где инициализируется Firebase в app/, подключить минимально.
4. Сидер: скрипт `scripts/accounts-v2-emulator-seed.mjs` создаёт в Auth-эмуляторе 3 тестовых аккаунта (сгенерированные учётки пишутся в `scripts/accounts-v2-emulator-seed.example.json` или .local-файл, НЕ в чат), включает `config/accounts_v2` и `remote_config/app.bools.accounts_v2_client_enabled` ТОЛЬКО в эмуляторе Firestore.
5. Сценарий E2E (через очередь emulator.sh, слот, один тяжёлый процесс): для каждого из 3 аккаунтов — вход → флаг выкл (никаких вызовов accountsV2SyncApply) → флаг вкл → изменение урока/карточки → видно в эмуляторе Firestore accounts_v2/{uid} → перезапуск приложения → данные на месте → выход → вход другим аккаунтом (нет доступа к области первого) → удаление аккаунта (область стёрта, квитанция). Плюс проверки из 6C: путь базы, папка accounts-v2 до блокировки, исключение SecureStore из бэкапа (adb backup policy/readback). Квитанция с фактами в docs/work/tasks/account-v2-e2e-receipt-2026-10-01.md.

## Scope

In scope: modules/account-session-v2/*, firebase.json (только emulators.auth), минимальная dev-only точка в инициализации Firebase в app/, scripts/accounts-v2-emulator-seed*.mjs, тесты. Out of scope: прод Firebase, деплой, реальные аккаунты, ввод паролей пользователя, App Check.

## Architecture

Эмуляторы Firebase запускаются локально (functions собираются из functions/); приложение в dev видит их через 10.0.2.2. Всё за переменной окружения + __DEV__.

## Security and privacy

Никаких прод-данных; тестовые учётки только локальные; ни одного обращения к прод-проекту из сидера (проверка: FIRESTORE_EMULATOR_HOST/FIREBASE_AUTH_EMULATOR_HOST обязаны быть заданы, иначе скрипт отказывает).

## Technical debt

Accept temporarily: iOS; реальные аккаунты — после релиза.

## Verification

RED→GREEN для P3; тест, что dev-подключение недостижимо без переменной и в релизе; E2E-квитанция; независимое ревью. Тяжёлое — только со слотом и очередью эмулятора.

## Rollback

Копия `.tmp_pkg6d_backup/`; переменная окружения не задана = старое поведение.

## Итог исполнителя (2026-10-01)

- P3 хвосты 6C: (а) `account_native_scope_erase.ts` — при битой метке и erased_empty V проверяется isEmpty(plan V); остатки V → стирается V. (б) битая защёлка при упавшем стирании переписывается ВАЛИДНОЙ защёлкой из упавших uid (остальные аккаунты больше не блокируются); «повтор не поможет» (manifest_mismatch/marker_foreign/lineage_exhausted) — ветка лога `erase resume_terminal`; стор сохраняет код адаптера в `causeCode`. (в) аноним снимает ключ только при успешном ответе (`clearStoredAccountsV2DeletionCredentialAfterAckIfEnabled`).
- firebase.json: `emulators.auth` 9099. Dev-only подключение: `app/firebase_emulator_dev.ts` + `app/firebase_emulator_dev_boot.ts` (импорт в index.js до expo-router), только `__DEV__` И `EXPO_PUBLIC_FIREBASE_EMULATOR_HOST` (локальный/частный хост).
- Сидер `scripts/accounts-v2-emulator-seed.mjs` (+ example.json, .local.json в .gitignore): отказ без loopback-хостов эмуляторов до любой сети.
- Тесты: tests/account_v2_tails_6d_v2.test.ts, tests/firebase_emulator_dev_guard_v2.test.ts, tests/accounts_v2_emulator_seed_guard.test.mjs, +1 тест в account_native_scope_adapter_v2; 11 мутаций пойманы. E2E: tests/accounts_v2_emulator_e2e_v2.test.ts (только при ACCOUNTS_V2_EMULATOR_E2E=1), 4/4.
- Квитанция: docs/work/tasks/account-v2-e2e-receipt-2026-10-01.md.

## Ревью: SPEC+SECURITY APPROVE. P3: неатомарный mark по uid (client_session.ts:335) — одна запись replace(uids); «бесхозные» uid при сбросе; терминальные коды без потолка; seed-guard (node:test) не подключён к прогону.
