# Task packet: сторож непереведённого текста в JSX (текстовые узлы и строковые пропсы)

Governance-ID: TG-752BED1EFDC5
Status: In progress
Owner: сессия «3 · Макеты» по поручению координатора
Related epic/enabler: scan_untranslated_ui (база 0, 3321a8ce1) — дыра: JSX-текст и пропсы без кавычек-литералов он не видит

## Outcome

Новый сторож scripts/scan_untranslated_jsx.mjs (разбор TypeScript): текстовые узлы JSX и строковые пропсы интерфейса (title, label, placeholder, accessibilityLabel, accessibilityHint и др.) с кириллицей или английскими словами в продовых файлах app/ и components/ — нарушение, если не обёрнуты в перевод. Исключения: dev-файлы и файлы-исключения основного сторожа, строки с `i18n-ok: <причина>`, бренды. Храповик с базой config/untranslated-jsx-baseline.json (только вниз). Найденные реальные непереводы — перевод на 9 языков, затем база.

## Scope

In scope: scripts/scan_untranslated_jsx.mjs, config/untranslated-jsx-baseline.json, файлы с реальными находками (только строки интерфейса → triLang).

Out of scope: логика экранов; подключение сторожа в pre-commit — по слову координатора.

## Architecture

Отдельный скрипт, не трогает основной сторож; список исключений читает из scan_untranslated_ui.mjs (CONTENT_FILES) текстом, чтобы правила не разошлись.

## Security and privacy

Данных пользователей нет.

## Technical debt

Contain: находки, которые нельзя перевести сейчас (чужие грязные файлы) — в базу с пометкой, координатору.

## Verification

Прогон сторожа (число находок по классам); синтаксис изменённых файлов — разбор TypeScript по одному файлу; повторный прогон обоих сторожей.

## Rollback

Откат коммитов.
