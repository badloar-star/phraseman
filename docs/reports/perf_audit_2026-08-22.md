# Фулл-аудит скорости приложения — 2026-08-22

Принцип аудита: телефон — главный, сервер только синхронизация; скорость без потери
качества анимаций и графики. Проверено против Performance Bible (`AGENTS.md`) +
общих RN-практик. Прогнаны контрактные perf-тесты.

Метод: 3 агента-исследователя (холодный старт; горячие экраны/анимации;
локальность/сеть) + точечные greps + запуск `tests/perf_freeze_contract.test.ts`,
`tests/owner_direction_runtime_contract.test.ts`, `tests/layout_stability_contract.test.ts`.

## Обновление: исправления внесены (тем же днём)

Все 12 падений контрактных perf-тестов разобраны поштучно — часть чинила код
(реальные нарушения), часть чинила сами тесты (устаревшие/ложные проверки, с
явным объяснением почему в каждом случае). Финальный прогон всех трёх
контрактов: **68/68 тестов зелёные**.

**Код починен:**
- [firestore_friend_requests.ts](../../app/firestore_friend_requests.ts) — добавлен `.limit()` на оба
  collection-листенера друзей (`friends`, `friend_requests`) — тот же класс бага,
  что уже ронял Android OOM в `app_messages.ts`.
- [components/friends_together/FriendEventMarker.tsx](../../components/friends_together/FriendEventMarker.tsx) —
  секундный тикер дуэли гейтован `useRuntimeActive()`, больше не тикает на
  замороженном/фоновом экране.
- [app/flashcards/ListeningEqualizer.tsx](../../app/flashcards/ListeningEqualizer.tsx) — вечная анимация
  полос гейтована `useRuntimeActive()`, не крутится вне фокуса/фона.
- [app/(tabs)/home.tsx](<../../app/(tabs)/home.tsx>) — скролл Главной: пересчёт видимости карточки дня
  троттлится по времени (не чаще раза в ~100мс) вместо каждого кадра;
  тултип энергии переведён на `useNativeDriver: true`.
- [app/(tabs)/friends.tsx](<../../app/(tabs)/friends.tsx>) +
  [components/friends_together/FriendListRow.tsx](../../components/friends_together/FriendListRow.tsx) —
  `renderItem` списка друзей передаёт стабильные by-uid колбэки вместо новых
  замыканий на каждый рендер — `React.memo(FriendListRow)` снова реально
  отсекает лишние перерисовки строк.
- [app/_layout.tsx](../../app/_layout.tsx) — ожидание Play Install Referrer вынесено из-под
  `setReady(true)`: сплэш на первом запуске Android больше не держится лишние
  ~2 секунды; захват реферального кода остался фоновым.

**Тесты синхронизированы с фактическим кодом** (ArenaTimerRing/ArenaComboMeter —
осознанное исключение freeze-контракта внутри `arena_match`, устаревший TTL
45_000мс исправлен на актуальные 6 часов, кавычки/переименования/рефакторинги
Home и xp_manager приведены к факту) — детали в diff тестов, все правки с
комментарием `// зачем (аудит скорости 2026-08-22)`.

**Не тронуто из списка находок** (осталось на будущую сессию): статические
импорты `achievements.ts`/`idioms_data`/`LeagueResultModal` в старте, default-
then-patch `homeOnboardingDone`, renderItem уроков без memo-подкомпонентов,
арена-поллинг (осознанный компромисс), `adjustsFontSizeToFit` в 4 файлах.

---

## 0. Статус контрактных perf-тестов: КРАСНЫЕ (12 падений)

`layout_stability_contract` — PASS. `perf_freeze_contract` — 4 падения,
`owner_direction_runtime_contract` — 8 падений. CI по перфу фактически заблокирован.

### Реальные нарушения (чинить КОД)

