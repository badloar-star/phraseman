# Task packet: гонка «Добавил набор → написал комментарий → permission-denied»

Governance-ID: TG-DA899B96B939
Status: In progress
Owner: Claude session (badloar@gmail.com)
Related epic/enabler: docs/work/tasks/2026-09-17_pack_comments_full_redesign.md

## Outcome

По логам ([PACK-COMMENTS-COMPOSER], [PACK-COMMENTS], [AUTH-LOOP]) точно
подтверждена причина: `addCommunityPackToLibrary` пишет владение набором
ЛОКАЛЬНО мгновенно, а серверную запись `pack_adds/{uid}` шлёт в фоне через
`void bumpAddedCountOnce(...)` — никто её не ждёт
(`communityPackActions.ts`). Композер комментариев открывается сразу
(`canWrite=true` от `ownedLocally`), но если человек отправляет ПЕРВЫЙ
комментарий раньше, чем `pack_adds` реально долетел до Firestore,
`firestore.rules` честно отклоняет запись (`packAddedByMe(packId)` не находит
документ) — `permission-denied`, хотя UI уже показывал разрешённое поле ввода.

## Scope

In scope:
- `app/community_packs/PackCommentsSheet.tsx`: перед вызовом
  `publishPackComment`, если `canWrite` был поднят только `ownedLocally` (сервер
  ещё не подтвердил `addedByMe` этим сеансом шторки) — дождаться
  `registerCommunityPackAddRemote(packId, uid)` (идемпотентна, транзакция
  `applyPackAdd`), и только затем публиковать комментарий. UI остаётся
  Optimistic: строка комментария появляется в ленте немедленно (как сейчас),
  ожидание регистрации не блокирует отрисовку — только фактическую сетевую
  отправку текста, которая и так асинхронна.

Out of scope:
- Изменение самого `communityPackActions.ts`/`bumpAddedCountOnce` — это точка
  общего быстрого пути добавления набора в библиотеку, трогать его ради одного
  边-кейса с комментарием нецелесообразно и рискованно для остальных экранов.
- Визуальный редизайн шторки — отдельная задача (full_redesign).

## Architecture

Не меняется структурно. Используется уже существующая идемпотентная функция
`registerCommunityPackAddRemote` (packSocialFirestore.ts) — повторный вызов
безопасен (транзакция создаёт `pack_adds/{uid}` только при отсутствии).

## Security and privacy

Не затрагивается — то же самое серверное действие, которое уже штатно
выполняется при добавлении набора, просто теперь синхронно дожидается там, где
нужна гарантия перед записью комментария.

## Technical debt

Нет нового долга.

## Verification

- Точечный tsc на изменённый файл.
- Логи `[PACK-COMMENTS-COMPOSER]`: новая строка перед отправкой — «жду
  подтверждение pack_adds перед первым комментарием».
- Ручная проверка (владелец): добавить набор → сразу написать и отправить
  комментарий → комментарий публикуется без permission-denied.

## Rollback

Точечная правка одного файла, откатывается независимо через git revert.
