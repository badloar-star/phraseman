# Task packet: PM-235 — migration version и совместимость клиентов (E23, evidence)

Governance-ID: TG-0AE4918142EE
Status: Partial — A1/A2 частично; задачи T1–T8 координатору
Owner: Claude session (Account V2 → очередь координатора)

## Outcome

Критерии PM-235 (docs/phraseman-2.0/tasks/PM-235.md): A1 — есть schemaVersion, cutover, read/write compatibility и условия блокировки старых клиентов; A2 — rollout обратим до purge.
Результат: `docs/phraseman-2.0/evidence/PM-235_migration_version_compat.md` по фактическому коду 2.0, в первую очередь Account V2 (контракт `functions/src/accounts_v2_contract.ts`, отметка `accounts_v2_meta/migration {version}`, флаги `config/accounts_v2` syncEnabled/deletionPurgeEnabled/everEnabled, клиентские `accounts_v2_client_enabled`/`accounts_v2_legacy_sync_disabled`, правила выкладки «функции до клиента», «первая выкладка V2 включает 7C», «откат только вперёд»), а также прочие миграции 2.0 (D-решения: жемчуг, монеты, Шпиль, удаления). Где механизма нет (например, принудительного обновления старых клиентов / min-version gate) — `missing` с предложением, без реализации.

## Scope

Только чтение кода/документов, новый evidence-файл. Out of scope: код, флаги, данные, деплой.

## Architecture

Таблица по доменам: schemaVersion → cutover-переключатель → совместимость (старый клиент↔новый сервер, новый клиент↔старый сервер) → блокировка старых клиентов → точка необратимости (purge) → откат.

## Security and privacy

Без данных пользователей.

## Technical debt

Accept temporarily: недостающие механизмы (если найдутся) — отдельными задачами координатору.

## Verification

Ссылки file:line реальны; независимое ревью.

## Rollback

Удалить файл.
