# Task packet: learn-011 текст замка урока + spire-012 фикстура Стража в превью

Governance-ID: TG-E77336B09B2B
Status: In progress
Owner: Ядро (сессия 1)
Related: docs/phraseman-2.0/CORE_ZONES_DIFF_ROWS_R1_2026-10-13.md § 1 (01542fbe5)

## Outcome

- learn-011: модалка замка урока говорит как образец learn.html (gateLesson): «Чтобы открыть этот урок, пройди урок N на 2★.» (ru) и
  то же по-украински. Остальные 7 языков уже полные — не трогаются.
- spire-012: /dev_spire_preview?state=guard&floor=4 показывает «Этаж 4 → Страж» (этаж 5), а не этаж 2.

## Scope

In scope: app/(tabs)/lessons.tsx (две строки ru/uk), tests/lesson_gate_modal_contract_2026_09_20.test.ts (строка ожидания),
components/spire/spire_preview_fixtures.ts (ветка guard, dev-превью). Out of scope: тост Learning V2 (совпадает со своим образцом).

## Architecture

No architecture change.

## Security and privacy

Не касается данных: текст интерфейса и dev-фикстура (в релизе маршрута превью нет).

## Technical debt

- Тост замка Learning V2 «Пройди урок N, чтобы открыть этот» оставлен как в learning-v2.html — если Макеты сведут к одной формулировке, правка отдельно.

## Verification

Точечный прогон сторожа модалки замка; babel-проверка синтаксиса двух файлов; журнал [DEV-STATE] spire_preview model state=guard floor=5 при floor=4.

## Rollback

Откат коммита.
