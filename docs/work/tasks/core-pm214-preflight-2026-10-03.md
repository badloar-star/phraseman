# PM-214 preflight: загрузочные состояния и кеш (скелетоны)

Governance-ID: TG-01FCD3D0E1D6
Governance-ID: TG-2604AE121024
Status: PREFLIGHT (только чтение; код, тесты и коммиты не тронуты)
Owner: Ядро; сессия 2026-10-03
Задача: docs/phraseman-2.0/tasks/PM-214.md («меньше вот этих скелетов постоянных», R214), спецификация docs/phraseman-2.0/docs/RUNTIME.md, AGENTS.md → Performance Bible.

Снимок: HEAD `77c4f5aed1e83877393d2b596a344c24b1daf843`, ветка `feature/referral-roulette`. Рабочее дерево грязное (десятки `M`/`MM` от параллельных сессий), поэтому номера строк ниже — по рабочему дереву, а не по HEAD. Прямо сейчас изменены другими сессиями: `app/flashcards_training_setup.tsx` (MM), `app/statsCache.ts` (M), `components/spire/SpireHomeScreen.tsx` (M) — перед правкой сверять.

## Outcome

1. Скелетоны на главных вкладках (Главная, Уроки, Друзья, Настройки) уже cached-first: первый кадр из `app_snapshot_store` / peek-кэшей. Жалоба «постоянные скелетоны» идёт не отсюда.
2. Постоянные скелетоны живут во втором эшелоне экранов: статистика, достижения, ошибки (список и деталь), «Видео», наборы из видео, подписка, Шпиль (пустой кадр), тренажёры карточек, Plus-окно, шторки ИИ-объяснений.
3. Главный структурный дефект (A2): правило владельца 01.10 («ни экранов ошибок, ни «Повторить», тихий повтор») реализовано одним и тем же приёмом: ошибка рисуется ТЕМ ЖЕ скелетоном, а тихий повтор ограничен 5 раз по 20 с. После исчерпания повторов состояние остаётся «error», а рисуется всё тот же скелетон — то есть вечный скелетон с причиной только в логе. Так устроены: Plus-окно, настройка тренировки, «Вспомни», «Сохранённые», диагностика (француз.), «Видео». См. раздел «Худшие места».
4. Часть мест имеет не ограниченное по времени ожидание без отклонения промиса (сеть без таймаута, `await` без потолка): Plus (`getOfferings`), «Вспомни» (`loadDeckCardsMulti`, `energyResult`), `mistake_practice_session` (`confirmSpendOne`), `loadSpireConfig` (Firestore `get`).
5. Есть немые/полупустые `catch` в самом корне скелетона: `app/statsCache.ts:233` (`.catch(() => (_cache.loaded ? _cache : null))` — без лога, на холодном старте даёт `null` → `statsReady` не поднимется никогда).
6. Общих помощников для cached-first достаточно, но они почти не используются: `app/screen_snapshot_store.ts` (владелец 2026-07-27: «ни один экран не показывает скелетон») используют ровно три кэша (`referrals_cache`, `lingman_youtube_cache`, `youtube_catalog_cache`); `useAppSnapshotSelector` — четыре вкладки и `account_details`.
7. Конфликт критериев и сторожей: A2 («честное пустое/ошибка») против правила владельца 01.10, которое защищено тестами (`tests/flashcards_no_loading_or_error_contract.test.mjs`, `dialogue_hub_no_loading_or_error_contract`, `lingman_misc_no_loading_or_error_contract`). Закрывать самому нельзя — нужно решение владельца (раздел «Открытые вопросы»). В `03_DECISIONS.md` записи с ID для правила 01.10 нет — оно живёт в комментариях кода и `OWNER_TASKS_QUEUE.md` (строки 23, 40).

## Scope

Входит: инвентарь экранов со скелетоном/заставкой загрузки, оценка риска вечного скелетона, места «скелетон при наличии кэша», предложение минимального плана. Не входит: реализация, замеры на устройстве (unknown — нет baseline по `config/perf-device-baseline.json`), тексты и дизайн терминального состояния (зона «Дизайн» и решение владельца).

Что НЕ скелетон и не относится: серверные `ActivityIndicator` внутри кнопок/плиток (`opening`, `purchasing`, `busy`) — это индикатор действия, не загрузка экрана.

