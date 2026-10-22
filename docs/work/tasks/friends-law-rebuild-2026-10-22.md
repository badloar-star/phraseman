# Task packet: «Друзья» по закону «телефон решает, сервер хранит» — план пересборки

Governance-ID: TG-E04DBC3F936A
Status: План (22.10, вечер). Код не меняется до ответа координатора: клиентская часть — файлы 8 · МОМЕНТЫ.
Owner: Ядро (сервер, кошелёк); 8 · МОМЕНТЫ (клиент `app/friends_together/*`).
Основание: закон владельца 22.10 (`server-decides-inventory-2026-10-22.md`); кнопка «А1 — строка lesson_together: да».

## Outcome

«Урок вместе» и «Дуэль» работают без серверных решений о том, что получит человек. Сервер только хранит идемпотентно и проверяет целостность (кто пишет, тот ли адресат, форма записи). Помощник засчитывания Learning V2 (168afbc21) НЕ подключается.

## Scope

Сервер и кошелёк: `functions/src/friends_lesson_together*.ts`, `functions/src/friends_duel*.ts`, `functions/src/coin_wallet_policy.ts`, `functions/src/level_spin_star_grant.ts`, `functions/src/stars_ledger.ts`, `functions/src/index.ts`, `functions/src/account_delete.ts` + новый `functions/src/account_delete_friend_duels.ts` (замок «История остаётся, имя скрыто»), зеркала номинала `app/level_spin_star_grants.ts` и `modules/phone-state/domains/economy.ts`, проба `tests/pm080_coin_sources_allowlist.probe.ts`, сторожа замков и `docs/work/OWNER_LOCKS.md`. Клиент «Друзей» (`app/friends_together/*`) — НЕ в объёме, это 8 · МОМЕНТЫ.

## Architecture

### «Урок вместе»
1. Пригласивший → `friendsLessonInvite` (как есть): сервер хранит приглашение у друга `users/{друг}/friend_lesson_invites/{inviteId}`. Лимит «3 в день» снимается с сервера и уходит на телефон.
2. Телефон друга после засчитывания своего занятия (событие `learning_v2_session_credited`, совпало принятое приглашение):
   - сам начисляет себе +2 через очередь кошелька: `enqueueLevelSpinStarGrant`, ключ `lessontogether_<sha(пара|день друга|uid)>`. Ключ одинаковый у A→B и B→A, поэтому раз в день на пару решает детерминированный ключ, а не сервер;
   - отмечает приглашение выполненным: новый `friendsLessonTogetherMark {inviteId, requestId}`. Сервер ставит `status: done, doneAtMs, dayKey` (идемпотентно по inviteId) и шлёт пригласившему уведомление `friend_nudge / lesson_together_done`.
3. Телефон пригласившего (по уведомлению или при входе во «Друзей», одним запросом `where(fromUid==me, status==done, rewardSeenByInviter==false)` с лимитом) сам начисляет себе +2 тем же способом и отмечает `inviterCredited` (идемпотентно).
4. Кошелёк А1: в `coin_wallet_policy.ts` добавляется префикс `lessontogether_[0-9a-f]{40}`, сумма 2, источник friends. Повтор того же ключа — replay. Дневной потолок на сервере — пометка, а не отказ (закон).
5. `friendsLessonTogetherClaim` и `createFriendsLessonTogetherClaimHandler` с `notWiredLessonCompletionReader` удаляются из кода до выкладки (в облако они не выходили).

### «Дуэль»
- `friendsDuelChallenge` / `friendsDuelMove` / `friendsDuelDecline` хранят вызов и ходы по duelId/requestId.
- Итог (точность → время → ничья) считают оба телефона одной общей функцией. Сервер в ответе на ход возвращает оба хода, а не вердикт.
- Отказы остаются только целостные: «нет такой дуэли», «ты не адресат», «ход уже записан» (replay того же requestId — тот же ответ).
- Лимит «3 вызова в день» — на телефоне.
- Монет за дуэль нет (ECONOMY.md).

