# Task packet: комментарии `//` внутри JSX как текстовые узлы в View (риск падения) — исправление; сторож JSX-текста

Governance-ID: TG-529BC0A61882
Status: In progress
Owner: сессия «3 · Макеты» по поручению координатора
Related epic/enabler: 2026-10-13-jsx-untranslated-guard.md

## Outcome

1. Три места, где комментарий `// …` стоит прямо среди детей JSX (React рендерит его как текст внутри View — «Text strings must be rendered within a <Text> component»): app/flashcards_speaking_session.tsx (панель «Верно» в «Устно»), components/cards-grid/CardsKit.tsx (KitCheck — круг выбора), components/NotificationPermissionModalHybrid.tsx (окно разрешения уведомлений). Комментарий переносится в `{/* … */}`, смысл и разметка без изменений.
2. Сторож scan_untranslated_jsx.mjs ловит и этот класс отдельно (текст, начинающийся с `//` среди детей JSX).

## Scope

In scope: три файла выше (только перенос комментария), scripts/scan_untranslated_jsx.mjs.

Out of scope: прочая логика экранов.

## Architecture

No architecture change.

## Security and privacy

Данных пользователей нет.

## Technical debt

Contain: класс ошибки закрывается сторожем scan_untranslated_jsx (проверка «комментарий-текст» в JSX); владельцам зон — к сведению.

## Verification

Разбор TypeScript по файлу: после правки в этих местах нет JsxText; сторож JSX — 0 находок класса «комментарий-текст».

## Rollback

Откат коммита.
