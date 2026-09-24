# Task packet: удалить бонус входа, недельные/comeback-бонусы, полёт рун

Governance-ID: TG-A6AC173C92E8
Governance-ID: TG-BBDFD166EF4A
Governance-ID: TG-FDC5FB60961D
Status: In progress
Owner: Claude Sonnet 5 (PhraseMan 2.0 исполнитель)
Related epic/enabler: E05 (PM-049, PM-050, PM-051, PM-052)

## Outcome

Первый вход и повседневное использование приложения больше не прерываются
праздничными модалками/сундуками (бонус входа, «Сундук недели», «День
возвращения», «Идеальная неделя», «бонус дня активирован»). Пользователь видит
только сам продукт. Уже начисленные деньги/спины не отнимаются; welcome-подарок
(+100 жемчужин, +300 рун) продолжает начисляться, но молча, без модалки.

## Scope

In scope:
- `app/_layout.tsx` — снять монтирование `OnboardingWelcomeHost`,
  `MysteryMondayHost`, `ComebackBoonHost`, `PerfectWeekHost`, `BoonActivatedHost`;
  заменить триггер welcome-подарка на прямой молчаливый вызов
  `ensureWelcomeGiftGranted()`.
- `components/OnboardingWelcomeHost.tsx`, `components/WelcomeGiftModal.tsx`,
  `components/BoonActivatedHost.tsx`, `components/BoonActivatedSheet.tsx`,
  `components/ComebackBoonHost.tsx`, `components/PerfectWeekHost.tsx`,
  `components/MysteryMondayHost.tsx`, `components/TodaysBoonStrip.tsx`,
  `components/WeeklyBoonDetailModal.tsx` — удаление (только если не используются
  больше нигде — проверено grep).
- `components/CleanOnboarding.tsx` — снять вызов `markOnboardingWelcomePending`
  и связанный рубильник `welcomeSheetEnabled` (больше не на что влиять — хоста нет).
- `app/onboarding_welcome_state.ts` — удаление (был только источником pending-
  флага для удалённого хоста).
- `app/boons/boon_engine.ts` — единственный источник истины `getTodaysBoons()`
  начинает всегда возвращать `primary: null, modifiers: []` (модификаторы
  double_xp/early_bird/perfect_week/energy_free_window выключены разом), чтобы
  остановить НОВОЕ начисление бонусов дня/недели без переписывания 10+ точек
  интеграции (xp_manager, energy_system, feature_gates) в рамках этой задачи.
- `app/boons/boon_bootstrap.ts` вызывается из `app/(tabs)/home.tsx` (файл вне
  зоны правок этой сессии — см. секцию ниже) — эффект стал no-op сам по себе,
  т.к. `getTodaysBoons().primary` теперь всегда null.
- Тесты, зависящие от удалённых модулей/хостов — актуализация.

Out of scope:
- `app/(tabs)/home.tsx`, `app/(tabs)/_layout.tsx` — не редактируются (правило
  сессии); что нужно снять там — описано в отчёте для интерфейс-сессии.
- `app/local_level_spins.ts`, `level_gift_system.ts`, `level_gifts_inventory.tsx`,
  `daily_journey_*`, `gifts_to_coins_*` — работа другой параллельной сессии,
  не трогается.
- Серверные функции (`functions/src/welcome_gift.ts`, `welcomeGiftClaim`) — не
  меняются (уже начисленные деньги/сервер не трогаем без явного решения).
- Деньги/жемчужины welcome-подарка — НЕ удаляются (D32: money-конфликт с более
  ранним поручением «не трогай подарок 300 рун и 100 жемчугов» зафиксирован в
  отчёте, решение оставлено владельцу; здесь снимается только модалка/прерывание).

## Architecture

Текущая граница: показ бонуса и его денежный эффект были частично связаны через
`getTodaysBoons()` (единый резолвер) и частично независимы (welcome_gift.ts
всегда денежно-авторитетен, отвязан от модалки уже с инцидента 26.08).

Новая граница: `getTodaysBoons()` становится статическим "выключено" (primary
null, modifiers []) — одна точка правды гасит все read/write эффекты бонусов
дня/недели без изменения каждого потребителя. UI-хосты премиальных модалок
удаляются полностью (не просто `enabled=false`) — соответствует правилу BIBLE
"простого enabled=false недостаточно" для самих модалок и их queue/host кода;
резолвер бонусов — исключение, обоснованное большим блокирующим радиусом
переписывания xp_manager/energy_system в рамках одной сессии S1.

## Security and privacy

Не затронуто: не добавляется сбор новых данных, разрешений, сторонних сервисов.
Welcome-подарок остаётся авторизованным callable (welcomeGiftClaim), логика
идемпотентности не меняется.

## Technical debt

- Contain: `boon_effects_energy.ts`/`boon_effects_xp.ts`/`boon_feature_grants.ts`
  и call sites в `xp_manager.ts`/`energy_system.ts`/`feature_gates.ts` не
  вычищены построчно — они молча не сработают (primary/modifiers всегда пусты),
  но мёртвый код остаётся. Экономика: 0 доп. Firestore-операций, 0 доп. рантайм-
  стоимости (проверки те же чистые функции, просто всегда возвращают "выключено").
  Владелец/следующая сессия: физическое удаление плюс тестов — отдельная
  задача после подтверждения, что owner согласен с отключением через единый
  флаг, а не поштучным вычищением интеграций.
- Contain: серверная функция `welcomeGiftClaim` остаётся задеплоенной (по
  условиям задачи функции не трогаем) — расход не растёт (тот же 1 вызов на
  аккаунт за жизнь, что и раньше), эффект PM-049 достигается на клиенте.

## Verification

- `npm run test:one -- tests/<файл>` по точечным тестам boon/welcome_gift/
  onboarding-контрактов (список в отчёте), под светофором.
- `npm run typecheck` один раз в конце, под светофором.
- `git grep` на HEAD по именам удалённых модулей (app/components) — пусто.

## Rollback

Откат — `git revert` коммитов этой задачи (после релиза) вернёт хосты, модалки и
резолвер `getTodaysBoons()` к прежнему поведению. Деньги не мигрировались и не
удалялись, поэтому откат не создаёт долгов и не бьёт по балансам.
