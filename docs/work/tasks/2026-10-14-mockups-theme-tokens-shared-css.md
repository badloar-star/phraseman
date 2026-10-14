# Task packet — общие css образцов на токены темы (координатор 14.10, (A))

Governance-ID: TG-4875AE7E84B7

## Outcome
Правило владельца «ВСЁ СТРОГО В ТЕКУЩЕЙ ТЕМЕ»: окна, шторки, тосты и их плашки в образцах берут цвета из токенов темы kit.css (:root),
а не из вписанных #hex. Затронуты общие файлы extension.css, overlay.css, overlay-more.css, overlay-runtime.css, kit.css и копии тоста в страницах.

## Scope
Только docs/design/v2-app/*.css и строки стилей тоста в страницах. Лишние элементы (B) не режем — отданы владельцам зон (Авторизация, Дизайн).

## Architecture
Близкие оттенки → существующие токены (--sheet, --tile, --control, --card, --bg, --cta, --text, --sec, --muted, --track); недостающие роли —
новые токены в :root с прежними значениями (--scrim, --btn2, --danger, --danger-ink, --disabled, --disabled-ink). Тёмная тема визуально почти не меняется.

## Security and privacy
Не касается.

## Technical debt
Светлые страницы образцов со своими локальными токенами (--n-*, --w-*) не трогаем.

## Verification
playwright: 0 ошибок страниц, снимки окон overlays / overlays-more / profile / dialogs до и после; аудит кнопок (audit.cjs) без новых нарушений.

## Rollback
git revert коммита.

## Status
In progress.