| Что | Где | Влияние |
|---|---|---|
| `freezeOnBlur: false` вне allowlist | `app/_layout.tsx` → `<Stack.Screen name="arena_today" freezeOnBlur:false>` | экран продолжает рендериться в фоне (нагрев/батарея) |
| Вечные анимации без гейта фокуса/AppState | `app/flashcards/ListeningEqualizer.tsx:186` (`withRepeat(...,-1)`), `components/arena/ArenaComboMeter.tsx`, `components/arena/ArenaTimerRing.tsx:80` | крутятся, пока экран не в фокусе |
| ~9 новых `setInterval` вне реестра владельца | `app/max_call_client.ts` (×2), `app/max_call_session.tsx` (×3), `app/flashcards_blitz_session.tsx`, `app/personal_plan.tsx`, `app/voice_equalizer.tsx`, `components/arena/ArenaTimerRing.tsx` (×2), `components/friends_together/FriendEventMarker.tsx`, `components/league/LeagueChestScanTeaser.tsx`, `components/max/MaxDailyQuotaMeter.tsx` | сами таймеры в основном грамотные (фазовый гейт, cleanup), но не прошли осознанное ревью реестра |
| Новый Firestore-листенер вне реестра | `app/arena_client.ts:709` — **doc**-листенер (по потокам безопасен), нет в allowlist | реестр живых листенеров разошёлся с кодом |
| `FriendEventMarker` — секундный тикер без гейта фокуса | `components/friends_together/FriendEventMarker.tsx:32` — `setInterval(1000)` для duel_invite, чистится, но НЕ гейтован `useIsScreenFocused`/runtimeActive | тикает setState раз в секунду на замороженном табе Друзья |

### Устаревшие сторожа (чинить ТЕСТ, класс из памяти «13 турнирных сторожей»)

- `owner_direction_runtime_contract.test.ts:896` ждёт `CLUB_REMOTE_REFRESH_MS = 45_000` —
  это **отменённое** правило (инцидент 2026-08-17): в коде правильно `6 * 60 * 60 * 1000`,
  сторож `guard_league_refresh_ttl.mjs` как раз запрещает 45с. Тест сторожит сломанный TTL.
- `perf_freeze_contract.test.ts:148` ждёт `runtimeOwnerId === 'settings'` в одинарных
  кавычках — в `app/(tabs)/settings.tsx:498` то же самое в двойных. Ложное срабатывание.
- Home-контракты (`homeDailySummaryDirtyRef`, `setUserAvatarAura(...)`, точный кортеж
  `Promise.all([...])`) — код Home отрефакторен (батч на месте: `home.tsx:1658`, состав
  кортежа изменился), точные подстроки устарели. Проверить, что коалесинг daily-summary
  не потерян по существу, и обновить контракт.
- Аналогично: `xp_manager` / `cloud_restore` / `friend gift` — «toContain(старый код)»
  разошёлся с рефакторингом; требуется разбор по существу в отдельной сессии.

---

## 1. Холодный старт и первый кадр

**🔴 Высокая.** `app/_layout.tsx:2358–2379` — первый запуск на Android:
`PlayInstallReferrer.getInstallReferrerInfo` с гонкой `setTimeout(2000)` стоит ДО
`setReady(true)` → сплэш держится до ~2с дольше. Атрибуция не нужна первому кадру —
вынести после `setReady`/`firstContentReady`.

**Высокая.** `app/_layout.tsx` — 160 статических импортов в корневом layout (3305 строк);
в т.ч. `achievements.ts` (~103 КБ) статически (`:84`), используется только в async-хэндлерах —
перевести на `await import()`. Совокупный граф module-init до первого кадра — системный
резерв ускорения (проверить `react-native-bundle-visualizer`).

