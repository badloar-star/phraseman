# Task packet: стирание ключей сообщений аккаунта при выходе/удалении (PRIVACY_DELTA_R1 п.5)

Governance-ID: TG-E7ED61DF8376
Status: In progress
Owner: сессия «5 · АВТОРИЗАЦИЯ» (стирание — её область; координатор 12.10)
Related epic/enabler: docs/phraseman-2.0/PRIVACY_DELTA_R1.md п.5; legal/privacy_policy_en.json §3, §20

## Outcome

`wipeLocalAccountData` стирает ключи сообщений аккаунта (в имени — stableId): кэш, метку последнего обновления, превью, состояния превью, очереди подтверждения просмотра и модалок, анимированные id, метку «входящие форсили», и устаревшие v1-ключи; плюс отметку `mistake_restore_full_done_v1:<uid>`. Политика (§3, §20) обещает удаление локальных данных — теперь выполняется. Лог `[ACC-WIPE] app_messages {prefix: count}` и стадия `appMessages` в `wipe_stages`.

## Scope

In scope: `app/app_messages.ts` — только экспорт списка префиксов/ключей для стирания; `app/cloud_sync.ts` — отдельный шаг стирания этих ключей тем же `removeExactly` после «Памяти диалогов» и тихий повторный проход в конце; сторож `tests/account_wipe_owner_keys_guard.test.ts`.
Out of scope: общий инвентарь `accountOwnedStorageKeysFrom` (он же — аварийная копия и «проверка чистоты»: кэш сообщений есть у любого гостя, добавление сделало бы каждого гостя «грязным» и сменило бы ветку входа); порядок существующих шагов; ключи с деньгами — `app_messages_report_reply_pending_claims_*` (награды за отчёты, досылает синхронизация), `community_pack_paid_ids_v1`, `community_pack_sale_outbox_v1` — описаны координатору, не стираются этой правкой.

## Architecture

Новый шаг `appMessages` внутри существующего стирания; совпадение ключа — `prefix` или `prefix:` + владелец. Повторный проход в конце — без броска `account_wipe_incomplete` (живой загрузчик сообщений мог дописать кэш во время выхода — это не должно ронять выход).

## Security and privacy

Удаляет локальные данные, связанные со stable app ID, как обещает политика. Новые данные не собираются. Лог — только имена префиксов и числа.

## Technical debt

Contain: сторож перечисляет все ключи-владельцы в `app/**` (шаблон `<prefix>:${owner}`) и требует для каждого решение: стирается / сохраняется намеренно (деньги, с причиной). Accept temporarily: денежные очереди (`community_pack_*`, награды за отчёты) переживают удаление аккаунта — владелец Ядро/Магазин, решение — включить их в аварийную копию и стирание при удалении (не при смене), до релиза — по решению координатора.

## Verification

`tests/account_wipe_owner_keys_guard.test.ts`, `tests/auth_provider_behavior.test.ts`, `tests/account_switch_backup_restore.test.ts`, `tests/aa_account_switch_roundtrip_scenario.test.ts`, тесты app_messages. Прогон Сверки: после выхода — строки `[ACC-WIPE]`.

## Rollback

Откат коммита — ключи сообщений снова переживают выход (прежнее поведение), остальное стирание не затронуто.
