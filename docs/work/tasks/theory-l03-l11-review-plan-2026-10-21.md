# Task packet: вычитка теории уроков 3–11 на 8 языках (Переводчик → 12 · ТЕОРИЯ)

Governance-ID: TG-590A2F476076
Status: In progress
Owner: сессия «10 · ПЕРЕВОДЧИК»
Related epic/enabler: R07

## Outcome

По каждому уроку 3–11 — файл правок `docs/work/tasks/theory-lNN-review-2026-10-21.md` для 12 · ТЕОРИЯ,
отдельный коммит на урок. Ошибки носителя — отдельным списком. Сквозные темы: «занятие» → «эпизод»,
обращение «вы» (ru/uk — открытый вопрос), живые формулировки без кальки.

## Scope

In scope: чтение закоммиченных `docs/work/theory_drafts/lesson_{03..11}_*.md` и файлы правок в `docs/work/tasks/`.
Out of scope: правка самих черновиков (их правит 12 · ТЕОРИЯ), файлы курса Codex
(`content/learning-v2-course/**`, `modules/learning-v2/content/**`).

## Architecture

No architecture change. Вспомогательный скрипт поиска повторяющихся ошибок лежит во временной папке, не в репозитории.

## Security and privacy

Не применимо.

## Technical debt

- Вычитка не заменяет носителя языка.

## Verification

Автопоиск ошибок, уже найденных в уроках 1–2, по всем 8 языкам + чтение прозы vi/id/tr/pl.

## Rollback

Удалить файлы правок.