## Architecture

### 1. Инвентарь (экран → условие выхода; cached-first; потолок/сторож; пусто/ошибка; вечный?)

Обозначения: C — cached-first есть; T — потолок/сторож есть; E — честное пусто/ошибка отличимо; ∞ — может висеть вечно.

**Тренажёры карточек**

| Экран (file:line) | Условие выхода | C | T | E | ∞ |
|---|---|---|---|---|---|
| Блиц `app/flashcards_blitz_session.tsx:1241` (`!blitzAccessGranted \|\| loading \|\| energyGate==='checking'`) | старт эффекта → `setLoading(false)`/`energyGate` | нет (локально) | да: токен запуска `:516`, сторож 20 с `:759` → «Попробовать снова» | да (quota-retry) | закрыто сегодня (b268f22e3) |
| «Устно» `app/flashcards_speaking_session.tsx:1385` | `loading` | нет | да: сторож 20 с `:1164` | да (`:1436`) | закрыто (85f9e7231) |
| «Вспомни» `app/flashcards_recall_session.tsx:790` (`loading \|\| (!activeCard && loadError)`) | `setLoading(false)` в 6 местах `:286-465` | нет | НЕТ сторожа; тихий повтор 5×20 с `:255-268`, после — `:259` лог и тишина | НЕТ: `loadError` рисуется скелетоном | ДА |
| Свайп `app/flashcards_swipe.tsx` (`loadingSources` `:1080`, `keepSkeleton` `:2137`) | `finally` `:2149` | да: `initialSources` (peek) | тихий повтор 5×20 с `:2138-2147`; после — пустое состояние `:4230` | частично: `setLoadError('')` нигде не ставит текст, пусто и ошибка слиты | нет (но до ~100 с при пустом кэше) |
| Настройка тренировки `app/flashcards_training_setup.tsx:526` (`loading \|\| (error && kind==='load')`) | `loadDecks` → `ready`/`error` `:255-296` | да: `peekFcDeckOptions` `:154`, `:158` | тихий повтор 5×20 с `:301-314`; после — `error` рисуется СКЕЛЕТОНОМ | НЕТ (ветка «error» `:561` недостижима для kind=load) | ДА |
| «Сохранённые» `app/flashcards/SavedCollectionStates.tsx:53-66`, `app/flashcards_collection.tsx:1150` | `loading` / `loadError` из `useCollectionData.ts:389-475` | да: `_savedCardsCache`/`_customCardsCache` `:371,:389` | повтор 5×20 с, затем `SavedCollectionLoading` навсегда | НЕТ (`loadError` → скелетон) | ДА |
| Выбор голоса `app/flashcards_voice_picker.tsx:84-100,318` | `setLoading(false)` | нет | нет; в IIFE нет `catch` (`getVoicePrefs` может отклониться) | нет | да, при отказе чтения (`getVoicesOnce` имеет 2 с потолок `tts_voices.ts:125`) |
| Хаб/наборы/мои наборы/видео-наборы `FlashcardsHubScreen.tsx:247-261`, `flashcards_packs.tsx:127,143`, `flashcards_my_packs.tsx:274`, `flashcards_video_packs.tsx:177` | peek-кэши | ДА (эталон) | видео-наборы: повтор 5×20 с `:393-408` | видео-наборы: «пусто» и «ошибка» = одни и те же заготовки `:502` | видео-наборы: да (экран «никогда не пустой») |
| `pack_opening.tsx:387,549` | `setLoading(false)` `:416-474` | нет (данные есть локально для бандловых наборов) | нет; `catch {` без лога `:471` | да (`error` + текст) | да при зависшем `fetchCommunityPackCards` |

**Диалоги**

| Экран | Условие | C | T | E | ∞ |
|---|---|---|---|---|---|
| Хаб диалогов `components/dialogs/DialogueV2CatalogueContainer.tsx:160-277` | `fetchReleasedDialogueV2Catalogue` | ДА: peek → встроенный снимок | тихий повтор 3×30 с | нет «ошибки», остаётся последний каталог или блок Plus; пустой кадр при поломке сборки `:254,:271` (лог) | нет |
| Брифинг `app/dialogue_v2_briefing.tsx:153-196` | peek/каталог | да | неизвестно | да (`unavailable`) | нет |
| Сессия `app/dialogue_v2_session.tsx:243-262,483` | старт сессии | да | повтор 5×4 с → `unavailable` | да | нет |
| `ai_dialog_session.tsx` | импорт `SkeletonBlock` не используется (`:86`) | — | — | — | мёртвый импорт |

