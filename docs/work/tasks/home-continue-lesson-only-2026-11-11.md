# Task packet: Главная — только «Продолжить урок», состояния в истории

Governance-ID: TG-0168C598A416
Status: Done, not committed — waiting for other sessions to commit dependencies (owner 11.11)
Owner: Claude session (продолжение передачи Codex 11.11)
Related epic/enabler: none

## Outcome

Владелец 11.11: «все сцены на главной, все состояния, какой урок, какой набор… удаляем полностью, а что-то перемещаем в истории»;
«кнопка „Продолжить урок“ открывает тот урок, на котором остановился юзер последний раз». Решения владельца 11.11 (вопросы):
новичку без открытого урока кнопку прятать; старые состояния удалить с Главной полностью (dev-«Сверку» не трогать);
историй — только статус дня. Успех: на Главной сверху фон темы, шапка, неделя и одна кнопка «Продолжить урок» (ру ровно так),
тап → /lesson1 с сохранённым id и from: 'home'; урока нет → кнопки нет; статус дня — история в кольце аватара.

## Scope

In scope: app/(tabs)/home.tsx (обработчик и входы сцены), components/home/v2/scene/HomeScene.tsx (режим continueOnly),
modules/story_events/home_activity_stories.ts, tests/home_continue_lesson_stories.test.ts.

Out of scope: dev-экран «Сверки» и прежние состояния в HomeSceneView для него; скорость запуска; живой прогон на устройстве.

## Architecture

HomeScene по-прежнему считает решение состояния (pickHomeSceneState) только ради истории дня; HomeSceneStage рисуется как
герой «continue» без текстов и чипов. Главная больше не выбирает запасной раздел (homeSceneContinueTarget) и не собирает место урока.

## Security and privacy

Нет новых данных, сервисов, разрешений и сетевых вызовов. История живёт в памяти процесса, в облако не пишется.

## Technical debt

- Contain: HomeContinueScene.tsx отдаёт только текст кнопки — компонент не подключён; выход — удалить при следующей правке сцены.
- Accept temporarily: home_scene_copy и герои состояний живут для dev-«Сверки»; владелец решил не трогать (11.11).

## Verification

npm run test:one по: home_continue_lesson_stories, home_scene_cta_target_table, home_continue_places_contract,
stories_ring_viewer_contract, stories_viewer_owner_locks_2026_10_24, gustav_last_opened_lesson_target_isolation; npm run typecheck.
Ручной путь (не выполнен): тап, удержание 1 с, новичок, смена языка/аккаунта.

## Rollback

Вернуть continueOnly → убрать проп в HomeScene; обработчик Главной — git revert коммита. Данных пользователя изменение не трогает.
