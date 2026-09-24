# PM-209 — разведка целевой очереди на основе существующей (`app_resume_policy`)

Профиль A1, разведка + карта точек аудита, **read-only**. Код не менялся, коммит
не делался. Задача — собрать факты для проектирования, а не спроектировать
реализацию (см. `docs/phraseman-2.0/docs/RUNTIME.md`).

## Что есть в `app_resume_policy.ts` сейчас

Файл маленький (135 строк) и содержит **не очередь с приоритетами, а набор из
трёх независимых примитивов**, которые можно комбинировать вручную у каждого
вызывающего:

1. **Классификатор длительности фона** — `getForegroundRefreshKind(ms)` /
   `shouldRunDeepForegroundRefresh(ms)`. Чистая функция: возвращает
   `'none' | 'local' | 'cloud'` по порогу `SHORT_BACKGROUND_CLOUD_REFRESH_MS`
   (5 мин). Не исполняет ничего сама, только классифицирует «насколько долго
   приложение было в фоне» — единственное, что тут похоже на «приоритет».

2. **Коалессинг одного асинхронного раннера** — `createCoalescedAsyncRunner(run)`.
   Возвращает функцию: если `run` уже выполняется, повторный вызов не создаёт
   параллельный запуск, а помечает «нужно перезапустить после текущего»
   (`queued=true`) и переиспользует тот же промис. Это dedupe одного
   конкретного асинхронного действия, без ключей, без приоритета, без TTL,
   без отмены (нет `cancel`, вопреки формулировке в RUNTIME.md «coalescing
   queue с ключом, cancel и serial drain» — cancel и ключ есть только у
   ВТОРОГО примитива, не у этого).

3. **Троттлер запланированных задач по фону, С КЛЮЧОМ и cancel** —
   `scheduleCoalescedForegroundTask(key, run, delayMs)`. Единственный из трёх
   примитивов, который держит общее модульное состояние
   (`scheduledForegroundTasks: Map<string, ScheduledForegroundTask>`) и
   реальный serial drain (`drainForegroundTasks`, с паузой
   `FOREGROUND_TASK_GAP_MS=80ms` между задачами, чтобы не блокировать
   поток). Новый вызов с тем же `key` отменяет предыдущий отложенный запуск
   (не параллельно исполняющийся — если задача уже стартовала выполнение,
   она не прерывается, отменяется только следующая невыполненная). Возвращает
   `{ cancel }`. Задачи выполняются строго последовательно (`while` цикл),
   без параллелизма, без приоритета между разными `key`, без `timeout`,
   `retryLimit`, `maxConcurrent` — они выполняются в порядке `readyAt`
   (кто раньше стал готов).

**Архитектурный вывод:** это **обёртка-примитив** уровня "не запусти дважды
одно и то же при частом сворачивании/разворачивании", а НЕ очередь с
приоритетами P0-P4, дедлайнами, ретраями или бюджетами конкурентности,
которую описывает раздел «Предлагаемая иерархия работ» в RUNTIME.md. Она не
знает о существовании других задач в системе — только о задачах, которые сами
её вызвали под своим `key`.

## Реальные вызывающие

8 файлов, 12 call-сайтов (некоторые файлы вызывают примитив несколько раз).

