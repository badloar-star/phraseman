# Task packet: пилюля языка на вкладке «Видео» открывает выбор ИЗУЧАЕМОГО языка, а не язык интерфейса

Governance-ID: TG-A30B81C181C4
Status: Planned
Owner: сессия «Авторизация» (по поручению координатора 13:45, приоритет №1, баг владельца со скриншотом), исполнитель Opus
Related: решение 5 (video.html); PRF-23 (шторка выбора языка изучения, `components/settings/StudyLanguagePicker.tsx`); D129/D130/D132 (`app/learning_language_surface_readiness.ts` — videos ready для всех 5 языков)

## Outcome
Тап по пилюле языка (флаг + «EN» + шеврон) в шапке вкладки «Видео» открывает выбор изучаемого языка (en/es/fr/de/it), а не `/settings_language` (язык интерфейса). После выбора: `studyTarget` меняется (`setStoredStudyTarget` / `applyStudyLanguageSelection` → `STUDY_TARGET_CHANGED`), лента Видео перезагружается под выбранный язык (`resolvePreferredYoutubeChannel(manifest, studyTarget, …)`), пилюля показывает изучаемый язык. Новый, ещё не начатый язык — тем же путём, что задумано в пикере (`/language_welcome`). Такая же ошибка проверена и исправлена в пилюлях языка «Диалогов» и «Карточек» (если есть).

## Scope
In:
- `app/lingman_videos.tsx` ~578 (`onOpenLanguage`), `components/youtube/YoutubeChannelHeader.tsx` (только если нужно — пилюля уже показывает `studyTarget`).
- Выбор: переиспользовать `components/settings/StudyLanguagePicker.tsx` (логика `applyStudyLanguageSelection`, `getStartedStudyLanguages`) — в шторке по макету PRF-23 (`docs/design/v2-app/*.html`, найти grep'ом по PRF-23 / «язык изучения»). Если макета шторки нет — НЕ придумывать: остановиться и описать (гейт «нет макета → сначала макет»).
- Поиск такой же ошибки: grep по `settings_language`, `onOpenLanguage`, пилюлям языка в Диалогах/Карточках.
- Логи по правилу «сперва логи»: `[VIDEO-LANG-PILL]` — тап, что открыто, выбранный язык, откуда пришёл studyTarget, перезагрузка канала (resolution, channelId).
- Тест: RNTL или source-контракт — пилюля Видео не ведёт на `/settings_language`, а открывает выбор изучаемого языка; выбор меняет studyTarget и канал.
Out: строка «Язык изучения» в Настройках (PRF-23 решение «без тапа» — не трогать без отдельного решения), `app/settings_language.tsx`, таблица готовности языков (D129 — только владелец), сервер.

## Architecture
Без новой архитектуры: шторка/экран выбора → существующий `applyStudyLanguageSelection` → событие `STUDY_TARGET_CHANGED` → `StudyTargetContext.refresh` → `lingman_videos` пересчитывает канал по `studyTarget` (эффект ~216/246). Optimistic UI: пилюля и лента реагируют сразу (контекст обновляется по событию), без спиннера на весь экран; кэш канала по языку — как есть.

## Security and privacy
Нет новых данных: язык изучения уже хранится локально (`study_target_v1`) и синхронизируется как раньше. Политика не меняется.

## Technical debt
- Pay now: неверный маршрут пилюли; немые ранние выходы в пути смены языка — логировать.
- Accept temporarily (владелец — координатор): строка «Язык изучения» в Настройках остаётся без тапа (PRF-23), пока владелец не решит иначе.

## Verification
Новый тест + соседние (по одному, со слотом): тесты `lingman_videos`/`youtube`/`study_target`/`study_language` (найти grep'ом), `learning_language_surface_readiness_guard`. Сверка с макетом PRF-23 (склейку делает Сверка — сообщить, что снять: вкладка Видео → тап по пилюле → шторка → выбор es → лента ES). Ревью до APPROVE.

## Rollback
Отдельный коммит; `git revert`.
