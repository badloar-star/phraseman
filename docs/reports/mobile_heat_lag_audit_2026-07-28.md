# Аудит нагрева и деградации производительности — 28 июля 2026

## Итог

Причина не одна. После нескольких минут работы приложение могло накапливать фоновые подписки, таймеры, нативные анимации, повторные сетевые загрузки и дорогие операции с локальным хранилищем. Это особенно заметно при быстрых ответах в уроках, переходах между вкладками, открытии турниров, запуске аудио и возврате из дочерних экранов.

Исправления сохраняют существующий принцип: экран показывает последний кэшированный результат сразу, без нового полноэкранного loader и без изменения маршрутов или серверных контрактов.

## Как проверялось

- Статически просмотрены 1 415 runtime-файлов (`app`, `components`, `hooks`, `lib`, `modules`): 683 753 строк, таймеры, Firestore-подписки, AppState, бесконечные анимации, module-level cache и аудио.
- Смоделированы переключение вкладок, скрытие push-экранов, background/foreground, медленная сеть, поздние async-ответы, смена аккаунта A→B, быстрые ответы, турнирные фазы и повторные нажатия аудио.
- Для подтверждённых сценариев добавлены поведенческие тесты с deferred promises и fake timers. Строковые contract-тесты использовались только как дополнительный smoke-check.

## Исправленные причины

| Область | Что происходило | Исправление |
|---|---|---|
| Account / rewards | Старый async-контекст мог продолжить запись или награду уже в аккаунте B. | Account-generation, bounded queues, idempotent pending payout для achievement shards, token-aware one-time/referral rewards. |
| XP | Глобальная очередь через 10 секунд допускала параллельные начисления; refresh групповых бустов мог тормозить award. | Строгая очередь по аккаунту; watchdog только диагностирует; group boost — SWR/single-flight без ожидания Firestore на award path. |
| Public profile | Ежедневный XP вызывал bulk reads ещё до TTL, а конкурирующие calls дублировали работу. | Owner-scoped cache/TTL, single-flight и latest-wins daily input до bulk reads. |
| Progress outbox | Concurrent enqueue/ACK могли терять событие; retry шёл без backoff и дорого переписывал queue. | Per-owner mutation tail, FIFO hydrated queue, max-10 batch, один write хвоста, durable 5–300 s cooldown, owner-scoped flush/result key. |
| Retained tabs | `useIsFocused()` был true для всех панелей custom tab slider. | Явный `ownerActive`: скрытые Lingman, Inbox, Avatar aura, refresh, Firestore streams, timers, audio и loops засыпают; cache остаётся на первом кадре. |
| Late listener adoption | Cleanup мог отработать до async setup, после чего добавлялись неотписываемые listeners. | Одноразовый disposable adoption для App Messages, notification tap и referral URL bootstrap. |
| Friends / Home / speech | Hidden retry продолжал сеть; поздние данные терялись; watchdog старой попытки мог оборвать новую. | Lease для invite retry, dirty catch-up, generation-safe requests, owner-safe watchdog. |
| Tournament | Cached room мог запустить side effect, а hidden Results продолжал слушать/тикать. | Cached first frame отделён от fresh server snapshot; listeners/reactions/FX/navigation gated by runtime; устранён Table→same Round bounce. |
| Arena / Club / Exam | Таймеры и модалки продолжались скрыто; Arena могла сохранить двойной/ложный ответ; Exam давал неверное время в фоне. | Runtime ownership, absolute deadlines, synchronous answer lock, deferred visible presentation. |
| Audio / lists / telemetry | Timeout audio позволял дубль native download; каждая строка Flashcard list держала loop; route tracking читал storage при no-op. | Real single-flight download, nudge только на active row, early activity no-op. |
| Lesson audio | Autoplay, TTS и auto-advance могли сработать под дочерним экраном. | Runtime/AppState gates, cleanup chains, focus-scoped lesson BackHandler. |

## Проверочная выборка