| Файл:строка | Что вызывает | Что именно рефрешит | Триггер | Вероятный приоритет |
|---|---|---|---|---|
| `app/(tabs)/home.tsx:2400` | `getForegroundRefreshKind` (только классификатор, без раннера) | Решает, легкий или облачный рефреш нужен главному экрану после возврата | AppState → foreground | Классификатор — сам по себе не P0-P4, определяет ветку ниже |
| `app/_layout.tsx:976` | `scheduleCoalescedForegroundTask('root_level_up_queue_flush', ...)` | Дренаж очереди бонусов за повышение уровня + `flushRewards()` (страховка на пропущенное событие `level_up_pending`) | AppState → foreground, троттл `FOREGROUND_FLUSH_MIN_MS` поверх | P3 — отложенная синхронизация/flush, основной путь идёт через событие, это лишь страховка |
| `app/_layout.tsx:1011` | `scheduleCoalescedForegroundTask('root_widget_snapshot_refresh', ...)` | Пересобирает снапшот для домашнего/lock-screen виджета «фраза дня» на случай смены дня в фоне | AppState → foreground | P4 — необязательный, best-effort, "native no-op off-device" по комментарию в коде |
| `app/_layout.tsx:1915` | `scheduleCoalescedForegroundTask('root_league_bonus_availability', ...)` | Проверка доступности бонуса лиги | AppState → foreground (гейт `ready && !showOnboarding && !isBanned`) | P3 — локальное обслуживание/уведомление, не блокирует экран |
| `components/BillingIssueToastHost.tsx:110` | `scheduleCoalescedForegroundTask('billing_issue_toast_check', ...)` | Проверяет сохранённый инцидент оплаты, показывает тост «обновите карту» (раз в 3 дня на инцидент) | mount + AppState → foreground | P3 — диагностика/уведомление, не критический путь |
| `components/EnergyContext.tsx:774` | `createCoalescedAsyncRunner(runLoad)` | Загружает баланс энергии (таймеры реген, бонусная энергия, безлимит) из кэша/облака, пишет peek-cache | mount, смена аккаунта, внутренние триггеры | P2 — данные активного экрана, реально гейтит игровые действия (можно/нельзя играть) |
| `components/GlobalFriendGiftHost.tsx:97` | `scheduleCoalescedForegroundTask('global_friend_gift_poll', ...)` | Опрос непросмотренных подарков от друзей (троттл `POLL_INTERVAL_MS`) | mount + AppState → foreground | P3 |
| `components/GlobalFriendGiftHost.tsx:116` | тот же `scheduleCoalescedForegroundTask('global_friend_gift_poll', () => poll(true))` | Тот же опрос, но форсированный — предотвращает утечку чужого подарка в новый аккаунт после смены | смена generation аккаунта | P2 — защита от утечки данных между аккаунтами, не просто рефреш "для красоты" |
| `components/PremiumContext.tsx:349` | `createCoalescedAsyncRunner(runReload)` | Пересчёт локальных флагов доступа (Plus/VIP/Pro/intro) из уже закэшированных источников | после покупки/восстановления, смена аккаунта, вызывается из foreground-пути ниже | P1/P2 — корректность прав доступа гейтит платный контент и paywall |
| `components/PremiumContext.tsx:452` | `createCoalescedAsyncRunner(runReloadAfterCloudRefresh)` | Тянет актуальные права из облака (`restoreFromCloud`), инвалидирует кэш, зовёт `reload` | AppState → foreground, если `getForegroundRefreshKind` решил "cloud" | P2 |
| `components/StreakRiskToastHost.tsx:74` | `scheduleCoalescedForegroundTask('streak_risk_toast_check', ...)` | Проверка «серия сгорит сегодня к полуночи», показывает тост раз в день вечером | mount + AppState → foreground | P3 |
| `components/TodaysBoonStrip.tsx:63` | `scheduleCoalescedForegroundTask('todays_boon_strip_refresh', ...)` | Пересчёт полосы «бонус дня» + флага «сундук недели забран» | AppState → foreground, а также события `remote_config_changed`/`mystery_chest_claimed` (эти два — без коалессинга) | P3/P4 |

Наблюдение: `TodaysBoonStrip` вызывает рефреш и по нескольким событиям
(`remote_config_changed`, `mystery_chest_claimed`) НЕ через
`scheduleCoalescedForegroundTask` — только foreground-путь коалесснут, событийные
триггеры идут мимо примитива. Это не баг сам по себе (разные источники), но
стоит учитывать в проектировании: тот же `key` не гарантирует единственный
источник вызова.

## Другие bootstrap/preload системы вне `app_resume_policy`

`app/_layout.tsx` — 3710 строк, около 80 `useEffect`, несколько независимых
`AppState.addEventListener('change', ...)`. Только 3 из них используют
`app_resume_policy` (перечислены выше). Остальные найденные механизмы:

| Файл/механизм | Что делает | Пересекается ли с `app_resume_policy` | Риск дублирования |
|---|---|---|---|
| `_layout.tsx:~1409` — `AppState` → `setAppIsActive` | Просто зеркалит состояние AppState в React state | Нет — не рефреш данных, чистое зеркало | Нет |
| `_layout.tsx:~1534` — foreground аудио-восстановление | Останавливает осиротевшие аудио-владения, снимает протухшие аренды треков (recovery после mute-switch/звонка) | Частично — тоже "foreground cleanup", но домен другой (аудио-ресурсы, не данные) и логика идемпотентна внутри вызываемых функций | Частично — тот же класс триггера, но не тот же тип работы; сосуществование выглядит оправданным |
| `_layout.tsx:~1690` — debounced аналитика `app:state_change` | Логирует переход состояния приложения (screen_view/lifecycle) с собственным `setTimeout`-дебаунсом (1200ms активный / 250ms прочие) | Нет — чистая диагностика, не рефреш данных | Нет |
| `_layout.tsx:~1965` — возврат из стора | Если стоит флаг "ждём возврата из App Store/Play Store", повторно показывает модалку обновления после задержки | Нет — одноразовая обработка конкретного события, не периодический рефреш | Нет |
| `_layout.tsx:~1990` — background flush | На уходе в фон/inactive гонит sync с собственным троттлом 60s (`lastBackgroundSyncAt` + `flushTimer`) | Частично — тот же КЛАСС ответственности (троттлинг вокруг foreground/background границы), но реализован полностью независимо и на ПРОТИВОПОЛОЖНОМ триггере (background, не foreground) | Частично — не прямой дубль по триггеру, но дублирует ПАТТЕРН (свой ref+timer вместо общего примитива) |
| `_layout.tsx:~2738` — `authRecoveryBootRetryScheduler` | На foreground повторяет попытку `ensureFreshPostDeletionIdentity`, свой scheduler с backoff/in-flight guard | Нет по домену (identity/auth recovery, не общий data refresh), но структурно похож на custom foreground scheduler | Нет — целенаправленно отдельный, критичный путь восстановления личности после удаления |
| `_layout.tsx:~2938` — проверка "интро-доступ закончился" | На foreground перепроверяет, показывать ли модалку конца пробного периода, свой троттл (`lastForegroundIntroCheckAtRef` + `FOREGROUND_MODAL_CHECK_MIN_MS`) | **Да** — прямой дубль паттерна `scheduleCoalescedForegroundTask` (foreground-триггер + минимальный интервал между запусками), реализован вручную вместо общего примитива | **Да** — кандидат №1 на объединение |
| `_layout.tsx:~2983` — проверка winback-оффера | На foreground перепроверяет доступность winback-предложения, тот же троттл-паттерн (`lastForegroundWinbackCheckAtRef` + та же константа) | **Да** — тот же ручной дубль паттерна, что и пункт выше | **Да** — кандидат №2 на объединение |
| `installRewardFlightQueue()` (~1356) | Устанавливает собственную глобальную singleton-очередь для анимации "полёта" наград | Нет — визуальный эффект, не data refresh; mount-once эффект | Нет |
| `installForegroundUsageMsTracker()` (~1934) | Устанавливает собственный трекер накопленного времени на переднем плане | Нет — учёт времени, не рефреш данных | Нет |
| `preloadVectorIconFonts` / `preloadPrimaryTabImages` / `preloadDeferredNonPrimaryImages` | Одноразовые async-прогревы при старте | Нет — bootstrap-only (P0/P4 в момент старта), не foreground-повтор | Нет |
| `prefetchMarketplacePacks`, `prefetchAchievementArtInBackground`/`prefetchAllAchievementArt`, `prefetchEasUpdateAfterStartup`, `scheduleAheadPhraseAudioPrefetch` | Точечные фоновые прогревы, каждый со своим триггером (в т.ч. по событию `level_up_pending`) | Нет прямого пересечения — это одноразовые prefetch-вызовы, не периодические foreground-рефреши, кроме `scheduleAheadPhraseAudioPrefetch`, у которого свой планировщик | Нет / частично (свой планировщик, но другой домен — аудио вперёд по треку) |
| `referral_bootstrap`, `bootstrapPhoneState`, `primeAppSnapshotFromStorage`, `learning_v2_bootstrap_audio_seed_v1`, `primeAllLessonsFromStorageOnAppLaunch` | Одноразовые шаги гидратации при старте приложения | Нет — bootstrap-only, не foreground-resume | Нет |
| Главный `bootstrap()` (~2418) + `authRecoveryBootRetryScheduler` | Основная auth/identity bootstrap-последовательность, свой in-flight guard и `BOOTSTRAP_READY_DEADLINE_MS` | Нет — отдельный домен (идентификация при старте), архитектурно самостоятелен | Нет |