**Шпиль**

| `components/spire/SpireHomeScreen.tsx:189` (`config === null` → пустой `<View testID="spire-loading">`) | `loadSpireConfig()` `:109-125` | НЕТ синхронного peek (`useState(null)`) | нет; `loadSpireConfig` без таймаута на Firestore `get` (`app/spire_config_client.ts:99-110`) | замок/«пауза» различимы | пустой кадр, ∞ только при зависшем `get` (unknown) |
|---|---|---|---|---|---|
| `useSpireGame` `app/spire/use_spire_game.ts:100-130` | `spireSyncRoom` | да: `peekSpireRoom` | неизвестно | `roomLoad.status` | нет |

**Профиль / настройки / магазин / Plus**

| Экран | Условие | C | T | E | ∞ |
|---|---|---|---|---|---|
| Статистика `app/streak_stats.tsx:1751,2198` (`!statsReady`) | `loadAll` `:1959-1970` | да: `useState(_sc.loaded)` (модульный кэш `statsCache`) | нет; `loadAll` без try/catch; `refreshStatsCache` `app/statsCache.ts:226-239` на сбое возвращает `null` без лога `:233` | нет | ДА (холодный старт + сбой) |
| Достижения `app/achievements_screen.tsx:957-962,1267` | `achievementsLoaded` | нет синхронного peek (чтение диска асинхронное, но `.catch` → `[]` и выход есть) | неявный (catch) | нет | нет, но скелетон на каждом входе |
| Реферралы `app/referrals.tsx:136,830` | `loading` | да: `initialWarm` (`referrals_cache`) | `finally` `:286` | да | нет |
| Подписка `app/manage_subscription.tsx:279,337-377,741` | `finally` + локальный план | частично: `routeParamPlan` и AsyncStorage (асинхронно) | нет таймаута RevenueCat | да (минимум) | ДА при `!generation.stableId` (`isBootstrapCurrent()` ложно → `setLoading(false)` не вызывается) и при зависшем RC |
| Plus-окно `components/paywall/PaywallPlusScreen.tsx:70,76-90,151`, `app/paywall_purchase.ts:350-434` | `offeringsFailed`/`loading` | нет | авто-ретрай 1×1.5 с в хуке; тихий повтор 5×20 с в экране | НЕТ (`error` → скелетон, кнопка «ждите») | ДА, деньги |
| Онбординг-цены `components/CleanOnboarding.tsx:1882-1950` | `loading` | нет | как у Plus | кнопка «Повторить» есть `:3616` | нет |
| Настройки/Друзья/Главная/Уроки `app/(tabs)/*` | снимок/peek | ДА | — | — | нет |

**Ошибки (журнал)**

| `app/mistakes_hub.tsx:174,216-293` | `snapshot !== null` | да: модульный `hubSnapshotPeek` (только после первого входа) | нет; `open:catch` `:115-118` логирует, но `snapshot` остаётся `null` | нет | да при отказе (данные локальные, риск малый) |
|---|---|---|---|---|---|
| `app/mistakes_list.tsx:59,149` | `items === null` | НЕТ (всегда `null` на входе) | catch → `[]` | ошибка выдаётся за пустоту `:77` | нет |
| `app/mistake_detail.tsx:81,130` | `detail===null` | НЕТ | catch → `'missing'` | ошибка выдаётся за «не найдено» `:95` | нет |
| `app/mistake_practice_session.tsx:934` (`if (loading)` → ПОЛНОЭКРАННЫЙ `ActivityIndicator`) | `prepareMistakePracticeSession` + `confirmSpendOne` | нет | нет; `await confirmSpendOneRef.current` без потолка `:493`; ранний `return` при `stale_account_generation` `:517` | да (`loadError`) | да; нарушение Performance Bible (полноэкранный спиннер) |

**Видео, диагностика, ИИ**