Ниже — независимые целевые запуски в текущем рабочем дереве:

- Account/reward: 60 тестов — PASS.
- XP strict queue: 20 тестов — PASS.
- Public profile hot path: 5 новых тестов — PASS.
- Progress outbox: 45 тестов — PASS.
- Retained tabs / late listeners: 16 тестов — PASS.
- Friends/Home/Speaking lifecycle: 54 теста — PASS.
- Tournament runtime: 15 тестов — PASS.
- Timed screens: 3 теста — PASS.
- Audio/list/telemetry micro hot path: 15 тестов — PASS.
- Final audio/lesson/settings ownership: 3 теста — PASS.

`tsc` подтверждает XP/account пакеты. Общая проверка типов всё ещё блокируется существующей, не относящейся к этой работе ошибкой `aura-preview-runtime/App.tsx:16` (`"prism-oracle"` не входит в `AuraLabId`). Один широкий Firebase cost contract также содержит старые source-assertion расхождения в App Check/referral progress; новые профильные сценарии при этом проходят.

## Последний пакет оптимизаций

1. Нативный `dismissTo`/`POP_TO` включён по умолчанию в общем Back-пути и в выходе из урока. Он действительно снимает покинутые Stack-экраны, поэтому их подписки и анимации не остаются в стеке. Экстренный откат без новой правки кода: `EXPO_PUBLIC_NATIVE_POP_TO_BACK=0`; тогда автоматически используется прежний `replace`.
2. Вторичные XP-проекции (локальные leaderboard/week/day/streak) объединяются на 300 мс по account-generation. Авторитетные XP, `xp_changed`, weekly XP и серверный FIFO остаются немедленными. Пакет сохраняет знак суммарной дельты — списание wager не теряется; при смене аккаунта устаревший пакет отбрасывается generation guard.
3. В раскрытой коллекции бесконечные ambient-анимации запускаются лишь у первого видимого ряда, а остальные карточки остаются полностью интерактивными и визуально теми же, но статичными. В Settings два JS-перехода на scroll объединены в один и прорежены до 8 px.

## Что всё ещё требует физического прогона

1. Исторический Android/Fabric crash на native teardown нельзя окончательно исключить без реального Android release/profile прогона. Новый возврат защищён флагом экстренного отката, но сейчас намеренно включён по запросу владельца.
2. Полная переработка всех BackHandler-маршрутов и крупный UI-thread scroll refactor не нужны для закрытия найденных источников, но остаются следующими кандидатами, если профиль покажет остаточные jank/heat.

## Физическая проверка

На реальном Android release/profile build повторить 5-минутный маршрут: Home → урок с быстрыми ответами → audio cards → Friends → tournament → Review → возврат → background/foreground.

Снять Perfetto с FrameTimeline, `sched`, CPU frequency/idle, затем сравнить до/после:

- `adb shell dumpsys gfxinfo app.phraseman`
- `adb shell dumpsys meminfo app.phraseman`
- Hermes sampling profile
- число активных room/reaction/Firestore listeners и таймеров после возврата.

Тестировать в одинаковом режиме питания: USB сам удерживает wakelock на многих Android-устройствах и искажает idle/thermal картину.

## Источники

- [React Native: performance overview](https://reactnative.dev/docs/performance)
- [React Native: AppState](https://reactnative.dev/docs/appstate)
- [React Navigation: lifecycle](https://reactnavigation.org/docs/8.x/navigation-lifecycle/)
- [React Navigation 8 upgrade: freeze does not clean effects](https://reactnavigation.org/docs/8.x/upgrading-from-7.x/)
- [React Native: FlatList optimization](https://reactnative.dev/docs/optimizing-flatlist-configuration)
- [Reanimated: performance](https://docs.swmansion.com/react-native-reanimated/docs/guides/performance/)
- [Android FrameTimeline guidance](https://developer.android.com/topic/performance/vitals/render)
- [Perfetto system tracing](https://perfetto.dev/docs/getting-started/system-tracing)
