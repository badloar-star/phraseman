# Task packet: превью роликов — фикстура без сети и запасной вид при ошибке (cards-028)

Governance-ID: TG-E20F7FAFA939
Status: In progress
Owner: сессия «2 · ДИЗАЙН» по заданию координатора (12.10)
Related epic/enabler: app/flashcards/VideoPackRow.tsx, app/thumb_trace.ts, app/dev_state_cards_demo.ts

## Outcome

1. Фикстура роликов (id devDemoVid0…4) в превью берёт локальные картинки из ассетов, без обращения к i.ytimg.com (там 404) — только dev.
2. При ошибке загрузки превью (удалённый ролик у настоящего пользователя) плитка не остаётся серой пустой: запасной вид — тон темы, значок ▶, название; без новых сетевых запросов и повторов. Лог [THUMB] fallback reason=….

## Scope

In scope: VideoPackRow (оба вида плитки), фикстура, тест.
Out of scope: лента «Видео» на Главной (отдельно, по тому же образцу — отметить в отчёте).

## Architecture

No architecture change: локальное состояние ошибки плитки, один флаг на плитку.

## Security and privacy

Данных не касается; сетевых запросов не добавляется.

## Technical debt

Pay now: серая пустая плитка при удалённом ролике.

## Verification

Тест на запасной вид и на локальные превью фикстуры; срез типов.

## Rollback

Откат коммитов.
