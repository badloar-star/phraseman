# HEAT_REPORT — Аудит накопителей нагрузки (Phraseman RN)

Симптом: приложение греется и тормозит **через несколько минут** использования и несколько экранов; после перезапуска снова шустрое → это **накопление живых ресурсов при навигации**, а не разовый тяжёлый экран.

Уже закрыто другими сессиями (не дублируем, считаем `DONE`):
- **Таймеры/polling** приведены в порядок: sub-second интервалы → 1с, polling-кадансы выправлены, есть guardrail `tests/owner_direction_runtime_contract.test.ts` (allowlist на `setInterval`/`onSnapshot`).
- **События/тосты/оверлеи** разобраны: см. `CLASS_REGISTRY_EVENTS_TOASTS.md`.

Проверено 7 классов накопителей, 7 аудиторов + верификация скептиком. Ниже — только то, что осталось.

---

## 🔄 АКТУАЛЬНЫЙ СТАТУС (сверка с кодом после правок других сессий)

Коммит `fa33a3607` ("perf: устранить накопительные утечки…") уже закрыл часть моих находок:

**✅ УЖЕ ПОЧИНЕНО (другая сессия) — НЕ трогать:**
- `AvatarAura` — добавлен проп `animate` + AppState-гард, анимация ауры гасится в фоне/списках.
- `phrase_audio_player` — слушатель снимается при прерывании фразы.
- `league_chest_rewards` — убрана гонка, оставлявшая onSnapshot-сирот.
- `_layout` — подписка `remote_config` закрывается в cleanup; подписка на бонусы лиги не пересоздаётся каждый рендер.
- `home` — бесконечный shimmer переведён на нативный драйвер и гасится.
- `LeagueChatPanel` / `cachedMessagesMemory` — кеш чата теперь чистится через `forgetCachedLeagueChatRoom` (LeagueChatPanel.tsx:222).
- `personal_plan_exercise` — аудио-слушатели теперь снимаются в cleanup (return с `.remove()`).

**❌ ОСТАЛОСЬ (не тронуто, всё ещё актуально):**
1. **КОРЕНЬ №1: `freezeOnBlur: false`** — `app/_layout.tsx:2383`, на месте. Самый большой рычаг, требует решения хозяина (T1, осторожно из-за Android/Fabric).
2. **`_profilesCache`** — `app/friends_tab_swr_warm.ts:41`, очистки/лимита по-прежнему НЕТ → монотонный leak.
3. **`phraseIndex`** — `app/phrase_analytics.ts:195`, инвалидация только вручную.
4. **`exam.tsx` 60-мин таймер** — без паузы на blur (нужно бизнес-решение: считать фоновое время или нет).
5. **arena_* onSnapshot/таймеры** на горячих экранах — требуют решения (realtime-матч, нельзя бездумно усыплять).
6. **Точечные модал-анимации** (`PremiumCelebrationModal`, `CardPackShardPaywallModal`, reward-модалы) — cleanup привязан к `visible`, а не к unmount.

Итог: «лёгкие» точечные накопители другая сессия добила. Осталось **тяжёлое и спорное** — корневой freeze + 2 кеша + экзамен/арена, всё под решение хозяина.

---

> **Поправки после ручной проверки кода (важно — приоритет над оценками агентов):**
> 1. **`ScreenGradient` НЕ активный накопитель.** Глобальный флаг `SCREEN_GRADIENT_MOTION_ENABLED = false` ([ScreenGradient.tsx:22](components/ScreenGradient.tsx:22)) при `false` делает early-return в каждом анимационном `useEffect` (строки 131, 235, …) — `Animated.loop` **не создаётся**, рендерится статичный `<View>`. Фоновое движение градиента **уже выключено**. Понижено с HIGH №1 до **не-проблема** (пока флаг `false`).
> 2. **`useAudioPlayer` (expo-audio) выгружается на unmount хуком.** Cleanup на размонтировании ЕСТЬ. Реальная проблема — `updateInterval:250` тикает, пока компонент жив, а при `freezeOnBlur:false` он не размонтируется при уходе с экрана. Это **производная от корня №1**, а не самостоятельный «leak без cleanup». Severity → medium.
> 3. **Корень №1 (`freezeOnBlur: false`) подтверждён вручную** — [app/_layout.tsx:2359](app/_layout.tsx:2359), глобально в `screenOptions`. Поставлен осознанно (рядом — обход падений Android/Fabric на native-stack). Это T1: менять осторожно.
> 4. **Skia = dead code подтверждён вручную:** нет в `package.json`, нет в `node_modules`, не импортируется. Не источник нагрева.
> 5. **`_profilesCache` leak подтверждён вручную** — [friends_tab_swr_warm.ts:41](app/friends_tab_swr_warm.ts:41): модульный синглтон, только spread-merge, ни одной точки delete/clear/limit/TTL.

