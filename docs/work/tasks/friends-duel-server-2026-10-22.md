# Task packet: сервер «Дуэль на 5 фраз» и «Урок вместе» — Ядро

Governance-ID: TG-294BC388853C
Status: Код без прогонов (тишина на ПК); тесты точечно — после тишины; выкладка — только по «да» владельца. Клиент: 8 · МОМЕНТЫ, за `FRIENDS_TOGETHER_UI_ENABLED=false`.
Owner: Ядро (сессия 1). Контракты: `friends-duel-2026-10-22.md` (дуэль), `lesson-together-server-2026-10-22.md` («Урок вместе»).

## Outcome

Серверные callable по готовым контрактам клиента: `friendsDuelChallenge`, `friendsDuelMove`, `friendsDuelDecline`, `friendsLessonInvite`, `friendsLessonTogetherClaim`. Без сканов коллекций, без слушателей, без плановых функций.

## Scope

- `functions/src/friends_duel_core.ts` — чистые функции: разбор фраз и хода, итог, id пары и дуэли, ленивый срок.
- `functions/src/friends_duel.ts` — три callable дуэли.
- `functions/src/friends_lesson_together.ts` (+ core) — два callable «Урока вместе».
- `functions/src/stars_ledger.ts` — новая причина `friends_lesson_together` (grant, источник friends).
- `functions/src/index.ts` — экспорт пяти функций.
- `firestore.rules` — закрыть `friend_duels` (только сервер; чтение — участникам, если нужно клиенту: по контракту итог приходит в уведомлении → клиенту чтение не нужно, закрываем целиком).
- `functions/src/account_delete.ts` — стирание дуэлей и приглашений удаляемого аккаунта.
- Тесты: core + callable на поддельной базе.
- НЕ в объёме: клиент, выкладка, монеты за дуэль (их нет, ECONOMY.md).

## Architecture

Дуэль:
- `friend_pairs/{a__b}` (уже есть, пара по возрастанию) — замок пары: `duel.seq`, `duel.openDuelId`, `duel.openExpiresAtMs`. «Одна открытая дуэль на пару» без where.
- `friend_duels/{a__b}_{seq}` — 1 документ на дуэль: `uids[2]`, challenger, opponent, phraseIds[5], challengerMove, opponentMove?, status (open/finished/declined/expired), createdAtMs, expiresAtMs, outcome.
- Лимит 3 вызова в день на отправителя — `users/{uid}/friend_duel_days/{dayKey UTC}`; расписки по requestId — `users/{uid}/friend_duel_receipts/{requestId}` (ответ повторяется, без второго хода и пуша).
- Ход друга: одна транзакция — проверка адресата, срока (лениво: просрочено → статус expired в той же транзакции), запись хода, итог, снятие замка пары, уведомление вызвавшему `duel_result`.
- Отказ: та же схема, уведомление `duel_declined`.
- Уведомления — тип `friend_nudge`, `nav.kind 'friend_event'`, `nav.action duel_challenge / duel_result / duel_declined`, `actorStableUid`, уникальный `eventId`.

«Урок вместе»:
- Приглашения у адресата: `users/{друг}/friend_lesson_invites/{inviteId}` — claim читает только свою подколлекцию.
- Лимит 3 на занятие в день + расписка по requestId — один документ `users/{отправитель}/friend_lesson_invite_days/{dayKey}` и `.../friend_lesson_invite_receipts/{requestId}`.
- Награда раз в день на пару: `friend_pairs/{a__b}/lesson_together_days/{dayKey друга}`; opId `lesson_together:<sha256(pairKey|dayKey|uid) 48 hex>`; prepare/commitStarOperations на двоих в одной транзакции.
- Поиск записи о пройденном занятии — через экспорт `inboxDocumentId` из Learning V2 (ждёт разрешения координатора).

## Security and privacy

- Личность — только из auth (`ensureStableLinkForAuth` / `resolveStableUidForAuth`); имя — из `public_profiles`, клиентское — запасное.
- Результаты дуэли — отметки true/false и время между взаимными друзьями; тексты фраз по сети не ходят, только id. Политика: «social feature state» — проверить формулировку перед выкладкой.
- В журналах — метки uid по 6 знаков.

## Technical debt

Точность хода присылает телефон (без монет за победу допустимо — контракт).

## Verification

Тесты core и callable: лимит, повтор requestId, не друзья, выключатель, открытая дуэль, чужой ход, срок, отказ, итог (точность → время → ничья). «Урок вместе»: лимит, повтор, чужое приглашение, истекло, не засчитано, повтор пары в день, разные языки, класс grant.

## Rollback

Функции не выложены; флаг клиента выключен. После выкладки — удаление по имени, начисления идемпотентны и в журнале.

## Решения координатора (22.10)

Governance-ID: TG-14B9E120CDE6

- ECONOMY.md обновлён координатором (0273fc93e): «Урок вместе» (friends_lesson_together, friendsLessonTogetherClaim). Строка в пробе PM-080 — «№43-М, владелец 21.10».
- Стирание приглашений и дуэлей в account_delete.ts — да. Правила: новые коллекции закрыты общим запретом в конце firestore.rules.
- Политика: покрыто явно («in Learn together and duels, that you invited them and the result of a duel between the two of you») — абзац для сайта не нужен.
- Помощник засчитанного занятия — от Learning V2 (`readRequiredSessionCompletionFactV1` под `LessonCompletionReader`); до подключения claim не выкладывать.
- Порядок: тесты и проверка типов functions → коммит без выкладки → Ревизор → индексы и функции только по «да» владельца.