| `app/lingman_videos.tsx:128,520-538` | `catalog`/`snapshot` | ДА (`peekYoutubeCatalogScreenSnapshot`) | нет видимого | НЕТ: `visibleLoading \|\| issue==='error'` и `allVideos.length===0` рисуются скелетоном | ДА при пустом кэше + сбое |
|---|---|---|---|---|---|
| `app/lingman_playlist.tsx:46,97` | `playlist` | да (`catalog`) | нет | нет | при пустом кэше |
| Диагностика (фр.) `app/diagnostic_test.tsx:1179-1208,1495` | `loadFrenchRemoteDiagnosticQuestions` | нет | 5×20 с, затем `:1202` «остаётся скелетон» | НЕТ | ДА (зафиксировано кодом) |
| Шторка объяснения `app/explain_phrase_request.ts:116-123`, `components/ExplainSheet.tsx:297` | `status==='ok'` | да (кэш результата `:90`) | `explain_callable_timeout` у вызова | НЕТ: ВСЕ неуспешные состояния → `showSkeleton:true`, `degraded` всегда `false`; докстринг врёт про «Попробовать ещё раз» | ДА на сбое |
| ELI5-шторка `components/MistakeEli5Modal.tsx:193` (`state !== 'ready'`) | `use_mistake_explain.ts:253,406-423` | — | повтор с backoff до 30 с БЕЗ ограничения числа попыток | типа ошибки нет | ∞ по замыслу, + расход ИИ-вызовов |
| `components/level-exam/LevelExamV2.tsx:127,241-295` | `phase` | — | в async-IIFE нет `catch` (`AsyncStorage.getItem` может отклониться) | да (`identityUnavailable`, `blocked`) | малый риск |

**Learning V2**

| Гейт сессии `app/learning-v2/session/[id].tsx:2117-2191` (`gate==='checking'`) | `energyReady` | скелет шапки с кнопкой «закрыть» | `EnergyContext` ставит `energyReady` в `finally` (fail-open) `components/EnergyContext.tsx:~725-735, 1105-1110`; но `runLoad` ждёт замок restore/wipe (зависание — unknown) | `denied`-модалка | почти нет |
|---|---|---|---|---|---|
| Плеер `app/learning_v2_direct_session_player_v1.tsx:2366-2400` | локаторы маршрута | «недоступно» гасится на выходе | — | да | нет |
| Карта вкладки «Уроки» `app/(tabs)/lessons.tsx:2616-2760` | peek каталога + `learningV2ProgressHydrated` | да (peek), `catch` поднимает флаг | да | — | нет; прогресс стартует с «дефолтом» `lesson-01:session:01` `:2621`, затем патч (видимость в первом кадре — unknown) |

Полный список файлов с `SkeletonBlock`: `rg -l "SkeletonBlock|SkeletonSwap|LessonLoadingSkeleton" app components`. `components/LessonLoadingSkeleton.tsx` определён, но НЕ используется нигде (мёртвый код, 83 строки).

### 2. Худшие места по риску вечного скелетона (ранжировано)

