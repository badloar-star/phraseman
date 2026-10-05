# Task packet: «назад» из плейлиста возвращает во вкладку «Видео» (SECTION_ROOTS)

Governance-ID: TG-67966A1F0A2A
Status: In progress (координатор 05.10: «тест красный на HEAD и зелёный с починкой — факт; коммить»)
Owner: сессия 1 · ЯДРО

## Outcome

Вкладка «Видео» → плейлист → «назад» открывала новый экран /lingman_videos (вкладка «Главная»), потому что /video и
/(tabs)/video не были корнями раздела 'lingman' в SECTION_ROOTS (app/navigation_back.ts) и popBackCandidate сбрасывал
историю по section_mismatch. Добавить оба пути как корни раздела 'lingman'.

## Scope

app/navigation_back.ts — 2 строки в SECTION_ROOTS; tests/navigation_back_video_tab_section.test.ts — воспроизведение
и проверки, что «назад» в других разделах не меняется. Логи [NAV-BACK] остаются.

## Architecture

Вкладка «Видео» рендерит тот же LingmanVideosScreen — корень того же раздела.

## Security and privacy

Не затрагивается.

## Technical debt

Нет нового.

## Verification

Новый тест: 2 красных на HEAD → зелёные; navigation_back + underlay 32/32; Сверка подтвердит на устройстве.

## Rollback

git revert коммита.
