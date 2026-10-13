# Task packet — ревью «Моментов вовлечения» v2 (№33 координатора)

Governance-ID: TG-16C45A4E1B2C
Governance-ID (постановка): TG-834BA97AA4EB

## Outcome
Короткий список «бери как есть / править / нельзя» по 23 моментам макетов Fable
(docs/design/v2-app/engagement-moments-v2-a/b/c.html) со ссылками на решения журнала и на код,
где лежат ₽ / «7 дней» / «3 дня» / «Шпиль» / «Подняться» / капсула / выдуманные механики.

## Scope
Только документ docs/phraseman-2.0/ENGAGEMENT_V2_REVIEW_2026-10-13.md. Макеты и код не меняются.

## Architecture
Вердикт по каждому моменту сверен с 03_DECISIONS.md (D03, D07, D09, D67, D76, D101, D102, D107, D108,
D112, D115, D117, D124, D145, D147, D158, D162, D167, D170, D171, D173, D177, D182) и с кодом
(lesson_star_scale.ts, energy_contract.ts, spire_*, combo_engine, StreakRiskToastHost, DayRings.tsx).

## Security and privacy
Данных не собирает. Отмечено: share-карточка с фразой пользователя (m17) вне D76 — до внедрения
нужна проверка политики конфиденциальности.

## Technical debt
v1 и v3 галереи не разобраны; D162 в боевом коде не проверен.

## Verification
Выборочная сверка фактов: LESSON_THREE_STARS_PERCENT = 85 (app/lesson_star_scale.ts:22),
ENERGY_PASSIVE_UNIT_MS = 10 мин (app/energy_contract.ts:36), 2 вхождения ₽ в -c.html.

## Rollback
git revert коммита документа.

## Status
Done.