1. **Plus-окно** (`PaywallPlusScreen.tsx:70-90,151`; `paywall_purchase.ts:350-434`). Деньги. `state==='error'` рисуется скелетоном цен, кнопка «ждите» (`PaywallPlus.tsx:296-300`) недоступна; повторов 5×20 с (счётчик `priceRetryRef` не обнуляется при повторном сбое — после пятого повтор остановлен навсегда); `Purchases.getOfferings()`/`initRevenueCat()` без таймаута, а `offeringsLoadInFlightRef` (`paywall_purchase.ts:352-354`) блокирует ВСЕ следующие вызовы, пока висит первый (возврат из фона `:445` тоже не поможет). Сегодняшний сценарий «Блица» — тот же класс.
2. **Настройка тренировки** (`flashcards_training_setup.tsx:526,301-314`) — вход во все четыре тренировки; после 5 повторов вечный скелетон наборов, старт заблокирован (`canStart` `:388`). Файл сейчас правит другая сессия.
3. **«Вспомни»** (`flashcards_recall_session.tsx:790,255-268`) — единственный из четырёх тренажёров без сторожа 20 с; `loadDeckCardsMulti` `:276` и `energyResult` `:~330` без потолка; `catch` внутри IIFE (`:420-470`) ставит `loadError`, а экран рисует скелетон.
4. **«Сохранённые»** (`SavedCollectionStates.tsx:53-66`, `useCollectionData.ts:416-475`) — `loadError` → скелетон навсегда после 5 повторов (счётчик модульный, сбрасывается через 5 мин `:56`); `Promise.all` из семи чтений без таймаута.
5. **Статистика** (`statsCache.ts:233`, `streak_stats.tsx:1959-1970,2198`) — немой `catch` + `null` + `loadAll` без try/catch: на холодном старте при сбое `statsReady` не поднимется.
6. **Шторка объяснения** (`explain_phrase_request.ts:116-123`) — любая неудача = скелетон; ретраи не ограничены (расход платных ИИ-вызовов, 💸) и не идут при `netStatus !== 'online'` (`use_mistake_explain.ts:404`).
7. **«Видео» и видео-наборы** (`lingman_videos.tsx:520-532`, `flashcards_video_packs.tsx:393-408,502`) — «пусто» и «ошибка» неотличимы от загрузки.
8. **Диагностика (французская)** (`diagnostic_test.tsx:1179-1208`) — код сам пишет «остаётся скелетон».
9. **`mistake_practice_session`** (`:934`) — полноэкранный спиннер без потолка; ранний `return` без снятия `loading` при `stale_account_generation` (`:517`).
10. **Подписка** (`manage_subscription.tsx:279,337-377`) — при пустом `stableId` `loading` не снимается; RC без таймаута.
11. **Шпиль** (`SpireHomeScreen.tsx:189`) — пустой кадр на каждом входе (нет peek конфига).
12. **Статистика-ошибки-достижения** (`mistakes_hub`, `mistakes_list`, `mistake_detail`, `achievements_screen`) — не вечные (кроме `mistakes_hub` при отказе), но скелетон на каждом входе.

Не вечные благодаря уже сделанному: Блиц и «Устно» (сторож 20 с + «Попробовать снова»), свайп (`missing` → fail-open, 85f9e7231), хаб диалогов, брифинг/сессия диалога, Learning V2 гейт (кнопка выхода + fail-open энергии).

### 3. «Скелетон при наличии кэша» (default-then-patch) и неиспользованные помощники

Лишний скелетон при локально доступных данных:
- `achievements_screen.tsx:957-962,1273` — состояния читаются с диска асинхронно; синхронного peek нет, скелетон высотой 306 на каждом входе.
- `mistakes_list.tsx:59,149` и `mistake_detail.tsx:81,130` — `useState(null)`, журнал локальный.
- `mistakes_hub.tsx` — peek есть, но модульный и только после первого визита (на холодном старте не прогрет).
- `SpireHomeScreen.tsx:189` — `useState(null)` при кэше конфига 6 ч в AsyncStorage (`spire_config_client.ts:76-95`).
- `manage_subscription.tsx:279` — локальный план читается асинхронно (`:350-361`), `loading=true` до него.
- `flashcards_voice_picker.tsx:84` — список голосов кэшируется на жизнь процесса (`tts_voices.ts:131`), но `loading=true` на первом кадре даже при тёплом `voicesCache`.
- `pack_opening.tsx:387` — для бандловых наборов данные локальны, загрузка стартует с `true`.
- `lessons.tsx:2621-2633` — дефолтный `currentSessionId`, затем патч.
- `home.tsx:649-651` — статус ленты видео `loading` на холодном старте, если peek пуст (что именно рисуется — unknown).

Общие помощники и где ими не пользуются:
- `app/app_snapshot_store.ts` (`useAppSnapshotSelector`, `patchAppSnapshot`): Главная, Уроки, Друзья, Настройки, `account_details`.
- `app/screen_snapshot_store.ts` (`peekScreenSnapshot`, `rememberScreenSnapshot`, `primeScreenSnapshotsFromStorage` — одно чтение диска на старте, TTL 26 ч, `MAX_ENTRIES=24`, лимит записи 24 000 символов): используют только `referrals_cache`, `lingman_youtube_cache`, `youtube_catalog_cache`. НЕ используют: достижения, ошибки, Шпиль, подписка, голос, `pack_opening`, статистика (свой модуль `statsCache`).
- `app/statsCache.ts`, `app/home_screen_hydration.ts`, `app/friends_tab_swr_warm.ts` — собственные peek-модули; логика (peek → state-инициализатор → тихая ревалидация) везде своя, копипастой.
- Общего хука «cached-first + потолок + терминальное состояние» нет.
- Опорные реализации «как надо»: `DialogueV2CatalogueContainer.tsx:100-277`, `FlashcardsHubScreen.tsx:247-261`, `flashcards_training_setup.tsx:148-160`, `lingman_videos.tsx:120-147`.

