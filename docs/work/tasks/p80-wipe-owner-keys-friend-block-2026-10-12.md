# Task packet: п.80 — после удаления/выхода не остаются ключи с идентификатором прежнего владельца

Governance-ID: TG-1396DD034B1A
Status: Done
Owner: 5 · АВТОРИЗАЦИЯ (координатор; улика docs/phraseman-2.0/evidence/account_actions_2026-10-12.md: «осталось 2»)

## Outcome

1. Причина (по коду): очистка wipeLocalAccountData (cloud_sync.ts — общая для выхода, смены и удаления) стирает общий инвентарь
   аккаунта + отдельный список WIPE_ONLY_ACCOUNT_KEY_PREFIXES. `friend_blocked_v1:<stableId>` (friend_block.ts, ключ = константа + uid)
   не был ни там, ни там; сторож account_wipe_owner_keys_guard ловил только шаблон `` `prefix:${uid}` `` и сборку «константа + uid» не видел.
   Тем же путём пропущен `economy_daily_stats_tail_v1:<stableId>` (хвост баланса для проверки непрерывности; Пакет 8L прямо
   рассчитывал на его стирание).
2. Оба префикса добавлены в WIPE_ONLY_ACCOUNT_KEY_PREFIXES (стираются тем же removeExactly с проверкой остатка).
3. Постоянный лог `[ACC-WIPE] owner_residue`: после стирания — сколько ключей с stableId прежнего владельца осталось и их префиксы
   (id заменён на `<owner>`); намеренно сохранённые денежные очереди там видны — это ожидаемо.
4. Сторож расширен: ключи вида `CONST + uid` / `` `${CONST}${uid}` `` тоже требуют решения «стирается/сохраняется».
5. Метка `account_delete_pending_auth_v1`: снимается clearAccountDeletePendingAuthLock() только на фазе `ready` цепочки
   prepared → local_data_cleared → server_enqueued → … → ready; цепочка продолжается при каждом запуске (auth_provider.ts ~1419–1515).
   До выкладки индексов сервер не принимал заявку — метка честно держалась. Кода не меняю.

## Scope

In scope: app/cloud_sync.ts (список + лог), tests/account_wipe_owner_keys_guard.test.ts.
Out of scope: повторное настоящее удаление гостя (только по слову владельца), серверная часть.

## Architecture

Отдельный шаг appMessages (WIPE_ONLY) — тот же, что для ключей сообщений; общий инвентарь (копия, проверка чистоты) не расширяется.

## Security and privacy

Политика (§3, §20) обещает удаление локальных данных — исправление приводит поведение в соответствие; список заблокированных и хвост
баланса — личные данные прежнего владельца. Денежные очереди не стираются.

## Technical debt

- Contain: нет.

## Verification

Сторож account_wipe_owner_keys_guard (когда хватит памяти для jest); проверка синтаксиса; owner_residue на следующем выходе/удалении.

## Rollback

Откат коммита.
