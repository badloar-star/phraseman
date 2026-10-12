# Task packet: Карточки — diff-строки со свежим кадром (cards-*, cards-section-*, cards-v2-*)

Governance-ID: TG-B36A2058E2E6
Status: In progress
Owner: сессия «2 · ДИЗАЙН» по заданию координатора ([R1-PAGE] 16:55)
Related epic/enabler: docs/phraseman-2.0/R1_DIFF_ONE_FIX.md, журнал [CARDS-SHEET]

## Outcome

1. Из 91 diff-строки Карточек свежий кадр (evidence_at позже последнего коммита файлов `code` и общих файлов CardsKit/PanelSheet) — разобран; кадр старше кода — в пересъёмку.
2. cards-034 («Удалить» у самого низа шторки, жестовая полоска пересекает слово): шторка действий карточки в «Сохранённых» стоит в слое, смещённом по `rootWindowY` (50 dp), а значение приходило только ПОСЛЕ тапа (замер в эффекте) — на первом кадре слой на 50 dp ниже, анимация въезда стартует с этого положения. Смещение измеряется заранее (onLayout корня).

## Scope

In scope: app/flashcards/CollectionGalleryView.tsx (замер корня при раскладке), тест-сторож.
Out of scope: перекомпоновка шторки, PanelSheet.

## Architecture

No architecture change: замер в onLayout корня вместо замера только при открытии шторки.

## Security and privacy

Данных не касается.

## Technical debt

Pay now: шторка стартует в неверном положении.

## Verification

Тест-сторож по исходнику, срез типов, пересъёмка cards-034 за Сверкой (журнал [CARDS-SHEET] root:layout и scrim).

## Rollback

Откат коммита.
