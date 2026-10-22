# Task packet: friendsGetProfiles отдаёт isPlus и plusUntilMs (кольцо Plus у друзей)

Governance-ID: TG-9D2D0074FBDF
Status: Done (код и тест), НЕ выложено. Группа В: функции → дозапись → сборка
Owner: Ядро (сессия 1), поручение координатора 22.10

## Outcome

В каждой записи ответа batch-callable `friendsGetProfiles` есть `isPlus` и `plusUntilMs`. Клиент кольца (4 · ТЕМЫ, 49677b5c4, `FriendProfileBatchRecord`, поля опциональны) рисует кольцо Plus у друзей по тому же правилу, что в сообществе: `isPlusProfile` — isPlus === true И (plusUntilMs === 0 ИЛИ срок + 72 ч > сейчас).

## Scope

- `functions/src/friends_profiles.ts`: два поля в `FriendPublicProfile` и в `buildFriendProfile`, плюс помощник `plusUntilMsOrNull`.
- `functions/src/friends_profiles.test.ts`: кейс с пятью друзьями — бессрочный, со сроком, без Plus, старый профиль без полей, мусор в полях. Отдельно проверено, что новых чтений нет.

## Architecture

- Поля берутся ТОЛЬКО из `public_profiles/{uid}`. Их пишет проекция и вебхук RevenueCat (cbdecef56, `isRealPlusActive`, без вводного доступа).
- leaderboard этих полей не несёт: при откате на него остаётся null, и кольца нет. На isPremium НЕ откатываемся — там бывает устаревшее true от вводного доступа.
- Новых чтений Firestore нет: `public_profiles` уже читается. Серверный кэш на 60 с прежний.

## Security and privacy

`isPlus` и срок уже лежат в публичном профиле (cbdecef56), а `isPremium`, `isVip` и `isLifetime` друзьям отдавались и раньше. Отдаются только взаимным друзьям: проверка `authorizedProfileUids` не тронута. Новых персональных данных нет, правка политики не нужна.

## Technical debt

Пока не прошла дозапись (`backfill_public_profile_is_plus.ts --apply`, 237 профилей), у старых профилей null и кольца нет. Поэтому порядок группы В: функции → дозапись → сборка.

## Verification

`friends_profiles.test.ts` + `public_coin_rank_projection.test.ts` — 20/20, точечно через слот.

## Rollback

`git revert`. Старый клиент поля игнорирует, новый без полей рисует «кольца нет».
