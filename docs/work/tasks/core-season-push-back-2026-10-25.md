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

## Дополнение 25.10 ~11:10: «Все уроки» и отступ под таббаром (тот же OTA)
Governance-ID: TG-7C33B86E9D30
Governance-ID: TG-788DC061536D
Governance-ID: TG-39251C53360D
- Владелец: «из „Все уроки“ выхожу — и таббара нет, и пропадает». «Все уроки» — не маршрут, а замена обложки списком (allLessonsOpen) в
  том же экране. Скрытие таббара (useHideTabBar) не вызывается нигде. Гипотеза: вход с Главной (push) — у списка своя «Назад», после неё
  обложка без кнопки (закрыто 15658f6b9). Проверяем журналом [LESSONS-NAV]: открытие/закрытие, чем закрыт, вкладка или push, canGoBack,
  запрос скрытия таббара до/после.
- Ревизор: списки Сезона брали голый bottomPadding (SeasonPickScreens подвал, LearningV2AllLessonsList) — подпись под капсулой таббара.
  use_season_list_bottom_pad: isTabPage ? max(bottomPadding, useTabContentBottomPad()) : bottomPadding (как SeasonCourseView).
- Сторож: tests/season_push_back_contract.test.mjs — списки Сезона на вкладке учитывают таббар, журнал открытия/закрытия на месте.

## Дополнение 25.10 ~11:30: журналы для iOS (окно эпизода обрезано справа)
Governance-ID: TG-D5300686D388
- [SEASON-LAYOUT] root (SeasonCourseConnected): measureInWindow корня Сезона против окна и экрана — x, width, diffW, scale, fontScale.
- [NAV-TRANSITION] (app/learning-v2/course.tsx): состав стека на входе + события перехода/жеста.
- Только console.log: в релизе DebugLogger.info/warn молчат, журнал debug_logs_v1 никто не читает. Снимать — «Консоль» на Mac.
- Окно эпизода и [EPISODE-MODAL] — 2 · ДИЗАЙН (SeasonExpandedCard, season_modal_bounds, season_modal_log).

## Дополнение 25.10 ~11:45: аппаратная «Назад» Android на push-Сезоне (Сверка ❌)
Governance-ID: TG-D5300686D388
- Сверка: «Назад» Android на push-Сезоне → POP_TO lessons_list (классика «Обучение A1»), [BACK-BTN] нет. У Сезона не было своего
  hardwareBackPress (ScreenBackButton вешает его только для ✕) — нативный стек снимал экран, под ним лежал lessons_list.
- Правка: на push-Сезоне BackHandler → тот же safeRouterBack(router, '/(tabs)/home'), что у «‹», + [BACK-BTN] source=hardware.
  Подписка один раз при монтировании (не по фокусу): окно эпизода, «Все уроки» и списки глав подписываются позже и первыми забирают
  «Назад». Обработчик работает только в фокусе экрана.
- [LESSONS-NAV] season mount: состав стека (кто положил lessons_list под Сезон).
