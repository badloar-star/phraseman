# Task packet: Account V2 — Пакет 6E: SecureStore вне бэкапа, хвосты 6D, dev-вход по почте на эмуляторе

Governance-ID: TG-9375E3E2FCB9
Status: Done (SPEC+SECURITY APPROVE)
Owner: Claude session (Account V2, /loop)

## Outcome

1. **Бэкап Android:** `plugins/withAndroidBackupRules.js` — исключить `sharedpref/SecureStore.xml` (и ключи V2 в нём) из cloud-backup и device-transfer, в обоих XML; сторож-тест на сгенерированные правила. Ветка `latch_read_failed` на восстановленном устройстве: не блокировать V2 навсегда — после N подряд неудачных чтений (или при явном признаке отсутствия ключа Keystore) трактовать как «нет защёлки» с логом и пройти обнаружение незаконченных стираний.
2. **Хвосты 6D:** атомарная запись защёлки `replace(uids)` вместо цикла `mark` (client_session.ts:335); бесхозные uid при сбросе — логировать и проверять метки по всем найденным семействам файлов; потолок попыток для терминальных кодов стирания (manifest_mismatch, marker_foreign, lineage_exhausted) — после K попыток только лог раз в сутки; seed-guard (node:test) подключить к npm-скрипту или перевести на jest.
3. **Dev-вход по почте ТОЛЬКО в режиме эмулятора:** когда `__DEV__ && EXPO_PUBLIC_FIREBASE_EMULATOR_HOST` — скрытая dev-кнопка/путь входа по почте+паролю против Auth-эмулятора (тестовые учётки из локального seed-файла, не в коде и не в чате); в релизе и без переменной — недостижимо (сторож-тест). Цель — E2E «вход → синхронизация» на телефоне.
4. **Повтор E2E на телефоне** (через очередь эмулятора): вход каждым из 3 тестовых аккаунтов → флаг выкл/вкл → (производителя операций пока нет — проверить хотя бы старт клиента, открытие области SQLCipher, отсутствие перекрёстного доступа при смене аккаунта, стирание при удалении через V2-путь) → квитанция дополняется.

## Scope

plugins/withAndroidBackupRules.js (+ его тест), modules/account-session-v2/*, app/ dev-only точка входа по почте (минимально), scripts/accounts-v2-emulator-seed*, package.json scripts (только добавить seed-guard), тесты, квитанция E2E. Out of scope: прод, реальные аккаунты, ввод паролей пользователя, производитель операций (Пакет 6F).

## Architecture

Dev-вход — отдельный модуль, подключается только в ветке `__DEV__ && emulatorHost`. Бэкап — правило исключения в плагине Expo config.

## Security and privacy

Исключение ключей из бэкапа усиливает защиту. Dev-вход недостижим в релизе; тестовые учётки только в .local.json (gitignored).

## Technical debt

Accept temporarily: iOS бэкап/Keychain — вне задачи.

## Verification

RED→GREEN, мутации (правило бэкапа, недостижимость dev-входа, атомарность защёлки), Babel/perf/layout-сторожа, E2E на эмуляторе, независимое ревью.

## Rollback

Копия `.tmp_pkg6e_backup/`.

## Итог исполнителя (2026-10-01)

1. Бэкап: `<exclude domain="sharedpref" path="SecureStore.xml"/>` в full-backup-content, cloud-backup, device-transfer (плагин экспортирует XML для сторожа). `latch_read_failed`: повторное чтение + проба SecureStore; хранилище живо → запись считается битой → обнаружение незаконченных стираний и сброс (`read_failed_treated_as_corrupt`); хранилище мертво → как раньше, fail-closed.
2. Хвосты 6D: `latch.replace(uids)` одной записью; `lastDiscoveryUnattributed()` + лог `latch reset_with_orphans`; терминальные коды стирания — учёт в `accounts_v2_terminal_erase_v1`, после 3 попыток не чаще раза в сутки (`erase terminal_capped`), запись снимается при успешном стирании; npm-скрипт `test:accounts-v2-seed-guard`.
3. Dev-вход: `app/firebase_emulator_dev_login.ts` + маршрут `app/dev-emulator-login.tsx` (только `__DEV__` + эмулятор-хост, только @phraseman.test).
4. Телефонный E2E: найден и починен дефект Android — закрытие области всегда падало (`null` от Kotlin Unit), смена аккаунта была невозможна. Добавлены постоянные логи причин закрытия (store/sqlite/lease). Квитанция дополнена.

Тесты: tests/account_v2_tails_6e_v2.test.ts (19), регрессия 140/140, seed-guard 6/6, typecheck — 0 ошибок в своих файлах. Мутации пойманы: правило бэкапа, атомарность защёлки, read_failed/probe (2), потолок терминальных, недостижимость dev-входа (3), бесхозные.

## Ревью: SPEC+SECURITY APPROVE. P3: гонка read_failed→probe (сироты только в логе); карта терминальных записей без чистки при reset/replace; dev-лог deep-link в _layout.tsx:1343 печатает password= (только локальный тестовый); комментарий плагина ссылается на несуществующий сторож-файл; проба SecureStore при каждом запуске с read_failed.
