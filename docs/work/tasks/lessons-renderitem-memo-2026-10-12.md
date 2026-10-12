# Task packet: стабильный renderItem списка Уроков и мемоизированная ячейка (L1)

Governance-ID: TG-7E727D95E702
Status: In progress
Owner: сессия «2 · ДИЗАЙН» по заданию координатора (12.10, вечер)
Related epic/enabler: docs/phraseman-2.0/R1_PERF_FIRST_FRAME.md (L1)

## Outcome

renderItem списка Уроков (`Animated.FlatList` в app/(tabs)/lessons.tsx) не пересоздаётся на каждый коммит корня; ячейка урока — memo со сравнением по данным; сторож «ячейка не перерисовывается при коммите корня без изменения её данных».

## Scope

In scope: app/(tabs)/lessons.tsx (renderItem, ячейки), тест-сторож, документ R1_PERF_FIRST_FRAME.
Out of scope: Главная (H2) и хаб Карточек (C2) — после цифр Сверки.

## Architecture

Архитектура не меняется: useCallback для renderItem через ref на актуальные данные, memo с кастомным сравнением для ячейки.

## Security and privacy

Данных не касается.

## Technical debt

Pay now: каждый коммит корня перерисовывает все видимые ячейки.

## Verification

Тест-сторож, perf_freeze/layout_stability, профильные тесты Уроков, срез типов.

## Rollback

Откат коммита.
