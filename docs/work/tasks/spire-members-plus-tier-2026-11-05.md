Governance-ID: TG-58125260A0CF

# Task packet: уровень Plus/Ultra в участниках Пика (members.<uid>.plusTier)

## Outcome
Просьба сессии «Вход» (06.11, часть D «Plus/Ultra», слово владельца): в рейтинге Пика кольцо у монеты показывает уровень подписки соседей (Plus — фиолетовое, Ultra — рубиновое). Сейчас в документе группы только `members.<stableUid>.isPremium` (boolean), уровня нет. Добавляем `members.<stableUid>.plusTier` ('plus' | 'ultra' | null) той же записью, что `isPremium`; условие «статус сменился» расширено на смену уровня; 0 новых чтений (users уже прочитан). Права доступа не меняются.

## Scope
- `functions/src/spire_groups.ts`: `spirePlusTierOf`, поле участника при вступлении, обновление при смене (вступление в существующую группу и `spireMemberStepsUpdate`).
- `functions/src/spire_progress.ts`: передать уровень в `spireMemberStepsUpdate`.
- Тесты `functions/src/spire_room_plus_tier.test.ts`.
- Не трогаются: боты-жители Пика (`spire_residents.ts`), права, клиент (читает «Вход»), выкладка функций (по порядку чек-листа: политика → функции → EAS).

## Architecture
Источник — `realPlusTier(progress, now)` из `premium_status.ts` (тот же, что пишет публичный профиль и ответ друзей). Поле пишется только сервером точечным `members.<uid>.plusTier`; старые записи без поля читаются клиентом как plus.

## Security and privacy
Поле публично внутри группы Пика, как `isPremium`: только уровень подписки, без суммы/даты/product id. Политика (3af392b08, §5) уже сообщает, что другим виден уровень плана.

## Technical debt
У существующих участников поле появится при следующем входе в комнату или отчёте о ступенях (смена статуса пишется только при несовпадении).

## Verification
Юнит-тесты: годовая → 'ultra', месячная → 'plus', нет Plus → null; патч пишется только при смене; прежние тесты `spire_room_plus_flag`, `spire_rank_by_coins`, `spire_room_coin_rank`.

## Rollback
`git revert` коммита; поле в уже записанных документах безвредно.
