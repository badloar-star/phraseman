# Тренировка карточек (выбор наборов): панель «Начать» — сплошной фон цвета экрана

Governance-ID: TG-40FC5C87325B
Status: в работе
Owner: сессия «4 · ТЕМЫ 2.0» (цикл координатора, журнал 27)
Related epic/enabler: OWNER_REQUESTS_LEDGER.md строка 27; panel-dock-log-2026-10-13.md

## Outcome

Закреплённая панель с кнопкой «▶ Начать» на экране выбора наборов (`app/flashcards_swipe.tsx`, `selectStartBar`) больше не просвечивает строки списка и не выглядит серой плитой: фон панели — сплошной цвет низа фона экрана (`bgGradient[1]`) без прозрачности, над панелью короткое плавное затухание вместо жёсткого края.

## Scope

In scope: стиль панели в `app/flashcards_swipe.tsx` (только блок `selectStartBar`), запись в INBOX. Out of scope: `PanelDock` (там остаётся временный лог до замера), остальные экраны.

## Architecture

Причина найдена по коду: кадр Сверки — не `PanelDock`, а `selectStartBar` (кнопка с иконкой «play»). Её фон был `glassFill(t.bgSurface, 0.94)`: `bgSurface` = `opaqueControl` (светлее/темнее фона страницы) с прозрачностью 0.94 — отсюда и серая плита с жёстким верхом, и просвет строк (6 %). Замер токенов: светлый Графит `bg #EDF0F4`, `bgBottom #EAEDF1`, `opaqueControl #DFE3E8`.

## Security and privacy

Не применимо.

## Technical debt

Временный лог `[DOCK]` в `PanelDock` остаётся до подтверждения, что `PanelDock` сам не просвечивает.

## Verification

Синтаксис, контрактные тесты экрана выбора, кадр Сверки (светлая «Спокойно»).

## Rollback

`git revert` коммита.
