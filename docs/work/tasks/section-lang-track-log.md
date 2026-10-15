# Task packet: трассировка трекера языка раздела и подпись языка ролика

Governance-ID: TG-4040AF8F2CB0
Status: In progress
Owner: сессия «4 · ТЕМЫ 2.0»
Related epic/enabler: R70, замечание Макетов c1_r60b (язык «Карточек» не сбрасывается, английский ролик подписан «Испанский»).

## Outcome
Каждый вызов трекера раздела пишет `[SECTION-LANG] track` (next, lastSection, override, where) — по журналу видно, почему сброс «Карточек» не срабатывает. Подпись языка ролика берётся: канал → язык набора → язык раздела.

## Scope
In scope: `app/section_language.ts`, `app/lingman_video_watch.tsx`, тесты. Out of scope: починка сброса до получения журнала.

## Architecture
Одна строка журнала на вызов трекера (вызовов мало — смена вкладки/пути); логика сброса не меняется.

## Security and privacy
Данные не собираются; в журнал — раздел и пути экранов.

## Technical debt
Трассировку трекера оставить до закрытия R70 «Карточки», затем сократить до сбросов.

## Verification
Тесты `pack_language_preferences`, `train_intent_and_video_watch_pack`; повтор на эмуляторе Макетами.

## Rollback
`git revert`.
