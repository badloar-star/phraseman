# Learning V2: мгновенное раскрытие карты урока

**Статус:** APPROVED BY OWNER, 2026-08-21  
**Поверхность:** `app/(tabs)/lessons.tsx`, страница Learning V2  
**Тип изменения:** performance/interaction architecture; без изменения учебного контента

## 1. Решение владельца

При нажатии на карточку урока карта из 56 сессий должна начинать раскрываться
немедленно и не создавать ощущения загрузки. Приложение должно визуально
отвечать в тот же кадр и не выполнять сеть, чтение диска, сборку полного курса,
hashing или массовый React-mount между пальцем и первым кадром карты.

Утверждён вариант: убрать тяжёлую работу из hot path тапа, материализовать карту
как виртуализованные строки основного списка и заранее готовить компактную
модель раскрытия.

## 2. Проверенный исходный дефект

Текущий путь тапа:

1. `toggleLearningV2Lesson()` меняет `expandedLearningV2Lesson`.
2. `buildLearningV2CourseAccordionMapModelV1()` вызывает
   `buildLearningV2CourseTopologyV1()`.
3. Полностью создаются 32 урока × 56 сессий = 1 792 session objects.
4. `hashCanonicalBody()` сериализует и хеширует всю топологию.
5. Раскрытый урок рендерится одним item внешнего `FlatList`; внутри него
   синхронно монтируются 56 session nodes и 7 chapter headers.
6. Layout transition длится 240 ms, а отдельные node reveal — 260–390 ms.

Локальный диагностический benchmark, 30 повторов на desktop Node:

- полная accordion model: median 148.62 ms;
- один `hashCanonicalBody()` готовой topology: median 149.43 ms.

Это не device benchmark, но он доказывает, что canonical hashing сам по себе
многократно превышает кадр 16.6 ms ещё до React render/layout. На мобильном
устройстве синхронная стоимость и массовый mount закономерно ощущаются сильнее.

Сеть не является обязательной частью этого тапа. Существующие catalog,
progress, session-package и audio preload сохраняются, но не решают найденный
синхронный bottleneck.

## 3. Scope и non-goals

### Scope

- построение UI-модели inline-карты;
- состав `listData` страницы Learning V2;
- виртуализация chapter/session rows;
- первый визуальный ответ и motion раскрытия;
- idle precomputation и cache invalidation по прогрессу;
- performance instrumentation и focused regression gates.

### Non-goals

- изменения 32 × 56 topology contract;
- изменения `SessionKind`, objective, grammar/lexicon boundaries, interaction
  profiles, activity families или восьми локалей;
- изменения canonical fingerprints, release packages или Content Studio;
- изменения progress/economy authority, Firestore, Jarvis или схем данных;
- изменение утверждённого поведения: карта остаётся inline под карточкой,
  одновременно раскрыт максимум один урок;
- deploy, publish, TTS или production activation.

## 4. Рассмотренные варианты

### A. Только memoize полной topology

Убирает повторный hash после первого построения, но оставляет массовый mount 63
элементов и переносит тяжёлую первую сборку в другое место. Допустим как
дополнительная защита canonical builder, но недостаточен для owner-цели.

### B. Компактная UI-модель + плоская виртуализация — утверждено

Accordion path строит только 32 lesson rows и 63 строки выбранного урока, не
трогая canonical topology/hash. Chapter/session rows становятся отдельными
items уже существующего внешнего списка. Поэтому React создаёт только видимый
viewport и небольшой buffer.

### C. Отдельный экран карты

Может дать быстрый navigation transition, но нарушает утверждённый inline
контракт и меняет пользовательскую модель. Отклонён.

## 5. Архитектура

### 5.1 Compact accordion projection

`course_accordion_map_model_v1.ts` получает UI-специфичную projection-функцию,
которая использует только стабильные координаты курса:

- 32 lesson ordinals;
- 56 session ordinals выбранного урока;
- chapter = `ceil(sessionOrdinal / 8)`;
- checkpoint/final role через существующий role helper;
- state через `completedSessionIds` и `currentSessionId`.

В interaction path запрещены:

- `buildLearningV2CourseTopologyV1()`;
- `hashCanonicalBody()`;
- создание/обход всех 1 792 сессий;
- повторная locale/catalog/package materialization.

Progress IDs валидируются по строгому parser/coordinate contract без создания
полной топологии. Ошибочный progress продолжает fail closed.

Модель раскрытого урока кэшируется по ключу:

`lessonOrdinal + currentSessionId + stable completedSessionIds fingerprint`.

Закрытие/повторное открытие без изменения прогресса возвращает ту же immutable
ссылку. При смене аккаунта, study target или progress fingerprint cache
инвалидируется.

### 5.2 Плоский список вместо вложенной карты

Для страницы V2 `listData` содержит discriminated rows:

- `lesson`;
- `v2_chapter`;
- `v2_session`;
- существующие legacy/header/exam rows там, где они применимы.

При раскрытии выбранного урока его 7 chapter и 56 session rows вставляются
сразу после lesson row. Внешний `FlatList` получает стабильные keys и рендерит
каждую строку отдельно. Вложенный `.map()` всех 56 сессий удаляется из активного
пути.

Текущий `FlatList` достаточен для максимум 95 логических строк и уже имеет
windowing. Переход всей страницы на FlashList не входит в этот пакет: это
увеличит риск без необходимости доказать owner-цель.

Chapter и session renderer выносятся в memoized components. Inline callbacks и
новые style objects не оптимизируются спекулятивно: только если React Profiler
покажет их в heaviest commit после основной архитектурной правки.

### 5.3 Ahead-of-finger preparation

