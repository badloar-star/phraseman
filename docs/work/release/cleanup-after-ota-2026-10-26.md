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
| ProgressProofBlock | components/feedback/ProgressProofBlock.tsx | Темы, 84a97fbd5 | нигде не подключён (и текст t.textSecond = cta, до 1,00) |
| CollectionLimitHeader | (Карточки) | Темы, 709872d53 | не подключён; текст textSecond = cta, до 1,00 |
| StatusFilterChips | (Карточки) | Темы, 709872d53 | не подключён; текст textSecond = cta, до 1,00 |
| FlashcardsShelves | (Карточки) | Темы, 709872d53 | не подключён |

## Добавлено 26.10 00:20 (координатор, по Макетам b39a4c603)
- LearningV2ChaptersCourse (карта глав, строки learning-v2-003/005/006/076) — в боевом пути подменён SEASON_SCENE_V2_ENABLED; импортируют app/(tabs)/lessons.tsx и SeasonCourseConnected (import type). Удалить мёртвую ветку → строки закроются через component_unreachable.
- LearningV2MapNode (строка 075) — 4 импортёра (lessons.tsx, ChaptersCourse, PulseMapSessionRow, Horizons). Удалять вместе с картой.
- Founder Pass (строка 015) — файла нет; закрыть только «removed_by_owner» словом владельца.
- (скорость, первый после OTA) AppMessagesInbox (1261 строка) — отделить лёгкий хук подсчёта непрочитанных (точка на колокольчике) от тяжёлого интерфейса ящика и окон опроса VIP; интерфейс грузить лениво. Ядро, аудит 5a15d588a.
- Моменты №8 — предзагрузка чанка в app/lesson_complete.tsx + хранилище показанных рубежей (риск двойного показа).
