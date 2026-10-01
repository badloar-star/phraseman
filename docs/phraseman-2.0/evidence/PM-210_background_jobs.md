# PM-210 — реестр фоновой работы клиента

Дата: 2026-09-30. Исполнитель: субагент (PM-210 + PM-212). Код: `app/`, `components/`,
`modules/`, `hooks/` (без тестов, `graphify-out`, `__tests__`).

## Как этим пользоваться

- Сторож: `npx tsx tests/pm210_background_jobs_registry.probe.ts`. Он AST-сканирует код и
  сверяет с таблицей ниже. Новая фоновая работа без строки (или больше вызовов, чем записано
  в `count`) **роняет пробу**. Уменьшение/исчезновение — предупреждение «обнови строку».
- Текущие счётчики: `npx tsx tests/pm210_background_jobs_registry.probe.ts --dump`.
- Неизвестное пишется словом `unknown`, **не нулём** — проба отвергает пустое поле и `0`.
- Строка таблицы = файл × вид работы. Сканируемые виды:
  `setInterval`, `appState` (`AppState.addEventListener`), `runtimeAppState`
  (`runtimeAppStateStore.subscribe`), `foregroundTask` (`scheduleCoalescedForegroundTask`),
  `coalescedRunner` (`createCoalescedAsyncRunner`), `networkLease`
  (`withBackgroundNetworkLease`), `afterInteractions` (`InteractionManager.runAfterInteractions`
  в `app/_layout.tsx` и не-экранных `.ts`), `backgroundTask` (TaskManager / BackgroundFetch /
  expo-background-*). Виды `outbox` и `timeoutLoop` — ручные строки (сканер их не видит).

### Словарь полей

- **priority** — шкала `docs/RUNTIME.md`: P0 реакция UI / видимый экран; P1 подтверждённое
  действие, auth/entitlement; P2 данные активного экрана; P3 отложенный sync/flush/обслуживание;
  P4 необязательный prefetch/диагностика.
- **TTL** — сколько живёт работа (подписка/таймер) до обязательного снятия.
- **dedupe** — чем защищено от двойного запуска.
- **queues** — на какие очереди влияет: `ИТС` — забор «интерактивной тишины сети»
  (`interactive_network_quiet`: фоновая сеть уступает занятию и ждёт); `FGQ` — сериализованная
  очередь foreground-задач (`app_resume_policy`, шаг 80 мс); `IM` — очередь
  `InteractionManager` (ждёт конца анимаций); `JS` — только JS-поток; `ACL` — замок смены
  аккаунта; `Firestore` — платные чтения/записи.

## Сводка

| Показатель | Значение |
|---|---|
| Сканируемых мест фоновой работы | 123 в 73 файлах (обновлено 2026-10-01) (88 сканируемых строк + 9 ручных outbox/timeoutLoop) |
| Сетевые фоновые аренды (`networkLease`) | 18 файлов, все под забором ИТС |
| Бесконечные таймеры-циклы вне экрана | 2: `foreground_usage_ms` (5 мин, только active), `app_messages` ×3 (мёртвые, см. ниже) |
| Системные фоновые задачи ОС (TaskManager/BackgroundFetch) | 0 (удалены в D47) |
| Удалено в этом проходе | 4 фоновые работы (см. «Удалено») |
| Мёртвые, но оставлены (чужая зона/активная правка) | 9 (см. «Мёртвые, не удалены») |

## Удалено в этом проходе (PM-210/PM-212)

1. `app/remote_config_client.ts` — 5-минутный «живой» опрос Remote Config (таймер-цикл,
   модульная подписка `runtimeAppStateStore.subscribe` и участник ИТС `remote_config.poll`).
   Подписчиков не было (`subscribeRemoteConfig()` — заглушка), но подписка и участник
   вешались при импорте навсегда. Остался разовый `loadRemoteConfig()` при старте.
2. `app/_layout.tsx` — выключенный константой `ENABLE_STARTUP_CONTENT_PREWARM=false` прогрев
   контента (карточки, меню урока, слова урока через 8 с после старта): мёртвый эффект с
   `runAfterInteractions` + таймером. Удалены константа и ставшие лишними импорты.
3. `app/_layout.tsx` + `app/hall_of_fame_utils.ts` — шаг `migrateWeekPointsIfNeeded()`
   (недельные очки лиги, пустая заглушка после удаления лиг) в пост-загрузочной цепочке.
4. PM-212: чтения AsyncStorage **при импорте** — `startFriendsTabSwrPrime()` в
   `app/(tabs)/friends.tsx` и `hydrateStatsCacheFromStorage()` в `app/statsCache.ts`
   (обе дублировали осознанный прогрев в `_layout` и вызовы на монтировании экрана).

