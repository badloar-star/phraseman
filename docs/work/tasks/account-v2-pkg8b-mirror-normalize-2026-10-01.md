# Task packet: Account V2 — Пакет 8B: после гидрации карточки не отправляются повторно

Governance-ID: TG-42D62661C3F2
Status: Done (SPEC+SECURITY APPROVE)
Owner: Claude session (Account V2, /loop)

## Outcome

E2E 2026-10-01 (квитанция 5b18dd743): сразу после гидрации producer планирует `card_snapshot planned=3` — засеянное сервером зеркало (`seedMirrors` в `modules/account-session-v2/account_v2_hydration.ts`) отличается от локального снимка полями `studyTarget`/`packLanguage` (и, возможно, другими производными/локальными полями). Итог — ревизии карточек растут без действий человека, лишние записи Firestore на каждой новой установке/повторном применении.

1. Сначала логи/доказательство: тест, воспроизводящий «гидрация → первый снимок → операции ≠ 0» на реальной форме локальной карточки (`hooks/use-flashcards.ts`, `app/flashcards/custom_cards_store.ts`), с перечнем расходящихся полей.
2. Починка: единая нормализация карточки для сравнения в producer (`account_sync_producer_plan.ts`) и для засева зеркала — локальные/производные поля (`studyTarget`, `packLanguage` и найденные) либо всегда исключаются из синхронизируемых полей, либо одинаково приводятся на обеих сторонах. Не ломать: 7A `unsetFields` (не слать снятие производных полей), 7C названия, 7D/7E журнал удалений и `updatedAt`, `unseen`-поля.
3. Итог: после гидрации без действий человека — 0 операций.

## Scope

modules/account-session-v2/{account_sync_producer_plan,account_v2_hydration}.ts, app/accounts_v2_hydration_apply.ts при необходимости, тесты. Out of scope: сервер, флаги, деплой.

## Architecture

Одна функция нормализации, общая для засева и сравнения.

## Security and privacy

Без новых данных.

## Technical debt

Accept temporarily: уже записанные лишние ревизии на сервере не откатываются (V2 нигде не включён — их нет).

## Verification

RED (операции после гидрации > 0) → GREEN (0), мутации, регрессия 6F/6G/7A/7C/7D, независимое ревью.

## Rollback

git revert; бэкап `.tmp_pkg8b_backup/`.

## Итог исполнителя (2026-10-01)

**Доказательство (RED).** Новый тест `tests/account_v2_mirror_normalize_8b.test.ts` идёт настоящим путём: ответ pull → `parseHydration` (засев зеркала) → `applyHydratedCards` в настоящие хранилища → снимок, как его отдаёт приложение (`loadFlashcards`, `listCustomCards`) → план производителя. До починки: расходились поля **`studyTarget`, `packLanguage`, `uk`** (у сохранённых карточек; свои — без расхождений). Источники: `mergeSavedFlashcardsFromAccountsV2` дописывает `studyTarget = язык хранилища` и `packLanguage = normalizePackLanguage(packLanguage ?? язык)`; `repairSavedFlashcardContent` при чтении дописывает `uk = ru`, если uk пуст.

**Починка — одна функция** `normalizeCardFieldsForSync(target, list, fields)` в `modules/account-session-v2/account_sync_producer_plan.ts`, общая для сравнения (производитель, `cardRows`) и засева зеркала (`parseHydration` в `account_v2_hydration.ts`). Только для сохранённых: studyTarget = язык хранилища; packLanguage = packLanguage ?? язык, не из списка → 'en'; uk пусто → ru. Поля только ДОПИСЫВАЮТСЯ и одинаково с обеих сторон — снятия (`unsetFields`, 7A) из-за нормализации не бывает. Значимые значения сохраняются (packLanguage 'none'). Список языков `ACCOUNT_SYNC_PACK_LANGUAGES` сверяется тестом с `PACK_LANGUAGE_CHOICES` приложения. tombstone не нормализуется. `unseen` — по-прежнему только поля сервера. 7C (названия), 7D/7E (журнал, updatedAt, запас) не затронуты.

**Итог:** после гидрации без действий человека — 0 операций (тест). Новая сохранённая карточка уходит на сервер уже в нормализованной форме (с studyTarget/packLanguage/uk).

**Файлы.** `modules/account-session-v2/account_sync_producer_plan.ts`, `modules/account-session-v2/account_v2_hydration.ts`, новый `tests/account_v2_mirror_normalize_8b.test.ts`, `tests/account_v2_producer_6f_v2.test.ts` (ожидания двух тестов дополнены нормализованными полями; три теста снятия полей 7A переведены на свои карточки — логика снятия общая для списков, а синтетическое зеркало сохранённой не несёт производных полей). Окончания строк сохранены. Бэкап `.tmp_pkg8b_backup/`.

**Тесты.** RED: 2/2 красных (расхождение packLanguage/studyTarget/uk). GREEN: 8B 5/5. Регрессия: 6F 27/27, 6G 25/25, 7A 30/30, 7C 15/15, 7D+7E 21/21, repair1 25/25; functions card_unset 18/18, library_titles 31/31. Типы своих файлов — чисто.

**Мутации 9/9 пойманы:** studyTarget, packLanguage по умолчанию, битый язык, uk из ru, засев без нормализации, сравнение без нормализации, нормализация своих, нормализация tombstone, unseen из нормализованного зеркала.

**Остаток (TEMP).** Точечные правки текста сохранённых карточек из таблицы `SAVED_FLASHCARD_CONTENT_REPAIRS` (несколько фраз, app) модуль V2 не повторяет — такие карточки после гидрации уйдут одной операцией правки (не потеря, разовая запись). Старые карточки в хранилище не-en без packLanguage/studyTarget приложение считает 'en', а нормализация (как и применение гидрации 6G) пишет язык хранилища — это поведение 6G, не новое.
