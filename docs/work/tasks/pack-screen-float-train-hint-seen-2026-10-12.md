# Task packet: «Свой набор» (cards-section-012) — без плавающей «Тренировать» и подсказки; разовая подсказка в фикстурах

Governance-ID: TG-82347FF7CF77
Status: In progress
Owner: сессия «2 · ДИЗАЙН» по сообщению Макетов (12.10)
Related epic/enabler: app/flashcards_collection.tsx, app/dev_state_cards_demo.ts, app/dev_state_fixtures.ts

## Outcome

1. На экране набора (packSurface) плавающая «Тренировать» не рисуется: у набора своя кнопка «Тренировать» в шапке (в образце cards-v2 №14 поверх сетки ничего нет).
2. Подсказка «Зажми карточку…» не попадает в кадры гостя: фикстуры карточек помечают её увиденной (синхронизируемый ключ — только на одноразовом госте, как остальные), параметр hint=show возвращает её для кадра cards-033.

## Scope

In scope: условие плавающей кнопки, фикстура + параметр hint, ссылка cards-033. Out of scope: поведение подсказки у людей (разовая, как раньше).

## Architecture

No architecture change.

## Security and privacy

Только dev, только анонимный гость (assertWritableAccount); в стор-сборке фикстур нет.

## Technical debt

Pay now: две «Тренировать» на экране набора и подсказка поверх сетки на кадрах.

## Verification

Сторож, срез типов, пересъёмка Сверкой.

## Rollback

Откат коммита.