### 4. Минимальный план (не реализован)

Принцип по RUNTIME.md: не строить ещё один framework поверх существующего; один понятный контракт.

**Паттерн (один чистый модуль + тонкий хук, без новых job/очередей/Firebase-операций):**
- `app/load_gate.ts` (чистая логика, тестируется без React) и `hooks/use_cached_first_load.ts`: вход `{ id, peek(): T | null, load(signal-token): Promise<T>, ceilingMs, retry: {max, delaysMs}, accountToken }`; выход `{ data, status: 'cached' | 'fresh' | 'pending' | 'empty' | 'unavailable', reload }`.
- Инварианты: (1) первый кадр из `peek` синхронно, без default-then-patch; (2) актуальность запуска по токену запуска (как `blitzStartRunRef`), НЕ по cleanup-флагу; (3) `finally` всегда переводит в терминальное состояние, любой `return`/`catch` пишет причину `[LOAD-GATE:<id>]` с мс и значением; (4) потолок (`Promise.race`+таймер), поздний ответ применяется, если запуск ещё актуален; (5) терминальное состояние — НЕ скелетон: `empty` (данных нет) отличается от `unavailable` (сбой); (6) смена аккаунта/языка сбрасывает и не применяет старый результат (`isCurrentAccountGeneration`); (7) 0 новых чтений Firestore: повторы остаются теми же, что сейчас (5×20 с и т. п.), счётчик не увеличивается; диагностика в `DebugLogger`/`trackEvent` существующими каналами (в админку — unknown, нужен существующий канал, нового не заводить).
- Скелетон остаётся только как `pending` в пределах потолка, с зарезервированными размерами (`SkeletonBlock`, как в `app/review.tsx`).

**Порядок (мелкими атомарными шагами, каждый — отдельный коммит):**
0. Решение владельца по терминальному состоянию (см. вопросы) — блокирует всё, что рисует конец состояния.
1. Plus-окно (деньги): потолок на `initRevenueCat`/`getOfferings`, сброс `offeringsLoadInFlightRef` по потолку, счётчик повторов обнулять при успехе/ре-входе, терминальное состояние цены (без выдуманных цен).
2. Контур тренировки одним пакетом: `flashcards_training_setup`, `flashcards_recall_session` (сторож 20 с как у Блица, потолок на `loadDeckCardsMulti`), `SavedCollectionStates`/`useCollectionData`, остаток свайпа (`loadError` реально различим). Файлы — с учётом параллельных правок.
3. Статистика: убрать немой `catch` в `statsCache.ts:233` (лог причины), `try/catch/finally` в `loadAll`, терминальное состояние `statsReady`.
4. ИИ-шторки: `resolveExplainDisplay` возвращает `degraded` на сбое + ограничение числа повторов (💸).
5. «Видео», видео-наборы, диагностика: терминальное состояние вместо вечного скелетона.
6. Peek-слой для вторых экранов через существующий `screen_snapshot_store` (достижения, ошибки список/деталь, Шпиль-конфиг, подписка) — только синхронная гидрация, без новых записей в Firestore.
7. Замена полноэкранного `ActivityIndicator` в `mistake_practice_session.tsx:934` скелетоном с финальной геометрией и потолком; мёртвые `LessonLoadingSkeleton`, импорт в `ai_dialog_session.tsx:86` — отдельным коммитом (по D78, с картой потребителей).

