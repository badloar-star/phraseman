# Task packet: Account V2 — Пакет 8F: сервер V2 отвечает client_too_old старым клиентам (PM-235 T2/T5) + лог причины в auth_identity

Governance-ID: TG-766E45F4A75A
Status: Done (SPEC+SECURITY APPROVE); runtime-строки callMigrate/callPull — докоммит после чужой сессии (смешанный файл)
Owner: Claude session (Account V2, /loop), поручение координатора (§39 PM-235 T1–T6)

## Outcome

1. **T2 — серверная проверка версии клиента в V2-функциях** (`accountsV2SyncApply`, `accountsV2PullMine`, `accountsV2MigrateMine`, `accountsV2DeletionStatus`): клиент V2 передаёт свою версию (номер сборки/версия контракта клиента — выбрать то, что уже есть в приложении; если не передаёт — добавить в запросе); сервер сравнивает с минимальной (`config/accounts_v2.minClientVersion`, по умолчанию 0 = не проверять — ПОВЕДЕНИЕ НЕ МЕНЯЕТСЯ до решения владельца) и при меньшей отвечает `client_too_old` (failed-precondition) без записи. Клиент на `client_too_old` останавливает отправку (не повторяет бесконечно), лог `[ACCOUNT-V2] client_too_old`. Чтение флага — из уже кэшированного config (ноль доп. чтений).
2. **T5 — версия формы хранения V2:** у состояния сущности/операции есть явная версия формы (или зафиксировать существующую), сервер принимает N и N+1 (читает обе), пишет N; тест «N+1 из будущего не ломает загрузчик старого сервера» — если это невозможно без деплоя-в-два-шага, записать правило выкладки вместо кода.
3. **Лог причины** в `functions/src/auth_identity.ts` `throwIdentityCheckUnavailable` (и соседних catch): класс ошибки и код, без uid/PII — правило владельца «немой catch» (8D: TypeError выглядел как «нет доступа»).
4. T1 (план force_update) — короткий раздел в evidence PM-235: что выставить владельцу при релизе (`force_update_enabled`, `min_app_version`, `config/accounts_v2.minClientVersion`) и в каком порядке относительно 7B.

## Scope