---

## 1. Краткое резюме: ранжирование классов по вкладу в нагрев

Главное наблюдение: **корень — архитектурный, а не точечный.** В навигаторе (`app/_layout.tsx`, `app/(tabs)/_layout.tsx`) **нет `freezeOnBlur`/`enableFreeze`/`detachInactiveScreens`**, поэтому все ушедшие в стек экраны остаются **полностью смонтированы и активны**. Из-за этого почти каждый класс ниже усиливается: накопитель, который при правильном freeze «замолчал бы» при уходе с экрана, продолжает молотить в фоне. Это объясняет именно «через несколько минут и несколько экранов».

Ранжирование (вклад в накопление/нагрев, по убыванию):

1. **Reanimated / Animated бесконечные анимации (`withRepeat(-1)`, `Animated.loop`)** — НАИБОЛЬШИЙ вклад.
   - Живут на **корневом уровне** (`ScreenGradient` оборачивает каждый экран: Orbs / GoldFabricFlow ×4 параллельных лупа / CinemaParticles) и на **много-экранных** компонентах (`AvatarAura`, `PremiumGoldButton`, `HoloFoilCard`, `CollectibleArtFrame`).
   - cleanup на размонтировании в основном есть, но **никто не паузится при blur экрана и при уходе app в background** → при отсутствии freeze анимации копятся по мере навигации и греют GPU/UI-thread непрерывно. Это самый «горячий» и самый системный класс.

2. **Экраны без паузы при blur (`setInterval` + `withRepeat`, удерживаемые смонтированными)** — второй по тяжести и фактически **усилитель класса №1 и Firestore**.
   - `exam.tsx` (таймер на 60 мин тикает в фоне), `arena_game/results/leaderboard`, `CardPackShardPaywallModal` (подтверждён: `withRepeat(-1)` без `cancelAnimation` на blur/unmount).
   - Это прямое следствие отсутствия freeze + локальных пропусков `useFocusEffect`.

3. **Аудио-плееры (`useAudioPlayer` без cleanup)** — узкий по месту, но **тяжёлый по ресурсу**.
   - `personal_plan_exercise.tsx`: два плеера без `useEffect`-cleanup, один с `updateInterval: 250` (повторяющийся status-listener). На длинной сессии упражнений/повторной навигации копятся декодеры/буферы/файловые хэндлы и тики. Подтверждено ×2.

4. **Firestore `onSnapshot`** — средний вклад, но **опасен на «горячих» арена-экранах**.
   - Большинство подписок имеют cleanup. Реальные риски: `arena_lobby` (`friendUnsubRef` — partial cleanup, runsAfterLeave=yes) и арена-сервисы, у которых отписка зависит от вызывающего. При отсутствии freeze слушатели БД продолжают принимать апдейты на невидимых экранах.

5. **Растущие кеши Map/Record (монотонный рост)** — медленный, но **настоящий leak** (не сбрасывается до перезапуска).
   - `friends_tab_swr_warm.ts._profilesCache` (spread-merge, нет delete/TTL/limit — HIGH), `firestore_league_chat.ts.cachedMessagesMemory` (ключи-комнаты не удаляются), `phrase_analytics.ts.phraseIndex` (все 32 урока в памяти, инвалидация только вручную).

6. **Слушатели событий / AppState** — **вклад ≈ 0**. Все 28 находок имеют корректный cleanup (`DONE`-класс по факту).

