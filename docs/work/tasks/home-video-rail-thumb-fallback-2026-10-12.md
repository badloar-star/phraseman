# Task packet: лента «Видео» на Главной — запасной вид превью

Governance-ID: TG-643227388385
Status: In progress
Owner: сессия «2 · ДИЗАЙН» по заданию координатора (12.10)
Related epic/enabler: components/home/v2/HomeV2VideoRail.tsx, app/flashcards/VideoThumb.tsx

## Outcome

При ошибке превью в ленте «Видео» плитка не остаётся серой пустой: запасной вид (тон ленты, ▶ в акценте), без новых запросов и повторов; первый кадр Главной не замедлен.

## Scope

In scope: HomeV2VideoRail, общий компонент превью. Out of scope: данные ленты.

## Architecture

No architecture change: тот же VideoThumb.

## Security and privacy

Данных не касается.

## Technical debt

Pay now: серая пустая плитка при удалённом ролике на главном экране.

## Verification

Тест запасного вида в ленте, срез типов.

## Rollback

Откат коммита.
