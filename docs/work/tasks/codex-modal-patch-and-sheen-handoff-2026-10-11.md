# Патч-файл для Codex (окно уведомлений) и передача блика строки каталога

Governance-ID: TG-50FCF2BE8988
Status: в работе
Owner: сессия «4 · ТЕМЫ 2.0» (запрос координатора 23:47)
Related epic/enabler: theme-guards-run-2026-10-11.md

## Outcome

Файл `docs/work/tasks/codex-notification-modal-tokens.patch` (токены вместо двух зашитых цветов), который Codex применяет сам; запись в INBOX о передаче блика строки `CatalogTileGlass` Дизайну.

## Scope

In scope: патч-файл и записи в INBOX. Out of scope: прямая правка `components/NotificationPermissionModalHybrid.tsx` (Codex) и `app/flashcards/FlashcardsCategoryHub.tsx` (Дизайн/«Карточки»); самозапуск ходов по расписанию.

## Architecture

Затемнение окна берёт `glass.scrim`; тень кнопки остаётся чёрной и помечается `theme-exempt` на той же строке (храповик читает пометку только на строке).

## Security and privacy

Не применимо.

## Technical debt

Патч не применён до решения Codex; храповик красный до тех пор.

## Verification

`git apply --check` патча на рабочую копию; после применения храповик (`node --test`) без новых цветов.

## Rollback

Удалить файл патча.
