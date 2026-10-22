# Task packet: сервер «Урок вместе» (friendsLessonInvite / friendsLessonTogetherClaim) — Ядро

Governance-ID: TG-F792B1169C10
Status: Planned. Начало — после выкладки В, удалений и пакета 27. Клиент: 8 · МОМЕНТЫ (276eef4d9), флаг выключен.
Owner: Ядро (сессия 1). Решение владельца 21.10: сервер — у Ядра, «вместе» +2 каждому (координатор).

## Outcome

Пользователь после занятия зовёт до 3 друзей на «это же занятие». Друг проходит его сегодня до своей полуночи → оба получают +2 монеты и уведомление.

## Scope — контракт от 8 · МОМЕНТЫ (сводный, 22.10)

1. `friendsLessonInvite` (callable, us-central1):
   - запрос: `friendUids[1–3]`, `lessonKey` (только журнал), `lessonOrdinal` и `sessionOrdinal` (int 1–999), `requestId 'flt_…'`, `minutes?` (0–180), `stars?` (0–999);
   - ответ: `{ok, inviteIds:{uid:id}, expiresAtMs:{uid:ms}}`;
   - ошибки: `disabled`, `…limit` (3 на занятие в день), `not_friends`.
2. Уведомление `friend_lesson_invite`:
   - nav: `kind 'friend_event'`, `actorStableUid`, `eventId`, `action 'lesson_invite'`, `inviteId`, `lessonOrdinal`, `sessionOrdinal`, `lessonKey`, `expiresAtMs`, `minutes?`, `stars?`;
   - пуш: «{Имя} зовёт на занятие» / «Урок N · Занятие M…» — без uid и языка.
3. `friendsLessonTogetherClaim {inviteId, mutationId}`:
   - ответ: `{ok, coins, inviterName}`;
   - ошибки: `expired`, `not_completed`, `already_claimed`, `not_invited`.
4. «Не успел до полуночи» — только на телефоне пригласившего, сервер не участвует.

## Поправки Ядра к контракту (безопасность)

- `stableId` и `senderDisplayName` из запроса НЕ используются. Личность — из auth (auth_links → stableId), имя — из public_profiles отправителя. Клиент может слать их, сервер игнорирует.
- `minutes` и `stars` — только обрезка по границам; вне границ поле не кладём.
- Claim:
  - номера урока и занятия берутся из записи `users/{друг}/v2_required_session_completion_inbox`: `requiredSessionOrdinal`, урок — из `episodeId` / `canonicalSessionId`, формат проверить на id ОБОИХ языков;
  - `studyTarget` у пары может отличаться;
  - `awardedAtMs` ∈ [создание приглашения, полночь друга].
  - Ключ inbox — хеш (progressAccountScopeHash + mutationId): нужен экспорт помощника из `learning_v2/required_session_completion_callable.ts` — зона Learning V2, согласовать через координатора.
- Монеты:
  - stars_ledger, новая причина `friends_lesson_together`, класс **grant** — earn двигал бы starsWeekEarned → место в Пике;
  - **защита от фарма** (условие владельца 21.10: «+2 не чаще 1 раза в день на пару, только сервер», уточнение 8 · МОМЕНТЫ):
    - ключ награды — пара + день, а не приглашение;
    - pairKey — оба stableUid по возрастанию;
    - dayKey — местный день друга, прошедшего занятие, на момент awardedAtMs (friends_push_v1.tz);
    - повтор пары в тот же день → `{ok:false, reason:'already_claimed'}`, монет и уведомления нет;
    - приглашения и пуши при этом не ограничиваются (кроме 3/занятие/день против спама);
  - opId: `OP_ID_RE = /^[a-z0-9_]{1,32}:[A-Za-z0-9_.-]{1,96}$/` — ОДНО двоеточие, хвост ≤96. Поэтому `lesson_together:<sha256(pairKey|dayKey|uid) hex[0..48]>`; исходные pairKey, dayKey и uid — в полях операции и в журнале;
  - тест: A→B и B→A в один день → +2 один раз каждому; на следующий день снова можно;
  - D-строка и ECONOMY.md — у координатора.
- Полночь друга — `users/{друг}.progress.friends_push_v1.tz`, иначе `config.nudgeDefaultTzOffsetMinutes`.
- Предел 3/день и расписка по requestId — один документ в транзакции. Повтор → тот же ответ без второго пуша.

## Architecture

Два callable в `functions/src/friends_lesson_together.ts`.
- Invite: проверка дружбы (как в friendsNudge), транзакция «расписка + счётчик + приглашения», после неё пуши; тихие часы — как у nudge.
- Claim: транзакция — приглашение + inbox-запись друга + prepare/commitStarOperations на двоих + уведомление пригласившему.

## Security and privacy

Новых категорий данных нет: уведомления между взаимными друзьями уже описаны в политике (проверить при реализации). В пуше — имя и номера, без uid и языка. Подделка minutes/stars ничего не начисляет.

## Technical debt

Зависимость от формата идентификаторов Learning V2 — сторож-тест на разбор номера урока.

## Verification

Тесты:
- invite: лимит, повтор requestId, не друзья, выключатель;
- claim: чужое приглашение, истекло, не засчитано, повтор, разные языки, класс grant.

Выкладка — по «да» владельца.

## Rollback

Флаг на клиенте выключен. Функции удаляются по имени, начисления идемпотентны и в журнале.
