# PERF_MASTER_PLAN — «10 часов без нагрева и тормозов»

Дата: 2026-07-02. Автор: Claude (Fable). Основа: 5 параллельных аудитов кода + HEAT_REPORT.md + CLASS_REGISTRY_PERFORMANCE.md + археология правок Codex.

## СТАТУС РЕАЛИЗАЦИИ (2026-07-02, та же сессия)

- ✅ **A1** freezeOnBlur:true глобально; исключения: arena_game/arena_lobby/arena_join/arena_room/exam (`app/_layout.tsx`).
- ✅ **A2** react-freeze для скрытых табов: `TabPane` (freeze после первого коммита, активный+соседи живут), `ENABLE_TAB_FREEZE` (`app/(tabs)/_layout.tsx`).
- ✅ **A3** гарды focus+AppState: SkeletonShimmer, ShineOverlay, HoloFoilCard, FlashcardListItem, AiTypingBubble, AppMessagesInbox, LingmanVideosButton.
- ✅ **A4** LRU-лимит (12 комнат) на cachedMessagesMemory чата лиг. ✅ **A5** useMemo на value MatchmakingContext.
- ✅ **A6** guardrail: `tests/perf_freeze_contract.test.ts` (freeze-allowlist, tab-freeze, premount, вечные анимации-храповик, шов тематических паков) + обновлён `tests/navigation_back_underlay_contract.test.ts` (константный фон, флаги анимаций).
- ✅ **B1** PremiumContext стартует из app_snapshot (убирает мигание в ~50 файлах). ✅ **B2** EnergyContext peek-кеш. ✅ **B3** Lang/StudyTarget peek через app_snapshot_bootstrap (эффект со 2-го маунта процесса). ✅ **B4** ранний прогрев lessons_tab_state (+600мс вместо выключенного 8с-прогрева).
- ✅ **C1** константный фон стека/корня (tTheme.bgPrimary). ✅ **C2** fade 140мс iOS-only (`SCREEN_FADE_TRANSITIONS`, kill-switch EXPO_PUBLIC_SCREEN_FADE=0). ✅ **C4** ENABLE_BACKGROUND_TAB_PREMOUNT=true (idle-премаунт, чинит 2 ждавших этого контракт-теста).
- ⏸ **C3** (убрать setTimeout(0) перед router.navigate) — НЕ делал: только после проверки C1/C2 на устройстве.
- ✅ **D1** plan_content_registry: ленивый require по planId (+loadAllPlanContentDays для dev/валидации). ✅ **D2** quiz_thematic_registry: кеширующий геттер pack (ограничение: фильтр видимости трогает pack.target — полная метадата-развязка = отдельный рефакторинг).
- ✅ **B5** тихая ревалидация (сравнение перед setState): lesson_menu, personal_plan (+сброс entrance-анимации только при реальном изменении), trainer, daily_tasks, arena_lobby (3 focus-блока). ✅ **B6** скелетоны с финальной геометрией вместо полноэкранного спиннера/пустоты: friends_screen, pack_opening.
- ⚠️ Коммиты: ядро+правила (ab213c416) и гарды+гидрация+ленивый контент (2212d0fa8) — закоммичены. Правки B5/B6 (lesson_menu, personal_plan, trainer, daily_tasks, arena_lobby, friends_screen, pack_opening) и гарды AppMessagesInbox/LingmanVideosButton — В ДЕРЕВЕ, НЕ закоммичены: в тех же файлах живёт незавершённая работа других сессий, коммитить вместе с ней.
- ✅ **D3** (2026-07-02, вторая сессия): friends.tsx — оба таба на FlashList 2.0.2, каждый таб = собственный скроллер (шапка/переключатель в ListHeaderComponent, empty — в ListEmptyComponent; FlashList внутри ScrollView НЕ виртуализирует). achievements_screen — правка НЕ нужна: экран давно на SectionList+аккордеон (6ca36b8), рендерится максимум одна открытая категория; премиса «127 .map» устарела.
- ✅ **D4** (та же сессия): lesson_help.tsx 20 383 → 617 строк (данные в lesson_help_theory_data.tsx за ленивым lesson_help_theory_registry.ts по образцу plan_content_registry; UI-слой lesson_help_theory_ui.tsx; bug_report_content_regression/animated_event переуказаны на новый файл — не ослаблены). home.tsx: секции sectionStyle(3..5) (быстрый доступ, SRS-ряд/тренер, фраза дня, подвал) — вторым проходом belowFoldReady/InteractionManager; one-shot xp_migration_v2 перенесён из экрана в xp_manager.migrateXPFormulaV2() (старт из _layout). arena_lobby: гейтинг onSnapshot/интервалов по arenaTabVisible уже сделан параллельной сессией (в дереве); консолидация 36 useEffect отложена — файл активно правится.
- ✅ **B7, первая волна** (2026-07-02, третья сессия) — мгновенный первый кадр из тёплой памяти процесса/снапшота + скелетоны вместо ЛОЖНЫХ пустых состояний (по жалобе «разделы открываются пустыми и грузятся»): `review.tsx` (скелетон вместо «Нечего повторять!» первым кадром), `arena_rating.tsx` (профиль синхронно из `getRememberedArenaLobbyProfile()`/`app_snapshot.arena`, история из нового `peekArenaRatingHistory()` в arena_rating_cache, скелетон-строки вместо «Сыграй первый матч»), `streak_stats.tsx` (WagerCard: warm-память процесса — блок больше не «выпрыгивает»), `phrase_analytics_screen.tsx` (warm-память результата, ключ target:locale + скелетон вместо «Пока нет данных»), `personal_plan_stats_screen.tsx` (warm-память + скелетон вместо «Нет данных о плане», вход без сброса анимации при тёплом старте). Паттерн: warm-модуль/peek в useState-инициализаторе → loading только при пустой памяти → скелетон финальной геометрии → тихая фоновая ревалидация.
- ✅ **D5**: `friends_screen.tsx` — подтверждён МЁРТВЫЙ дубль таба (ни одного router.push по всему app/+components/; UX_AUDIT_2026-06-08 рекомендует удалить). Удаление отложено: на файл ссылаются owner_direction_runtime_contract (файл правится другой сессией) и appArtBackdropRegistry — удалять одним атомарным коммитом, когда тест освободится.
- ℹ️ Разведка B7 (полный скан app/*.tsx): daily_tasks_screen/manage_subscription/referrals/arena_season_leaderboard/pack_opening уже со скелетонами (без warm-кеша — короткий скелетон при каждом заходе, допустимо); arena_leaderboard — пустое тело списка при загрузке, но экран достижим только из dev-меню (низкий приоритет); trainer/club_screen/flashcards_collection/personal_plan/home/lessons/friends — уже эталонные. Хвост `Animated.loop` без гардов — почти весь в модалках (unmount при закрытии); не-модалки на перепроверку руками: club_screen, flashcards_collection, lesson1, lesson_intro_screens, voice_equalizer, lesson_complete, pack_opening (RN Animated не всегда останавливается freeze'ом).
- 📋 Осталось: C3 (после устройства), консолидация useEffect arena_lobby (после коммита чужой работы), удаление friends_screen.tsx (см. D5, ждёт освобождения контракт-теста), B7 вторая волна — warm-кеши для daily_tasks и остальных скелетонных экранов по мере жалоб.
- Правила закреплены: `AGENTS.md` → «Performance Bible (Instagram-Grade Runtime)» + указатель в `CLAUDE.md`.

## Цель (критерии приёмки)

1. Никаких чёрных/тёмных кадров между переходами экранов.
2. Отклик на тап по табу/кнопке — мгновенный визуально (< 1 кадра до реакции).
3. Открытие экрана — сразу финальный контент из кеша, без «прыжка» (снапшот → перерисовка).
4. После 10+ минут непрерывной навигации по всем экранам: нет нагрева, нет деградации отклика (сейчас деградация наступает через ~1 минуту).
5. Ничего не сломано: арена (realtime) и экзамен (60-мин таймер) работают как раньше; Android/Fabric не крашится.

## Диагноз (сводка 5 аудитов)

### Симптом 1: нагрев + деградация после минуты — КОРЕНЬ

- **`app/_layout.tsx:2484` — `freezeOnBlur: false`** глобально на корневом Stack (77 экранов). Ушедшие экраны продолжают рендериться/жить. НЕ тронуто ни Codex, ни прошлыми фиксами. Это «рычаг №1» из HEAT_REPORT — всё остальное лишь умножается на него.
- **Кастомные табы** (`app/(tabs)/_layout.tsx`, свайпер TabSlider): посещённый таб остаётся смонтированным навсегда (`visitedTabs`/`mountedTabs`), никакой заморозки скрытых табов нет. `arena_lobby.tsx` (33 useEffect, 2 onSnapshot, setInterval 1с) продолжает тикать, будучи скрытым.
- Точечные накопители в основном УЖЕ прибраны прошлыми сессиями (AvatarAura, shimmer, подписки лиги, `_profilesCache` с TTL, guardrail-тесты на setInterval/blur). Остались мелкие: `SkeletonShimmer.tsx:61`, `ShineOverlay.tsx:60`, `HoloFoilCard.tsx:117`, `flashcards/FlashcardListItem.tsx:439`, `AiTypingBubble.tsx:49,70`, badge-пульсы (`AppMessagesInbox.tsx:310`, `LingmanVideosButton.tsx:119`); кеш `firestore_league_chat.ts:27 cachedMessagesMemory` без лимита ключей.

### Симптом 2: чёрный экран между переходами

- **`app/_layout.tsx:2478`**: `contentStyle.backgroundColor = appShellReady ? tTheme.bgPrimary : STARTUP_SPLASH_BG('#101214')` — фон ВСЕГО стека зависит от 4 асинхронных флагов; при гонке стек перекрашивается в почти-чёрный.
- `animation: 'none'` глобально (флаг `ENABLE_SCREEN_TRANSITIONS=false`, `app/config.ts:147`) — native-stack мгновенно переключает контейнер ДО того, как JS дорендерил тяжёлый экран → в зазоре виден голый фон контейнера. В коде это уже признано: `premium_modal` получил персональную подложку «чтобы native-stack не показывал чёрный кадр» (`app/_layout.tsx:2524-2526`) — латали точечно, не системно.
- Тяжесть первого рендера экранов растягивает зазор: экраны по 3300–3900 строк, 14–33 useEffect на маунте, и (главное) статические мега-импорты (см. симптом 4).

### Симптом 3: «прыжки» контента (снапшот → реальное состояние)

- Глобальные контексты стартуют с неверного дефолта и чинят себя асинхронно → мигает ВСЁ приложение:
  - `components/PremiumContext.tsx:119-121` — premium/vip стартуют `false`, реальный статус после await (RevenueCat/AsyncStorage/Firestore). При этом `app_snapshot_store` УЖЕ хранит `premiumActive/vipActive`, но контекст его не читает. Влияет на ~50 файлов.
  - `components/EnergyContext.tsx:193` — стартует `MAX_ENERGY`, реальное значение позже; `home.tsx:659`, `quizzes.tsx:891,1495,3194` показывают число без проверки `energyReady`.
  - `components/LangContext.tsx:1190-1213` — стартует с локали устройства, сохранённый язык приходит в useEffect → перерисовка всего текста.
  - `components/StudyTargetContext.tsx:27,44-46` — стартует `'en'`, реальный target позже.
- Прогрев кеша уроков отложен на **8 секунд** (`app/_layout.tsx:1481-1512`, setTimeout 8000) — тап на «Уроки» раньше → нули → прыжок.
- ~25 экранов делают refetch на КАЖДЫЙ фокус (`useFocusEffect`) без TTL и без «тихого» сравнения (arena_lobby, streak_stats, trainer, daily_tasks, personal_plan, club_screen, flashcards*, diagnostic_test…). `lesson_menu.tsx:634-635` — колбэки без useCallback.
- Полноэкранный спиннер с layout-shift: `app/friends_screen.tsx:937-954`, `app/pack_opening.tsx`.
- Правильный механизм в проекте УЖЕ есть: `app_snapshot_store.ts` (useSyncExternalStore, синхронное чтение) — но покрывает только 4 экрана; эталоны: `lessons.tsx` (модульный кеш + один multiGet), `friends.tsx` (warm snapshot в useState-инициализаторе).

### Симптом 4: тяжёлый старт/первое открытие экранов

- **~20 МБ** данных планов строятся в память при первом касании графа personal_plan: `plan_content_registry.ts:23-33` статически импортирует все 5 файлов (`plan_content_impuls/gavan/mitap/echo/voyazh.ts`) и строит общий Map, хотя активен один план.
- **1.6 МБ** тематических квизов (`quiz_thematic_home_and_rooms.ts` 847КБ + `quiz_thematic_kitchen_and_cooking.ts` 747КБ) строятся при монтировании таба «Квизы» через статический `quiz_thematic_registry.ts`.
- `lesson_help.tsx` — 20 383 строки (аномалия №1 проекта).
- Ни один главный таб не виртуализирован: всё `ScrollView + .map()`. Реальные кандидаты: лента друзей (`friends.tsx:1270`), 127 ачивок (`achievements_screen.tsx:1811`). Эталон уже есть: FlashList в `flashcards_collection.tsx:1914`.
- 9 контекст-провайдеров + 25+ постоянно смонтированных host/toast-компонентов над Stack — ре-рендерятся при каждом переходе (value провайдеров мемоизированы — ок, кроме `MatchmakingContext`).

### Медленный отклик табов

- `app/(tabs)/_layout.tsx:671-682` — `router.navigate` намеренно отложен на `setTimeout(0)` (анти-white-frame патч). Визуальный отклик (`setVisualIdx`) синхронный, но реальная навигация ждёт тик, а JS-поток занят фоновыми экранами → суммарная задержка.
- Прогрев соседних табов ВЫКЛЮЧЕН (`ENABLE_BACKGROUND_TAB_PREMOUNT=false`, `app/(tabs)/_layout.tsx:131`) → первое открытие таба = полный маунт «с нуля» на глазах у пользователя.

## Почему Instagram не тормозит, а мы — да (кратко)

Instagram: агрессивная виртуализация (рендерится только видимое), единый слой данных с мгновенным кешем, фоновые экраны замораживаются, тяжёлое грузится лениво. У нас: все посещённые экраны живут вечно (freeze выключен), данные каждый экран тянет сам и перерисовывается после первого кадра, мегабайты контента строятся в память статически, списки не виртуализированы. План ниже закрывает ровно эти четыре разрыва.

---

# ПЛАН РАБОТ

## Фаза A — «Тихий фон»: убить накопление (нагрев) — НАИВЫСШИЙ ПРИОРИТЕТ

**A1. Включить `freezeOnBlur: true` глобально на корневом Stack** (`app/_layout.tsx:2484`).
- Точечно исключить realtime-экраны: `arena_game`, `arena_friend_room*` (live-матч), и проверить `exam` (см. A1b). Для них — явный `freezeOnBlur: false` в их `<Stack.Screen options>`.
- A1b. `exam.tsx`: перевести 60-мин таймер на timestamp-базу (остаток = `endTime - Date.now()` при каждом тике/фокусе), чтобы заморозка не ломала отсчёт. Если уже так — просто подтвердить тестом.
- ВАЖНО про риск: старые краши Android/Fabric были от **transitions** (slide-анимаций), НЕ от freeze. freeze — другой механизм (react-freeze/Suspense, поставляется с react-native-screens 4.16). Тем не менее: включать первым коммитом фазы, гонять на реальном Android (открытие/Back по всем стек-экранам).
- Что даёт: ушедшие стек-экраны перестают рендериться → главный источник фоновой работы гаснет.

**A2. Заморозка скрытых табов в кастомном свайпере** (`app/(tabs)/_layout.tsx`).
- Обернуть содержимое неактивных табов в `<Freeze freeze={!isActiveTab}>` (пакет `react-freeze`, уже в транзитивных зависимостях react-native-screens).
- Нюанс: freeze останавливает рендеры, но НЕ таймеры/подписки. Поэтому добавить **TabVisibilityContext** (или проп `isVisible`) от TabLayout к экранам табов — и в горячих табах (`arena_lobby` прежде всего) гейтить setInterval/onSnapshot по видимости таба: скрыт > 30с → отписка, возврат → переподписка. Механика `arenaTabVisible` уже частично существует — унифицировать.
- Не замораживать активный + соседний по свайпу (чтобы свайп-переход оставался живым).

**A3. Догардить оставшиеся вечные анимации** (по образцу уже пофикшенного `AvatarAura`):
- `components/SkeletonShimmer.tsx:61`, `components/ShineOverlay.tsx:60`, `components/HoloFoilCard.tsx:117`, `app/flashcards/FlashcardListItem.tsx:439`, `components/AiTypingBubble.tsx:49,70`, `components/AppMessagesInbox.tsx:310`, `components/LingmanVideosButton.tsx:119` — `useIsScreenFocused()` + AppState-гард (listener вешать только когда луп реально стартует).

**A4. Кеш чата лиг**: `app/firestore_league_chat.ts:27` `cachedMessagesMemory` — лимит числа ключей-комнат + TTL по образцу `pruneFriendsProfileCache` (`friends_tab_swr_warm.ts`).

**A5. `MatchmakingContext`** (`contexts/MatchmakingContext.tsx`): обернуть value в `useMemo` (единственный не-мемоизированный провайдер).

**A6. Guardrail-тесты** (расширить `tests/owner_direction_runtime_contract.test.ts`):
- «`freezeOnBlur: false` разрешён только в allowlist (arena_game, …)».
- «`withRepeat(-1)`/`Animated.loop` без фокус/AppState-гарда — только в allowlist (модалки)».

## Фаза B — «Мгновенный первый кадр»: убить прыжки

**B1. PremiumContext — синхронная гидрация**: инициализатор `useState(() => getAppSnapshot().profile?.premiumActive/vipActive ?? false)` — данные уже лежат в снапшоте (`app_snapshot_bootstrap.ts:25-26,68-69`), их просто не читают. Один фикс убирает мигание премиум-бейджей/гейтов в ~50 файлах.

**B2. EnergyContext — peek-кеш**: модульный синхронный кеш последнего значения энергии (по образцу `peekProfilesCache`), `useState(() => peekEnergy() ?? MAX_ENERGY)`; в `home.tsx:659` и `quizzes.tsx:891,1495,3194` не показывать число до `energyReady` (показывать последнее кешированное).

**B3. Lang + StudyTarget — в ранний батч**: добавить ключи `app_lang` и study-target в `AsyncStorage.multiGet` внутри `app_snapshot_bootstrap.ts` (он выполняется до первого кадра) и читать синхронно в инициализаторах контекстов. Убирает перерисовку всех текстов и контента через долю секунды после старта.

**B4. Прогрев уроков**: перенести `loadLessonsTabStateFromStorage(studyTarget)` из `setTimeout(...,8000)` (`app/_layout.tsx:1481-1512`) в `primeAppSnapshotFromStorage` (ранний Promise.all). Таб «Уроки» перестанет показывать нули при раннем тапе.

**B5. Правило «тихой ревалидации»** для refetch-on-focus экранов (25 шт., список в аудите): 
- before `setState` — сравнение с текущим (shallow/hash); данные не изменились → НЕ перерисовывать;
- TTL: не перечитывать чаще раза в 30–60с, кроме явных событий (`onAppEvent`);
- начать с горячих: `arena_lobby` (3 useFocusEffect-блока: 423-438, 442-457, 614-623), `personal_plan.tsx:486-494`, `daily_tasks_screen.tsx:1934-1944`, `trainer.tsx:589`, `lesson_menu.tsx:634-635` (+обернуть в useCallback).

**B6. Layout-shift**: `friends_screen.tsx:937-954` и `pack_opening.tsx` — скелетон с геометрией финального контента вместо полноэкранного спиннера.

**B7. (стратегически) Расширять `app_snapshot_store.ts`** как единый мгновенный слой для остальных горячих экранов (сейчас 4/40+). Новые экраны — только через снапшот-паттерн: первый рендер из памяти, фоновая тихая ревалидация.

## Фаза C — «Ноль чёрных кадров»

**C1. Стабильный фон стека**: `contentStyle.backgroundColor` = константный `tTheme.bgPrimary` ВСЕГДА (`app/_layout.tsx:2478`). Сплэш/онбординг-состояние решать оверлеем ПОВЕРХ стека, а не перекраской фона всех экранов. Проверить совпадение с фоном темы у: корневого View приложения, `android windowBackground` (app.json / splash), фонов самих экранов — чтобы в любом зазоре был виден фон цвета темы, а не чёрный.

**C2. Мягкий fade вместо 'none'**: `animation: 'fade', animationDuration: 120-150` под НОВЫМ флагом (отдельным от `ENABLE_SCREEN_TRANSITIONS`, который про slide). Старые краши Fabric были на slide-transitions; fade — простейший композитинг, но всё равно: включить сначала на iOS, на Android — после ручной проверки (открытие/Back по всем вложенным экранам). Если Android нестабилен — Android остаётся `'none'` + C1 (фон темы делает зазор незаметным).

**C3. Убрать `setTimeout(0)` перед `router.navigate`** (`app/(tabs)/_layout.tsx:671-682`) — ПОСЛЕ C1/C2: патч закрывал белый кадр, который лечим системно. Проверить на устройстве; если белый кадр вернётся — оставить, это дешёвый компромисс.

**C4. Включить прогрев табов**: `ENABLE_BACKGROUND_TAB_PREMOUNT = true` (`app/(tabs)/_layout.tsx:131`) — idle-премаунт по одному уже написан Codex'ом и гейтится по AppState. Включать ТОЛЬКО после фазы A (иначе прогретые табы = больше живого фона). Тогда первое открытие любого таба — мгновенное.

## Фаза D — «Лёгкие экраны»: вес и списки

**D1. Ленивая загрузка контента планов** (`app/plan_content_registry.ts:23-33`): заменить статические импорты 5 планов (~20 МБ) на `require()` по `planId` при первом реальном обращении + модульный кеш загруженного плана. Синхронный `require` внутри функции сохраняет типизацию и не требует async-рефакторинга вызывающих.

**D2. Ленивая загрузка тематических квизов** (`app/quiz_thematic_registry.ts`): `require()` пакета темы при открытии категории, не при маунте таба «Квизы» (−1.6 МБ на маунте таба).

**D3. Виртуализация**: лента активности друзей (`friends.tsx:1270`) и список друзей (`friends.tsx:2920`) → FlashList; `achievements_screen.tsx:1811` (127 карточек) → FlashList/SectionList. Эталон в проекте: `flashcards_collection.tsx:1914`.

**D4. Разбиение гигантов** (разрешено хозяином: «разделяй любые файлы»):
- `lesson_help.tsx` (20 383 строки) — вынести данные/секции, рендерить секции лениво.
- `home.tsx` (3933) — секции ниже первого экрана монтировать вторым проходом (`InteractionManager.runAfterInteractions`); 14 mount-эффектов разделить: критичные к первому кадру vs отложенные; one-shot миграцию `xp_migration_v2` (`home.tsx:926`) убрать из экрана в bootstrap.
- `arena_lobby.tsx` (3801, 33 useEffect) — консолидировать эффекты, Firestore-подписки поднимать только при видимом табе (связка с A2).

**D5. `friends_screen.tsx` (1179 строк)** — проверить, не мёртвый ли дубль таба `friends.tsx`; если жив — применить warm-snapshot паттерн из таба.

## Фаза E — Верификация (после каждой фазы)

- `tsc --noEmit`, `eslint`, `jest --watchman=false` (профильные сьюты + guardrail).
- Ручной протокол на реальном устройстве (iPhone + Android): 10 минут непрерывной навигации по всем табам и 10+ стек-экранам → температура, отклик табов, отсутствие чёрных кадров/прыжков. Сравнение до/после фазы.
- Особые регрессии: арена live-матч (2 устройства), экзамен 60 мин (таймер при уходе/возврате), Back-навигация по всем вложенным экранам на Android (история Fabric-крашей).

## Порядок и зависимости

1. **A1+A2** (корень нагрева) → сразу E-проверка на Android.
2. **B1–B4** (прыжки контекстов + уроки) — независимы от A, можно параллельно.
3. **C1** (фон) → **C2** (fade) → **C3** (убрать setTimeout) → **C4** (прогрев табов, требует A).
4. **D1+D2** (мега-импорты) — независимы, высокая отдача при малом риске.
5. **A3–A6, B5–B7, D3–D5** — вторым эшелоном.

Правила безопасности: каждая правка — атомарный коммит в общую ветку; файлы с чужими незакоммиченными правками (много в дереве!) перед правкой проверять `git diff -- <file>`; при конфликте — обходной путь или доклад «файл редактируется в другой сессии». Никаких worktree/веток/stash.

## Что НЕ делать (уже проверено/опровергнуто)

- ScreenGradient не трогать — моушен уже выключен константой (`SCREEN_GRADIENT_MOTION_ENABLED=false`), лупы не создаются.
- Skia — мёртвый код, не источник нагрева.
- BlurView в рантайме отсутствует и заблокирован тестом.
- Таймеры по allowlist уже приведены к ≥1с каденсу с cleanup — новые setInterval ломают guardrail-тест.
- Провайдеры (кроме Matchmaking) уже мемоизированы — «оптимизировать контексты» повторно не нужно.
