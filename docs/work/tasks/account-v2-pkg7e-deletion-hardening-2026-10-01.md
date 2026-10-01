# Task packet: Account V2 — Пакет 7E: доработки журнала удалений (P3 ревью 7D)

Governance-ID: TG-E3F54087DDB5
Status: Done (SPEC+SECURITY APPROVE после ремонта №1)
Owner: Claude session (Account V2, /loop)

## Outcome

Закрыть P3 ревью Пакета 7D (коммит c0dae20e6), чтобы ни в одном узком случае не пропала карточка, которую человек хочет иметь:
1. **Запас по часам:** удаление (журнал/tombstone) побеждает локальную карточку только если оно свежее её последней правки на ≥ 1 ч (константа с `// зачем:`); сбитые вперёд часы телефона не убивают свежую правку с другого устройства.
2. **`updatedAt` своих карточек:** при правке своей карточки (`app/flashcards/custom_cards_store.ts`) ставить время правки; `localCardEditTimeMs` в `app/accounts_v2_hydration_deletions.ts` учитывает его. Старые карточки без поля — как сейчас.
3. **«Вернуть» (restoreFlashcard и аналог своих карточек):** снимать запись журнала и в ветке раннего выхода «карточка уже есть»; при сбое снятия записи — освежить время карточки (addedAt/lastSeenAt или updatedAt), чтобы повторная гидрация её не убрала; лог причины.

## Scope

app/accounts_v2_hydration_deletions.ts, app/flashcards/card_deletion_journal.ts, app/flashcards/custom_cards_store.ts, hooks/use-flashcards.ts (минимально, `// зачем:`), tests/account_v2_card_resurrection_7d.test.ts (дополнить). Out of scope: сервер, флаги, деплой.

## Architecture

Те же точки, что в 7D; только более строгие условия «удалять».

## Security and privacy

Новых данных нет (время правки своей карточки локально; в V2 уходит как поле карточки, как прочие поля). Privacy policy не меняется.

## Technical debt

Нет нового.

## Verification

RED→GREEN, мутации (запас по часам, updatedAt, ранний выход restore, сбой снятия записи), регрессия 7D/7A/7C/6G/6F, fc_custom_cards_store по одному, независимое ревью.

## Rollback

Копия `.tmp_pkg7e_backup/`.

## Итог исполнителя (2026-10-01)

**Сделано.**
1. **Запас по часам** `ACCOUNTS_V2_DELETION_CLOCK_MARGIN_MS = 1 ч` (`app/accounts_v2_hydration_deletions.ts`): удаление (tombstone/журнал) убирает локальную карточку, только если позже её последней правки ≥ 1 ч; журнал не даёт добавить живую карточку сервера, только если её `updatedAtMs` / времена содержимого (ревизия 1) раньше удаления ≥ 1 ч. Цена: удаление меньше чем через час после правки карточку не убирает (карточка остаётся).
2. **`updatedAt`**: `upsertCustomCard` при правке существующей своей карточки ставит `updatedAt = Date.now()` (новая карточка — без поля, как раньше); поле добавлено в `CardItem` и `Flashcard` (необязательное). `localCardEditTimeMs` = max(addedAt, updatedAt, lastSeenAt); `serverCardContentTimeMs` тоже учитывает `updatedAt` (правка на другом устройстве после удаления → сервер свежее). Старые карточки без поля — как в 7D.
3. **«Вернуть»**: `restoreFlashcard` снимает запись журнала и в ветке «карточка уже есть»; `restoreCustomCard` снимал её и раньше (мутатор возвращает тот же массив, `.then` идёт всегда). Снятие возвращает итог (`forgetCardDeletions` → `Promise<boolean>`: false = сбой хранилища / сменился аккаунт). Не снялось → фоном освежается `updatedAt` карточки (сохранённая — под очередью записи с проверкой поколения; своя — через `updateCustomCards`), лог `[ACCOUNT-V2] journal restore_forget_failed -> touch list=…`, провал освежения — `restore_touch_failed`/`restore_touch_skip`. «Вернуть» не ждёт журнал (мгновенный отклик экрана).

**Файлы.** `app/accounts_v2_hydration_deletions.ts`, `app/flashcards/card_deletion_journal.ts`, `app/flashcards/custom_cards_store.ts`, `hooks/use-flashcards.ts`, `app/flashcards/types.ts` (одно необязательное поле), `tests/account_v2_card_resurrection_7d.test.ts`. Окончания строк сохранены как были (LF/CRLF по файлу). Бэкап `.tmp_pkg7e_backup/`.