## Мёртвые, не удалены (причина — чужая зона или активная правка)

| Что | Почему мёртвое | Почему не удалено |
|---|---|---|
| `app/app_messages.ts` → `subscribeUserAppMessages` (3× `setInterval` 5 мин, до 240 чтений Firestore за цикл) | 0 вызывающих в клиенте; инбокс работает через разовый `refreshAppMessagesSnapshotOnce` | файл правится другой сессией прямо сейчас (onSnapshot→опрос, 2026-09-30 11:05); удалить функцию вместе с её тестовым маркером в `tests/app_messages_background_refresh_contract.test.ts`; `tests/app_messages_read_persistence_ui_contract.test.ts` ждёт её в инбоксе — устарел |
| `app/_layout.tsx` → `GlobalLevelUpRewards`: слушатель `home_level_up_celebrated` (апселл на 5-м уровне) | событие больше никто не эмитит (XP удалён) | зона удаления XP; слушатель в памяти, стоимости нет |
| `components/QuestSheetModal.tsx` (тикер 30 с) | 0 импортёров (квесты отвязаны) | правится другой сессией; на файл смотрит `tests/quest_xp_retirement.probe.ts` |
| `components/ProfileCardMotionFx.tsx`, `components/ShineOverlay.tsx`, `components/stats/AiBlockNote.tsx`, `components/ui/new/UndoSnackbar.tsx`, `components/ui/V2Countdown.tsx`, `hooks/use-streak-freeze-active.ts` | 0 импортёров: код не монтируется, фоновой нагрузки нет | часть с чужими правками, часть охраняется тестами (`perf_freeze_contract`, `player_profile_liquid_glass_contract`, `streak_freeze_active`); удалять отдельной задачей |
| `modules/voice_minutes/packages_cache.ts` (прогрев цены при импорте) | 0 импортёров, раздел MAX запломбирован | пломба владельца 2026-09-04: код MAX не удалять |

## Реестр

