# Task packet: холодный старт — отметка «Главная интерактивна» и итоговая строка [COLD-START]

Governance-ID: TG-0AE5583EFBE9
Governance-ID: TG-D37C3466CF1B
Status: В работе — окно 13:00, затем 3 холодных старта у Сверки
Owner: 5 · АВТОРИЗАЦИЯ

## Outcome

Координатор 15.10: холодный старт от запуска до интерактивной Главной — сперва логи, найти 3 самых дорогих этапа и что можно
отложить/сделать фоном; правки ≤20 мин окнами, остальное — список.

Что уже есть (проверено по коду): `[COLD-START]` (app/cold_start_trace.ts) — вход в JS (cold_start_entry_mark, первым в index.js),
`layout.module_imports:done` с entryToImportsMs, шаги phone_state.* и content_migration.*, `[HOME-PAINT] first_frame epochMs`,
`[FIRST-FRAME]` отложенные прогревы, `[BOOT-RESTORE-*]`, `[STARTUP-READS]`, `[COLD-START-IO]`, `[JS-STALL]` (dev, 60 с).
Не хватает: конечной точки «Главная интерактивна» и одной итоговой строки.

## Scope

In scope: новый `app/cold_start_interactive.ts` (только dev): после кадра Главной (тот же контракт globalThis, что
home_paint_marker) тикает каждые 50 мс; «интерактивна» = 500 мс подряд без разрыва > 80 мс (потолок 30 с). Строка:
`[COLD-START] interactive entryToPaintMs=… paintToInteractiveMs=… entryToInteractiveMs=… maxStallAfterPaintMs=… stallsOver200=…`.
Подключение — одна строка импорта в index.js после cold_start_entry_mark. Out of scope: правки самих этапов (по фактам замера).

## Architecture

Без React и без импортов: глобальные `__phrasemanEntryEpochMs` (cold_start_entry_mark) и `__phrasemanHomePaintedAt` /
`__phrasemanHomePaintWaiters` (home_paint_marker). В релизе (`__DEV__ === false`) модуль ничего не делает.

## Security and privacy

Только время; данных нет.

## Technical debt

Временная трасса — убрать вместе с [COLD-START] после выноса тяжёлого с критического пути.

## Verification

Тест модуля (фальшивые часы и таймеры): интерактивность после тишины, учёт разрывов, потолок, выключено вне dev; парс/типы.
Затем 3 холодных старта у Сверки (гость, вошедший) — grep `[COLD-START]|[HOME-PAINT]|[FIRST-FRAME]|[BOOT-|[STARTUP-READS]|[JS-STALL]`.

## Rollback

`git revert` коммита.
