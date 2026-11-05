# Аудит: чистит ли удаление аккаунта данные Сообщества (pack_likes / pack_adds / pack_comments / contest_votes)

Governance-ID: TG-5381A8631F51
Governance-ID: TG-778913AEA999
Status: Аудит готов; правка НЕ внесена (рискованная — порядок выкладки), описание для утреннего отчёта
Owner: «5 · ВХОД»

## Outcome

Ответ на вопрос координатора 05.11 (Privacy, дельта Сайта): каскадно ли чистятся данные Сообщества с uid при удалении аккаунта.

## Scope

Только чтение: `functions/src/account_delete.ts`, `firestore.rules` (community_packs/*), `firestore.indexes.json`, `tests/account_delete_collection_group_indexes_contract.test.ts`.

## Architecture

Структура: `community_packs/{packId}/pack_likes/{stableId}`, `.../pack_adds/{stableId}` (поля userId, packId, createdAt), `.../pack_comments/{id}` (поле authorId, authorName, text), `.../contest_votes/{monthId_userId}` (поле userId).

## Security and privacy

Эти документы содержат стабильный uid пользователя (и имя в комментариях).

## Technical debt

См. «Результат».

## Verification

grep по `account_delete.ts`: подколлекции набора в списках удаления не упомянуты.

## Rollback

Не применимо (правка не вносилась).

## Результат

- ✅ **Свои наборы пользователя** (`community_packs` с `authorStableId` = uid, `account_delete.ts:197`) удаляются дерево-целиком (`recursiveDelete`, `account_delete.ts:738`): вместе с ними уходят все `pack_likes`, `pack_adds`, `pack_comments`, `contest_votes` ПОД этими наборами (в том числе чужие лайки и комментарии — набор исчезает).
- 🔴 **Лайки, добавления, комментарии и голоса конкурса пользователя ПОД ЧУЖИМИ наборами НЕ чистятся.** В списках `FIELD_QUERY_SPECS` / collection-group (`account_delete.ts:113–320`) нет `pack_likes`, `pack_adds`, `pack_comments`, `contest_votes`. После удаления аккаунта в чужих наборах остаются: `pack_likes/{uid}` и `pack_adds/{uid}` (stable uid + время), `pack_comments` с `authorId` (uid) и `authorName` (имя, видно всем вошедшим), `contest_votes` с `userId`.
- Что добавить (collection-group, `values: 'stable'`): `pack_likes.userId`, `pack_adds.userId`, `pack_comments.authorId`, `contest_votes.userId` в массив collection-group-спек (`account_delete.ts` рядом со строками 294–320) И по одному override с `queryScope: COLLECTION_GROUP` на поле в `firestore.indexes.json` (как у `reactions.userId`, строка ~1635). Контракт-тест `account_delete_collection_group_indexes_contract` требует оба.
- Счётчики `likesCount`/`addedCount` в наборе при удалении документа лайка не уменьшатся (удаление правилами запрещено клиенту, функция админская): либо принять завышение на 1 до пересчёта, либо отдельный декремент в той же функции — решение владельца.
- **Почему НЕ внесено ночью:** порядок выкладки обязателен — сначала индексы (`firebase deploy --only firestore:indexes`, строятся минуты), потом функция удаления; если функция уйдёт раньше индексов, запрос по полю в collection group упадёт (FAILED_PRECONDITION) и может сорвать удаление аккаунтов целиком. Функцию удаления деплоит Ядро по списку.
- **Для Ядра:** имя функции — экспорт удаления аккаунта из `functions/src/account_delete.ts` (в `--only`, если её нет в списке); индексы — отдельным шагом до неё.
- **Политика:** до исправления формулировка «удаление аккаунта удаляет ваши лайки и добавления» (Правка 2 дельты) НЕВЕРНА для чужих наборов — писать «удаляет ваш аккаунт и ваши наборы; отметки на чужих наборах удаляются при следующей очистке» либо исправить код до релиза.

## Правка внесена (решение координатора 05.11 00:18) — код+тест, функция НЕ выкладывается ночью

- `functions/src/account_delete.ts`: 4 collection-group-спеки (`pack_likes.userId`, `pack_adds.userId`, `pack_comments.authorId`, `contest_votes.userId`, `values: 'stable'`).
- `firestore.indexes.json`: 4 override'а (COLLECTION ASC/DESC/CONTAINS сохранены + COLLECTION_GROUP ASC).
- Тесты: `tests/account_delete_community_marks_2026_11_05.test.ts`, контракт `account_delete_collection_group_indexes_contract` (требует индекс на каждую спеку).
- Счётчики `likesCount`/`addedCount` не декрементируем (принято: завышение на 1, в KNOWN_ISSUES).

## ПОРЯДОК ВЫКЛАДКИ (для Ядра)

1. **Индексы** (ночное окно 02:00, отдельной строкой ПОСЛЕ rules): `firebase deploy --only firestore:indexes --project <боевой>`. Аддитивно: добавляются 4 индекса группы коллекций, существующие не меняются. Построение — минуты.
2. **Проверка READY**: `firebase firestore:indexes --project <боевой>` — для `pack_likes.userId`, `pack_adds.userId`, `pack_comments.authorId`, `contest_votes.userId` с `queryScope: COLLECTION_GROUP` статус `READY`; либо Консоль → Firestore → Индексы → Исключения/Группа коллекций → «Готов».
3. **Только после READY — функция удаления** (утром): `firebase deploy --only functions:<имя экспортируемой функции удаления из functions/src/account_delete.ts>` (то, что сейчас в списке `--only` для удаления аккаунта; отдельную НОВУЮ функцию не добавляем).
4. **Откат**: функция — вернуть предыдущую версию (git revert коммита + повторный `--only functions:<имя>`); индексы откатывать НЕ нужно (безвредны). Если функция выкачена раньше READY и удаления падают с `FAILED_PRECONDITION` на этапе `collection_group_matches` — немедленно откат функции, дождаться READY, выкатить снова.
5. **Проверка после выкладки**: удалить тестовый аккаунт, поставивший лайк/комментарий под чужим набором на эмуляторе/стейджинге; `community_packs/<id>/pack_likes/<uid>` и комментарий исчезли.