## Рекомендация

**Не заводить вторую независимую «главную очередь».** Материал подтверждает
предупреждение из RUNTIME.md буквально: `app_resume_policy` — это узкий
примитив (dedupe + троттлинг по ключу), которым уже пользуются 8 файлов, и
рядом с ним в `_layout.tsx` живут **минимум два места (~2938 "конец
интро-доступа" и ~2983 "winback"), которые вручную реализуют ТОТ ЖЕ паттерн**
(foreground-триггер + `useRef` таймстемп + минимальный интервал) вместо вызова
`scheduleCoalescedForegroundTask`. Это и есть конкретный, а не гипотетический,
риск дублирования — но он уже произошёл на уровне паттерна кода, а не в виде
отдельного framework/очереди.

Дальнейшее проектирование (вне рамок этой A1-задачи) стоит держать в двух
руслах:

1. **Немедленно годный, дешёвый шаг** — завести оба хвоста (~2938, ~2983) на
   существующий `scheduleCoalescedForegroundTask` вместо ручных `useRef`-таймеров.
   Это не новый framework, а использование уже существующего контракта там,
   где он и должен был использоваться. Не входит в PM-209 (A1, read-only) —
   кандидат для отдельной A2/A3 задачи.

2. **Отдельные пути, где сосуществование оправдано, а не баг:**
   - `_layout.tsx:~1990` (background flush, троттл 60s) технически похож
     паттерном, но триггер противоположный (background, не foreground) —
     решение о слиянии требует отдельного анализа, не тривиальная замена.
   - Аудио-восстановление (~1534) и auth-recovery scheduler (~2738) —
     разные домены с осмысленными причинами иметь свою логику (durable write
     path/восстановление личности не должны зависеть от общей data-refresh
     очереди — RUNTIME.md явно говорит "общий durable write path имеет
     приоритет над prefetch").
   - Диагностика/аналитика (~1690) и одноразовые bootstrap-прогревы —
     не относятся к "resume/foreground refresh" вообще, приоритетная
     иерархия P0-P4 из RUNTIME.md к ним неприменима напрямую (они не про
     resume, а про cold start или lifecycle-логирование).

Иерархия P0-P4 из RUNTIME.md **предложена**, но реальному коду соответствует
частично: примитив `app_resume_policy` сам по себе не различает приоритеты —
приоритет у каждого вызывающего "в голове разработчика", не в коде. Из таблицы
вызывающих видно, что там, где встречается P1/P2 (EnergyContext, PremiumContext
— данные, гейтящие деньги/игровые действия), используется
`createCoalescedAsyncRunner` (без ключа, без отмены), а там, где P3/P4
(тосты, виджет, прогнозы) — `scheduleCoalescedForegroundTask` (с ключом и
cancel). Совпадение не строгое и не документировано как правило — это
наблюдение, а не проектное решение; будущая очередь может либо формализовать
это разделение, либо оставить как есть, если разница в примитивах уже
достаточно защищает P1/P2-код от отмены более "дешёвых" P3/P4-задач.

Заводить общий framework поверх всего (единый menеджер с приоритетами,
maxConcurrent, retryLimit и т.д., как в шаблоне карточки job) сейчас **не
обосновано фактами**: реальных конфликтов конкурентности/порядка исполнения
между разными call sites не найдено (каждый использует свой уникальный `key`,
пересечений по `key` нет). Единственный подтверждённый дефект — ДВА места,
где скопирован паттерн общего примитива руками вместо вызова самого примитива.
