# Task packet: Account V2 — Пакет 8C-2: «Мои наборы» — ошибка ≠ пусто; покупка набора при смене аккаунта (поведенческий тест)

Governance-ID: TG-DFE864BF1030
Governance-ID: TG-CF6FC31B52DD
Status: In progress
Owner: Claude session (Account V2, /loop); поручение координатора §77 (+дополнение), ответ §AV2-14

## Outcome
1. `loadAuthorCommunityPacksPendingUpdate` (app/community_packs/communityFirestore.ts:~361) глотает ошибку и возвращает `[]` → экран «Мои наборы» (`app/flashcards_my_packs.tsx:~358`) и `app/flashcards/trainingSources.ts:~391` считают «у автора нет опубликованных наборов». Сделать `loadAuthorCommunityPacksPendingUpdateResult` → `{status:'ok'|'error', packs}` (можно через существующий `readArrayWithStatus` из app/flashcards/myPacksDataIntegrity.ts); экран при error помечает результат `stale` (не «пусто», не перезаписывает тёплый кэш/готовые данные, как уже делается для каталога); trainingSources — при error не терять авторские наборы из выдачи (использовать последнее известное/не считать отсутствие). Логи `[MY-PACKS] author_packs result=… code=…` без uid. Старую функцию оставить обёрткой или заменить у всех вызывающих (grep всех).
2. Поведенческий тест покупки: смена аккаунта (поколения) во время покупки официального набора через `app/economy/client_shard_operation_ledger.ts` (проверки ~523–539 + `withAccountTransitionLock`) → набор НЕ попадает в хранилище нового аккаунта (flashcardsOwnedPacksKey), списание не уходит чужому. С мутациями (убрать проверку поколения / замок → тест красный).
3. Мёртвые `saveOwnedPackIds`/`addOwnedPackId` (app/flashcards/marketplace.ts:~351/362, без внешних вызовов, read→await→write мимо смены аккаунта): удалить (проверить grep по всему репо, включая tests/ и scripts/), если где-то нужны — пустить через проверку поколения.
4. Запись авторских наборов локально (`localAuthored` / сохранение своего набора) — проверить, защищена ли от смены аккаунта (поколение/замок); если нет — поведенческий тест + минимальная защита.
5. Немые catch: `readOwnedIds` (marketplace.ts ~295) и разбор owned в `client_shard_semantic_reducer.ts` (~85) — с логом причины (без значений).

## Scope
app/community_packs/communityFirestore.ts (одна функция), app/flashcards_my_packs.tsx (только место загрузки авторских), app/flashcards/trainingSources.ts (только вызов), app/flashcards/marketplace.ts (удаление мёртвого + лог), app/economy/client_shard_semantic_reducer.ts (только лог в catch), место записи авторских наборов при необходимости, тесты. Чужие незакоммиченные хунки не трогать. Out of scope: прод, UI-вёрстка.

## Architecture
Трёхзначный/двузначный результат загрузки вместо «пусто при ошибке»; защита записи — существующие примитивы поколения/замка.

## Security and privacy
Новых данных нет; логи без uid.

## Technical debt
Нет новых.

## Verification
RED→GREEN: «ошибка загрузки авторских → stale, а не пусто; тёплые данные не затираются», «trainingSources при ошибке не теряет авторские», «смена аккаунта во время покупки → набор не в чужом хранилище», «запись авторского набора после смены аккаунта не проходит» (если пункт 4 нашёл дыру). Мутации, затронутые тесты по одному (my_packs_data_integrity_behavior, client_shard_operation_ledger, …), тайпчек, независимое ревью.

## Rollback
git revert; бэкап `.tmp_pkg8c2_backup/`.

## Итог исполнителя (2026-10-02)

**Сделано (п. 1–5).**
1. `loadAuthorCommunityPacksPendingUpdateResult` → `{status:'ok'|'error', packs}` в `communityFirestore.ts`. При ошибке — последнее удачное чтение по ключу (автор|цель), ограничено 8 записями; чужой автор его не получает. Старая `loadAuthorCommunityPacksPendingUpdate` оставлена обёрткой (её зовут `flashcards_swipe.tsx`, `flashcards_packs.tsx`, мок в `tests/flashcards_swipe_access_behavior.test.ts`, строка в `tests/gustav_community_pack_target_gate.test.ts`); теперь при сбое отдаёт последнее известное, а не `[]`. Логи `[MY-PACKS] author_packs result=ok|error code=… count/last_known=…` без uid.
   - «Мои наборы» (`flashcards_my_packs.tsx`, только `loadMine`): Result-вызов, проверка поколения после него, статус `authoredCloudStatus` добавлен в `sourceStatuses` → при error итог `stale`; ветка коммита stale уже держит показанные наборы, счётчик публикуется только при `ready`.
   - `trainingSources.ts` (только вызов): Result; при error берутся `packs` (последнее известное) + опубликованные мной из каталога; лог `[MY-PACKS] author_packs training_sources result=error kept=…`.
