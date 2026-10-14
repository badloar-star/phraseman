# Task packet: красный typecheck в моих файлах после ночных коммитов (useStreakColors, звук Пика)

Governance-ID: TG-51C03BF58F4E
Status: In progress
Owner: сессия «4 · ТЕМЫ 2.0»
Related epic/enabler: поручение координатора 14.10 — Дизайн видит красный typecheck: `use_spire_game.ts:349`, `StreakMilestoneScreen`, `StreakMomentRings` («'colors' possibly null»)

## Outcome

`tsc` по моим файлам даёт 0 ошибок: `useStreakColors()` без аргумента возвращает ненулевые цвета, с аргументом `enabled` — возможно `null`; звук Пика в `use_spire_game.ts` проходит проверку типов.

## Scope

In scope: `components/streak/moments/use_streak_colors.ts` (перегрузки), при необходимости `app/spire/use_spire_game.ts` (тип события звука), прогон `npm run typecheck`.

Out of scope: чужие файлы с ошибками (курс de-curriculum и пр.) — только список владельцу.

## Architecture

Перегрузки TypeScript: `useStreakColors(): StreakColors` и `useStreakColors(enabled: boolean): StreakColors | null` — вызывающие, не передающие флаг, получают строгий тип.

## Security and privacy

Только типы.

## Technical debt

Contain: после правки typecheck по моим файлам чист; остальные ошибки репозитория записаны отдельно.

## Verification

`npm run typecheck` по слоту; фильтр по моим путям: 0 ошибок; затронутые тесты — «N passed».

## Rollback

git revert коммита.
