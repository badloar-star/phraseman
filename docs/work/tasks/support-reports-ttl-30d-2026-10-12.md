# Task packet: обращения и сообщения об ошибках удаляются через 30 дней (TTL) + политика — решение владельца 12.10 (а)

Governance-ID: TG-83AA419111D9
Status: Done
Owner: 5 · АВТОРИЗАЦИЯ (координатор 12.10). ВЫКЛАДКУ НЕ ДЕЛАТЬ — координатор включит в утреннюю 13.10.

## Outcome

- functions/src/log_ttl.ts: SUPPORT_REPORT_TTL_DAYS = 30, supportReportExpireAt(nowMs).
- functions/src/client_reports.ts: документ kind=error_report (обращение в поддержку и сообщение об ошибке в задании) получает expireAt = создание + 30 дней.
- firestore.indexes.json: fieldOverride error_reports.expireAt ttl: true.
- Политика (legal/*.json → legal:sync): журнал можно отключить переключателем на форме; обращения и приложенный журнал удаляются автоматически
  через 30 дней после отправки (и раньше — с удалением аккаунта или по просьбе).

## Scope

In scope: файлы выше, тесты functions и политики. Out of scope: выкладка функций и TTL (координатор), старые документы без expireAt
(TTL их не тронет — останутся до удаления аккаунта; при необходимости — отдельный backfill-скрипт).

## Architecture

TTL Firestore удаляет документ по полю expireAt (как app_errors/app_activity, 90 дней). spire_task_report пишется в ту же коллекцию,
но без expireAt — не затрагивается.

## Security and privacy

Сокращение срока хранения. Джарвис: число «открытых сообщений об ошибках» по error_reports будет учитывать только последние 30 дней.

## Technical debt

- Contain: старые документы без expireAt — backfill по решению координатора.

## Verification

client_reports тесты functions, jarvis_data_contract_guard, legal_document/legal_copies, support_diagnostics_privacy_contract.

## Rollback

Убрать expireAt и fieldOverride (TTL-политику выключить в консоли), откат абзаца.

## Result

functions: client_reports 31/31 (новый тест expireAt = +30 дней), jarvis_data_contract_guard 90/90, log_ttl 4/4. Корень: account_delete_collection_group_indexes 30/30,
support_diagnostics_privacy 4/4, legal_copies_sync 6/6, legal_document_liquid_glass 8/8 (хэши). Выкладка — координатор:
`npx firebase deploy --only functions:submitClientReport,firestore:indexes --project phraseman-ea0b3`
(TTL-политика для error_reports.expireAt создаётся из fieldOverrides; включение занимает до 24 ч; старые документы без expireAt не удаляются).