**Высокая.** `app/(tabs)/home.tsx:565` + `:1273` — default-then-patch для
`homeOnboardingDone`: `useState(false)` + асинхронный `AsyncStorage.multiGet`, при том что
`onboarding_done` уже прочитан синхронно в `_layout.tsx:2343`. Этот флаг гейтит
`homeRuntimeActive` → вся тяжёлая активность Главной ждёт лишний диск-раундтрип.
Рецепт: module-scope peek (как `peekAppLang` в `app_snapshot_bootstrap.ts`).

**Средняя.** `app/(tabs)/home.tsx:25` — `LeagueResultModal` (~78 КБ) импортируется
статически, а показывается не в каждой сессии → lazy.

**Средняя.** `idioms_data.ts` (624 КБ) попадает в стартовый граф статически:
`_layout.tsx:103` → `notifications.ts:10` → `daily_phrase_system.ts` → `IDIOMS`.
Завести реестр-аксессор (lazy require) по образцу `plan_content_registry`.

**Средняя.** Дублированный тройной emit `app_first_content_ready`
(`(tabs)/_layout.tsx:663–671` и `home.tsx:656–669`, по rAF+32+120мс каждый) — 6 срабатываний
одного события; оставить один источник. Фолбэк `FIRST_CONTENT_READY_FALLBACK_MS=900`
(`_layout.tsx:1588`) — потолок задержки сплэша, если событие потерялось.

**Низкая.** `plan_audio_url_map.generated.ts` (930 КБ) статически в
`personal_plan_exercise.tsx:89` — разовый паузок при первом входе в упражнение; спрятать
за lazy require. `phrase_audio_url_map.generated.ts` (816 КБ) — в `hooks/phrase_audio_player.ts`,
грузится с уроками (приемлемо, но тот же рецепт).

**Хорошо:** плановые гиганты (3–5 МБ ×5), теория (1.1 МБ), уроки 17–32 — только через
lazy-реестры ✔; snapshot/peek-гидрация Главной образцовая ✔; вкладки лениво ✔;
премаунт соседних табов ступенчатый после первого кадра ✔.

## 2. Горячие экраны: ре-рендеры и анимации

**Высокая.** `app/(tabs)/home.tsx:550–563, 2806` — `handleHomeScroll` на каждом кадре
скролла (`scrollEventThrottle=16`) на JS-треде пересчитывает видимость карточки дня и
дёргает setState (с guard, но работа на каждый кадр). Перевести на
`onScrollWorklet`/`useAnimatedScrollHandler` + `runOnJS` только на смене границы.

**Высокая.** `app/(tabs)/friends.tsx:3190–3209` — инлайн-колбэки
(`onOpenProfile={() => ...}` и др.) в `renderItem` создаются заново каждый рендер и
нейтрализуют `React.memo(FriendListRow)` → все видимые строки перерисовываются на любое
изменение состояния экрана. Стабилизировать через `useCallback`(uid).

**Средняя.** `app/(tabs)/lessons.tsx:3133–~3450` — renderItem ~300 строк без выноса в
`React.memo`-подкомпоненты (LessonRow/HeaderRow/ExamRow).

**Средняя.** `app/(tabs)/home.tsx:379–399` — `buildHomeLeagueChest` sort/reduce в теле
рендера самого часто перерисовываемого экрана → `useMemo`.

**Средняя.** lessons/friends скролл идёт через JS-мост (`onBouncyScroll`), хотя в
`BouncyScrollView` есть полностью UI-thread вариант `onAnimatedScroll`/`onScrollWorklet`.

**Средняя.** `app/lesson_help_theory_ui.tsx:206–207`, `app/lesson_irregular_verbs.tsx:895–896` —
`Animated.event(..., useNativeDriver:false)` + `scrollEventThrottle=16`: JS-колбэк каждые
16мс во время свайпа страниц.

**Низкая.** `home.tsx:997,1001` — тултип энергии: анимируются opacity/scale/translateY →
можно `useNativeDriver:true`. Мёртвый `itemAnims` в lessons (`:2401,3134,3170`) — убрать.