7. **Skia Canvas** — **вклад 0 (DEAD CODE)**. Skia установлена, но нигде не импортируется/не используется. Кандидат на удаление (~45 МБ бандла), но не источник нагрева.

---

## 2. Таблица подтверждённых накопителей

Отсортировано: severity ↓, затем scope (глобальные/много-экранные хуже точечных). `confirmed` — подтверждённые скептиком; ниже также добавлены HIGH из `allFindings`, которые скептик не помечал отдельно, но они того же ранга и нужны для полноты картины.

### 2a. Подтверждённые скептиком (confirmedSuspects)

| file:line | Что создаётся | cleanup | Работает в фоне | severity | scope |
|---|---|---|---|---|---|
| `app/friends_tab_swr_warm.ts:41` | `_profilesCache` (Record) — spread-merge, без delete/TTL/limit | НЕТ | да (живёт до рестарта) | high | глобальный (кеш друзей) |
| `app/personal_plan_exercise.tsx:261` | `useAudioPlayer` (PlanListenChoose) без cleanup | НЕТ | да | high | экран упражнений (повторно при навигации) |
| `app/personal_plan_exercise.tsx:398` | `useAudioPlayer` (PlanPronunciation) + `updateInterval:250` | НЕТ | да | high | экран упражнений |
| `app/flashcards/CardPackShardPaywallModal.tsx:294` | `ctaPulse = withRepeat(-1)` без `cancelAnimation` на unmount | partial | да | high | модал пейвола (условно монтируется) |
| `app/firestore_league_chat.ts:27` | `cachedMessagesMemory` (Record по комнатам) — ключи не чистятся | partial | да | medium | глобальный (лига-чат) |
| `app/phrase_analytics.ts:195` | `phraseIndex` (Map, все 32 урока) — инвалидация только вручную | partial | да | medium | глобальный |

### 2b. HIGH из allFindings того же ранга (не помечены скептиком отдельно, но системно опасны — приоритет фикса)

| file:line | Что создаётся | cleanup | Пауза на blur/bg | severity | scope |
|---|---|---|---|---|---|
| ~~`components/ScreenGradient.tsx:137`~~ | ~~Orb `Animated.loop`~~ → **ПОГАШЕНО** флагом `MOTION_ENABLED=false` (early-return, луп не создаётся) | — | НЕТ движения | ~~high~~ → **n/a** | корневой, но выключен |
| ~~`components/ScreenGradient.tsx:247`~~ | ~~GoldFabricFlow~~ → **ПОГАШЕНО** тем же флагом | — | НЕТ движения | ~~high~~ → **n/a** | корневой, но выключен |
| ~~`components/ScreenGradient.tsx:475`~~ | ~~CinemaParticle~~ → **ПОГАШЕНО** тем же флагом | — | НЕТ движения | ~~high~~ → **n/a** | корневой, но выключен |
| `components/PremiumGoldButton.tsx:45` | `Animated.loop` шайн, по 1 на кнопку | yes | НЕТ | high | много-экранный (CTA на множестве экранов) |
| `components/AvatarAura.tsx:34` | `Animated.loop` (premium/vip аура) | yes | НЕТ | high | много-экранный (профиль/лидерборды/друзья) |
| `components/HoloFoilCard.tsx:117` | `withRepeat(-1)` idle, 10–20 видимых карт | yes | НЕТ | high | сетка коллекции |
| `components/CollectibleArtFrame.tsx:58` | Sheen+Sparkle `withRepeat(-1)`, 10–20×2-3 анимации | yes | НЕТ | high | сетка коллекции (до 330 карт) |
| `components/PremiumCelebrationModal.tsx:211` | 3-4 `withRepeat(-1)` (ringSpin/ringPulse/ctaShimmer) | yes (только при `visible=false`) | НЕТ | high | модал; **leak если уход без `onClose`** |
| `components/reward_v2/RewardCardV2.tsx:123` | `Animated.loop` halo, на каждый reward-модал | yes | НЕТ | high | reward-модалы (частые) |
| `app/exam.tsx:518` | `setInterval(1000)` таймер экзамена (60 мин) | yes | НЕТ (нет `useFocusEffect`) | high | полноэкранный экзамен |
| `app/arena_game.tsx:203/219` | `setInterval` accept-deadline + `withRepeat` premeetScale | partial | частично (AppState только на bg, не blur) | high | дуэль (горячий) |
| `app/arena_results.tsx:478` | `setInterval(1000)` отсчёт rematch TTL | yes | НЕТ | high | результаты арены (в стеке) |
| `app/services/arena_db.ts:300` `subscribeMatchmakingQueue` | `onSnapshot` очереди матчмейкинга | yes | unknown | high | arena_lobby (поиск матча) |
| `app/arena_lobby.tsx:405` `friendUnsubRef` | `onSnapshot` arena_rooms (дружеский матч) | partial | unknown | high | arena_lobby (горячий) |

