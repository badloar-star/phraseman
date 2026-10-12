# Task packet: cards-009 — блок «Пока пусто» по центру экрана целиком (с кнопкой)

Governance-ID: TG-F30527852CD9
Status: In progress
Owner: сессия «2 · ДИЗАЙН» по заданию координатора (12.10)
Related epic/enabler: components/cards-grid/CardsKit.tsx (KitEmpty), app/flashcards/SavedCollectionStates.tsx

## Outcome

В журнале [CARDS-EMPTY] — высота и положение ВСЕГО блока (плитка · заголовок · подпись · кнопка); верх блока считается по измеренной высоте, а не по константе, центр блока (с кнопкой) — по центру экрана как в образце (translateY −46 %).

## Scope

In scope: KitEmpty. Out of scope: тексты.

## Architecture

No architecture change: onLayout блока и состояние высоты.

## Security and privacy

Данных не касается.

## Technical debt

Pay now: расхождение ≈60 dp с образцом на пустом экране.

## Verification

Тест формулы и журнала, срез типов, пересъёмка cards-009.

## Rollback

Откат коммита.
