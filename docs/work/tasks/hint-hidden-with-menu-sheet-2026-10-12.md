# Task packet: подсказка «Зажми карточку…» скрыта и при открытой шторке меню «⋯» (cards-032)

Governance-ID: TG-3671F2C72FA7
Status: In progress
Owner: сессия «2 · ДИЗАЙН» по сообщению Макетов (12.10)
Related epic/enabler: app/flashcards_collection.tsx, app/flashcards/CollectionGalleryView.tsx

## Outcome

Подсказка скрыта при любой открытой шторке/окне экрана «Сохранённые» (меню «⋯», выбор, подтверждения), а не только при шторке долгого нажатия и плашке «Удалено».

## Scope

In scope: условие показа подсказки в контейнере. Out of scope: вид шторок.

## Architecture

No architecture change.

## Security and privacy

Данных не касается.

## Technical debt

Pay now: подсказка поверх шторки на свежем кадре cards-032.

## Verification

Сторож на условие, срез типов.

## Rollback

Откат коммита.