**Тесты (точечно, `npm run test:one -- tests/<файл>`; полный сюит не гонять; тяжёлое — под светофором):**
- Новые: юнит чистого `load_gate` (потолок, поздний ответ, устаревший токен, смена аккаунта, повторы не растут); исходниковый сторож «каждая ветка скелетона имеет потолок или терминал» с ратчетом (может только уменьшаться, как `config/layout-stability-baseline.json`).
- Не ослаблять: `tests/layout_stability_contract.test.ts` (+ baseline), `tests/perf_freeze_contract.test.ts`, `tests/pm229_silent_catch.probe.ts`.
- Править ОСОЗНАННО после решения владельца: `flashcards_no_loading_or_error_contract.test.mjs` (запрещённые тексты, test id `fc-recall-load-error`, `fc-training-setup-retry`, регулярки `[FC-RECALL] тихий повтор` и т. д.), `dialogue_hub_no_loading_or_error_contract`, `lingman_misc_no_loading_or_error_contract`, `flashcards_entry_fail_open_contract` (окна по тексту), `explain_background_retry_contract`, `league_hydration_no_endless_skeleton_contract` (устарел: лиги удалены, но формулировка контракта — образец).

**Риски:**
- Параллельные сессии правят `flashcards_training_setup.tsx`, `statsCache.ts`, `SpireHomeScreen.tsx` — перед правкой сверять `git status`, при конфликте сообщать «файл редактируется в другой сессии».
- Сторожа с regex по тексту (`тихий повтор`, test id) ломаются при переименовании логов.
- Терминальное состояние = новый UI-текст/пустой экран → зона «Дизайн», 9 языков, `triLang`.
- Потолок слишком короткий даст ложный «пусто» на медленной сети; цифры — после замера (RUNTIME.md: «цифры лимитов — после baseline»; baseline на слабом телефоне — unknown).
- Поздний ответ после потолка не должен затирать более свежее локальное состояние (last-write-guard).

## Security and privacy

- Новых данных, полей, сервисов и разрешений план не вводит; privacy policy не затрагивается.
- Логи `[LOAD-GATE:*]` — без полного stableId (8 символов, как в `[FC-BLITZ-GATE]`), без текстов пользователя.
- Plus-окно: терминальное состояние не должно подставлять цены/пробный период не из стора (правило «ТОЛЬКО из стора» в `paywall_purchase.ts:458-470`).
- Снимки экранов — на диске, привязаны к аккаунту (`accountScopeKey`); новые потребители обязаны использовать `peekScreenSnapshotForToken`, чтобы чужой кэш не попал в UI после смены аккаунта.
- App Check не упоминается и не предлагается (запломбирован).

## Technical debt

- Копипаста «тихий повтор 5×20 с» в 8+ местах (`flashcards_recall_session`, `training_setup`, `SavedCollectionStates`, `SavedTopCommunityPacks`, `flashcards_my_packs`, `flashcards_video_packs`, `PaywallPlusScreen`, `diagnostic_test`, `dialogue_v2_*`) с разным поведением на исчерпании.
- Правило владельца 01.10 нигде не записано в `03_DECISIONS.md` как D-номер; живёт в комментариях и тестах.
- Немые/глухие места на пути к скелетону: `statsCache.ts:233` (`.catch` без лога), `pack_opening.tsx:471` (`catch {` без лога), `flashcards_voice_picker.tsx:90-98` и `LevelExamV2.tsx:246-295` (async-IIFE без `catch`), ранние `return` без `setLoading(false)` (`mistake_practice_session.tsx:517`, `useCollectionData.ts` на `!isCurrentAccountGeneration`), `mistakes_hub.tsx:115` (`catch` не выводит из скелетона).
- Мёртвое: `components/LessonLoadingSkeleton.tsx`, импорт `SkeletonBlock` в `ai_dialog_session.tsx`, ветка `state==='error'` в `flashcards_training_setup.tsx:561` (недостижима для kind=load), докстринг `resolveExplainDisplay` (врёт про retry).
- Спам логов: `DialogueV2CatalogueContainer.tsx:253` пишет `console.warn` на КАЖДЫЙ рендер в состоянии `loading`.
- Не измерено на устройстве (unknown): сколько реально миллисекунд скелетон виден на втором эшелоне экранов; доля пользователей, упирающихся в исчерпанные повторы; расход ИИ-вызовов на повторах объяснений; поведение `loadSpireConfig`/`getOfferings` при полном офлайне.
- Диагностика → админка (карточка влияния): канал для событий «скелетон не снялся за потолок» — unknown, нужно выбрать существующий (`DebugLogger`/`trackEvent`), нового коллектора не создавать.

## Verification

