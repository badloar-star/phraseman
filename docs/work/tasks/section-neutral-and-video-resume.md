# Task packet: нейтральные маршруты языка раздела и позиция ролика в модульной карте

Governance-ID: TG-5B8E2A4C6D10
Status: In progress
Owner: сессия «4 · ТЕМЫ 2.0»
Related epic/enabler: R70; замечания Ревизора по `f3ad957df` и `d2fe02fe4`.

## Outcome
(1) Модальные и временные маршруты (пейвол, шторки настроек и аккаунта, юридические страницы, опрос) и ролик, открытый из «Карточек», НЕ сбрасывают язык раздела (`[SECTION-LANG] neutral_route`). (2) Позиция ролика живёт в модульной карте `youtube_player_seek_bus` (TTL 30 мин, только память); вход с сохранённой позицией → `startSec=sec`, `autoPlay=false`, лог `[VIDEO-RESUME]`.

## Scope
`app/section_language.ts` (NEUTRAL_ROUTE_PREFIXES, isNeutralRoute), `app/youtube_player_seek_bus.ts`, `app/lingman_video_watch.tsx`, тест.

## Architecture
Список нейтральных маршрутов — константа в одном месте. Карта позиций — Map ≤40 записей, порядок вставки = свежесть.

## Security and privacy
Позиция не покидает устройство и не пишется на диск.

## Technical debt
Нет.

## Verification
Тест `section_neutral_routes_and_video_resume`; видео-контракты.

## Rollback
`git revert`.
