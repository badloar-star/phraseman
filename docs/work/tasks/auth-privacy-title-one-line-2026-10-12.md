# Task packet: заголовок экрана «Приватность» в одну строку (settings-gap-016)

Governance-ID: TG-B342C005A468
Status: In progress
Owner: сессия «5 · АВТОРИЗАЦИЯ» (координатор 12.10: «вёрсткой или более коротким заголовком на всех 9 языках», без adjustsFontSizeToFit)
Related epic/enabler: app/privacy_settings.tsx, макеты profile.html PRF-07 и settings-gaps-states.html (privacy)

## Outcome

Крупный заголовок экрана приватности (Inter Bold 34, letterSpacing −0,5) не переносится ни на одном из 9 языков. Замер по `assets/fonts/Inter-Bold.ttf`: «Приватность и данные» 384 dp и vi 402 dp — больше места на Pixel 8 (412 − 2×20 = 372); pt-BR 327 — больше места на узких 360 dp (320). Вёрсткой не решается: заголовок уже на всю ширину между полями 20 из макета. Короткий заголовок «Приватность» / Privacy / … — самый длинный vi 240 dp, запас на 360 dp. Смысл «данные» несёт подпись под заголовком («Необязательные данные и документы»). Строка в списке Настроек «Приватность и данные» не меняется.

## Scope

In scope: строка заголовка в `app/privacy_settings.tsx`, тест.
Out of scope: строка в Настройках, подпись, кегль (34 по макету), макеты — правку текста в макетах делают Макеты (запрос в INBOX).

## Architecture

No architecture change: только текст заголовка.

## Security and privacy

Нет данных.

## Technical debt

Contain: сторож `tests/privacy_title_single_line.test.ts` — короткий заголовок на 9 языках и нет adjustsFontSizeToFit. Accept temporarily: макеты показывают длинный заголовок до правки Макетами (владелец — Макеты, по запросу в INBOX §AUTH-0150).

## Verification

Тест; пересъёмка Сверкой settings-gap-016/017.

## Rollback

Откат коммита — вернётся длинный заголовок (перенос на Pixel 8).