Выполнено (только чтение): Read/Grep/`git show --stat`/`git log` по `docs/phraseman-2.0/tasks/PM-214.md`, `RUNTIME.md`, `AGENTS.md` (Performance Bible), коммитам b268f22e3 и 85f9e7231, перечисленным файлам и тестам-сторожам. Тесты, `tsc`, jest, Metro не запускались (светофор не брался: работа лёгкая). Номера строк — по рабочему дереву на момент чтения.

Для приёмки реализации (план): `npm run test:one` по новым и затронутым контрактам; `npm run typecheck` — только владелец/под слотом; проверка на эмуляторе по логам `[LOAD-GATE:*]`: (а) холодный вход при сломанной сети, (б) самолётный режим → ожидание потолка → терминальное состояние, (в) смена аккаунта в полёте.

Критерии PM-214: A1 (cached-first экран + честное пусто/ошибка) — НЕ закрыт, зависит от решения владельца по терминальному состоянию; A2 (ошибки не прячутся вечным скелетоном) — НЕ закрыт, найдено ≥8 мест.

Gates (оба закрыты общим пакетом `docs/phraseman-2.0/evidence/GATES_COMMON_2026-10-01.md`, Q76; подтвердил координатор по делегированию владельца 2026-10-01, владелец вправе отозвать):
- BASELINE_SHA_APPROVED: рабочая база — `feature/referral-roulette` (D30); HEAD на момент этого preflight `77c4f5aed1e83877393d2b596a344c24b1daf843`; в карточке задачи `Audit SHA` не установлен — проставить при начале реализации.
- DOMAIN_AUDIT_AND_IMPACT_ACCEPTED: принят общим пакетом; карточка влияния конкретной задачи — этот файл (требует подписи координатора/владельца: пункт «диагностика → админка» помечен unknown).

## Rollback

Сейчас откатывать нечего: изменён только этот файл (создан). Откат — удалить `docs/work/tasks/core-pm214-preflight-2026-10-03.md`. Для будущей реализации: каждый шаг плана — отдельный коммит, откат `git revert`; хуки/состояния за общим модулем `load_gate` можно отключить заменой вызова на прежний локальный эффект, т.к. снимки и повторы остаются прежними (0 новых операций Firebase).

## Открытые вопросы владельцу (не закрывать самостоятельно)

1. Что рисовать, когда потолок истёк и данных нет? Правило 01.10 запрещает тексты ошибок и «Повторить», но A2 требует честного состояния. Варианты: (а) показать последнее известное содержимое + спокойная пустая плитка без слова «ошибка» и тихие повторы продолжаются с backoff; (б) пустая плитка с жестом pull-to-refresh; (в) оставить как есть (вечный скелетон) — противоречит A2.
2. Потолок: числа (для локального чтения ~2–3 с, для сети ~10–20 с) — по замеру; baseline на слабом телефоне — у владельца.
3. Plus-окно: что показывать вместо цен при исчерпании (без выдуманных цен) и нужна ли явная кнопка (деньги: исключение из «без Повторить»?).
4. ИИ-объяснения: ограничить число автоповторов (расход платных вызовов) — какое?
5. Записать правило 01.10 как D-номер в `03_DECISIONS.md` (чтобы сторожа ссылались на решение).

## Файлы, которые читал (абсолютные пути)

C:\appsprojects\phraseman\docs\phraseman-2.0\tasks\PM-214.md; C:\appsprojects\phraseman\docs\phraseman-2.0\docs\RUNTIME.md; C:\appsprojects\phraseman\AGENTS.md; C:\appsprojects\phraseman\app\screen_snapshot_store.ts; C:\appsprojects\phraseman\app\app_snapshot_store.ts; C:\appsprojects\phraseman\app\statsCache.ts; C:\appsprojects\phraseman\app\paywall_purchase.ts; C:\appsprojects\phraseman\components\paywall\PaywallPlusScreen.tsx; C:\appsprojects\phraseman\app\flashcards_recall_session.tsx; C:\appsprojects\phraseman\app\flashcards_training_setup.tsx; C:\appsprojects\phraseman\app\flashcards\SavedCollectionStates.tsx; C:\appsprojects\phraseman\app\flashcards\useCollectionData.ts; C:\appsprojects\phraseman\app\explain_phrase_request.ts; C:\appsprojects\phraseman\tests\flashcards_no_loading_or_error_contract.test.mjs.