---

## 3. Системные выводы

1. **КОРЕНЬ №1 — нет freeze в навигаторе.** Ни в `app/_layout.tsx` (Stack из expo-router), ни в `app/(tabs)/_layout.tsx` нет `freezeOnBlur: true` / `enableFreeze(true)` / `detachInactiveScreens`. Следствие: каждый экран в стеке остаётся полностью смонтированным и активным после ухода. Все `setInterval`, `withRepeat`, `Animated.loop`, `onSnapshot` на невидимых экранах продолжают работать. Именно это превращает точечные «нормальные» накопители в нагрев, нарастающий по мере навигации. Один правильный флаг гасит большую часть классов 1, 2 и часть 4 разом — это фикс с наибольшим рычагом.

2. **`AppState`-гард ≠ `useFocusEffect`.** `AppState.addEventListener('change')` ловит только уход всего приложения в background, но НЕ потерю фокуса одним экраном при навигации внутри открытого app. Несколько компонентов опираются только на `AppState` (`arena_game`) и потому продолжают анимировать/тикать на невидимом, но смонтированном экране.

3. **Анимации не паузятся ни на blur, ни на background.** Ни один из анимационных накопителей не использует `useFocusEffect` и не реагирует на background. `withRepeat`/Reanimated worklet вообще не паузится автоматически на `AppState='background'`. На корневом `ScreenGradient` это означает непрерывную работу GPU/UI-thread даже когда app свёрнут.

4. **Корневой `ScreenGradient` — «мина» на root-уровне.** Orbs + GoldFabricFlow (×4 лупа) + CinemaParticles запускаются для КАЖДОГО экрана. Даже при `SCREEN_GRADIENT_MOTION_ENABLED=false` (строка 22) Orb-эффект всё равно создаёт лупы (останавливаются только при флаге=false — логику надо проверить). Это самый широкий по охвату источник.

5. **Cleanup «внутри visible-блока» — ловушка.** `PremiumCelebrationModal` отменяет анимации только при `visible=false`. Если экран покинут через `goBack` без вызова `onClose`, модал остаётся в дереве и анимации текут. Тот же паттерн риска у `CardPackShardPaywallModal` (подтверждён) и `ModalFx`.

6. **Монотонные кеши не привязаны к жизненному циклу.** `_profilesCache` (spread-merge без удаления), `cachedMessagesMemory` (ключи-комнаты копятся), `phraseIndex` (инвалидация только вручную) переживают навигацию и растут до перезапуска. Это объясняет, почему «после рестарта снова шустро».

7. **Reduce-motion не соблюдается частью компонентов.** Часть уважает `AccessibilityInfo.isReduceMotionEnabled` (`ScreenGradient`, `CollectibleArtFrame`), часть — нет (`PremiumGoldButton`, `AiTypingBubble`, ряд модальных эффектов). Это и UX-долг, и упущенный «бесплатный» способ снизить нагрузку.

---

## 4. Единый паттерн фикса по классам (Фаза D — подход, без кода)

**Сквозной приоритет (фикс с наибольшим рычагом):** включить freeze на уровне навигатора (`freezeOnBlur`/`enableFreeze`/`detachInactiveScreens`) в `app/_layout.tsx` и `(tabs)/_layout.tsx`. Это автоматически «замораживает» большинство фоновых накопителей. Делать **первым** и измерять до/после; остальные правки — добивание остаточных случаев и корневых компонентов, которые freeze не покрывает (root-обёртки живут на всех экранах).

