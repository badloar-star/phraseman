# Выжигание замечаний: цвет/кромка/свечение/просвет — разбор доли Тем

Governance-ID: TG-0185BC1FF86C
Status: в работе
Owner: сессия «4 · ТЕМЫ 2.0» (приказ владельца через координатора; список `docs/phraseman-2.0/DIFF_BURNDOWN.md`)
Related epic/enabler: panel-sheet-mockup-match-2026-10-13.md

## Outcome

По каждой строке доли Тем (mistakes-panel, coins, system, results, overlays, packs-simple) — статус: исправлено кодом (хэш), «не дефект» (зависит от положения ползунка темы), «нужен кадр» (проверка на эмуляторе), «данные». Безопасные правки токенов — коммитами; в списке для Сверки — что переснять.

## Scope

In scope: разбор и точечные правки цвета/кромки/тени в `components/ErrorBoundary.tsx` (экран-заглушка «Что-то пошло не так»). Out of scope: вёрстка и структура экранов (Дизайн), данные.

## Architecture

Правки — только токены `GRAPHITE` (`bevelHi`, `hairlineSoft`, `dropShadow`), без литералов цвета.

## Security and privacy

Не применимо.

## Technical debt

Часть замечаний требует визуальной проверки на эмуляторе; без кадра правки «по описанию» не делаю.

## Verification

Синтаксис, ратчет цветов, контрактные тесты заглушки.

## Rollback

`git revert` коммита.