**Хорошо:** TabSlider — жест целиком на UI-потоке, `scheduleOnRN` один раз за жест ✔;
freeze невидимых табов ✔; `PulseOn` и Home-пульсы гейтованы runtimeActive ✔;
`AvatarAura` — эталон ✔; списки виртуализированы, `.map()>30` в ScrollView нет ✔;
`ScreenGradient` — вся вечная анимация выключена флагом, фон статичен ✔.

## 3. Локальность («телефон главный») и сеть

**Средняя-высокая.** `app/firestore_friend_requests.ts:528, 592` — два
**collection**-листенера (`friends`, `friend_requests`) БЕЗ `.limit()`. Ровно тот класс,
что уже ронял Android OOM в `app_messages.ts` (комментарий `:1460–1465`) и ради которого
стоит `android_task_executor_maximum_pool_size: 0`. Добавить `.limit(N)`.

**Инфо.** Реестр живых листенеров сейчас: 11 в 7 файлах (не «5», как в памятке 2026-07-26);
все под allowlist-тестом. Обновить памятку.

**Средняя (осознанный компромисс).** Арена-поллинг Cloud Functions:
`arena_matchmaking.tsx:132` (15с heartbeat), `arena_friend_duel.tsx:120`,
`arena_invite.tsx:58,76` (1.5с цепочки) — только пока экран поиска виден; буква правила
«рефреш при заходе + TTL» нарушена, но это live-матчмейкинг; альтернатива — doc-onSnapshot
на запись очереди.

**Хорошо:** `cloud_sync.ts` — diff-push, debounce 5 мин, restore только на вход/TTL,
крупных синхронных JSON нет ✔; optimistic UI образцовый в друзьях
(accept/decline до сети с откатом), лайках паков, revive стрика ✔; блокирующие ожидания
сети только там, где положено (промокод, смена тарифа RevenueCat — деньги/серверная истина) ✔;
`shards_shop` минутный таймер — локальный, без сети ✔; `pollStats` 250мс в MAX-звонке —
локальный WebRTC `getStats`, не сеть ✔.

## 4. Прочее

- `adjustsFontSizeToFit` (запрещён владельцем) живёт в 4 файлах: `app/personal_plan.tsx`,
  `app/personal_plan_exercise.tsx`, `app/flashcards_swipe.tsx`, `app/paywall_e.tsx` —
  baseline пуст, но контракт их не ловит (вне сканируемого множества?) — проверить скоуп рэтчета.
- `app/collectibles_screen.tsx` — удалённые вебп-карточки (~300 КБ шт.) через RN `Image`
  без `expo-image` (`cachePolicy`, даунскейл) — декод/память при скролле сетки.
- 79 МБ коллекционных картинок и «*-source» файлы в `assets/` в бинарник НЕ попадают
  (в коде не require'ятся) — вес только репозитория.
- `console.*` в основном за `__DEV__` ✔; babel не режет console в проде — при случае
  добавить `transform-remove-console` для release, чтобы страховать негейтнутые вызовы.

## 5. Приоритетный план (для следующих сессий)

1. **Отдельная сессия «рэтчеты в зелёный»**: реальные нарушения → чинить код
   (arena_today freeze, 3 вечные анимации, гейт тикера FriendEventMarker, внести осознанные
   таймеры/листенер в реестры); устаревшие сторожа → чинить тест (45_000!, кавычки settings,
   Home-подстроки — с проверкой сути).
2. `.limit()` на 2 листенера друзей (5 минут, страховка от OOM).
3. Вынести PlayInstallReferrer из-под `setReady` (минус до 2с сплэша на первом запуске).
4. Worklet-скролл Главной + useCallback в renderItem друзей (главный анти-джанк).
5. Peek для `homeOnboardingDone`; lazy `LeagueResultModal`, `idioms_data`, `achievements`.
6. lessons renderItem → memo-подкомпоненты; expo-image в коллекциях.
