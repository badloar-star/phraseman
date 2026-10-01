# Task packet: Account V2 — Пакет 8C: «Мои наборы» с id вне каталога не висят на скелетоне

Governance-ID: TG-B5032F0B7653
Status: Done (SPEC+SECURITY APPROVE)
Owner: Claude session (Account V2, /loop)

## Outcome

E2E 2026-10-01 (квитанция 5b18dd743): после гидрации в библиотеке есть id наборов, которых нет в каталоге (удалённый/скрытый/недоступный по языку набор, тестовые id) → экран «Мои наборы» бесконечно показывает скелетон.
1. Сначала логи (правило владельца): где именно ждёт загрузка — какой запрос/кэш не возвращает набор, что получает экран (`[MY-PACKS]` на каждом решении: сколько id, сколько найдено, сколько не найдено, причина, источник кэш/сеть, без uid).
2. Починка: у загрузки есть конец — найденные наборы показываются, не найденные НЕ держат скелетон всего экрана (ограничение ожидания / явный «не найден»), без вечного спиннера; один отсутствующий набор не прячет остальные. Что показывать для отсутствующего — минимально и без нового дизайна: тихо не показывать карточку (и лог), если решение о визуале не принято — записать вопрос координатору.
3. Firebase-экономия: не перезапрашивать отсутствующие id на каждом рендере (кэш отрицательного ответа на сессию/с TTL).

## Scope

Экран/хук «Мои наборы» (найти: app/community_packs/*, components/*), загрузка метаданных наборов; тесты. Out of scope: каталог/сервер наборов, редизайн, удаление id из библиотеки (данные человека не трогаем).

## Architecture

Состояние загрузки по каждому набору (found/missing/error) вместо одного общего «ждём всё».

## Security and privacy

Без новых данных.

## Technical debt

Accept temporarily: визуал «набор недоступен» — если понадобится, отдельной задачей «Дизайн».

## Verification

RED (id вне каталога → вечный скелетон) → GREEN; сторожа layout_stability/perf_freeze; затронутые тесты по одному; независимое ревью.

## Rollback

git revert; бэкап `.tmp_pkg8c_backup/`.

## Итог исполнителя (2026-10-01)

**Точка ожидания (по коду, подтверждено RED-тестом).** `app/flashcards_my_packs.tsx` → `loadMine` → `classifyMyPacksResolution` (`app/flashcards/myPacksDataIntegrity.ts`): статус `ready` только если КАЖДЫЙ id библиотеки нашёлся в каталоге или в точечном чтении `fetchCommunityPackMeta`. Несуществующий набор (удалён, тестовый id, пустой каталог эмулятора) не находится никогда, а `fetchCommunityPackMeta(...).catch(() => null)` не отличал «документа нет» от «сеть упала» → `stale` → экран показывал строку-скелетон (`loadStatus !== 'ready'`), 5 тихих повторов по 20 с (каждый — новые чтения Firestore), потом вечный скелетон.

**Починка (без редизайна).**
- `fetchCommunityPackMetaResult` (communityFirestore.ts): `found` / `missing` (документа нет, не отображается, облако выключено в сборке) / `error` (сеть, права — лог `[MY-PACKS] meta_fetch_failed kind=…`). Старый `fetchCommunityPackMeta` не тронут (другие вызовы).
- `classifyMyPacksResolution(..., missingPackIds)`: ТОЧНО отсутствующие id не держат экран; сбой чтения по-прежнему `stale` (тихий повтор), непрочитанный источник — тоже `stale`.
- Экран: отсутствующие = «документа нет» + купленные/официальные id вне ПОЛНОСТЬЮ прочитанного каталога; найденные показываются, отсутствующие тихо не показываются; один отсутствующий больше не прячет остальные.
- 💸 Отрицательный ответ кэшируется `MissingPackCache` (30 мин, ≤ 200 записей, ключ `язык:id`) — фокусы экрана и тихие повторы не читают заново несуществующие документы.
- Логи (без uid и id): `[MY-PACKS] resolve owned=… community=… catalog=… catalog_status=… fetched=… found=… missing_fetched=… missing_cached=… missing_outside_catalog=… fetch_errors=… status=…`, `[MY-PACKS] commit status=… added=… created=…`, ранние выходы `commit skip reason=cancelled|account_scope_changed`, `resolve skip reason=account_changed`.

**Файлы.** `app/flashcards_my_packs.tsx`, `app/flashcards/myPacksDataIntegrity.ts`, `app/community_packs/communityFirestore.ts`, `tests/my_packs_data_integrity_behavior.test.ts` (+3 теста). Окончания строк сохранены. Бэкап `.tmp_pkg8c_backup/`.

**Тесты.** RED: на исходных файлах `npx tsx --test tests/my_packs_data_integrity_behavior.test.ts` — pass 8, fail 2. GREEN — pass 11, fail 0. Сторожа: `layout_stability_contract` 15/15, `perf_freeze_contract` 12/12; `flashcards_my_packs_count_cache_contract` 2/2, `flashcards_my_packs_liquid_source_contract` 4/4. `my_packs_storage_status_contract` 0/2 — красный ДО пакета (проверено на исходниках: ищет `runAccountScopedStorageTransaction` и `loadAuthorCommunityPacksPendingUpdateResult`, которых в экране нет; не 8C). Типы своих файлов — чисто.

**Мутации 7/7 пойманы:** отсутствующие не учитываются, непрочитанный источник, TTL, предел кэша, экран не передаёт отсутствующие, экран не кэширует, «документа нет» = ошибка.

**Вопрос координатору (визуал):** отсутствующий набор сейчас тихо не показывается (решение пакета «без нового дизайна»). Нужна ли карточка «набор недоступен» (с возможностью убрать из библиотеки)? Если да — отдельной задачей «Дизайн».

**Остаток.** Та же схема `fetchCommunityPackMeta(...).catch(() => null)` есть в `app/flashcards/trainingSources.ts:394` (выбор колод для тренировки) — там скелетона нет (по коду), но отрицательный ответ не кэшируется; вне scope 8C. Проверка на эмуляторе не проводилась (экран не открывался).

## Ревью: SPEC+SECURITY APPROVE
- P2 (TEMP): каталог официальных наборов `loadMarketplacePacksResult` (app/flashcards/marketplace.ts:590-596) — заглушка `{packs:[], status:'ready'}` → купленные официальные наборы считаются «вне каталога» и не видны (не регрессия: и до 8C не показывались). Если каталог вернут с постраничным/ограниченным чтением — `ready` ОБЯЗАН означать «прочитан целиком», иначе купленный набор спрячется.
- P3: id одновременно в owned и communityOwned не дочитывается точечно.
