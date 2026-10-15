# Task packet: R59 «Видео» — закладка не двигает сетку, чип канала без чужого названия, трасса [VIDEO-OPEN-TRACE]

Governance-ID: TG-3C1A5B7D9E21
Status: In progress
Owner: сессия «4 · ТЕМЫ 2.0»
Related epic/enabler: R59 (Макеты), координатор 15.10.

## Outcome
(1) Закладка в сетке роликов не сдвигает сетку (компенсация прокрутки и у верхнего края). (2) Ролик открывается быстрее — сначала трасса `[VIDEO-OPEN-TRACE]` по шагам (тап → push → render/mount экрана ролика → снимок каталога → поиск набора → фразы → плеер → onLayout); починка по фактам. (3) Чип канала не показывает запасное английское название до прихода каталога.

## Scope
`app/lingman_videos.tsx`, `app/lingman_video_watch.tsx`, `components/youtube/YoutubeInlinePlayer.tsx`, новый `app/video_open_trace.ts`, тесты.

## Architecture
Трасса — модульный счётчик (20 с после тапа), без setState. Чип: та же геометрия без названия, пока канал не известен.

## Security and privacy
Данные не собираются.

## Technical debt
Трассу убрать после починки задержки открытия.

## Verification
Тесты `train_intent_and_video_watch_pack`, `button_audit_design_fixes_contract`, видео-контракты; трассу снимают Макеты.

## Rollback
`git revert`.
