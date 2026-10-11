# Task packet: §130 — панель итога «Моих ошибок» не обещает невозможный второй режим

Governance-ID: TG-94EA8E61CB15
Status: Done
Owner: Ядро (цепочку собирает сессия «Моих ошибок»); найдено «Дизайном»

## Outcome
После верного ответа панель говорила «ещё один верный день в другом режиме», когда в цепочке был один режим, даже если второй режим для этой ошибки невозможен (bc60bac61 уже снял это требование в правиле). Теперь цепочка несёт `requiredModes` (1 или 2) из того же расчёта, что правило, и панель обещает другой режим только когда он нужен.

## Scope
- modules/mistake-practice/projection.ts: экспорт `requiredModesForMistake(item)` — единственное место расчёта; правило использует его.
- app/mistake_practice_session.tsx: `chain.requiredModes`.
- components/mistake-practice/MistakeVerdictPanel.tsx: тип `requiredModes: 1 | 2`, условие `chain.modes < chain.requiredModes`.
- tests/mistakes_no_false_claims.test.ts: сторож держит новое условие.

## Architecture
Расчёт не дублируется: проекция, сессия и (позже) модель карточки «Дизайна» берут один помощник. Тексты не меняются.

## Security and privacy
Данные не меняются.

## Technical debt
app/mistake_detail_model.ts («Дизайн») считает то же самое своей строкой — может перейти на помощник.

## Verification
Сторож mistakes_no_false_claims, тесты проекции «Моих ошибок», проверка типов по файлам.

## Rollback
Откат коммита.