**Сквозной инвариант для всех классов — симметрия `create ↔ destroy` + 2 паузы:**
- Каждое создание ресурса (анимация/таймер/плеер/подписка) имеет парный `destroy` в `return` того же `useEffect`.
- **Пауза при blur:** обернуть запуск в `useFocusEffect` (или гейтить запуск по `useIsFocused`) — на blur останавливать, на focus возобновлять.
- **Пауза при background:** один общий хук `useAppActive()` (на базе `AppState`), который компоненты используют как гейт; на `background` — стоп, на `active` — рестарт. Не плодить отдельные `AppState`-листенеры в каждом компоненте.

Класс за классом:

- **Reanimated/Animated `withRepeat(-1)` / `Animated.loop`:** запускать луп только при `focused && appActive && !reduceMotion`. На blur/background — `cancelAnimation()` / `loop.stop()` (не оставлять worklet крутиться). Для корневого `ScreenGradient` — вынести управление движением в глобальный контекст, завязанный на app-lifecycle (один источник правды вместо N независимых лупов). Проверить ветку `SCREEN_GRADIENT_MOTION_ENABLED=false`, чтобы лупы реально не создавались. Для сеток (`HoloFoilCard`, `CollectibleArtFrame`) опираться на `removeClippedSubviews` + гейт по фокусу экрана-сетки.
- **Экраны с `setInterval` + анимациями:** перевести все таймеры на `useFocusEffect` с `clearInterval` на blur (`exam`, `arena_*`). Для таймеров «до дедлайна» хранить целевой timestamp, а интервал только перерисовывает — тогда пауза в фоне не ломает логику отсчёта (см. T0 ниже). `arena_game` `premeetScale` добавить focus/appActive-гард.
- **Аудио `useAudioPlayer`:** добавить `useEffect`-cleanup с `player.remove()` в обоих местах `personal_plan_exercise.tsx`; на смену source — снимать старый плеер до создания нового; `updateInterval` поднять/гейтить так, чтобы listener не тикал на blur. Использовать как эталон уже корректные `use-correct-sound.ts`, `use-message-received-cue.ts`.
- **Firestore `onSnapshot`:** на «горячих» арена-экранах привязать отписку к `useFocusEffect`/unmount, а не к произвольному lifecycle вызывающего; `arena_lobby` `friendUnsubRef` — гарантировать `unsub()` во всех путях выхода. Глобальные синглтон-подписки (`PremiumContext`, `remote_config`, `app_messages`) оставить как есть (они и должны жить глобально).
- **Модалы с cleanup «внутри visible-блока»:** отвязать cleanup от `visible` и привязать к **unmount** компонента (`return` в `useEffect`), чтобы уход через `goBack` без `onClose` не оставлял живые лупы. Касается `PremiumCelebrationModal`, `CardPackShardPaywallModal`, `ModalFx`.
- **Растущие кеши:** ввести единый паттерн bounded-cache — LRU/`Map` с лимитом по числу ключей и/или TTL, плюс точку явной очистки на logout/смену пользователя. `_profilesCache` — добавить limit+eviction; `cachedMessagesMemory` — удалять ключ комнаты в `forgetCachedLeagueChatRoom`; `phraseIndex` — инвалидировать не только при `clearMistakeLog`, но и при смене урок-набора / по TTL.

---

## 5. Что НЕ является накопителем (отклонено — не тратить время)