**Тесты.** RED: тест 7E на файлах до пакета не компилируется (нет `updatedAt`, `forget` → void). GREEN: 7D+7E 21/21. Регрессия: 6G 25/25, 7A 30/30, 7C 15/15, 6F 27/27, repair1 25/25, fc_custom_cards_store 11/11, target_leak 3/3, fc_deck_options 11/11; `fc_session_multi_deck` 1 красный — был до пакета (проверено на копии). Типы своих файлов + редактор/useCollectionData — чисто.

**Мутации 9/9 пойманы:** запас локально, запас против сервера, updatedAt локально, updatedAt сервера, правка ставит updatedAt, ранний выход restore, освежение сохранённой, освежение своей, сбой снятия = false.

**Остаток.** `updatedAt` уходит в V2 и старое облако как обычное поле карточки (новых данных нет). Сохранённые карточки человек не правит — у них `updatedAt` появляется только при освежении после сбоя «Вернуть». Свои карточки, правленные до 7E, времени правки не имеют (как в 7D).

## Ремонт №1 (ревью: SPEC HOLD P1, SECURITY APPROVE) — выполнено

**P1.** Новое поле карточки `updatedAt` (своя карточка в `custom_flashcards_v2`, освежённая сохранённая в `flashcard_pages`) уходит в старое облако, а перенос OD21 пропускал только поля из `SAVED_CARD_FIELDS` → `held: unknown_card_field` → HOLD всего аккаунта навсегда.

**Починка.**
- `functions/src/accounts_v2_migration/inventory.ts`: `'updatedAt'` добавлен в `SAVED_CARD_FIELDS` (единственный список полей карточки при переносе; `report.ts` и `dry_run.ts` берут его же; клиентских копий списка нет — проверено поиском).
- `functions/src/accounts_v2_migration/dry_run.ts` (`withoutMalformedUpdatedAt`): `updatedAt` — safe integer > 0 → переносится в V2 как обычное поле карточки. Битое (строка, ≤ 0, дробное, null) → поле снимается с переносимой карточки, в отчёт `informational malformed_value` по пути `…[*].updatedAt`; карточка переносится, статус аккаунта не держится. Выбор: соседние поля (addedAt и пр.) не проверяются вовсе, а HOLD всего аккаунта из-за служебного времени хуже потери поля — клиент 7E битое время всё равно игнорирует (время неизвестно → карточку не убирает). Сам `informational` не блокирует статус и защищает путь от чистки.
- Сторож: `inventory.test.ts` — список содержит `updatedAt`; `dry_run.test.ts` — +2 теста (с `updatedAt` → ready и поле в операции; битые 4 вида → ready, поля нет, informational count 4).

**Тесты.** RED: на файлах до ремонта dry_run 2 красных, inventory 1 красный. GREEN: dry_run 64/64, inventory 39/39. Регрессия functions по одному: adapter callable 69/69, firestore_port 21/21, migrate_mine 23/23, rules_guard 6/6, cleanup_readers_guard 5/5, dry_run_legacy_doc 4/4, dry_run_lessons_cleanup 38/38, no_network 24/24. Типы functions по миграции — чисто. Окончания строк сохранены.

**Мутации 6/6 пойманы:** поле в списке, `> 0`, целое, отметка в отчёте, перенос сырого значения, битое держит аккаунт.

**ПОРЯДОК ВЫКЛАДКИ (обязательно):** функции (перенос с `updatedAt`) выкладываются ДО клиента 7E. Иначе клиент 7E успеет записать `updatedAt` в старое облако, и перенос старой версии функций поставит аккаунт в HOLD. Добавляется к правилам 7A/7C (функции ДО клиента).
- `functions/src/account_delete_revenuecat_phase2.test.ts` (по поручению координатора): 1 красный из 5 — **не из-за ремонта**. На исходных inventory.ts/dry_run.ts (бэкап `.r1`) падает тот же тест с тем же текстом. Причина: тест помечен «(RED)» и ищет в исходнике удаления аккаунта строку `const permanentDenialRef = db.collection(ACCOUNT_DELETE_PERMANENT_DENIALS)`, которой там нет (фаза 2 RevenueCat не реализована); с переносом V2 не связан, был красным и в отчётах 6A/6G.
