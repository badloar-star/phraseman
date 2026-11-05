Governance-ID: TG-9326ED0B6BC6
Governance-ID: TG-9DB26DB64B99

# Task packet: публичное поле plusTier (Plus / Ultra) в public_profiles и friends_profiles

## Outcome
Просьба сессии «Вход» (часть D «Plus/Ultra», слово владельца 06.11, подтверждено координатором): годовая подписка — «Ultra», месячная — «Plus». Для других людей (друзья, Пик, диалоги) нужно публичное поле `plusTier: 'plus' | 'ultra'` рядом с `isPlus/plusUntilMs`. `ultra` — ТОЛЬКО при активной магазинной годовой подписке (`premium_plan` yearly/annual); VIP, подарок, пожизненная, админский грант, конкурсный Plus → `plus`; нет Plus → `plusTier: null` (клиент трактует всё, кроме 'ultra', как plus, поэтому выкладка безопасна в любом порядке). Права доступа НЕ меняются: Ultra = все права Plus.

## Scope
- `functions/src/premium_status.ts`: `realPlusTier(progress, now)`.
- `functions/src/public_profile_plus_sync.ts`: патч профиля после серверного события несёт `plusTier`.
- `functions/src/public_profile_projection.ts`: проекция пишет `plusTier` (общий файл — коммит только своими хунками).
- `functions/src/friends_profiles.ts`: чтение `plusTier` из public_profiles в ответ друзей (0 новых чтений).
- Тесты: годовой → 'ultra', месячный → 'plus', пожизненный → 'plus', нет Plus → null.
- Не трогаются: права доступа, `isPremiumAccessActive`, правила Firestore, клиент.

## Architecture
Одна чистая функция в `premium_status.ts` — источник правды; оба писателя (проекция и серверная синхронизация после вебхука) зовут её. Читатель друзей берёт поле из уже читаемого `public_profiles` документа.

## Security and privacy
Поле публично, как `isPlus`: показывает только уровень подписки (месячная/годовая), без суммы, даты и product id. Политика: вид подписки виден друзьям так же, как факт Plus; отдельного абзаца не требует, но стоит упомянуть в списке публичных полей профиля при ближайшей правке политики.

## Technical debt
У существующих профилей поле появится при следующем событии Plus или запуске приложения (проекция) — до этого у всех Plus. Предупреждено клиентом (`tierFromPublicField`).

## Verification
Юнит-тесты `premium_status_plus_tier.test.ts` и обновлённый `public_profile_plus_sync.test.ts`; проверка типов functions по HEAD — за Ревизором; сухой прогон выкладки перед боевой.

## Rollback
`git revert` коммита; поле в уже записанных профилях безвредно (клиент его игнорирует до своего релиза).
