# Task packet: сторож коммита «фабрика V2 требует auxiliary, а манифест без него» + срочное предупреждение Codex

Governance-ID: TG-E2AEDA57969C
Status: In progress
Owner: сессия «1 · Ядро» (координатор 11.10: предупреждение Codex первой строкой handoff и отдельным файлом; защита от
случайного коммита; подтвердить, что HEAD открывает занятия)

## Outcome
1. `docs/phraseman-2.0/handoff/CODEX_URGENT_FACTORY_2026-10-11.md` + первая строка `CODEX_LEARNING_V2_PRIORITIES_2026-10-11.md`.
2. `scripts/guard_learning_v2_session_release.mjs` (уже в pre-commit): пункт 5 — если фабрика в коммите требует
   `loadAuxiliary` (`learning_v2_factory_native_auxiliary_missing`), а строк манифеста с `loadAuxiliary` меньше, чем строк
   занятий, — коммит остановлен. Читается то, что уходит в коммит (индекс/HEAD), — чужая незаконченная правка в рабочей
   копии чужие коммиты не валит.
3. Прогон `tests/learning_v2_lesson1_bundle_builds.test.ts` на состоянии HEAD (копия HEAD во временной папке, рабочая
   копия Codex не трогается).

## Scope
In: сторож, его тест, handoff-документы.
Out: сама фабрика и манифест (Codex), хуки (уже вызывают сторож — переустановка не нужна).

## Architecture
Статическая проверка текста двух файлов, без запуска тестов в pre-commit (быстро, без памяти). Тест сторожа — на
временном индексе, как существующий `tests/release_guard_staged_source.test.mjs`.

## Security and privacy
Нет данных пользователей.

## Technical debt
- Pay now: незакоммиченная правка фабрики может сломать все занятия одним коммитом.
- Contain: проверка по числу строк; если Codex переименует ошибку/поле — сторож скажет об этом явно (пункт про «не
  найден признак»), а не промолчит.

## Verification
node-тест сторожа (временный индекс): опасная пара → блок; согласованная пара → проход; HEAD → проход.

## Rollback
`git revert`.
