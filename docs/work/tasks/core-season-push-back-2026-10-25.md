# Ядро · из «Уроков» (Сезон) нельзя выйти назад (25.10, 2.0.2, iPhone)

Governance-ID: TG-22152C64C757
Governance-ID: TG-D7E6C63AF1FF

## Outcome
Владелец: «из раздела „Уроки“ невозможно выйти назад!!! нет кнопки назад, нет таббара».
Причина (код): маршрут /learning-v2/course (push поверх вкладок; входы — плитка «Уроки» и «Продолжить» на Главной,
learning_v2_home_continue_route, возврат из занятия router.replace, диплинк +native-intent) рендерит LessonsTab presentation="push".
Кнопку «Назад» вкладка передаёт пропом navigationControl. Старая карта LearningV2ChaptersCourse её рисовала, а SeasonCourseConnected
(включён SEASON_SCENE_V2_ENABLED в a78dbec4d) — нет. Таббара на push-экране нет → выхода нет; на iOS нет и системного жеста.
Итог: на push-экране Сезона штатная ScreenBackButton (замок «назад в одном месте») вне прокрутки. Строка «Урок N ⌄» + монеты
сдвинута вправо и выровнена по кругу. На вкладке (таббар виден, корневой экран) — без изменений.

## Scope
- components/learning-v2/season/SeasonCourseConnected.tsx: журнал [LESSONS-NAV]; на не-вкладке — backTop для шапки.
- components/learning-v2/season/SeasonCourseView.tsx: ScreenBackButton вне ScrollView + сдвиг строки шапки при backTop.
- tests/season_push_back_contract.test.mjs — сторож «каждый вход на Сезон: таббар или «Назад»».

## Architecture
Решение «вкладка или push» — useIsTabPage() (TabPageContext ставит только TabSlider). Обработчик — дефолт ScreenBackButton:
safeRouterBack(router, '/(tabs)/home'), ровно как handleLessonsBack для push_v2_route. Аппаратная «назад» Android на push-экране —
нативный стек (без изменений).

## Security and privacy
Данных не касается.

## Technical debt
Сверка с макетом: на макете Сезона push-варианта нет (эталон — вкладка). Положение кнопки — штатное по kit.css (ScreenBackButton).

## Verification
Сторож-тест, тесты Сезона, проверка типов; Сверка — все входы на эмуляторе. Только JS — подходит для обновления по воздуху (OTA) 2.0.2.

## Rollback
Revert коммита.