2. Поведенческие тесты покупки при смене аккаунта — в `tests/client_shard_operation_ledger.test.ts` (describe «8C-2»): (а) покупка, вставшая за переходом аккаунта → `failed stale_account_generation`, набора нет в хранилище, баланс нового аккаунта не тронут; (б) переход, запрошенный посреди покупки, ждёт её конца, затем стирание убирает данные A, баланс B не тронут. Код леджера не менялся — защита уже была.
3. `saveOwnedPackIds` / `addOwnedPackId` удалены из `marketplace.ts` (grep по app/components/hooks/tests/scripts/functions — вызовов нет, только `docs/atlas` и старые отчёты).
4. Запись своих наборов (`localAuthorPacks.ts` → `serializePackWrite`): уже защищена — поколение берётся в момент вызова и проверяется ВНУТРИ `withAccountTransitionLock`, вся запись под замком. Дыры нет, код не менялся; добавлен поведенческий тест-сторож.
5. Немые catch с логом причины (без значений): `readOwnedIds` и миграция legacy-ключа в `marketplace.ts` (`[MY-PACKS] owned_ids …`), `jsonObject` и разбор списка наборов в `client_shard_semantic_reducer.ts` (`[ECONOMY] reducer owned_*_unparseable`).

**Изменённые файлы (точный список).**
- `app/community_packs/communityFirestore.ts`
- `app/flashcards_my_packs.tsx`
- `app/flashcards/trainingSources.ts`
- `app/flashcards/marketplace.ts`
- `app/economy/client_shard_semantic_reducer.ts`
- `tests/client_shard_operation_ledger.test.ts` (импорт `invalidateAccountGeneration, withAccountTransitionLock` + блок describe «8C-2» в конце; CRLF как у соседних строк)
- `tests/my_packs_pkg8c2_behavior.test.ts` (новый)
- этот пакет (раздел «Итог исполнителя»)

Чужих незакоммиченных хунков в этих файлах на момент правки не было (`git diff` пуст), поэтому весь diff этих файлов — мой. Окончания строк сохранены (LF/CRLF как в оригинале, проверено побайтно). Бэкап: `.tmp_pkg8c2_backup/` (оригиналы; `mine/` — мои версии для RED-прогонов).

**Проверки.**
- RED на исходниках (3 файла откатаны на бэкап): `my_packs_pkg8c2_behavior` 4/5 красные (результат авторских, холодная ошибка, тренировка — `Received []`, связка экрана); тест п.4 зелёный и на исходниках (защита была). GREEN: 5/5.
- Леджер: 31/31. Мутации (восстановлены побайтно, `cmp`): убрать проверку поколения внутри замка → тест (а) красный; убрать `withAccountTransitionLock` → оба красные.
- Мутации 8C-2: при ошибке отдавать `[]` → красный; тренировка отбрасывает packs при error → красный; убрать `authoredCloudStatus` из сверки → красный; убрать проверку поколения в `serializePackWrite` → тест п.4 красный. `localAuthorPacks.ts` вернулся байт-в-байт, `git diff` пуст.
- Затронутые: `my_packs_data_integrity_behavior` 11/11, `my_packs_storage_status_contract` 2/2, контракты `flashcards_my_packs_*` 2/2, 4/4, 3/3, `fc_marketplace_official_gating` 8/8, `gustav_community_pack_target_gate` 5/5, `layout_stability_contract` 15/15, `perf_freeze_contract` 12/12.
- Красные НЕ от пакета: `flashcards_swipe_access_behavior` (нет модуля `components/personal_plan_sunset_guard`), `community_pack_catalog_owner_fixes` 2/39 (строки экрана коллекции и каталога сообщества — файлы вне пакета).
- Полный typecheck: 2 ошибки, обе чужие (`functions-admin/index.ts` — нет модулей турниров); в изменённых файлах ошибок нет.
- Независимое ревью исполнителем не проводилось (за координатором).

**Находки вне объёма.**
- `reportEconomyOperationApplied` пишет `economy_daily_stats_tail_v1:<прежний владелец>` фоном ПОСЛЕ отпуска замка: если переход аккаунта случился сразу после покупки, этот хвост дневного агрегата прежнего владельца остаётся на устройстве после стирания. Новому аккаунту он не приписывается (ключ по владельцу), денег/наборов не касается — кандидат на отдельный пакет (проверка поколения в репортёре).
- Запрос авторских наборов по `authorStableId` без `limit()` — как и было; чтений столько, сколько наборов у автора.
