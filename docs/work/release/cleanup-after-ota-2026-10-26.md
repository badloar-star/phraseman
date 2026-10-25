# Уборка после OTA (кандидаты, 25–26.10)

Собирает координатор. Ничего из этого не трогаем до выпуска OTA. Перед удалением — проверка Ревизора: ни одного импорта или маршрута, тесты, которые держат только мёртвый код, удаляются вместе с ним.

| Что | Где | Кто нашёл | Почему мёртвое |
|---|---|---|---|
| UndoSnackbar | components/ui/new/UndoSnackbar.tsx | Темы, 5d7933437 | нигде не подключён |
| medalToastThemeStyles | components/medalToastThemeStyles.ts | Темы, b5a22eebb | только витрина; живой путь — medalToastThemeStylesFromTokens |
| daily_phrase_chrome | daily_phrase_chrome.ts | Темы, ae74bf7e1 | «Фраза дня» на Главной рисуется вариантом homeV2; таблицу держат только 3 теста |
| окно званий в home.tsx | app/(tabs)/home.tsx (titleModal) | Темы, ae74bf7e1 | setTitleModalVisible(true) нигде нет |
| HomeMistakesLockedSheet | components/.../HomeMistakesLockedSheet | Темы, ae74bf7e1 | не импортируется с 21.09 |
| старый экран занятия V2 | app/learning-v2/session/[id].tsx → LearningV2LegacySessionScreen | Learning V2 | открывается только для языков обучения ≠ en, а они скрыты (D129/D130); en идёт через настоящий плеер |
