# Task packet: Account V2 — Пакет 6C: хранилище на телефоне + тумблеры в админке

Governance-ID: TG-75B2EECD5E7E
Status: Done (SPEC+SECURITY APPROVE; P2 до включения флага)
Owner: Claude session (Account V2, /loop)

## Outcome

1. **Хранилище области на Android.** `createStorageAdapter` в `modules/account-session-v2/accounts_v2_client_runtime.ts` отдаёт реальный адаптер на базе уже принятых нативных частей (`native/account_sqlite_scope_connection.ts`, `account_sqlite_lease_binding.ts`, `account_native_provisioner.ts`, патч expo-sqlite 16.0.10 — НЕ менять патч) — SQLCipher-база области `files/SQLite/accounts-v2/…`, ключ из SecureStore. iOS — `null` (не доказано, честно не открываем) с логом. Только при включённом флаге; ленивый импорт.
2. **Хвосты 6B к хранилищу:** перед `reset()` испорченной защёлки пройти `resumePendingErase` по всем найденным областям, сбрасывать только после; ключ удаления V2 привязать к operationId и удалять после завершения; перезапуск остановленной сессии не на каждом возврате.
3. **Админка (только `admin/v2/legacy.html`):** в «Пульте» тумблер клиента `accounts_v2_client_enabled` (через существующий общий писатель remote_config/app.bools) и отдельная карточка серверных флагов `config/accounts_v2` {syncEnabled, deletionPurgeEnabled} с предупреждением «everEnabled не снимать»; запись только админом (правила уже есть). Без новых вызовов на каждый uid; чтение одного документа при открытии вкладки.

## Scope

In scope: modules/account-session-v2/* , tests/account_*_v2*, admin/v2/legacy.html (узко, раздел Пульта). Out of scope: включение флагов, деплой, патч expo-sqlite, App Check (запломбирован), прочие файлы админки (заморожены).

## Architecture

Адаптер хранилища — тонкий слой над принятыми нативными модулями; ошибки открытия → лог `[ACCOUNT-V2]` + адаптер недоступен (клиент не пишет). Админка — тот же паттерн, что соседние рубильники.

## Security and privacy

Ключ SQLCipher только в SecureStore; база вне бэкапа (уже исключена в манифесте бэкапа). Новых персональных данных нет.

## Technical debt

Accept temporarily: iOS-хранилище; включение — владелец.

## Verification

RED→GREEN; tests/account_*_v2 по одному; Babel-сторож; perf/layout-сторожа; проверка админки — статически + сторожа админки (scripts/guard_admin_login.mjs не трогать); независимое ревью. Эмулятор — только через очередь.

## Rollback

Копия `.tmp_pkg6c_backup/`; флаги выключены.

## Ревью: SPEC+SECURITY APPROVE. До включения флага:
- P2 adapter.ts:58,257-284 + recoverCorruptLatch: поиск незаконченных стираний только по `.db` → сбой между шагами 5 и 7 + испорченная защёлка = вечный recovery_required. Fix: при открытии recovery_required → eraser.erase под той же очередью; искать все 4 суффикса; ошибку стирания не глотать (не сбрасывать защёлку).
- P3: метка без хэша манифеста (§5.2), planV2Retirement после записи метки (§5.3 — до); битая метка = отсутствующая; лик открытой базы при ошибке lease_binding; ключ удаления: аноним снимает до ответа, гонка FAST_WAIT, ветка waitForAccountDeletionCredentialSafe не снимает.
- Доказать на эмуляторе: defaultDatabaseDirectory, папка accounts-v2 до блокировки, исключение SecureStore из бэкапа.
- Ремонт №1 (P2+P3) сделан: дочистка при recovery_required, поиск по 4 суффиксам + известные uid, защёлка не сбрасывается при упавшем стирании, хэш манифеста в метке, planV2Retirement до метки, битая метка = восстановление, закрытие базы при сбое lease_binding, ключ удаления снимается только после ответа/записи. Коммит срочно: c930bac6c не включил app/accounts_v2_client_flag.ts и 2 теста → HEAD не собирался.