- **Класс «Слушатели событий и AppState» целиком (28 находок).** Все `DeviceEventEmitter`/`AppState`/`Keyboard`/`Linking`/`onAppEvent`/`player.addListener` имеют корректный `sub.remove()` в cleanup. Класс закрыт.
- **Skia Canvas.** `@shopify/react-native-skia` **не установлен и нигде не используется** (явный комментарий в `AuroraBackground.tsx`: «Skia установлена, но нигде не используется»). Не источник нагрева. Отдельно: кандидат на удаление зависимости ради бандла (~45 МБ), но это не perf-задача.
- **Dev-only экраны:** `app/_anim_demo_lab.tsx`, `app/_admin_celebration_lab.tsx`, `app/_admin_premium_delivery_test.tsx` — гейтятся `__DEV__`/`IS_STORE_RELEASE` и вырезаются из прод-бандла. Паттерн неидеален, но в проде их нет — не приоритет.
- **Bounded-очереди аналитики:** `analytics.eventQueueCache`, `app_activity.activityQueueCache` (cap 200 + splice), `app_health.healthThrottleCache` (cap 128 + LRU). Ограничены по размеру — не текут.
- **Single-value снапшоты:** `arena_rating_cache.arenaLobbyProfileMemory`, `arena_queue_hint.idleQueueHintCache` (TTL 60с), `shards_shop_cache.warmPackageMap` — заменяются целиком, не аккумулируют.
- **Большинство `onSnapshot` low-severity** (league boosts, league_chest_rewards, remote_config, PremiumContext, app_messages, arena_pulse) — с корректным cleanup; не дублировать работу с already-`DONE` таймерами/polling.

---

## 6. Открытые вопросы для хозяина (где пауза/отписка может сломать фичу)

**T0 — может сломать логику, требует решения до фикса:**
- **`exam.tsx` 60-мин таймер.** Должен ли экзамен **продолжать отсчёт** в фоне/при свайпе в другой таб? Если да — пауза на blur недопустима, нужен timestamp-based отсчёт (хранить deadline, интервал только рисует), а не остановка таймера. Нужно бизнес-правило: «фоновое время засчитывается или нет?».
- **`arena_*` (game/lobby/results) — realtime-матч.** Пауза `onSnapshot`/таймеров на blur может рассинхронить дуэль с соперником и сервером (пропустить ход, дедлайн, rematch-TTL). Эти экраны, вероятно, должны **оставаться активными** даже в фоне. Нужно подтверждение: какие именно арена-экраны исключаем из freeze.
- **`PremiumCelebrationModal` / reward-модалы.** Перенос cleanup на unmount безопасен, но: при уходе `goBack` без `onClose` — это валидный сценарий или баг навигации? От ответа зависит, чинить навигацию или только cleanup.

**T1 — низкий риск, но желательно подтверждение:**
- **Глобальный `freezeOnBlur`.** Есть ли экраны, которые ОБЯЗАНЫ продолжать работать в стеке после ухода (фоновая загрузка, прогресс, live-данные), кроме арены? Их нужно явно исключить из freeze.
- **`phraseIndex` инвалидация по смене урок-набора.** Подтвердить, что пересборка индекса при смене набора не ударит по производительности горячего пути (mistake-explain).
- **`_profilesCache` eviction.** Подтвердить, что выбрасывание «старых» профилей друзей не вызовет лишних повторных загрузок на экране друзей (SWR-теплый кеш).
- **Reduce-motion для CTA/модалов.** Подтвердить, что отключение шайна `PremiumGoldButton` при reduce-motion не вредит конверсии (визуальный акцент на покупке).

---

### Итог простыми словами

- Главная причина перегрева не в одном экране, а в том, что приложение **не «усыпляет» экраны, с которых ушёл пользователь** — они продолжают работать в фоне и копятся.
- Самые жадные — **бесконечные анимации** (особенно фоновое свечение, которое включено на каждом экране) и **таймеры**, которые не останавливаются при переходе.
- Есть несколько мест, где **звук и память** не освобождаются как надо: плееры в упражнениях и пара кешей (друзья, чат лиги), которые только растут до перезапуска.
- Слушатели событий и «Skia» — **чисто**, тут копать не нужно.
- Один общий приём чинит почти всё разом: **включить «заморозку» неактивных экранов** в навигации и добавить правило «останавливать анимации/таймеры, когда экран скрыт или приложение свёрнуто».
- До правок нужно решение хозяина по экзамену и онлайн-дуэлям: им, возможно, **нельзя** засыпать в фоне — иначе сломается отсчёт времени и связь с соперником.