| file | kind | count | job | priority | owner | trigger | TTL | dedupe | cancellation | budget | queues |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `app/_layout.tsx` | `appState` | 8 | корень: флаг appIsActive; сброс аудио-аренд на resume; трекинг app_state_change; возврат из стора; flush `syncToCloud` при уходе в фон; ретрай бутстрапа после восстановления auth; проверка «интро закончилось»; проверка winback | P1 (auth-ретрай, flush sync), P3 (проверки модалок), P4 (трекинг) | корень приложения (`AppContent`, `GlobalLevelUpRewards`) | смена AppState | жизнь процесса (корень не размонтируется) | троттлы: sync ≥60 с, модалки ≥60 с (`FOREGROUND_MODAL_CHECK_MIN_MS`), трекинг — дебаунс 1.2 с/0.25 с; auth-ретрай — планировщик с флагом in-flight | `sub.remove()` в cleanup эффекта + `clearTimeout` | sync ≤1 раз/мин; модалки ≤1 раз/мин; остальное — локально | Firestore (sync, winback/интро — unknown число чтений), ACL, JS |
| `app/_layout.tsx` | `afterInteractions` | 11 | корневые прогревы после первого кадра: ассеты разделов; установка планировщика завершений V2; тяжёлый init +250 мс; возврат из стора; прайм таба «Уроки»; тёплый магазин на пути онбординга; прайм уроков (2 места); отложенные картинки +2.5 с; арт достижений; модуль свайпа карточек и кэш коллекции | P2 (прайм уроков/таба), P3 (init, планировщик), P4 (картинки, арт, магазин) | корень приложения | первый кадр / смена темы / смена studyTarget | до выполнения задачи (one-shot) | ref-флаги (`heavyInitStartedRef`, `deferLessonPrimeRef`), идемпотентные primes | `task.cancel()` + `clearTimeout` в cleanup (кроме one-shot внутри init — без отмены) | unknown (нет общего бюджета; картинки/арт — малыми пачками) | IM, JS, сеть (RevenueCat, маркет паков, арт — через кэш картинок) |
| `app/(tabs)/home.tsx` | `appState` | 1 | Главная: лёгкий/облачный рефреш после возврата из фона | P2 | Главная | AppState→active после фона | пока смонтирована Главная | классификатор длительности фона (`getForegroundRefreshKind`), dirty-флаг при неактивной вкладке | cleanup эффекта снимает подписку и таймер | ≤1 рефреш на возврат; облачный только после фона ≥5 мин | IM, Firestore (облачный рефреш — unknown) |
| `app/achievement_art_prefetch.ts` | `appState` | 1 | повтор прогрева арта достижений при каждом возврате в active | P4 | достижения | AppState→active (подписка ставится при первом фоновом прогреве) | жизнь процесса (подписка не снимается) | `backgroundStarted`; `drain()` пропускает уже скачанные URL | нет (подписка вечная) | пачки по 8 URL, пауза 400 мс, старт через 4 с | сеть CDN картинок (не Firestore), JS |
| `app/app_check_init.ts` | `networkLease` | 1 | однократный init App Check (энфорс запломбирован, только выключение автообновления) | P3 | инфраструктура Firebase | `initFirebaseAppCheckIfAvailable()` из heavy init | до завершения init | общий промис `appCheckInitPromise` | аренда ИТС; участник `firebase.app_check_refresh` ждёт промис | 1 вызов на запуск | ИТС |
| `app/app_messages.ts` | `setInterval` | 3 | МЁРТВО: опрос глобальных/личных сообщений и состояний каждые 5 мин в `subscribeUserAppMessages` | P4 | сообщения приложения | подписка через `subscribeUserAppMessages` (0 вызывающих) | пока жив подписчик | unknown | `lifetime.dispose()` в `remove()` | 3 запроса × до 80 документов раз в 5 мин (если бы был подписчик) | Firestore |
| `app/community_pack_create.tsx` | `appState` | 1 | сохранение черновика набора при уходе в фон | P1 | создание набора (сессия «Дизайн») | AppState→background/inactive | пока открыт экран создания | запись по одному ключу черновика | cleanup эффекта | 1 запись AsyncStorage на уход в фон | JS, AsyncStorage |
| `app/exam.tsx` | `setInterval` | 1 | таймер экзамена 1 с | P0 | экран экзамена | старт попытки | до конца попытки/размонтирования | `timerRef` | `clearInterval` в cleanup | 1 тик/с | JS |
| `app/flashcards_blitz_session.tsx` | `setInterval` | 2 | таймер блица (отсчёт раунда) | P0 | блиц карточек | старт раунда | до конца раунда | `intervalRef` | `clearInterval` | 1 тик/с (unknown точнее) | JS |
| `app/flashcards_swipe.tsx` | `appState` | 2 | сброс памяти свайпов на диск при уходе в фон; сохранение черновика сессии при уходе в фон (`flushDraftSave`, 2026-10-01) | P1 | свайп карточек | AppState≠active | пока открыт экран | `flushSwipeMemoryNow` идемпотентен; черновик — один таймер `draftSaveTimerRef` | cleanup + финальный flush обоих | ≤2 записи AsyncStorage на уход в фон | AsyncStorage |
| `app/foreground_usage_ms.ts` | `appState` | 1 | учёт времени в приложении: старт/стоп тикера | P3 | статистика времени | AppState | жизнь процесса (ставится из `_layout`) | один `intervalId` | функция-снятие из `installForegroundUsageMsTracker` | локально | AsyncStorage |
| `app/foreground_usage_ms.ts` | `setInterval` | 1 | flush открытой сессии в дневные бакеты | P3 | статистика времени | AppState→active | пока приложение active | `intervalId` пересоздаётся одним | `clearInterval` при уходе в фон | 1 запись раз в 5 мин | AsyncStorage |
| `app/learning-v2/lesson/[id].tsx` | `appState` | 1 | пауза анимации ореола узла карты в фоне | P0 | карта Learning V2 | AppState | пока смонтирован узел | unknown | `subscription.remove()` | локально | UI-поток (reanimated) |
| `app/learning_v2_active_course_catalog_client_v1.ts` | `networkLease` | 1 | загрузка каталога курса V2 | P2 | Learning V2 | открытие карты/курса | до ответа | unknown | аренда ИТС (abort) | 1 вызов на загрузку | ИТС, Functions |
| `app/learning_v2_activity_audio_preload_v1.ts` | `networkLease` | 1 | предзагрузка озвучки занятия | P4 | Learning V2 | подготовка занятия | до завершения загрузки | кэш по занятию | аренда ИТС (abort) | unknown | ИТС, сеть Storage |
| `app/learning_v2_activity_auxiliary_client.ts` | `networkLease` | 1 | вспомогательные данные занятия | P2 | Learning V2 | подготовка занятия | до ответа | unknown | аренда ИТС | unknown | ИТС, Functions |
| `app/learning_v2_activity_released_completion_sync_v1.ts` | `networkLease` | 1 | синк завершения занятия (outbox) | P1 | Learning V2 | планировщик завершений | до ответа сервера | курсор ретраев (`learning_v2_completion_retry_cursor`) | аренда ИТС | ретраи 10 с…5 мин | ИТС, Functions |
| `app/learning_v2_activity_released_session_client_v1.ts` | `networkLease` | 1 | загрузка выпущенной сессии | P2 | Learning V2 | открытие занятия | до ответа | unknown | аренда ИТС | 1 вызов | ИТС, Functions |
| `app/learning_v2_activity_released_submission_sync_v2.ts` | `networkLease` | 1 | синк ответов занятия | P1 | Learning V2 | планировщик завершений | до ответа | курсор ретраев | аренда ИТС | ретраи 10 с…5 мин | ИТС, Functions |
| `app/learning_v2_completion_background_scheduler.ts` | `afterInteractions` | 1 | отложенный drain outbox завершений после анимаций | P3 | Learning V2 | resume/сеть появилась/смена аккаунта | до выполнения | `inFlights` ≤8, `continuationWakes` ≤4 | `resetForTests` / отмена таймеров | ≤8 полётов, пробуждения ≤4 × 5 с | IM, ИТС |
| `app/learning_v2_completion_background_scheduler.ts` | `appState` | 1 | планировщик завершений: будит drain при active | P3 | Learning V2 | AppState→active | жизнь процесса (ставится из `_layout`) | `installed` флаг | снятие в `reset` | ретраи 10/30/60/120/300 с | ИТС, JS |
| `app/learning_v2_completion_credential_admission.ts` | `networkLease` | 1 | допуск учётных данных перед синком завершений | P1 | Learning V2 | перед синком | до ответа | `credentialAdmissions` | аренда ИТС | 1 на синк | ИТС |
| `app/learning_v2_course_released_session_client_v2.ts` | `networkLease` | 1 | загрузка сессии курса v2 | P2 | Learning V2 | открытие занятия | до ответа | unknown | аренда ИТС | 1 вызов | ИТС, Functions |
| `app/learning_v2_course_released_session_client_v3.ts` | `networkLease` | 1 | загрузка сессии курса v3 | P2 | Learning V2 | открытие занятия | до ответа | unknown | аренда ИТС | 1 вызов | ИТС, Functions |
| `app/learning_v2_course_session_completed_sync_v1.ts` | `networkLease` | 1 | синк «сессия курса завершена» | P1 | Learning V2 | планировщик завершений | до ответа | курсор ретраев | аренда ИТС | ретраи 10 с…5 мин | ИТС, Functions |
| `app/learning_v2_direct_session_player_v1.tsx` | `appState` | 2 | плеер занятия: восстановление наград-рун на resume; инвалидация прерванного прохода | P1 | Learning V2 | AppState | пока открыт плеер | `finishingRef`, `interruptedWhileBackgroundedRef` | `subscription.remove()` | локально + unknown сеть на восстановление рун | JS, Functions (руны — unknown) |
| `app/learning_v2_lesson_background_prefetch_v1.ts` | `networkLease` | 1 | фоновая докачка урока | P4 | Learning V2 | карта уроков | до завершения | unknown | аренда ИТС | unknown | ИТС, сеть Storage |
| `app/learning_v2_required_session_completion_sync.ts` | `networkLease` | 1 | синк обязательного завершения (legacy outbox) | P1 | Learning V2 | планировщик завершений | до ответа | курсор ретраев | аренда ИТС | ретраи 10 с…5 мин | ИТС, Functions |
| `app/net_status.ts` | `networkLease` | 1 | проба «есть ли сеть» (fetch) | P3 | инфраструктура сети | подписчики `subscribeNetStatus` + активное приложение | пока есть подписчики | один `probeTimer` | аренда ИТС, пауза участника `net_status.probe` | unknown период (backoff внутри координатора) | ИТС, сеть |
| `app/net_status.ts` | `runtimeAppState` | 1 | пауза/возобновление проб при фоне | P3 | инфраструктура сети | смена active | жизнь процесса (координатор создаётся при импорте) | единый координатор | `dispose()` координатора (в проде не зовётся) | локально | JS |
| `app/nickname_guard.ts` | `appState` | 1 | ретрай генерации ника при возврате | P3 | профиль | AppState→active при отложенном нике | до исчерпания 3 попыток | `pendingNicknameRetry` | подписка снимается при исчерпании бюджета | 3 попытки на запуск | Firestore (unknown) |
| `app/paywall_navigation.ts` | `afterInteractions` | 1 | отложенная навигация на пейвол до готовности навигатора | P0 | пейвол | открытие пейвола | до выполнения | unknown | `cancel()` из возвращаемого объекта | 1 навигация | IM |
| `app/paywall_purchase.ts` | `appState` | 1 | перезагрузка офферингов RevenueCat, если пакетов нет | P1 | покупки | AppState→active на экране пейвола | пока открыт пейвол | `packagesRef` (только если не хватает пакетов) | cleanup `deadRef` + remove | ≤1 запрос на возврат | сеть RevenueCat |
| `app/posthog_client.ts` | `networkLease` | 1 | отправка событий PostHog | P4 | аналитика | очередь событий PostHog | до отправки | unknown | аренда ИТС | unknown | ИТС, сеть PostHog |
| `app/product_analytics_runtime_observer.tsx` | `appState` | 1 | флаг активности для рантайма продуктовой аналитики | P4 | аналитика | AppState | жизнь корня | нет (перезапись флага) | `subscription.remove()` | локально | JS |
| `app/remote_config_client.ts` | `networkLease` | 1 | разовая загрузка Remote Config при старте (живой опрос удалён PM-210) | P3 | Remote Config | `loadRemoteConfig()` из heavy init | до ответа | `startupLoadPromise`, `sharedNetworkRefreshPromise`, спрос `explicitRefreshDemand` | аренда ИТС | 1 чтение Firestore на запуск | ИТС, Firestore |
| `app/runtime_app_state_store.ts` | `appState` | 1 | единый стор AppState для подписчиков | P0 | инфраструктура | подписка первого слушателя | пока есть подписчики | один нативный слушатель на всех | снимается с последним подписчиком | локально | JS |
| `app/visible_wall_clock.ts` | `appState` | 1 | часы видимого экрана: пауза в фоне | P0 | инфраструктура UI | AppState | пока есть подписчики | общий тикер | снимается с последним подписчиком | локально | JS |
| `app/visible_wall_clock.ts` | `setInterval` | 2 | общий 1-секундный тикер часов (реализация + вызов через deps) | P0 | инфраструктура UI | первый подписчик + active | пока есть подписчики и active | один интервал на процесс | `clearInterval` без подписчиков | 1 тик/с | JS |
| `app/voice_equalizer.tsx` | `setInterval` | 1 | сторож простоя эквалайзера записи | P0 | запись голоса | начало записи | пока идёт запись | unknown | `clearInterval` в cleanup | тик `EQ_IDLE_WATCHDOG_MS` | JS |
| `components/AppMessagesInbox.tsx` | `appState` | 2 | бейдж инбокса: разовый рефреш на active (троттл 12 ч); пульс бейджа в active | P3 (рефреш), P0 (пульс) | сообщения приложения | AppState→active | пока смонтирован инбокс | `badgeRefreshInFlightRef`, `minIntervalMs` 12 ч | cleanup | ≤1 опрос/12 ч (3 запроса × до 80 документов) | Firestore, UI |
| `components/BillingIssueToastHost.tsx` | `appState` | 1 | проверка инцидента оплаты на resume | P3 | покупки | AppState→active | жизнь корня | foreground-задача `billing_issue_toast_check` | `scheduledRef.cancel()` + remove | ≤1 тост на инцидент за 3 дня | FGQ |
| `components/BillingIssueToastHost.tsx` | `foregroundTask` | 1 | та же проверка через очередь foreground-задач | P3 | покупки | mount + active | до выполнения | ключ `billing_issue_toast_check` | `cancel()` | локально | FGQ |
| `components/CleanOnboarding.tsx` | `appState` | 3 | онбординг: пауза/продолжение анимаций и таймеров шагов в фоне | P0 | онбординг | AppState | пока идёт онбординг | unknown | cleanup эффектов | локально | UI |
| `components/CollectibleArtFrame.tsx` | `appState` | 3 | пауза анимаций рамки арта в фоне | P0 | профиль/коллекция | AppState | пока смонтирован компонент | unknown | cleanup | локально | UI |
| `components/EnergyContext.tsx` | `appState` | 1 | перезагрузка энергии на resume (+300 мс, после анимаций) | P2 | энергия (чужие правки — не трогать) | AppState→active | жизнь провайдера | коалесинг раннера | cleanup + clearTimeout + task.cancel | 1 загрузка на возврат | IM, ACL, Firestore (unknown) |
| `components/EnergyContext.tsx` | `coalescedRunner` | 1 | коалесинг загрузки энергии | P2 | энергия | mount, смена аккаунта, resume | жизнь провайдера | `createCoalescedAsyncRunner` (без параллельных запусков) | сброс раннера при смене аккаунта | 1 полёт одновременно | ACL |
| `components/ErrorBoundary.tsx` | `appState` | 1 | сброс экрана ошибки при возврате в active | P0 | корень | AppState→active при ошибке | жизнь границы | нет | `componentWillUnmount` | локально | UI |
| `components/HoloFoilCard.tsx` | `appState` | 1 | пауза голографической анимации в фоне | P0 | карточки профиля | AppState | пока смонтирован | unknown | cleanup | локально | UI |
| `components/HomeDiscountBadge.tsx` | `setInterval` | 1 | пульс бейджа скидки каждые 4.2 с | P0 | Главная (скидка) | видимый бейдж | пока смонтирован | unknown | `clearInterval` | 1 анимация/4.2 с | UI |
| `components/NotificationCenterButton.tsx` | `appState` | 1 | разовый рефреш уведомлений на active | P3 | уведомления | AppState→active на Главной | пока кнопка смонтирована и вкладка активна | `requestGenerationRef` | cleanup | unknown (1 запрос на возврат) | Firestore (unknown) |
| `components/PremiumContext.tsx` | `appState` | 2 | перезагрузка премиума на resume (облачная после фона ≥5 мин); ретрай слушателя премиума после фона | P1 | premium/entitlement | AppState | жизнь провайдера | коалесинг раннеров, `retryTimer` | cleanup, `clearBackgroundResume` | backoff `PREMIUM_LISTENER_RETRY_BACKOFF_MS` | IM, Firestore, RevenueCat |
| `components/PremiumContext.tsx` | `coalescedRunner` | 2 | коалесинг reload и reload-после-облака | P1 | premium/entitlement | resume, события покупки | жизнь провайдера | `createCoalescedAsyncRunner` | unknown | 1 полёт на раннер | ACL |
| `components/ProfileCardMotionFx.tsx` | `appState` | 2 | МЁРТВО (0 импортёров): пауза эффектов карточки | P0 | профиль | AppState | не монтируется | unknown | cleanup | нет нагрузки | UI |
| `components/PromoBanner.tsx` | `runtimeAppState` | 1 | промо-баннер: рефреш и таймер истечения только в active | P3 | промо/скидки | смена active | пока смонтирован баннер | `refreshGeneration`, `expiryScheduler` | cleanup + `dispose()` | локально (Remote Config из кэша) | JS |
| `components/QuestSheetModal.tsx` | `setInterval` | 1 | МЁРТВО (0 импортёров): тикер 30 с шторки квестов | P0 | квесты (удалены) | не монтируется | не монтируется | unknown | `clearInterval` | нет нагрузки | UI |
| `components/RegistrationPromptModal.tsx` | `appState` | 1 | модалка регистрации: пересчёт при возврате | P0 | регистрация | AppState | пока открыта модалка | unknown | cleanup | локально | UI |
| `components/RegistrationPromptModal.tsx` | `setInterval` | 1 | тикер восстановления 1 с | P0 | регистрация | открыта модалка | пока открыта | unknown | `clearInterval` | 1 тик/с | UI |
| `components/ShineOverlay.tsx` | `appState` | 1 | МЁРТВО (0 импортёров): пауза блика | P0 | UI-кит | не монтируется | не монтируется | unknown | cleanup | нет нагрузки | UI |
| `components/SkeletonShimmer.tsx` | `appState` | 1 | пауза шиммера скелетона в фоне | P0 | UI-кит | AppState | пока виден скелетон | unknown | cleanup | локально | UI |
| `components/StreakRiskToastHost.tsx` | `appState` | 1 | проверка «стрик под угрозой» на resume | P3 | стрик | AppState→active | жизнь корня | foreground-задача `streak_risk_toast_check` | cancel + remove | локально | FGQ |
| `components/StreakRiskToastHost.tsx` | `foregroundTask` | 1 | та же проверка через очередь foreground-задач | P3 | стрик | mount + active | до выполнения | ключ `streak_risk_toast_check` | `cancel()` | локально | FGQ |
| `components/daily_journey/DailyJourneyProductionModalHost.tsx` | `appState` | 1 | показ модалки дневного пути на resume | P3 | дневной путь | AppState→active | жизнь хоста | unknown | cleanup | локально | JS |
| `components/energy_countdown_clock.ts` | `appState` | 1 | часы отсчёта энергии: пауза в фоне | P0 | энергия | AppState | пока есть подписчики | общий тикер | снимается с последним подписчиком | локально | JS |
| `components/energy_countdown_clock.ts` | `setInterval` | 2 | общий 1-секундный тикер отсчёта (реализация + deps) | P0 | энергия | подписчики + active | пока есть подписчики | один интервал | `clearInterval` | 1 тик/с | JS |
| `components/friends_together/FriendEventMarker.tsx` | `setInterval` | 1 | «живое» время события друга, 1 с | P0 | друзья | маркер видим | пока смонтирован | unknown | `clearInterval` | 1 тик/с на маркер | UI |
| `components/level-exam/LevelExamV2.tsx` | `setInterval` | 1 | таймер экзамена уровня 1 с | P0 | экзамен уровня | попытка идёт | до конца попытки | unknown | `clearInterval` | 1 тик/с | UI |
| `components/onboarding_aha/SpeechBeat.tsx` | `appState` | 1 | пауза речевой анимации в фоне | P0 | онбординг | AppState | пока смонтирован | unknown | cleanup | локально | UI |
| `components/onboarding_aha/TypewriterText.tsx` | `appState` | 1 | пауза печатной машинки в фоне | P0 | онбординг | AppState | пока смонтирован | unknown | cleanup | локально | UI |
| `components/paywall/PaywallMotion.tsx` | `appState` | 3 | пауза анимаций пейвола в фоне | P0 | пейвол | AppState | пока открыт пейвол | unknown | cleanup | локально | UI |
| `components/stats/AiBlockNote.tsx` | `appState` | 1 | МЁРТВО (0 импортёров): пауза анимации заметки | P0 | статистика | не монтируется | не монтируется | unknown | cleanup | нет нагрузки | UI |
| `components/ui/V2Backdrop.tsx` | `appState` | 1 | фон 2.0: пауза анимации в фоне | P0 | UI 2.0 | AppState | пока смонтирован | unknown | cleanup | локально | UI |
| `components/ui/V2Countdown.tsx` | `setInterval` | 1 | МЁРТВО (0 импортёров): отсчёт 1 с | P0 | UI 2.0 | не монтируется | не монтируется | unknown | `clearInterval` | нет нагрузки | UI |
| `components/ui/new/UndoSnackbar.tsx` | `setInterval` | 1 | МЁРТВО (0 импортёров): отсчёт отмены 1 с | P0 | UI-кит | не монтируется | не монтируется | unknown | `clearInterval` | нет нагрузки | UI |
| `components/youtube/YoutubePremiereHero.tsx` | `setInterval` | 1 | отсчёт до премьеры видео | P0 | YouTube-раздел | видим блок премьеры | пока смонтирован | unknown | `clearInterval` | тик `PREMIERE_TICK_INTERVAL_MS` | UI |
| `hooks/phrase_audio_ahead_prefetch.ts` | `appState` | 1 | отмена докачки озвучки вперёд при уходе в фон | P4 | озвучка фраз | старт докачки | жизнь процесса | `started` (раз за процесс) | `cancelAheadPrefetch` | локально | ИТС |
| `hooks/phrase_audio_ahead_prefetch.ts` | `networkLease` | 1 | докачка озвучки следующих уроков | P4 | озвучка фраз | `scheduleAheadPhraseAudioPrefetch()` | до завершения/ухода в фон | `started`, `generation` | аренда ИТС + отмена по AppState/аккаунту | `CONCURRENCY` воркеров, unknown клипов | ИТС, сеть Storage |
| `hooks/phrase_audio_prefetch.ts` | `networkLease` | 1 | хвост предзагрузки озвучки урока | P4 | озвучка фраз | открытие урока | до завершения | `isCurrent()` | аренда ИТС | `CONCURRENCY` воркеров | ИТС, сеть Storage |
| `hooks/use-streak-freeze-active.ts` | `appState` | 1 | МЁРТВО (0 импортёров): перечитать заморозку стрика | P2 | стрик | не монтируется | не монтируется | unknown | cleanup | нет нагрузки | JS |
| `hooks/useFlashcardTrainingQuotaPreview.ts` | `appState` | 1 | пересчёт месячной квоты тренировок на active | P2 | карточки | фокус экрана + active | пока экран в фокусе | `refreshRevision` | `useFocusEffect` cleanup | локально | JS |
| `hooks/useRevenueDailyQuotaPreview.ts` | `appState` | 1 | пересчёт дневной квоты на active | P2 | квоты | фокус экрана + active | пока экран в фокусе | `refreshRevision` | `useFocusEffect` cleanup | локально | JS |
| `hooks/use_video_watch_energy_boost.ts` | `appState` | 1 | стоп отсчёта просмотра видео в фоне | P0 | видео/руны | AppState≠active | пока смонтирован плеер | нет | `subscription.remove()` | локально | JS |
| `modules/audio/celebrationBackgroundPlayer.ts` | `setInterval` | 2 | плавное затухание фоновой музыки празднования | P0 | звук | старт/стоп сцены | до конца затухания | `fadeTimer` на трек | `clearInterval` | короткий фейд (unknown мс) | JS, аудио |
| `app/feedback_outbox.ts` | `outbox` | 1 | outbox отзывов | P3 | отзывы | отправка/повтор из карточки отзыва | unknown (есть `purgeExpiredFeedbackOutbox`) | ключ аккаунта + id записи | удаление при успехе | unknown | Functions |
| `app/support_report_outbox.ts` | `outbox` | 1 | outbox обращений в поддержку | P1 | поддержка | отправка + `resumePendingSupportReports` из `_layout` | до доставки | ключ аккаунта | unknown | unknown | Functions |
| `app/progress_events_client.ts` | `outbox` | 1 | flush отложенных событий прогресса | P3 | прогресс | пост-загрузочная цепочка `_layout` | до доставки | владелец stableId | unknown | unknown | Functions |
| `app/cloud_sync.ts` | `outbox` | 1 | `syncToCloud` при старте и уходе в фон | P3 | облачный прогресс | `_layout` (старт, фон ≥1.8 с, троттл 60 с) | один проход | троттл 60 с | unknown | unknown | Firestore |
| `app/flashcard_training_pending_grant.ts` | `outbox` | 1 | обслуживание незавершённых выдач тренировок | P1 | карточки | unknown | unknown | ключ stableUid+lineage | unknown | unknown | JS, AsyncStorage |
| `app/shards_pending_grants.ts` | `outbox` | 1 | дотягивание выдач жемчуга после оплаты | P1 | жемчуг (D70, зона исполнителя по жемчугу) | пост-загрузочная цепочка `_layout` | unknown | ключ аккаунта | unknown | unknown | Firestore |
| `app/learning_v2_completion_retry_cursor.ts` | `outbox` | 1 | курсор ретраев завершений V2 | P1 | Learning V2 | планировщик завершений | до drain | scope hash аккаунта | `clearCursor` | ретраи 10 с…5 мин | AsyncStorage |
| `app/_layout.tsx` | `timeoutLoop` | 1 | ретрай бутстрапа после восстановления auth (`createAuthRecoveryBootRetryScheduler`) | P1 | auth | провал бутстрапа | до успеха | флаг `authRecoveryBootstrapInFlight` | `cancel()` в cleanup | unknown | ACL, сеть |
| `app/nickname_guard.ts` | `timeoutLoop` | 1 | 3 отложенные попытки генерации ника | P3 | профиль | нет ника после входа | до 3 попыток | `pendingNicknameRetry` | `clearTimeout` при фоне | 3 попытки на запуск | Firestore (unknown) |
| `app/spire/use_spire_game.ts` | `afterInteractions` | 1 | прогрев пакета недели Шпиля после анимаций входа (2026-10-01) | P4 | Шпиль | вход на экран, комната загружена | до конца загрузки пакета | `inFlight` по ключу пакета (`app/spire/spire_pack_client.ts`) | флаг `alive` в cleanup (сам хэндл InteractionManager не отменяется) | 1 загрузка пакета недели (~1 МБ JSON) при промахе кэша | IM, сеть |
| `app/spire/use_spire_game.ts` | `setInterval` | 1 | досылка очереди отчётов Шпиля раз в 5 мин (`SPIRE_REPORT_FLUSH_INTERVAL_MS`) | P3 | Шпиль | экран Шпиля смонтирован | пока открыт экран | unknown | `clearInterval` + `flush('screen_leave')` в cleanup | ≤1 вызов отправки отчётов за 5 мин (unknown при пустой очереди) | Functions, AsyncStorage |
| `app/spire/use_spire_game.ts` | `appState` | 1 | досылка очереди отчётов Шпиля при уходе в фон | P1 | Шпиль | AppState≠active | пока открыт экран | unknown | `sub.remove()` в cleanup | ≤1 вызов отправки отчётов на уход в фон | Functions, AsyncStorage |
| `app/spire/use_spire_step_runner.ts` | `setInterval` | 1 | тик бюджета времени ступени, 250 мс | P0 | Шпиль (ступень) | фаза `playing` | пока идёт ступень | один `id` на эффект | `clearInterval` в cleanup | 4 тика/с, локально | JS, UI |
| `app/spire/use_spire_step_runner.ts` | `appState` | 1 | пауза ступени при сворачивании, продолжение при возврате | P0 | Шпиль (ступень) | AppState | пока смонтирован раннер | нет (перезапись фазы) | `sub.remove()` в cleanup | локально | JS |

## Что сканер не видит (известные ограничения)

- Самоперезапускающиеся `setTimeout`-циклы не детектируются автоматически: известные
  записаны ручными строками `timeoutLoop` (плюс координаторы `net_status` и планировщик
  завершений V2 — их циклы описаны в строках `networkLease`/`appState`).
- `runAfterInteractions` в экранах (`.tsx`, кроме `_layout`) — это отсрочка UI после
  перехода, не фоновая работа; не регистрируется.
- Подписки на шину событий в памяти (`onAppEvent`, `subscribeAccountGeneration`) — не фоновая
  работа; модульные подписки такого рода стережёт `tests/pm212_module_side_effects.probe.ts`.
