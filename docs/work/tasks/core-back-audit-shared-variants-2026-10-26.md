# Ядро · аудит «назад»: сканер узнаёт все варианты общей кнопки (Макеты e9d51db21, координатор 26.10)

Governance-ID: TG-9C8B848FBD94
Status: In progress
Owner: 1 · ЯДРО

## Outcome
`scripts/back_button_audit.ts` писал «НЕТ «назад»» там, где общая кнопка есть, но нарисована другим экспортом того же
модуля: `level_exam` (через `ExamHeader` → `SafeTopBackButton`, d739a0bd5), `combined_lesson_pick` (`SafeTopBackButton`
напрямую, 29128ef22). Теперь сканер узнаёт все экспорты `components/v2/ScreenBackButton.tsx`:
- «назад» — `ScreenBackButton`, `SafeTopBackButton`;
- «закрыть» — `ScreenCloseButton`, `SafeTopCloseButton`;
- то же на две ступени через обёртки (`ExamHeader`, шапки).

Отчёт пересобран; число экранов с находками уменьшилось честно — только за счёт распознанных кнопок.

## Scope
In scope: новый `scripts/back_button_audit_detect.mjs` (распознавание), `scripts/back_button_audit.ts`, тест
`tests/back_button_audit_detect.test.mjs`, пересобранный `docs/work/back-button-audit-2026-10-26.md`.
Out of scope: код экранов (сканер только читает).

## Architecture
Распознавание вынесено в чистый модуль: его зовут и сканер, и тест. Имя варианта пишется в колонку «назад»; сводка
считает все общие варианты вместе.

## Security and privacy
Не затрагивает данные.

## Technical debt
Нет новой.

## Verification
Тест: оба экрана из находки Макетов (настоящие исходники) + синтетика на прямой вызов, обёртку и «закрыть»;
пересборка отчёта до/после.

## Rollback
Откат коммита.
