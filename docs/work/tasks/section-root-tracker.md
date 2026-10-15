# Task packet: корневой трекер раздела (экраны поверх таббара) и открытие набора ролика из «Видео → Наборы»

Governance-ID: TG-06E014E1CDDE
Status: In progress
Owner: сессия «4 · ТЕМЫ 2.0»
Related epic/enabler: R70, Макеты c1_r60b.

## Outcome
(1) Язык раздела «Карточки» сбрасывается при уходе: пока поверх таббара открыт экран, навигатор вкладок заморожен и эффект в `(tabs)/_layout` не видел смену пути (отсюда «ни одной строки reset»); корень приложения не заморожен и ведёт этот случай. (2) Тап по набору ролика во вкладке «Видео → Наборы» открывает экран ролика даже при id `video_<id>`.

## Scope
`app/section_language.ts` (trackPushedRoute), `app/_layout.tsx` (один эффект), `app/flashcards_video_packs.tsx`, тесты.

## Architecture
Два источника событий в один трекер: вкладки (activeIdx, layout) и экраны поверх таббара (корень, pathname); `/video` корнем игнорируется.

## Security and privacy
Данные не собираются.

## Technical debt
Журнал `[SECTION-LANG] track` оставить до подтверждения Макетами, затем сократить.

## Verification
Тесты pack_language_preferences (сценарий «Мои наборы → es → назад → сброшено»), train_intent_and_video_watch_pack; повтор Макетов.

## Rollback
`git revert`.
