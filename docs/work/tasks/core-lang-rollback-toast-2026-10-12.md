# Task packet: тост при откате языка интерфейса (LangContext.setLang)

Governance-ID: TG-9B0529899F51
Status: In progress
Owner: сессия «1 · Ядро» (координатор 12.10; docs/phraseman-2.0/R1_OPTIMISTIC_UI_REST.md, обзор Дизайна).

## Outcome
`setLang` меняет язык сразу, запись догоняет; если запись не удалась и на диске остался прежний язык — откат
МОЛЧА. Теперь при реальном откате (и только если нет более нового выбора) — тост на 9 языках «Не удалось сохранить
язык — попробуй ещё раз». Лог отката уже был, добавлено поле `toast=shown` и причина.

## Scope
In: `components/LangContext.tsx` (ветка отката), тест `tests/lang_rollback_toast.test.ts`.
Out: запись предпочтений, остальные ветки setLang.

## Architecture
`emitAppEvent('action_toast', LANG_ROLLBACK_TOAST)` внутри ветки `langRef.current === l`; текст — `actionToastTri('error', …)`.
ActionToast покажет его на языке, к которому откатились.

## Security and privacy
Без данных.

## Technical debt
Строки тоста живут в LangContext рядом с откатом; общего словаря тостов настроек нет — при появлении перенести.

## Verification
Тест: запись упала + на диске прежний язык → откат и тост; запись частично прошла → без тоста; более новый выбор →
без тоста. Срез типов.

## Rollback
`git revert`.
