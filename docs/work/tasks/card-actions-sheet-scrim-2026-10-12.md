# Task packet: шторка действий карточки («Удалить») — затемнение закрывает весь экран, включая шапку (cards-034)

Governance-ID: TG-D797CFCFC5B0
Status: In progress
Owner: сессия «2 · ДИЗАЙН» по заданию координатора (12.10)
Related epic/enabler: app/flashcards/CollectionGalleryView.tsx, app/flashcards_collection.tsx, components/mistakes-panel/PanelSheet.tsx

## Outcome

Затемнение за шторкой действий карточки покрывает весь экран (шапка «‹ поиск + ⋮» тоже), как в образце.

## Scope

In scope: место рисования этой шторки (корень экрана вместо области под шапкой). Out of scope: вид самой шторки.

## Architecture

No architecture change: состояние выбранной карточки поднимается в контейнер, шторка рисуется на его корне как соседние шторки (меню «⋯»).

## Security and privacy

Данных не касается.

## Technical debt

Pay now: шапка остаётся яркой при затемнении.

## Verification

Сторож, срез типов, пересъёмка cards-034.

## Rollback

Откат коммита.
