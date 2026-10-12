# Task packet: литералы цвета Карточек для светлой темы; привязка 8 строк реестра без code

Governance-ID: TG-97345CC28D0A
Status: In progress
Owner: сессия «2 · ДИЗАЙН» по заданию координатора (12.10, вечер)
Related epic/enabler: docs/phraseman-2.0/R1_LIGHT_THEME_LITERALS.md

## Outcome

1) 70 непомеченных литералов цвета Карточек: ломающие светлую тему/оттенки — на токены (проверка контраста), сознательные — theme-exempt с причиной. 2) 8 строк реестра без code (profile-009/010/015/025/028/029/030, overlays-runtime-018): найти экран и состояние в коде и привязать либо объяснить, почему нельзя.

## Scope

In scope: app/flashcards/cardPackPaywallTheme.ts, marketplace.ts, pill_tabbar_chrome.ts, flashcards_speaking_session.tsx (только пометки/токены), запись code в visual_parity.json только по своим строкам, строка в RESCAN_QUEUE_FOR_ROBOT.
Out of scope: чужие незакоммиченные правки в файлах Карточек (обход), эмулятор.

## Architecture

Архитектура не меняется: токены вместо литералов, пометки theme-exempt, привязка code в реестре.

## Security and privacy

Данных не касается.

## Technical debt

Pay now: мёртвая таблица прежних тем окна покупки.

## Verification

test:one по сторожам, срез типов по затронутым файлам, контраст-тест.

## Rollback

Откат коммитов.