functions/src/accounts_v2_adapter/*, accounts_v2_flags.ts, accounts_v2_contract/validate (если нужно поле версии), auth_identity.ts (только логи), modules/account-session-v2/* (передача версии, реакция на client_too_old), тесты, docs/phraseman-2.0/evidence/PM-235_migration_version_compat.md (раздел T1). Out of scope: включение minClientVersion, деплой, прод, App Check.

## Architecture

Версия едет в существующем конверте запроса; проверка — в общем входе адаптера; дефолт 0 = выкл.

## Security and privacy

Версия приложения — не персональные данные. Логи без uid.

## Technical debt

Accept temporarily: старые клиенты без поля версии трактуются как «версия 0» → при включённом минимуме получают client_too_old (это и есть цель) — записать.

## Verification

RED→GREEN, мутации (дефолт 0 не блокирует; меньше минимума — отказ без записи; клиент не зацикливается), паритет клиент/сервер, functions + app тесты по одному, независимое ревью.

## Rollback

minClientVersion = 0; git revert; бэкап `.tmp_pkg8f_backup/`.

## Итог исполнителя (2026-10-01)

**T2 — сервер.** Новый `functions/src/accounts_v2_client_version.ts` (без импортов): поле `clientVersion` (номер сборки), `parseMinClientVersion`, `splitClientVersion` (версия + данные без поля — строгие разборщики пакета/запроса не меняются), `accountsV2ClientTooOld` (минимум 0 / нет → никогда). `config/accounts_v2.minClientVersion` читается в `parseAccountsV2Flags` (только целое ≥ 1, иначе ключа нет; тот же кэш флагов — 0 доп. чтений). Ворота сразу после проверки `syncEnabled` в `accountsV2SyncApply` (callable.ts), `accountsV2PullMine`, `accountsV2MigrateMine`: ниже минимума → `failed-precondition client_too_old` (final) ДО любых чтений/записей данных, лог `[ACCOUNTS-V2] … reject reason=client_too_old client=… min=… reads=0` (без uid). Нет поля = версия 0 (старые сборки при включённом минимуме получают отказ — цель). `accountsV2DeletionStatus` сознательно не проверяется: статус удаления ничего не пишет, человек обязан видеть этап удаления с любой версии.

**T2 — клиент.** `modules/account-session-v2/account_v2_client_version.ts`: номер сборки из `expo-constants.nativeBuildVersion` (Android versionCode = iOS buildNumber, сейчас 130), только цифры, иначе 0. Транспорт синхронизации шлёт `{ ...batch, clientVersion }`; перенос и pull — тоже (правка только двух строк `callMigrate`/`callPull` в `accounts_v2_client_runtime.ts`, чужие ханки файла не тронуты). `client_too_old` распознаётся там же, где `accounts_v2_disabled` (`accountsV2GateRejection`), и обрабатывается так же: отправка останавливается до перезапуска, пакет не в карантин и не повторяется, гидрация — `server_disabled` (снимает метку 7A → у этой сборки работает старая синхронизация); лог `[ACCOUNT-V2] client_too_old -> v2_stopped_for_this_build`.

**T5 — версия формы хранения.** Кодом «читать N и N+1» заранее не сделать (форма N+1 неизвестна, а поле версии в записи само было бы сменой формы под строгим кодеком) → записано **правило выкладки в две выкладки** (читать обе, писать старую → писать новую; откат после шага 2 — только на шаг 1) в `docs/phraseman-2.0/evidence/PM-235_migration_version_compat.md` §7.

**Лог причины в auth_identity.ts.** `throwIdentityCheckUnavailable` пишет `{event:'identity_check_unavailable', cause:'name=… code=…'}` (класс и код, без uid и без текста сообщения); три соседних catch (`enrichMetadataFromAuth` — был немой, `account_id_lookup_unavailable`, `account_id_lookup_verify_failed`) — тоже с причиной.

**T1** — план включения `force_update` + `min_app_version` + `minClientVersion` и порядок относительно 7B: `PM-235_migration_version_compat.md` §7.

**Файлы.** Новые: `functions/src/accounts_v2_client_version.ts` (+`.test.ts`), `modules/account-session-v2/account_v2_client_version.ts`, `tests/account_v2_client_too_old_8f.test.ts`. Правки: `functions/src/accounts_v2_flags.ts`, `accounts_v2_adapter/{callable,pull_mine,migrate_mine}.ts`, `auth_identity.ts` (+ тест в `auth_identity.test.ts`), `modules/account-session-v2/account_sync_callable_transport.ts`, `accounts_v2_client_runtime.ts` (2 строки + импорт), evidence PM-235. Окончания строк сохранены (в т. ч. смешанные в `auth_identity.test.ts`). Бэкап `.tmp_pkg8f_backup/`.

**Тесты.** functions: client_version 7/7, auth_identity 108/108, flags 11/11, envelope_parity 112/112, timing_parity 7/7, callable 69/69, migrate_mine (вкл. pull) 23/23, firestore_port 21/21, rules_guard 6/6, status_callable 6/6, deletion pipeline 28/28, no_network 28/28, app_check_sealed 4/4. app: 8F 5/5, callable_transport 7/7, transport 29/29, runner 24/24, client_session 17/17, client_wiring 18/18, 6G 25/25, 7A 30/30, 6C/6D/6E хвосты 10/10, 10/10, 19/19, 6F 27/27, repair1 25/25. Типы и eslint своих файлов — чисто.

**Мутации 12/12 пойманы:** минимум 0 не блокирует, «строго ниже», снятие поля, минимум из флагов, проверка в pull / migrate / sync, pull разбирает данные без поля, лог причины, клиент шлёт версию, клиент узнаёт client_too_old, номер сборки — только цифры (после добавления случаев `1e3`/`0x10`).

**Порядок выкладки:** функции 8F раньше клиента 8F (старый pull отвергает незнакомое поле `clientVersion` как `request_unknown_field`). Минимум НЕ включён; в «Пульт» поле `minClientVersion` не добавлял (пишет владелец в `config/accounts_v2`).