### Замки владельца (OWNER_LOCKS.md)
- «сервер для сохранения, а не решений…» (кроме А3: ответы курса на сервере) — сторож: серверный код «Друзей» не импортирует `prepareStarOperations/commitStarOperations` и не содержит дневных лимитов-отказов; кошелёк принимает `lessontogether_` без серверного потолка-отказа.
- «анонимизация удалённого игрока в дуэлях» — жду точные слова владельца от координатора, сторож поставлю по ним.

## Security and privacy

Риск закона, принятый владельцем: изменённый телефон может начислить себе +2 сколько угодно раз с разными днями и парами. Смягчение: начисления класса grant не двигают неделю и Пик; аномалии видны в админке. Политика уже покрывает «вы пригласили друга и итог дуэли между вами». Новых данных нет; поле `status/doneAtMs` у приглашения — то же «вы пригласили».

## Technical debt

Общая функция итога дуэли живёт в двух копиях (functions и клиент), пока нет общего пакета. Сторож сверяет обе копии на одном наборе случаев.

## Verification

Тесты core и callable на поддельной базе: отметка «выполнено» (повтор, чужое приглашение, истекло), кошелёк `lessontogether_` (replay, форма), ходы дуэли без вердикта, сторожа замков. Полная проверка типов functions после правки index.ts.

## Исполнение, сервер и кошелёк (координатор 22.10: раскладка подтверждена)

Governance-ID: TG-73C128DB475A

- `coin_wallet_policy.ts`: источник `lesson_together` (префикс `lessontogether_<40 hex>`), только base, gameplay, `stars_2`, сумма 2. Дневной счётчик — только пометка в журнале (`limits_flag`), отказа нет (закон).
- Номинал `stars_2` в трёх зеркалах: `functions/src/level_spin_star_grant.ts`, `app/level_spin_star_grants.ts`, `modules/phone-state/domains/economy.ts`.
- `friends_lesson_together*.ts`: удалить claim (серверная сверка занятия) и добавить `friendsLessonTogetherMark` (хранит «выполнено», шлёт уведомление пригласившему).
- `stars_ledger.ts`: причина `friends_lesson_together` удаляется (не выходила в облако). Проба PM-080 приводится к новому составу: префикс кошелька `lessontogether`; разрешённый вызывающий очереди — `app/friends_together/lesson_together_claim.ts` (клиент Моментов).
- Дуэль: ответ на ход несёт оба хода; вердикт считают телефоны.
- Лимит приглашений и вызовов «3 в день» на сервере пока ОСТАВЛЕН: это защита другого человека от потока пушей (как Б3 `friendsNudge`). Вопрос координатору.
- Замок «сервер хранит, телефон решает»: сторож `functions/src/owner_lock_server_stores_friends.test.ts` + строка в `docs/work/OWNER_LOCKS.md`.

## Rollback

Функции «Друзей» не выложены; флаг клиента `FRIENDS_TOGETHER_UI_ENABLED=false`. Откат — откат коммитов. Выкладка только по «да» владельца после Ревизора, вместе с «Итогом недели друга» (e8f50a9bc).

Governance-ID: TG-BF01655217CE

- Замок владельца 22.10 (кнопка): «Друг удалил аккаунт. Что видно в ваших общих дуэлях?» → «История остаётся, имя скрыто». Удаление аккаунта не стирает общие дуэли, а обезличивает удалённого: результаты остаются у друга, вместо ника и аватара — «Удалённый игрок».

Governance-ID: TG-60DC06F5C63E
Governance-ID: TG-40DB3E521C95

- Ревизор 22.10: строка 40 OWNER_LOCKS «сервер для сохранения, а не решений» → сторож functions/src/owner_lock_server_stores_friends.test.ts; пути обоих сторожей Ядра — в KNOWN_GUARDS tests/owner_locks_registry.test.cjs (только свои хунки).