После появления страницы V2 и после изменения прогресса компактная модель
текущего/видимого урока готовится в idle-время. `onPressIn` оставляет
существующую UI-thread scale reaction; он может лишь запросить idempotent
preparation, но не раскрывает урок до подтверждённого press, чтобы scroll
gesture не вызывал ложное открытие.

На подтверждённом `onPress` выполняются только:

1. haptic/уже запущенная press reaction;
2. выбор готовой projection;
3. одно state update с ordinal раскрытого урока.

Никакой promise не awaited. Ошибка фонового precompute не блокирует тап:
компактная projection строится синхронно в пределах малого бюджета и не
обращается к topology/hash/network/storage.

### 5.4 Motion contract

Motion сообщает «карта раскрылась», а не «карта загружается»:

- первая видимая строка присутствует в первом committed frame;
- opacity не стартует с нуля;
- нет 130 ms hold для видимых узлов;
- допустим лёгкий translate/scale settle на UI thread;
- целевая perceptual duration 140–180 ms;
- reduced motion показывает конечное состояние сразу;
- все видимые узлы кликабельны с момента первого появления.

Layout animation не может быть способом скрыть JS-паузу. Её длительность и
область оставляются только если device trace подтверждает отсутствие main/UI
thread drops; иначе применяется bounded UI-thread transition только к видимым
строкам.

## 6. Data flow

```text
local progress/catalog warm state
             |
             v
compact accordion projection cache (no canonical hash)
             |
finger down -> UI-thread press feedback
             |
confirmed press -> expanded lesson ordinal
             |
flat listData: lesson + virtualized chapter/session rows
             |
first visible map row -> remaining rows rendered by list windowing
```

Session package/audio preload остаётся параллельным фоновым потребителем и не
гейтит ни раскрытие карты, ни выбор узла.

## 7. RED и verification strategy

### 7.1 Deterministic RED contracts

До реализации добавить тесты, которые доказывают:

1. accordion projection не вызывает canonical topology builder/hash;
2. закрытая модель содержит 32 lesson rows;
3. раскрытая модель содержит 32 lesson + 7 chapter + 56 session rows и
   сохраняет правильный порядок;
4. progress state/checkpoint/final roles не меняются;
5. неправильные account/progress coordinates fail closed;
6. активный Lessons V2 renderer не содержит вложенный render всех 56 nodes;
7. chapter/session являются отдельными virtualized list items;
8. закрытие и повторное открытие возвращают stable cached projection;
9. смена account/progress invalidates projection;
10. reduced motion и accessibility `expanded` сохраняются.

Не использовать wall-clock unit test как единственный gate: он нестабилен в CI.
Структурный запрет на full topology/hash в hot path является обязательным
детерминированным сторожем.

### 7.2 Performance evidence

Измеряется точный flow `press lesson card -> first map row painted`, а не startup
или размер component tree. Нужны release/minified runs и минимум 20 повторов
для cold-after-navigation и warm reopen.

Предлагаемые acceptance budgets на согласованном минимальном устройстве:

- UI-thread press feedback: в текущем кадре, ≤16.6 ms при 60 Hz;
- press-to-first-map-row: p95 ≤50 ms;
- первый viewport полностью интерактивен: p95 ≤100 ms;
- JS long task в interaction window: ни одного >50 ms;
- отсутствие заметного падения UI/JS FPS во время раскрытия;
- повторные открытия не ухудшают latency и memory.

Проверки выполняются минимум на среднем Android и iPhone. Абсолютное «на любом
железе никогда» технически недоказуемо; продуктовая гарантия формулируется как
отсутствие I/O, сети, canonical compilation/hash и unbounded mount в hot path
плюс соблюдение budget на зафиксированном device floor.

## 8. Failure handling

- Нет progress/catalog cache: показывается безопасная локальная state-модель;
  background hydration обновляет её позже без блокировки тапа.
- Cache miss projection: дешёвая bounded projection строится немедленно.
- Некорректный progress: fail closed по существующему контракту; не подменять
  ошибку пустой картой.
- Session preload failure: карта остаётся интерактивной; ошибка обрабатывается
  только при фактическом входе в сессию по существующей LKG/fallback policy.
- Memory pressure: projection cache ограничен текущим account/target и не
  хранит 32 полные React trees.

## 9. Acceptance criteria

- Внешний вид и inline-поведение карты сохранены.
- Между press и первым кадром нет сети, storage, полной topology или hashing.
- Не монтируются все 56 session nodes одним React subtree.
- Первая видимая строка не скрыта delay/нулевой opacity.
- Progress, checkpoints, final exam, modal/session navigation и accessibility
  проходят focused regression tests.
- Release-device trace выполняет budgets раздела 7.2.
- До/после evidence сохранено кратко: commit timeline, heaviest render,
  press-to-first-paint p50/p95, JS/UI FPS и decisive long-task count.
- Никакие content/release/economy/schema поверхности не изменены.

## 10. Intended implementation boundary

Ожидаемые файлы реализации:

- `modules/learning-v2/map/course_accordion_map_model_v1.ts`;
- `app/(tabs)/lessons.tsx`;
- `components/LearningV2InlineNodeReveal.tsx` либо его замена row-level motion;
- focused tests для model, surface contract и performance hot-path guard.

Любое расширение в canonical topology, progress persistence, release package,
account identity, economy, Firestore или content authoring требует остановки и
отдельного решения владельца.

## 11. Drift-check

`ON TRACK`: дизайн меняет только latency и render architecture. Структура курса
32 × 56, содержание урока 1, SessionKind choreography, interaction budgets,
восемь локалей, diagnostics/feedback, owner mock и все release gates остаются
без изменений. `ON TRACK` не является implementation PASS.

