# Today Swipe Compass Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Добавить скрытый экран Today слева от Home: с мягким свайпом, одним актуальным CTA, честным прогрессом дня, одной персональной рекомендацией и лёгкой декоративной анимацией компаса.

**Architecture:** Today остаётся внутренней физической страницей существующего TabSlider и не становится Expo Router route. Навигация разделяет физическую страницу, логический tab и единственного runtime owner. Данные строятся локально в account/target/locale/date/timezone scope, синхронно читаются из bounded peek-cache и тихо перепроверяются. Все account-scoped хранилища участвуют в общем backup/wipe-контракте и защищены AccountGenerationToken + account transition lock. Алгоритмы CTA и рекомендации являются чистыми функциями, маршруты — закрытым типизированным union, а доступность уроков вычисляется одним resolver, общим для Lessons и Today.

**Tech Stack:** React Native, Expo Router, TypeScript, React Native Gesture Handler, Reanimated 4, react-freeze, react-native-svg, AsyncStorage, Jest/ts-jest, Maestro.

**Approved design:** docs/superpowers/specs/2026-07-13-today-swipe-compass-screen-design.md

---

## Обязательные инварианты

- Физический порядок: Today, Home, Lessons, Arena, Friends, Settings.
- Логический tab bar не меняется: Home, Lessons, Arena, Friends, Settings.
- На Today логически выбран Home, но Home не является runtime owner.
- Во время drag owner остаётся исходной страницей; меняется только после успешного snap.
- Перед freeze бывший owner получает один commit с ownerVisible=false, чтобы остановить эффекты и анимации.
- Today не имеет route-файла в app/, tab-кнопки и deep link.
- Первый кадр берётся из синхронного peek-cache; spinner и изменение геометрии после hydration запрещены.
- Никакие данные Today от старого аккаунта не переживают backup/wipe boundary и не могут вернуться поздней записью или hydration.
- `useSyncExternalStore` получает referentially stable account и snapshot значения; время последней проверки не считается изменением UI-контента.
- CTA всегда один; показателей дня ровно три; рекомендация ровно одна.
- На t.accent и t.correct используется t.correctText.
- Компас декоративный, не использует sensors, location и permissions.
- Все циклические анимации работают только при Today owner + foreground и выключены при Reduced Motion.
- Существующие Home, Lessons, Arena, Friends, Settings и их маршруты не удаляются и не переименовываются.

## Итоговая структура файлов

Новые production-файлы:

- lib/today/tab_page_model.ts
- lib/today/types.ts
- lib/today/scope.ts
- lib/today/storage_keys.ts
- lib/today/source_revision.ts
- lib/today/account_reset.ts
- lib/today/metrics_store.ts
- lib/today/study_route_classifier.ts
- lib/today/interaction_store.ts
- lib/today/resume_selector.ts
- lib/today/destinations.ts
- lib/today/recommendation_catalog.ts
- lib/today/recommendation_selector.ts
- lib/today/recommendation_history_store.ts
- lib/today/recommendation_session.ts
- lib/today/fallback.ts
- lib/today/snapshot_store.ts
- lib/today/snapshot_builder.ts
- lib/today/discovery_store.ts
- lib/today/analytics.ts
- lib/today/action_revalidation.ts
- lib/today/copy.ts
- lib/today/hydration_coordinator.ts
- lib/lesson_availability.ts
- components/today/TodayStudyTimeTracker.tsx
- components/today/TodayAmbientCompass.tsx
- components/today/TodayScreen.tsx
- components/today/TodayDiscoveryHint.tsx
- components/today/TodayWarmCoordinator.tsx
- components/today/TodayPaneBoundary.tsx

Новые тесты:

- tests/today_tab_page_model.test.ts
- tests/today_scope.test.ts
- tests/today_account_isolation.test.ts
- tests/today_metrics_store.test.ts
- tests/today_xp_integration.test.ts
- tests/today_study_route_classifier.test.ts
- tests/today_lesson_availability.test.ts
- tests/today_plan_progress_integration.test.ts
- tests/today_resume_selector.test.ts
- tests/today_interaction_store.test.ts
- tests/today_recommendation_catalog.test.ts
- tests/today_recommendation_selector.test.ts
- tests/today_recommendation_history_store.test.ts
- tests/today_recommendation_session.test.ts
- tests/today_snapshot_store.test.ts
- tests/today_snapshot_builder.test.ts
- tests/today_discovery_store.test.ts
- tests/today_hydration_coordinator.test.ts
- tests/today_source_revision.test.ts
- tests/today_navigation_contract.test.ts
- tests/today_pane_scope_safety.test.tsx
- tests/today_screen_contract.test.ts
- tests/today_screen_accessibility.test.tsx
- tests/today_warm_coordinator.test.tsx
- tests/today_cold_graph_contract.test.ts
- tests/today_analytics_contract.test.ts
- tests/today_action_revalidation.test.ts
- maestro/flows/today_swipe_smoke.yaml

---

### Task 0: Защитить уже существующие изменения пользователя

**Files:**

- Inspect only: все production/test-файлы, перечисленные в Tasks 1–10
- Known dirty at plan time: app/(tabs)/home.tsx
- Known dirty at plan time: app/_layout.tsx
- Known dirty at plan time: app/analytics.ts

**Step 1: Зафиксировать preflight до первой правки**

Run:

    git status --short
    git diff -- "app/(tabs)/home.tsx" app/_layout.tsx app/analytics.ts

Считать весь уже существующий diff пользовательским. Не откатывать, не форматировать целиком и не переносить эти файлы из чистого HEAD поверх рабочего дерева.

**Step 2: Применять политику частичного staging на каждом commit**

- Новые файлы можно добавлять обычным `git add -- <new paths>`.
- Любой существующий файл, который был dirty до задачи или стал содержать смешанные hunks, добавлять только через `git add -p -- <path>`.
- Перед каждым commit обязательно запускать `git diff --cached --check` и читать полный `git diff --cached`.
- Если Today-hunk нельзя отделить от пользовательского hunk без изменения его смысла, не коммитить этот файл: остановить только commit, сохранить рабочую копию и согласовать с пользователем отдельную интеграцию. Не использовать `git checkout --`, `git reset --hard` или whole-file staging.

Пример безопасного staging для первого изменяемого dirty-файла:

    git add -- lib/today/types.ts lib/today/scope.ts lib/today/storage_keys.ts tests/today_scope.test.ts
    git add -p -- app/TabContext.tsx
    git diff --cached --check
    git diff --cached

**Step 3: Проверять границу после каждого commit**

Run:

    git status --short
    git diff --cached

Expected: staged diff пуст после commit; исходные пользовательские hunks всё ещё присутствуют в working tree, если они не входили в Today.

---

### Task 1: Зафиксировать физическую и логическую модель навигации

**Files:**

- Create: lib/today/tab_page_model.ts
- Create: tests/today_tab_page_model.test.ts

**Step 1: Написать падающий unit test**

Проверить:

- Home logical index 0 отображается в physical index 1.
- Today physical index 0 отображается в logical Home index 0.
- Остальные пять tab-страниц имеют сдвиг +1.
- runtime owner однозначно определяется для всех шести страниц.
- недопустимые индексы отбрасываются, а не silently clamp.

~~~ts
import {
  logicalTabToPhysicalPage,
  physicalPageToLogicalTab,
  physicalPageToRuntimeOwner,
} from '../lib/today/tab_page_model';

expect(logicalTabToPhysicalPage(0)).toBe(1);
expect(physicalPageToLogicalTab(0)).toBe(0);
expect(physicalPageToLogicalTab(5)).toBe(4);
expect(physicalPageToRuntimeOwner(0)).toBe('today');
expect(physicalPageToRuntimeOwner(1)).toBe('home');
~~~

**Step 2: Запустить тест и подтвердить ожидаемое падение**

Run:

    npx jest --runTestsByPath tests/today_tab_page_model.test.ts --no-cache --runInBand

Expected: FAIL с Cannot find module "../lib/today/tab_page_model".

**Step 3: Реализовать закрытые типы и mapping**

~~~ts
export const LOGICAL_TAB_IDS = ['home', 'lessons', 'arena', 'friends', 'settings'] as const;
export const PHYSICAL_PAGE_IDS = ['today', ...LOGICAL_TAB_IDS] as const;

export type LogicalTabId = typeof LOGICAL_TAB_IDS[number];
export type PhysicalPageId = typeof PHYSICAL_PAGE_IDS[number];
export type LogicalTabIndex = 0 | 1 | 2 | 3 | 4;
export type PhysicalPageIndex = 0 | 1 | 2 | 3 | 4 | 5;
export type TabRuntimeOwnerId = PhysicalPageId;

export function logicalTabToPhysicalPage(index: LogicalTabIndex): PhysicalPageIndex {
  return (index + 1) as PhysicalPageIndex;
}

export function physicalPageToLogicalTab(index: PhysicalPageIndex): LogicalTabIndex {
  return (index === 0 ? 0 : index - 1) as LogicalTabIndex;
}

export function physicalPageToRuntimeOwner(index: PhysicalPageIndex): TabRuntimeOwnerId {
  return PHYSICAL_PAGE_IDS[index];
}
~~~

Добавить runtime assertions для чисел вне union на JS boundary.

**Step 4: Запустить тест**

Run:

    npx jest --runTestsByPath tests/today_tab_page_model.test.ts --no-cache --runInBand

Expected: PASS.

**Step 5: Commit**

    git add -- lib/today/tab_page_model.ts tests/today_tab_page_model.test.ts
    git diff --cached --check
    git diff --cached
    git commit -m "feat: define Today tab page model"

---

### Task 2: Ввести полный Today scope и общие доменные типы

**Files:**

- Create: lib/today/types.ts
- Create: lib/today/scope.ts
- Create: lib/today/storage_keys.ts
- Create: lib/today/source_revision.ts
- Modify: app/TabContext.tsx
- Modify: app/cloud_sync.ts
- Create: tests/today_scope.test.ts
- Create: tests/today_account_isolation.test.ts
- Modify: tests/local_account_data.test.ts

**Step 1: Написать падающие тесты scope**

Проверить:

- scope включает stable account id, study target, UI locale, local day и IANA timezone.
- phase uninitialized/transitioning и даже phase=active со stableId=null/blank не создают persistable scope.
- смена любого поля меняет scopeKey.
- timezone берётся через Intl.DateTimeFormat().resolvedOptions().timeZone с fallback UTC.
- date берётся через getLocalDayKey, а не UTC ISO day.
- повторный `getStableAccountGenerationSnapshot()` возвращает тот же object reference до реального generation change.
- subscription меняет reference ровно один раз на `beginAccountGeneration`/`invalidateAccountGeneration`.
- `accountLocalDataKeysForToday()` содержит четыре Today account keys, а discovery/opened-once keys не содержит.
- emergency backup использует тот же список account keys.

~~~ts
const scope = createTodayScope({
  account: { generation: 7, stableId: 'user-a', phase: 'active' },
  studyTargetId: 'en',
  uiLocale: 'ru',
  now: new Date('2026-07-13T10:00:00Z'),
  timeZone: 'Europe/Dublin',
});

expect(scope?.scopeKey).toContain('user-a');
expect(scope?.localDateKey).toBe('2026-07-13');
expect(createTodayScope({ ...input, timeZone: 'Asia/Tokyo' })?.scopeKey)
  .not.toBe(scope?.scopeKey);
expect(createTodayScope({ ...input, account: { generation: 8, stableId: null, phase: 'active' } }))
  .toBeNull();
~~~

**Step 2: Запустить тест**

Run:

    npx jest --runTestsByPath tests/today_scope.test.ts --no-cache --runInBand

Expected: FAIL, модули отсутствуют.

**Step 3: Реализовать types.ts**

Основные типы:

~~~ts
export type TodayScope = Readonly<{
  accountScopeId: string;
  accountGeneration: number;
  studyTargetId: string;
  uiLocale: Lang;
  localDateKey: string;
  timeZone: string;
  scopeKey: string;
}>;

export type TodayResumeAction =
  | { kind: 'lesson'; mode: 'start' | 'continue' | 'repeat'; lessonId: number; title: string; progressPct: number; estimatedMinutes: number | null }
  | { kind: 'plan'; mode: 'continue'; planInstanceId: string; title: string; progressPct: number; estimatedMinutes: number | null };

export type TodayMetrics = Readonly<{
  studyMs: number | null;
  xp: number | null;
  lessonsCompleted: number | null;
  completeness: 'complete' | 'unknown_before_tracking';
}>;

export type TodayDestinationId =
  | 'lessons'
  | 'arena'
  | 'plan'
  | 'practice'
  | 'quizzes'
  | 'flashcards'
  | 'daily_tasks';

export type TodayRecommendation = Readonly<{
  ruleId: string;
  variantId: string;
  destinationId: TodayDestinationId;
  label: string;
  accessibilityLabel: string;
}>;

export type TodaySnapshot = Readonly<{
  scope: TodayScope;
  resume: TodayResumeAction;
  metrics: TodayMetrics;
  recommendation: TodayRecommendation;
  contentUpdatedAt: number;
}>;
~~~

**Step 4: Реализовать scope.ts и storage_keys.ts**

Использовать encodeURIComponent для составных частей. Не логировать полный scopeKey в analytics или crash logs.

Storage keys:

~~~ts
export const TODAY_METRICS_STORAGE_KEY = 'today_metrics_v1';
export const TODAY_INTERACTION_STORAGE_KEY = 'today_interaction_ledger_v1';
export const TODAY_RECOMMENDATION_HISTORY_KEY = 'today_recommendation_history_v1';
export const TODAY_SNAPSHOT_STORAGE_KEY = 'today_snapshot_cache_v1';
export const TODAY_DISCOVERY_STORAGE_KEY = 'today_swipe_discovered_v1';
export const TODAY_OPENED_ONCE_STORAGE_KEY = 'today_opened_once_v1';

export const TODAY_ACCOUNT_STORAGE_KEYS = [
  TODAY_METRICS_STORAGE_KEY,
  TODAY_INTERACTION_STORAGE_KEY,
  TODAY_RECOMMENDATION_HISTORY_KEY,
  TODAY_SNAPSHOT_STORAGE_KEY,
] as const;

export const TODAY_DEVICE_STORAGE_KEYS = [
  TODAY_DISCOVERY_STORAGE_KEY,
  TODAY_OPENED_ONCE_STORAGE_KEY,
] as const;
~~~

В scope.ts сделать стабильный adapter для React external store. Нельзя передавать `captureAccountGeneration` напрямую как `getSnapshot`: эта функция каждый раз создаёт новый object и вызовет бесконечные/лишние render. Adapter кэширует последний token и меняет reference только при изменении generation/stableId/phase:

~~~ts
let stableAccountSnapshot = captureAccountGeneration();

export function getStableAccountGenerationSnapshot(): AccountGenerationToken {
  const current = captureAccountGeneration();
  if (
    current.generation !== stableAccountSnapshot.generation ||
    current.stableId !== stableAccountSnapshot.stableId ||
    current.phase !== stableAccountSnapshot.phase
  ) {
    stableAccountSnapshot = current;
  }
  return stableAccountSnapshot;
}

export function subscribeStableAccountGeneration(listener: () => void): () => void {
  const sub = subscribeAccountGeneration((next) => {
    stableAccountSnapshot = next;
    listener();
  });
  return sub.remove;
}
~~~

`createTodayScope` первым делом нормализует stableId и возвращает null без непустого id. В том же модуле добавить pure `rebuildCurrentTodayScope(requested, accountToken, studyTargetId, uiLocale, now, timeZone?)`: он заново вычисляет local date/timezone и возвращает scope только при полном совпадении scopeKey. Это будет post-await guard для CTA, поэтому его unit tests должны отдельно менять target, locale, date и timezone.

В app/cloud_sync.ts добавить только `TODAY_ACCOUNT_STORAGE_KEYS` в `accountLocalDataKeysForToday()`. Благодаря этому те же ключи автоматически входят и в `saveAccountSwitchEmergencyBackup()`, и в `wipeLocalAccountDataUnsafe()`. `TODAY_DEVICE_STORAGE_KEYS` намеренно не добавлять: discovery является настройкой устройства. В tests/local_account_data.test.ts зафиксировать обе стороны контракта.

В lib/today/source_revision.ts создать дешёвый module-level monotonic counter: `markTodaySourceChanged()`, `peekTodaySourceRevision()` и test-only reset. Метрики, interaction ledger, recommendation history и account reset вызывают mark синхронно при реальном memory change. Это позволяет Today определить пропущенные изменения при возвращении из freeze без постоянной screen subscription.

Чтобы Task 7 мог собираться до физической интеграции, уже здесь расширить read-side TabCtx полями runtimeOwnerId и todaySessionEpoch. До Task 8 TabProvider вычисляет runtimeOwnerId из существующего logical activeIdx (home/lessons/arena/friends/settings), а todaySessionEpoch равен 0. Методы physical navigation пока не добавлять.

**Step 5: Запустить тесты**

Run:

    npx jest --runTestsByPath tests/today_scope.test.ts tests/today_account_isolation.test.ts tests/local_account_data.test.ts --no-cache --runInBand

Expected: PASS.

**Step 6: Commit**

    git add -- lib/today/types.ts lib/today/scope.ts lib/today/storage_keys.ts lib/today/source_revision.ts tests/today_scope.test.ts tests/today_account_isolation.test.ts
    git add -p -- app/TabContext.tsx app/cloud_sync.ts tests/local_account_data.test.ts
    git diff --cached --check
    git diff --cached
    git commit -m "feat: add scoped Today domain model"

---

### Task 3: Записывать честные дневные метрики

**Files:**

- Create: lib/today/metrics_store.ts
- Create: lib/today/study_route_classifier.ts
- Create: components/today/TodayStudyTimeTracker.tsx
- Modify: app/_layout.tsx
- Modify: app/xp_manager.ts
- Modify: app/lesson1.tsx
- Modify: app/events.ts
- Create: tests/today_metrics_store.test.ts
- Create: tests/today_xp_integration.test.ts
- Create: tests/today_study_route_classifier.test.ts

**Metric semantics:**

- XP — весь реально начисленный finalDelta текущего аккаунта за локальный день. Это единая экономика аккаунта, поэтому значение одинаково при смене study target.
- Study time — только foreground-время на активных учебных runtime routes текущего study target.
- Completed lessons — уроки текущего study target, дошедшие до project pass threshold correct >= 45.
- Никакой backfill из старых UTC buckets: неточная история не выдаётся за фактические данные.
- При первом появлении Today storage текущий локальный день всегда `unknown_before_tracking`: отсутствие старого Today key не доказывает, что аккаунт новый. Собранные после старта числа сохраняются, но UI показывает null/«—», потому что полного дня мы не знаем.
- Со следующей локальной полуночи при неизменной timezone новые rows становятся `complete`. Смена timezone начинает новый tracking epoch и консервативно помечает текущий день unknown до следующей полуночи.
- Legacy/corrupt payload без tracking marker мигрируется консервативно: текущий день unknown, новый epoch начинается в момент hydration; никакой эвристики по `user_total_xp` или lesson progress нет.

**Step 1: Написать падающие unit tests metrics_store**

Проверить:

- положительный XP прибавляется один раз;
- нулевая/отрицательная дельта игнорируется;
- lesson completion dedupe работает по стабильному attemptId;
- time range делится на две локальные даты при переходе полуночи;
- target switch сохраняет account XP, но разделяет studyMs и lessonsCompleted;
- устаревший AccountGenerationToken не пишет данные;
- install/restart сохраняет `trackingEpoch`, а payload без него не превращает текущий день в complete;
- timezone change начинает новый unknown epoch и только следующая полная дата становится complete;
- raw XP/study/attempts + concurrent pre-hydration overlay объединяются аддитивно без ранней disk write;
- память и persistence bounded;
- timezone входит в ключ дневной записи.

**Step 2: Написать падающий classifier test**

Активными считать:

- /lesson1
- /lesson_words
- /lesson_irregular_verbs
- /lesson_verbs
- /lesson_help
- /lesson_theory_v2
- /diagnostic_test
- /exam
- /level_exam
- /preposition_drill
- /trainer и его session routes
- /review
- /active_recall
- /flashcards_swipe
- /flashcards_audio
- /quizzes_screen
- /ai_dialog_session
- /speaking_club_session
- /personal_plan_exercise
- /personal_plan_theory
- /arena_game
- /arena_room

Не считать:

- Home, Today, Lessons hub, lesson_menu, lesson_complete;
- personal_plan dashboard/setup/complete;
- flashcards hub/collection;
- daily_tasks dashboard;
- paywall, shop, settings, social screens.

`app/speaking_word_drill.ts` не является Expo Router screen: это pure judging module внутри SpeakingPanel на родительском учебном route (в частности lesson flow). Отдельный pathname для него не добавлять; время уже учитывается через активный parent route. Test фиксирует это обоснованное исключение, чтобы имя файла ошибочно не превратили в несуществующий route.

**Step 3: Запустить тесты**

Run:

    npx jest --runTestsByPath tests/today_metrics_store.test.ts tests/today_study_route_classifier.test.ts --no-cache --runInBand

Expected: FAIL, модули отсутствуют.

**Step 4: Реализовать metrics_store**

Хранить отдельно account-day row и account-target-day row:

~~~ts
type TodayTrackingEpoch = {
  startedAt: number;
  firstLocalDateKey: string;
  timeZone: string;
};

type AccountDayRow = {
  accountScopeId: string;
  localDateKey: string;
  timeZone: string;
  xp: number;
  completeness: 'complete' | 'unknown_before_tracking';
  updatedAt: number;
};

type TargetDayRow = {
  accountScopeId: string;
  studyTargetId: string;
  localDateKey: string;
  timeZone: string;
  studyMs: number;
  lessonsCompleted: number;
  lessonAttemptIds: string[];
  completeness: 'complete' | 'unknown_before_tracking';
  updatedAt: number;
};

type TodayMetricsPersistedState = {
  version: 1;
  trackingEpoch: TodayTrackingEpoch;
  accountRows: AccountDayRow[];
  targetRows: TargetDayRow[];
};
~~~

Hydration API:

~~~ts
prepareTodayMetricsHydration(token: AccountGenerationToken): void
hydrateTodayMetricsStore(input: {
  token: AccountGenerationToken;
  raw: string | null;
  nowMs: number;
}): Promise<void>
~~~

Store для каждой active generation начинает в состоянии `pending` и держит bounded optimistic overlay: XP delta по account-day rows, studyMs delta и lesson attempt-id set по target-day rows (те же лимиты 8/12 rows и 128 attempts). До hydration mutation немедленно обновляет visible memory и overlay, но не пишет неполный state на disk и не блокирует reward/navigation. Public hydrator под `withAccountTransitionLock` парсит raw base, replay-ит overlay поверх него, заменяет visible memory объединённым state и ставит первый merged AsyncStorage write в тот же write tail; только затем status становится ready. Тест: raw XP=100 + concurrent +10 => 110, raw study/attempts сохраняются вместе с новыми deltas/attemptId.

`readTodayMetrics(scope)` возвращает числовые значения только когда обе rows имеют `complete`. При `unknown_before_tracking` числовые counters остаются в persistence для диагностики/rollover, но публичные `xp`, `studyMs`, `lessonsCompleted` равны null.

Ограничения:

- максимум 8 account rows и 12 target rows;
- attemptIds максимум 128 на row;
- TTL 7 дней;
- один module-level write tail вместо растущей Map очередей;
- memory update синхронный, persistence fire-and-forget;
- любая mutation/hydration принимает token, проверяет его до memory update, затем выполняет AsyncStorage commit внутри `withAccountTransitionLock` и повторно проверяет `isCurrentAccountGeneration(token)` уже после получения lock;
- если account switch начался до commit, запись пропускается; если commit уже держит lock, wipe ждёт его и затем удаляет ключ, поэтому поздняя запись не может воскресить аккаунт A.

Каждое изменение вызывает:

~~~ts
emitAppEvent('today_state_changed', {
  reason: 'metrics',
  studyTargetId,
});
~~~

Добавить тип события в AppEventMap.
Перед событием синхронно вызвать `markTodaySourceChanged()` только если row действительно изменился; dedupe/no-op не меняет revision.

**Step 5: Реализовать TodayStudyTimeTracker**

Tracker находится рядом с AppContent внутри уже существующих LangProvider и StudyTargetProvider.

Поведение:

- token получать через `useSyncExternalStore(subscribeStableAccountGeneration, getStableAccountGenerationSnapshot, getStableAccountGenerationSnapshot)`, чтобы account switch немедленно завершал старый сегмент без referential churn;
- старт сегмента только если route классифицирован как active learning и AppState active;
- flush при route change, target change, AppState background/inactive и unmount;
- пока маршрут не меняется, one-shot setTimeout на 30 секунд flush-ит сегмент и планирует следующий;
- всегда clearTimeout в cleanup;
- каждый flush заново проверяет timezone;
- не использовать setInterval.

~~~ts
const shouldTrack = appState === 'active' && isTodayStudyRoute(pathname);

useEffect(() => {
  if (!shouldTrack) return undefined;
  let segmentStartedAt = Date.now();
  let timer: ReturnType<typeof setTimeout> | null = null;

  const flush = () => {
    const endedAt = Date.now();
    recordTodayStudyRange(token, studyTarget, segmentStartedAt, endedAt);
    segmentStartedAt = endedAt;
    timer = setTimeout(flush, 30_000);
  };

  timer = setTimeout(flush, 30_000);
  return () => {
    if (timer) clearTimeout(timer);
    recordTodayStudyRange(token, studyTarget, segmentStartedAt, Date.now());
  };
}, [pathname, shouldTrack, studyTarget, token.generation]);
~~~

**Step 6: Инструментировать XP и урок, захватывая identity до async boundary**

В app/xp_manager.ts token захватывается в самом начале `registerXP`, до `waitForPreviousXpLock` и любых `await`. Один guard исключает двойную запись, если исключение случилось после локальной записи total:

~~~ts
const todayAccountToken = captureAccountGeneration();
let todayXpRecorded = false;
const recordTodayXpOnce = (delta: number) => {
  if (todayXpRecorded || delta <= 0) return;
  todayXpRecorded = true;
  recordTodayXp(todayAccountToken, delta, Date.now());
};
~~~

- normal branch вызывает `recordTodayXpOnce(finalDelta)` непосредственно перед успешным return только при `totalXpWritten === true`;
- catch/fallback branch вызывает `recordTodayXpOnce(fallbackDelta)` непосредственно перед fallback return только при `totalXpWritten === true`: это покрывает и total, уже записанный до более поздней ошибки, и успешную fallback-запись;
- если primary и fallback записи `user_total_xp` обе отклонены, Today XP не меняется, даже если функция возвращает fallbackDelta для совместимости существующего caller contract;
- duplicate progress-event early return с finalDelta=0 не записывает XP;
- Today write остаётся fire-and-forget и не задерживает XP path.

В app/lesson1.tsx token фиксируется в ref одновременно с созданием/гидратацией `analyticsAttempt.id`, до прохождения попытки. После markLessonAttemptTerminal и до navigation используется именно этот token, а не token, снятый в конце:

~~~ts
const lessonAttemptAccountTokenRef = useRef(captureAccountGeneration());

if (correct >= 45) {
  recordTodayLessonCompleted({
    token: lessonAttemptAccountTokenRef.current,
    studyTarget: studyTargetRef.current,
    attemptId: analyticsAttempt.id,
    completedAt: Date.now(),
  });
}
~~~

Новые записи не должны блокировать reward/navigation path.

В tests/today_xp_integration.test.ts обязательно покрыть две реальные ветки `registerXP`: normal finalDelta и принудительный catch/fallbackDelta. Для обеих проверить exactly-once. Третий test ставит первый async dependency на deferred promise, запускает вызов под аккаунтом A, выполняет `invalidateAccountGeneration() -> wipeLocalAccountData() -> beginAccountGeneration('B')`, освобождает promise и доказывает отсутствие XP A в Today row B. Четвёртый test отклоняет primary и fallback `user_total_xp` writes и ожидает 0 Today XP.

**Step 7: Запустить тесты и связанные XP guards**

Run:

    npx jest --runTestsByPath tests/today_metrics_store.test.ts tests/today_xp_integration.test.ts tests/today_study_route_classifier.test.ts tests/xp_award_callers_contract.test.ts tests/progress_event_type_contract.test.ts --no-cache --runInBand

Expected: PASS.

**Step 8: Commit**

    git add -- lib/today/metrics_store.ts lib/today/study_route_classifier.ts components/today/TodayStudyTimeTracker.tsx tests/today_metrics_store.test.ts tests/today_xp_integration.test.ts tests/today_study_route_classifier.test.ts
    git add -p -- app/_layout.tsx app/xp_manager.ts app/lesson1.tsx app/events.ts
    git diff --cached --check
    git diff --cached
    git commit -m "feat: track Today learning metrics"

---

### Task 4: Построить достоверный resume ledger и selector

**Files:**

- Create: lib/today/interaction_store.ts
- Create: lib/today/resume_selector.ts
- Create: lib/lesson_availability.ts
- Modify: app/(tabs)/lessons.tsx
- Modify: app/lesson1.tsx
- Modify: app/personal_plan.tsx
- Modify: app/personal_plan_progress.ts
- Modify: app/personal_plan_task_progress.ts
- Modify: app/personal_plan_exercise.tsx
- Create: tests/today_interaction_store.test.ts
- Create: tests/today_resume_selector.test.ts
- Create: tests/today_lesson_availability.test.ts
- Create: tests/today_plan_progress_integration.test.ts

**Step 1: Написать selector tests**

Сценарии:

1. Более высокий interactionOrdinal выигрывает независимо от kind.
2. При равном ordinal валидный более свежий timestamp выигрывает.
3. Timestamp в будущем более чем на пять минут не используется.
4. При полном равенстве lesson выигрывает у plan.
5. Completed, unavailable и wrong-scope candidates исключаются.
6. Без общего надёжного указателя legacy lesson/plan timestamps не сравниваются.
7. Нет кандидата — первый доступный урок с correct < 45.
8. Полный progress cycle без pass становится repeat, а не ложным continue.
9. Весь доступный курс завершён — repeat последнего доступного урока.
10. Для lesson без достоверной средней длительности estimatedMinutes равен null.
11. Для plan estimatedMinutes равен сумме minutes оставшихся реальных задач.
12. Free, premium, exam-gated и noLimits lesson availability совпадает с экраном Lessons.

**Step 2: Написать store/integration tests**

Проверить atomic ordinal, account/target isolation, bounded scopes, stale token guard, parse corruption fallback и raw nextOrdinal/candidates + concurrent pre-hydration actions merge. Каждая persistence operation выполняется через `withAccountTransitionLock`; stale token отбрасывается и до memory patch, и после получения lock.

В tests/today_plan_progress_integration.test.ts доказать, что:

- успешный `savePlanTaskProgress` записывает plan interaction после реальной AsyncStorage записи;
- `markPersonalPlanTaskCompleted` записывает interaction из общего completion path, поэтому охватывает linked lesson, quiz, flashcards, review, trainer и personal_plan_exercise callers;
- rejected storage write не создаёт interaction;
- generation switch между началом async write и его завершением не создаёт row нового аккаунта.

В tests/today_lesson_availability.test.ts зафиксировать free sequential unlock, premium reachable CEFR level, exam-pass расширение, persisted unlock и DEV/noLimits all-unlocked. Source contract проверяет путь `lib/lesson_availability.ts`, отсутствие аналога в `app/` и отсутствие resolver в Expo Router route definitions.

**Step 3: Запустить тесты**

Run:

    npx jest --runTestsByPath tests/today_interaction_store.test.ts tests/today_resume_selector.test.ts tests/today_lesson_availability.test.ts tests/today_plan_progress_integration.test.ts --no-cache --runInBand

Expected: FAIL.

**Step 4: Реализовать interaction ledger**

~~~ts
type TodayInteractionCandidate = {
  kind: 'lesson' | 'plan';
  id: string;
  interactionOrdinal: number;
  lastInteractedAt: number;
  progressValue: number;
};

type TodayInteractionScopeRow = {
  accountScopeId: string;
  studyTargetId: string;
  nextOrdinal: number;
  lesson: TodayInteractionCandidate | null;
  plan: TodayInteractionCandidate | null;
  updatedAt: number;
};
~~~

API:

~~~ts
prepareTodayInteractionHydration(token: AccountGenerationToken): void
hydrateTodayInteractionStore(input: {
  token: AccountGenerationToken;
  raw: string | null;
  nowMs: number;
}): Promise<void>
peekTodayInteractionRow(accountScopeId: string, studyTargetId: string): TodayInteractionScopeRow | null
recordTodayLessonInteraction(input: {
  token: AccountGenerationToken;
  studyTargetId: string;
  lessonId: number;
  progressValue: number;
  interactedAt: number;
}): void
recordTodayPlanInteraction(input: {
  token: AccountGenerationToken;
  studyTargetId: string;
  planInstanceId: string;
  progressValue: number;
  interactedAt: number;
}): void
pruneTodayInteractionStoreForAccount(accountScopeId: string | null): void
~~~

Хранить максимум 4 scope rows, TTL 30 дней, serialize writes через один tail и account transition lock. До hydration bounded overlay хранит total local operation count и только последний lesson/plan op с их local sequence для каждого scope. Replay поверх raw сначала берёт raw nextOrdinal, затем присваивает pending candidates ordinals `rawNextOrdinal + localSequence`, сохраняя raw candidate другого kind и строгий общий порядок. До merge disk write запрещён; после merge пишется единый state. Test: raw nextOrdinal=100 + concurrent lesson/plan actions сохраняет старый неперезаписанный candidate, новые ordinals >100 и правильного победителя.
После memory update эмитить today_state_changed с reason='resume' и текущим studyTargetId; событие не содержит stableId или title.
При реальном изменении row также синхронно вызывать `markTodaySourceChanged()`; no-op/dedupe не увеличивает revision.

**Step 5: Вынести общий resolver доступности уроков**

Создать lib/lesson_availability.ts и перенести туда без изменения семантики обе части текущего кода Lessons. Файл намеренно находится вне `app/`, поэтому Expo Router не рассматривает pure resolver как route:

~~~ts
export type LessonAvailabilityInput = {
  lessonCount: number;
  devContentUnlock: boolean;
  noLimits: boolean;
  isPremium: boolean;
  scores: readonly number[];
  progressCounts: readonly number[];
  passCounts: readonly number[];
  persistedUnlocked: readonly number[];
  examResults: Partial<Record<CourseLevel, { passed: boolean }>>;
};

export function resolveLessonAvailability(input: LessonAvailabilityInput): {
  premiumReachableLevelIndex: number;
  unlockedLessons: readonly boolean[];
};
~~~

`premiumReachableLevelIndex` повторяет текущие правила A1 -> A2 -> B1 -> B2 по examResults и учитывает любой score/progress/pass/persisted unlock. Для premium открываются уроки только до reachable CEFR level; для free используется существующий `buildSequentialFreeLessonUnlocks`; DEV/noLimits открывает всё. Экран app/(tabs)/lessons.tsx переводится на этот resolver в том же commit. Today не содержит копии алгоритма и не вызывает упрощённый `buildSequentialFreeLessonUnlocks` отдельно.

**Step 6: Инструментировать реальные interaction points**

В lesson1:

- один record после успешной hydration lesson id/progress;
- один record после сохранения каждого нового nextCell;
- API обновляет memory сразу и коалесит persistence, не добавляя await к ответу.

В personal_plan:

- после чтения валидного active plan и построения finalLoaded;
- до early return unchanged, потому что повторный focus — реальное взаимодействие;
- completed plan не записывается как resume candidate.

В центральных progress writers:

- app/personal_plan_task_progress.ts принимает optional context `{ token, studyTargetId, planInstanceId, progressValue }`; после успешного `writeAll` вызывает `recordTodayPlanInteraction`, а rejected write ничего не записывает;
- app/personal_plan_exercise.tsx захватывает account token при создании plan exercise session и передаёт его в оба `savePlanTaskProgress` вызова;
- app/personal_plan_progress.ts захватывает token в начале `markPersonalPlanTaskCompleted`, до `readCompletedPlanTasks`, и после успешного AsyncStorage.setItem записывает plan interaction для переданного `planInstanceId/studyTarget`;
- completion instrumentation находится именно в `markPersonalPlanTaskCompleted`, а не дублируется во всех шести callers;
- Today interaction не добавляет await или новую сеть к completion path.

Не использовать state.updatedAt личного плана и lastOpenedLesson как конкурирующие legacy timestamps. В проекте нет общего legacy ordinal, поэтому migration path честно идёт к fallback lesson.

**Step 7: Реализовать pure selector**

~~~ts
export function selectTodayResumeAction(input: {
  nowMs: number;
  scope: TodayScope;
  interactions: TodayInteractionScopeRow | null;
  lessons: TodayLessonCandidate[];
  plan: TodayPlanCandidate | null;
}): TodayResumeAction
~~~

Уроки нормализовать из loadLessonsTabStateFromStorage, premium status и общего `resolveLessonAvailability`. Заголовок получать через lessonNameForStudyTarget, не импортируя lesson content packs.

**Step 8: Запустить тесты**

Run:

    npx jest --runTestsByPath tests/today_interaction_store.test.ts tests/today_resume_selector.test.ts tests/today_lesson_availability.test.ts tests/today_plan_progress_integration.test.ts tests/personal_plan_state.test.ts tests/personal_plan_lesson_progress_contract.test.ts tests/personal_plan_flashcards_completion_contract.test.ts tests/personal_plan_practice_seeded_review_contract.test.ts tests/personal_plan_trainer_weak_spot_completion_contract.test.ts --no-cache --runInBand

Expected: PASS.

**Step 9: Commit**

    git add -- lib/today/interaction_store.ts lib/today/resume_selector.ts lib/lesson_availability.ts tests/today_interaction_store.test.ts tests/today_resume_selector.test.ts tests/today_lesson_availability.test.ts tests/today_plan_progress_integration.test.ts
    git add -p -- "app/(tabs)/lessons.tsx" app/lesson1.tsx app/personal_plan.tsx app/personal_plan_progress.ts app/personal_plan_task_progress.ts app/personal_plan_exercise.tsx
    git diff --cached --check
    git diff --cached
    git commit -m "feat: select trustworthy Today resume action"

---

### Task 5: Добавить типизированные маршруты и 40 рекомендаций

**Files:**

- Create: lib/today/destinations.ts
- Create: lib/today/fallback.ts
- Create: lib/today/recommendation_catalog.ts
- Create: lib/today/recommendation_selector.ts
- Create: lib/today/recommendation_history_store.ts
- Create: lib/today/recommendation_session.ts
- Create: tests/today_recommendation_catalog.test.ts
- Create: tests/today_recommendation_selector.test.ts
- Create: tests/today_recommendation_history_store.test.ts
- Create: tests/today_recommendation_session.test.ts

**Step 1: Написать catalog contract**

Проверить:

- ровно 40 или больше personalized rule ids;
- fallback today.lessons.explore существует отдельно и не входит в 40;
- все ruleId и variantId уникальны;
- у каждого personalized rule минимум 2 текстовых варианта;
- каждый вариант содержит непустые ru, uk, es, pt-BR, vi, id, tr, pl;
- route union не содержит raw arbitrary string;
- отсутствуют shop, social и premium destinations;
- каждый destination проходит availability и resolver test.

**Step 2: Написать selector tests**

Проверить eligibility, score descending, oldest shown tie-break, lexical ruleId tie-break, cooldown after show/tap, oldest variant selection, locale-scoped variant history, session pinning, unknown daily metrics, fallback и raw history + concurrent pre-hydration show/tap merge.

В tests/today_recommendation_session.test.ts отдельно проверить:

- hidden warm с `todaySessionEpoch: null` может выбрать recommendation, но не создаёт real session pin;
- owner entry до первого refresh вызывает `beginTodayRecommendationSession(scope, epoch, warmSnapshotRecommendation)` и seed-ит pin из уже показанного/warm snapshot;
- impression/tap + refresh в том же epoch не меняют recommendation;
- новый epoch без valid seed может пересчитать recommendation с учётом cooldown/history;
- pin не протекает между account/target/locale/local-date/timezone scope;
- `endTodayRecommendationSession(scope, epoch)` очищает только точный scope+epoch;
- store хранит максимум 2 active pins и не импортирует catalog/selector.

**Step 3: Запустить тесты**

Run:

    npx jest --runTestsByPath tests/today_recommendation_catalog.test.ts tests/today_recommendation_selector.test.ts tests/today_recommendation_history_store.test.ts --no-cache --runInBand

Expected: FAIL.

**Step 4: Реализовать destination union**

~~~ts
export type TodayDestination =
  | { id: 'lessons'; kind: 'tab'; logicalTab: 1 }
  | { id: 'arena'; kind: 'tab'; logicalTab: 2 }
  | { id: 'plan'; kind: 'route'; pathname: '/personal_plan' }
  | { id: 'practice'; kind: 'route'; pathname: '/trainer' }
  | { id: 'quizzes'; kind: 'route'; pathname: '/quizzes_screen' }
  | { id: 'flashcards'; kind: 'route'; pathname: '/flashcards' }
  | { id: 'daily_tasks'; kind: 'route'; pathname: '/daily_tasks_screen' };
~~~

Resolver принимает router + goToTab. Перед переходом повторно проверяет availability. Route destinations перечислены literal union, поэтому не принимают произвольную строку.

**Step 5: Реализовать RecommendationFacts**

~~~ts
type RecommendationFacts = {
  timeBucket: 'morning' | 'midday' | 'evening' | 'night';
  isWeekend: boolean;
  todayStudyMinutes: number | null;
  todayLessons: number | null;
  todayXp: number | null;
  resumeKind: 'lesson' | 'plan';
  streak: number;
  daysSinceLearning: number | null;
  nextLessonId: number | null;
  courseComplete: boolean;
  plan: null | {
    active: boolean;
    isCarryover: boolean;
    remainingTasks: number;
    remainingMinutes: number;
    progressPct: number;
  };
  practiceDue: number;
  flashcardCount: number;
  arenaPlaysLeft: number;
  dailyTasksRemaining: number;
  dailyTasksTotal: number;
  availableDestinations: ReadonlySet<TodayDestinationId>;
};
~~~

**Step 6: Авторизовать следующий начальный каталог**

Каждая строка ниже — отдельный ruleId. Для каждой создать два качественных варианта текста во всех восьми UI locales. Русский вариант A фиксирует смысл; вариант B должен сохранять тот же intent, а не создавать новое правило.

| # | ruleId | Eligibility | Destination | Base / cooldown | RU variant A |
|---:|---|---|---|---|---|
| 1 | today.plan.carryover | plan.isCarryover | plan | 100 / 24h | Сначала закрой хвост прошлого дня — сегодняшний план станет легче. |
| 2 | today.plan.one_left | plan.remainingTasks = 1 | plan | 99 / 24h | В личном плане остался один шаг. Закрой день красиво. |
| 3 | today.plan.morning_start | morning, plan.progressPct = 0 | plan | 91 / 36h | Утро подходит для первого шага личного плана. |
| 4 | today.plan.midday_resume | midday, plan.progressPct 1–99 | plan | 90 / 24h | Вернись к личному плану, пока ритм дня ещё с тобой. |
| 5 | today.plan.evening_finish | evening, plan.progressPct 1–99 | plan | 94 / 24h | До конца дня можно спокойно продвинуть личный план. |
| 6 | today.plan.short_window | plan.remainingMinutes 1–10 | plan | 97 / 24h | На оставшуюся часть плана хватит короткого окна. |
| 7 | today.plan.keep_streak | streak >= 3, plan.progressPct = 0 | plan | 86 / 48h | Поддержи свой ритм одним шагом личного плана. |
| 8 | today.plan.weekend | weekend, active plan | plan | 78 / 72h | Выходной — хороший момент пройти план без спешки. |
| 9 | today.practice.due_20 | practiceDue >= 20 | practice | 98 / 24h | В практике накопилось много важного — начни с самых слабых мест. |
| 10 | today.practice.due_10 | practiceDue 10–19 | practice | 93 / 24h | Несколько ошибок готовы к точному повторению. |
| 11 | today.practice.due_5 | practiceDue 5–9 | practice | 88 / 24h | Короткая практика сейчас закрепит то, что уже почти запомнилось. |
| 12 | today.practice.after_lesson | todayLessons > 0, practiceDue > 0 | practice | 92 / 36h | После урока полезно сразу укрепить сложные места. |
| 13 | today.practice.morning | morning, practiceDue > 0 | practice | 73 / 48h | Начни с небольшой практики и разбуди язык. |
| 14 | today.practice.evening | evening, practiceDue > 0 | practice | 76 / 48h | Вечером лучше повторить знакомое, чем перегружать себя новым. |
| 15 | today.practice.keep_streak | streak >= 5, practiceDue > 0 | practice | 80 / 72h | Твоя серия держится на регулярности — точечная практика поможет. |
| 16 | today.practice.short_session | studyMinutes 1–9, practiceDue > 0 | practice | 84 / 24h | Добавь к короткой сессии ещё одно точное повторение. |
| 17 | today.flashcards.saved_50 | flashcardCount >= 50 | flashcards | 90 / 48h | В твоей коллекции уже много фраз — пора освежить несколько. |
| 18 | today.flashcards.saved_20 | flashcardCount 20–49 | flashcards | 84 / 48h | Карточки готовы превратить знакомство с фразами в память. |
| 19 | today.flashcards.saved_5 | flashcardCount 5–19 | flashcards | 75 / 48h | Небольшой набор карточек удобно повторить за один подход. |
| 20 | today.flashcards.after_lesson | todayLessons > 0, flashcardCount >= 5 | flashcards | 86 / 48h | Закрепи урок фразами, которые ты сохранил сам. |
| 21 | today.flashcards.morning | morning, flashcardCount >= 5 | flashcards | 68 / 72h | Быстрый утренний просмотр карточек мягко включает язык. |
| 22 | today.flashcards.evening | evening, flashcardCount >= 5 | flashcards | 70 / 72h | Перед завершением дня пролистай несколько знакомых фраз. |
| 23 | today.flashcards.weekend | weekend, flashcardCount >= 10 | flashcards | 66 / 96h | В выходной можно без спешки разобрать свою коллекцию фраз. |
| 24 | today.quizzes.first_today | studyMinutes = 0 | quizzes | 72 / 48h | Небольшой вызов быстро покажет, что уже получается уверенно. |
| 25 | today.quizzes.after_lesson | todayLessons > 0 | quizzes | 83 / 48h | Проверь свежие знания в коротком вызове. |
| 26 | today.quizzes.short_session | studyMinutes 1–9 | quizzes | 77 / 48h | Заверши короткую сессию быстрой проверкой себя. |
| 27 | today.quizzes.weekend | weekend | quizzes | 64 / 96h | Выходной подходит для спокойной проверки знаний без давления. |
| 28 | today.quizzes.morning | morning | quizzes | 62 / 72h | Один утренний вызов задаст ясную цель на день. |
| 29 | today.quizzes.level_check | nextLessonId is 9, 19 or 29 | quizzes | 95 / 72h | Перед новым уровнем проверь, насколько уверенно держится база. |
| 30 | today.arena.plays_ready | arenaPlaysLeft > 0, studyMinutes >= 5 | arena | 74 / 72h | Готов к живой проверке? Арена покажет скорость твоих решений. |
| 31 | today.arena.after_lesson | arenaPlaysLeft > 0, todayLessons > 0 | arena | 81 / 72h | Испытай свежие знания в коротком матче на Арене. |
| 32 | today.arena.evening | evening, arenaPlaysLeft > 0 | arena | 67 / 96h | Вечерний матч добавит практике немного азарта. |
| 33 | today.arena.weekend | weekend, arenaPlaysLeft > 0 | arena | 65 / 96h | В выходной можно проверить себя в одном спокойном матче. |
| 34 | today.daily_tasks.unstarted | remaining = total > 0 | daily_tasks | 89 / 24h | Вызовы дня ещё не начаты — выбери самый лёгкий первый шаг. |
| 35 | today.daily_tasks.one_left | remaining = 1 | daily_tasks | 96 / 24h | Остался один вызов дня. Забери завершение. |
| 36 | today.daily_tasks.evening | evening, remaining > 0 | daily_tasks | 87 / 24h | До конца дня ещё можно закрыть один полезный вызов. |
| 37 | today.lessons.plan_alternative | resumeKind = plan, nextLessonId exists | lessons | 71 / 48h | Хочется сменить ритм? Выбери один урок вместо длинной сессии. |
| 38 | today.lessons.comeback | daysSinceLearning >= 2, nextLessonId exists | lessons | 97 / 48h | Вернись мягко: один понятный урок лучше большого рывка. |
| 39 | today.lessons.next_level | nextLessonId is 9, 19 or 29 | lessons | 98 / 72h | Впереди новый уровень — посмотри, с какого урока он начинается. |
| 40 | today.lessons.course_repeat | courseComplete | lessons | 85 / 72h | Курс пройден. Выбери урок, который хочется сделать ещё увереннее. |

Fallback:

- id: today.lessons.explore
- destination: lessons
- priority: ниже любого personalized rule
- RU: Выбери урок, который подходит твоему настроению сегодня.
- минимум два полностью локализованных варианта.

Fallback вынести в маленький lib/today/fallback.ts без импорта полного каталога. Snapshot store и первый кадр могут статически импортировать только этот лёгкий модуль; recommendation_catalog использует тот же объект и не создаёт вторую копию.

Selector дополнительно исключает personalized destination, совпадающий с главным CTA, чтобы вторичная рекомендация не дублировала основное действие. Fallback разрешено совпасть, если других корректных направлений нет.

Правила, зависящие от нулевого или положительного daily metric, применяются только когда соответствующее поле не null. Unknown-before-tracking не трактуется как ноль и не запускает today.quizzes.first_today или другие «сегодня ещё ничего» формулировки.

**Step 7: Реализовать deterministic selector**

Sort:

1. score descending;
2. lastShownAt ascending, null раньше показанных;
3. ruleId lexical.

Variant sort:

1. lastShownAt для locale ascending;
2. variantId lexical.

Session pin cache — максимум 2 записи. Cooldown persistence — максимум 80 rule records, TTL 90 дней.

Весь persisted history/hydration код находится в лёгком `recommendation_history_store.ts`, который не импортирует catalog или selector. Runtime session pin API находится в `lib/today/recommendation_session.ts`; он хранит только `{scopeKey, epoch, recommendationIdentity}` и не импортирует catalog/selector. `recommendation_selector.ts` может читать pin через этот лёгкий API, но hydration coordinator и account reset никогда не импортируют selector. History API принимает AccountGenerationToken, захваченный до show/tap async work. Memory patch и AsyncStorage commit используют тот же stale-token + `withAccountTransitionLock` протокол, что metrics/interactions. Session pin очищается немедленно при generation change; persisted history удаляется общим wipe.
Реальное изменение persisted/session history вызывает `markTodaySourceChanged()`, а повторный identical impression не увеличивает revision.

Session API:

~~~ts
beginTodayRecommendationSession(input: {
  scope: TodayScope;
  epoch: number;
  warmSnapshotRecommendation: TodayRecommendation | null;
}): void
endTodayRecommendationSession(scope: TodayScope, epoch: number): void
getPinnedTodayRecommendation(scope: TodayScope, epoch: number | null): TodayRecommendationIdentity | null
clearTodayRecommendationSessions(): void
~~~

`todaySessionEpoch: null` означает hidden warm/sentinel: selector может выбрать recommendation, но не закрепляет real pin и не создаёт impression. При owner entry, до любого owner refresh, экран seed-ит текущий epoch из уже отрисованного snapshot recommendation. После этого builder/selector получает explicit `todaySessionEpoch` и обязан уважать pin exact scope+epoch. Impression, cooldown write и refresh в том же epoch не могут изменить recommendation, иначе пользователь увидит скачок. При exit/account/target/locale/date/timezone смене вызывается `endTodayRecommendationSession`; новый epoch без valid seed может пересчитать рекомендацию с учётом cooldown.

Hydration exports:

~~~ts
prepareTodayRecommendationHistoryHydration(token: AccountGenerationToken): void
hydrateTodayRecommendationHistory(input: {
  token: AccountGenerationToken;
  raw: string | null;
  nowMs: number;
}): Promise<void>
~~~

До hydration store держит bounded aggregate overlay максимум для 80 rule records: show/tap count deltas, max timestamps и locale-variant timestamps плюс максимум 2 session pins. Hydrator объединяет raw cooldown/history с overlay (counts складываются, timestamps берутся max, новые rule/locale rows сохраняются), затем пишет merged state. Test: существующий raw cooldown A + concurrent tap A/show B сохраняет cooldown A, увеличивает его counters и добавляет B; ни одна сторона не теряется.

**Step 8: Запустить тесты**

Run:

    npx jest --runTestsByPath tests/today_recommendation_catalog.test.ts tests/today_recommendation_selector.test.ts tests/today_recommendation_history_store.test.ts tests/today_recommendation_session.test.ts --no-cache --runInBand

Expected: PASS.

**Step 9: Commit**

    git add -- lib/today/destinations.ts lib/today/fallback.ts lib/today/recommendation_catalog.ts lib/today/recommendation_selector.ts lib/today/recommendation_history_store.ts lib/today/recommendation_session.ts tests/today_recommendation_catalog.test.ts tests/today_recommendation_selector.test.ts tests/today_recommendation_history_store.test.ts tests/today_recommendation_session.test.ts
    git diff --cached --check
    git diff --cached
    git commit -m "feat: add curated Today recommendations"

---

### Task 6: Собрать instant snapshot и тихую revalidation

**Files:**

- Create: lib/today/snapshot_store.ts
- Create: lib/today/snapshot_builder.ts
- Create: lib/today/discovery_store.ts
- Create: lib/today/account_reset.ts
- Create: lib/today/hydration_coordinator.ts
- Modify: app/app_snapshot_bootstrap.ts
- Modify: app/cloud_sync.ts
- Modify: components/today/TodayStudyTimeTracker.tsx
- Modify: tests/today_account_isolation.test.ts
- Create: tests/today_snapshot_store.test.ts
- Create: tests/today_snapshot_builder.test.ts
- Create: tests/today_discovery_store.test.ts
- Create: tests/today_hydration_coordinator.test.ts
- Create: tests/today_source_revision.test.ts

**Step 1: Написать падающие store tests**

Проверить:

- peek отдаёт snapshot синхронно;
- wrong scope никогда не возвращается;
- cache maxEntries = 2;
- TTL = 24 часа;
- `Object.is(peekTodaySnapshot(scope), peekTodaySnapshot(scope))` истинно без content change;
- normalized equal validation обновляет `lastValidatedAt`, но не заменяет snapshot reference и не уведомляет subscriber;
- после equal validation следующий owner refresh не запускается раньше нового TTL 45 секунд;
- account switch удаляет learning snapshots старого аккаунта;
- invalidate -> wipe -> begin new account не позволяет отложенной write/hydration вернуть row старого аккаунта;
- delayed same-account hydration объединяет raw base и concurrent optimistic overlay без потери любой стороны;
- corrupt JSON даёт пустой store;
- discovery key не входит в learning snapshot.

Отдельно в today_discovery_store.test.ts проверить device-local hydration, idempotent successful-open write, opened-once flag и то, что account reset не очищает discovery.

**Step 2: Написать builder tests**

Проверить:

- resume, metrics и recommendation собираются в один scope;
- greeting/date не persist-ятся, а вычисляются UI из current scope;
- fallback snapshot всегда содержит lesson action и today.lessons.explore;
- upgrade scope без достоверной дневной истории показывает null/«—», а не ложные нули;
- plan estimate использует оставшиеся task minutes;
- lesson estimate без надёжной средней равен null;
- daily facts читаются локально;
- no direct import generated lesson/quiz content.
- source revision, изменившийся один раз во время read, вызывает ровно один retry;
- source revision, изменившийся и во время retry, оставляет record dirty и не запускает бесконечный цикл.

В tests/today_source_revision.test.ts отдельно проверить: dirty mutation while Today conceptually frozen; `shouldRefreshTodaySnapshot` возвращает true даже при свежем 45s TTL; equal validation продвигает `validatedSourceRevision` без subscriber call; bounded retry ограничен двумя read passes.

В tests/today_hydration_coordinator.test.ts проверить: bootstrap attempt регистрирует barrier до multiGet; consumer/warm ждёт barrier; все async hydrators и merged persistence завершены до resolve; stale-account attempt ничего не применяет; raw-existing + concurrent mutation объединяются для metrics, interactions, recommendation history и snapshots. Отдельно проверить, что ни один pre-hydration mutation path не пишет неполный state на AsyncStorage и не блокирует caller promise/navigation.

Добавить общий non-reentrant tail/lock contract test для double-storage race: hydrator store enqueues ровно один hydration job в собственный write tail; hydration job входит в `withAccountTransitionLock` ровно один раз; внутри lock синхронно парсит raw, drain-ит pre-hydration overlay, merge-ит raw+overlay, заменяет visible memory, ставит status `merging` и делает `await AsyncStorage.setItem(merged)` прямо в этом lock. Он не re-enqueue-ит merged write в тот же tail и не входит в account lock повторно. Mutation, случившаяся во время deferred merged disk write, синхронно обновляет visible memory и отдельный post-merge overlay/dirty flag; она планируется следующим обычным tail job после release hydration job и не очищается при переходе status в ready. Barrier ждёт именно hydration tail job. Storage failure не подвешивает barrier: visible memory и overlay остаются, status становится retryable, а обычный retry job уважает существующую offline/error policy. Тест: raw XP=100, pre-hydration +10, затем во время зависшего merged setItem ещё +5; после release visible=115, barrier resolved, следующий tail write сохраняет +5, итоговый disk=115.

**Step 3: Запустить тесты**

Run:

    npx jest --runTestsByPath tests/today_snapshot_store.test.ts tests/today_snapshot_builder.test.ts tests/today_discovery_store.test.ts tests/today_hydration_coordinator.test.ts tests/today_source_revision.test.ts --no-cache --runInBand

Expected: FAIL.

**Step 4: Реализовать snapshot_store со стабильным external-store snapshot**

Внутренний persisted record разделяет UI-контент и freshness metadata:

~~~ts
type TodaySnapshotRecord = {
  snapshot: TodaySnapshot;
  lastValidatedAt: number;
  validatedSourceRevision: number;
};
~~~

`contentUpdatedAt` меняется только при семантическом изменении resume/metrics/recommendation/scope. Успешная проверка тех же данных меняет только metadata `lastValidatedAt` + `validatedSourceRevision`. `useSyncExternalStore` возвращает `record.snapshot`, поэтому React получает тот же object reference до реального content change.

Builder читает `peekTodaySourceRevision()` до и после параллельных reads. Если revision изменился, делает не более одного retry; если изменился и во второй раз, сохраняет revision, снятый до второго read, и оставляет record dirty для следующего коалесированного refresh. `validatedSourceRevision` хранится в metadata record, а не в UI snapshot. На owner entry экран сравнивает metadata с текущим revision: это ловит изменения, случившиеся пока Today был frozen, без hidden subscription и без render на equal validation.

API:

~~~ts
prepareTodaySnapshotHydration(token: AccountGenerationToken): void
hydrateTodaySnapshotStore(input: {
  token: AccountGenerationToken;
  raw: string | null;
  nowMs: number;
}): Promise<void>
peekTodaySnapshot(scope: TodayScope): TodaySnapshot
subscribeTodaySnapshot(listener: () => void): () => void
patchTodaySnapshot(token: AccountGenerationToken, next: TodaySnapshot, validation: {
  validatedAt: number;
  validatedSourceRevision: number;
}): void
markTodaySnapshotValidated(token: AccountGenerationToken, scope: TodayScope, input: {
  validatedAt: number;
  validatedSourceRevision: number;
}): void
getTodaySnapshotLastValidatedAt(scope: TodayScope): number
getTodaySnapshotValidatedSourceRevision(scope: TodayScope): number
shouldRefreshTodaySnapshot(scope: TodayScope, input: {
  currentSourceRevision: number;
  nowMs: number;
  ttlMs: number;
}): boolean
useTodaySnapshot(scope: TodayScope): TodaySnapshot
clearTodaySnapshotsForAccountSwitch(nextAccountScopeId: string | null): void
~~~

До hydration snapshot store держит last-write-wins overlay максимум для 2 scope records: content patch и validation metadata разделены. Hydrator сохраняет unaffected raw scope rows, применяет pending content для того же scope по contentUpdatedAt и max-merge validation metadata, затем pruning maxEntries=2/TTL. Test: raw scope A + concurrent patch scope B оставляет оба; concurrent validation scope A не стирает raw content и продвигает metadata.

peek всегда возвращает безопасный scoped baseline:

- lesson 1 start или известный next lesson;
- unknown null metrics до первой полной локальной даты; отсутствие key никогда не считается доказательством нового аккаунта;
- typed fallback today.lessons.explore.

**Step 5: Реализовать snapshot_builder**

Локальные источники читать параллельно:

- loadLessonsTabStateFromStorage;
- readPersonalPlanState/readPersonalPlanSnapshot;
- peek/read Today metrics;
- peek Today interaction ledger;
- getTrainerTotalDue;
- loadFlashcards;
- getDailyArenaPlaysLeft;
- getTodayTasksSafe + loadTodayProgress;
- app snapshot streak;
- feature availability caches.

Ни один источник не блокирует первый render: builder работает после peek. Full builder читает эти тяжёлые secondary sources только для background warm/owner refresh и использует TTL 45 секунд. CTA никогда не вызывает full builder.

Full-builder API остаётся отдельно от action revalidation:

~~~ts
buildTodaySnapshotCandidate(scope, token, {
  reason: 'warm' | 'owner' | 'state_changed';
  todaySessionEpoch: number | null;
}): Promise<{
  snapshot: TodaySnapshot;
  validatedAt: number;
  validatedSourceRevision: number;
}>
~~~

Этот модуль намеренно содержит полный recommendation/heavy-reader graph и поэтому никогда не импортируется статически из TodayScreen, Tab layout или app root. Из `components/today/*` он загружается через `import('../../lib/today/snapshot_builder')` только после startup/owner scheduling. Узкая action revalidation будет отдельным модулем Task 9.
Builder не patch-ит external store сам. Warm/owner caller после await заново вычисляет full current scope; только при точном совпадении вызывает `patchTodaySnapshot(token, result.snapshot, result validation)`. Stale target/locale/date/timezone candidate отбрасывается без UI write.

Offline/error policy:

- scoped last-known snapshot сохраняется без error card;
- повреждённый или wrong-scope cache никогда не используется;
- если один вторичный источник недоступен, builder сохраняет предыдущую достоверную часть и typed fallback;
- main CTA строится только из локально валидируемого lesson/plan state;
- quiet refresh failure не заменяет реальные данные нулями.

**Step 6: Подключить race-safe hydration и account wipe reset**

Создать lib/today/hydration_coordinator.ts. Его bounded API хранит только текущую generation attempt и barrier:

~~~ts
beginTodayHydrationRead(token: AccountGenerationToken): TodayHydrationRead | null
completeTodayHydrationRead(read: TodayHydrationRead, rawByKey: ReadonlyMap<string, string | null>, nowMs: number): Promise<void>
ensureTodayHydrated(token: AccountGenerationToken): Promise<void>
waitForTodayHydration(token: AccountGenerationToken): Promise<void>
resetTodayHydrationCoordinator(): void
~~~

`beginTodayHydrationRead` вызывается до AsyncStorage.multiGet, фиксирует token и переводит четыре stores в pending/hydrating state через `prepare...Hydration`. Stores по умолчанию также считают active generation неготовой, поэтому mutation, случившаяся даже чуть раньше coordinator effect, попадает в overlay и не пишет disk. `complete...` ждёт `Promise.all` четырёх async hydrators; barrier resolve происходит только после replay overlay, transition-lock merge и постановки merged persistence в единые write tails. Поэтому:

- account A raw не применяется после invalidate/wipe/B;
- delayed same-account raw и новая mutation объединяются, а не выбирают одного победителя;
- warm/full builder не обгоняет медленную hydration;
- reward/navigation paths остаются optimistic: они синхронно меняют visible memory/overlay и не ждут disk или hydration.

Hydration coordinator статически импортирует только metrics_store, interaction_store, лёгкий recommendation_history_store и snapshot_store. Он не импортирует recommendation_selector/catalog или snapshot_builder.

Добавить все Today storage keys в существующий AsyncStorage.multiGet внутри `primeAppSnapshotFromStorage`. Перед multiGet зарегистрировать `beginTodayHydrationRead(activeToken)`; после mapPairs `await completeTodayHydrationRead(...)`. Если prime начался без active stableId, attempt не создаётся.

`TodayStudyTimeTracker`, уже смонтированный вне frozen tabs, при первом active generation вызывает `ensureTodayHydrated(token)`. Эта функция, только если bootstrap attempt для generation отсутствует, запускает один fallback multiGet; четыре bounded overlays replay-ятся поверх raw через те же async hydrators, а consumer получает общий barrier. Read не блокирует Home render.

Создать `resetTodayAccountMemory()` в lib/today/account_reset.ts: очистить metrics, interactions, recommendation persisted/session caches, snapshots, все optimistic overlays/hydration statuses и текущий hydration barrier/coordinator, но не discovery/opened-once. Следующая generation снова начинает stores в pending. В `wipeLocalAccountDataUnsafe`, сразу после `multiRemove` и пока удерживается существующий account transition lock, динамически импортировать и вызвать этот reset. Subscription в TodayStudyTimeTracker может очистить UI раньше, но не считается границей безопасности.
Reset завершает операцию вызовом `markTodaySourceChanged()`, чтобы следующий active scope не принял старый sourceRevision за свежий.
`resetTodayAccountMemory()` и все вызываемые store/hydration-coordinator resets строго synchronous и in-memory: внутри нет AsyncStorage, Promise или повторного `withAccountTransitionLock`, потому что wipe уже держит non-reentrant account transition lock.

Каждый Today store применяет одинаковый протокол:

1. mutation/hydration получает token, захваченный до первого await;
2. stale token не меняет memory;
3. bootstrap/fallback disk read может идти вне lock; до него stores находятся pending и накапливают bounded pre-hydration overlay без disk writes;
4. каждый `hydrate...` enqueues один hydration job в single write tail своего store;
5. этот hydration job входит в `withAccountTransitionLock` ровно один раз, после получения lock повторно проверяет token, синхронно парсит raw, drain-ит pre-hydration overlay, merge-ит raw+overlay, заменяет visible memory, ставит status `merging` и делает merged `AsyncStorage.setItem` прямо внутри того же lock;
6. hydration job не re-enqueue-ит merged persistence в тот же tail и не вызывает `withAccountTransitionLock` повторно, потому что lock non-reentrant;
7. mutation во время awaited merged setItem пишет в visible memory и post-merge overlay/dirty flag, не очищаемый status ready, затем планирует следующий normal tail job после hydration job release;
8. wipe удаляет четыре account keys и очищает memory/overlays/statuses; device keys остаются;
9. late operation A после `beginAccountGeneration('B')` не может создать B row или восстановить A payload;
10. late raw той же generation сохраняет raw base и replay-ит все concurrent metrics/interaction/history/snapshot overlays;
11. overlay limits совпадают с limits итоговых stores, поэтому pre-hydration и post-merge overlays не растут без границ.

В tests/today_account_isolation.test.ts реализовать контролируемую race: начать delayed write и delayed hydration под A, вызвать `invalidateAccountGeneration()`, `wipeLocalAccountData()`, `beginAccountGeneration('B')`, отпустить promises и проверить AsyncStorage + все four in-memory peeks. Отдельно проверить, что emergency backup содержит четыре account keys, но не два device keys.

**Step 7: Запустить тесты**

Run:

    npx jest --runTestsByPath tests/today_snapshot_store.test.ts tests/today_snapshot_builder.test.ts tests/today_discovery_store.test.ts tests/today_hydration_coordinator.test.ts tests/today_source_revision.test.ts tests/today_account_isolation.test.ts tests/local_account_data.test.ts tests/app_snapshot_bootstrap_contract.test.ts --no-cache --runInBand

Expected: PASS.

**Step 8: Commit**

    git add -- lib/today/snapshot_store.ts lib/today/snapshot_builder.ts lib/today/discovery_store.ts lib/today/account_reset.ts lib/today/hydration_coordinator.ts tests/today_snapshot_store.test.ts tests/today_snapshot_builder.test.ts tests/today_discovery_store.test.ts tests/today_hydration_coordinator.test.ts tests/today_source_revision.test.ts
    git add -p -- app/app_snapshot_bootstrap.ts app/cloud_sync.ts components/today/TodayStudyTimeTracker.tsx tests/today_account_isolation.test.ts
    git diff --cached --check
    git diff --cached
    git commit -m "feat: build instant Today snapshot"

---

### Task 7: Построить премиальный статический экран и motion layer

**Files:**

- Create: components/today/TodayScreen.tsx
- Create: components/today/TodayAmbientCompass.tsx
- Create: components/today/TodayWarmCoordinator.tsx
- Create: lib/today/copy.ts
- Modify: app/_layout.tsx
- Create: tests/today_screen_contract.test.ts
- Create: tests/today_screen_accessibility.test.tsx
- Create: tests/today_warm_coordinator.test.tsx
- Create: tests/today_cold_graph_contract.test.ts
- Modify: tests/runtime_lifecycle_ratchet.test.ts
- Modify: tests/perf_freeze_contract.test.ts only if its reviewed animation file list requires adding the new guarded file; не ослаблять assertions

**Step 1: Написать падающий UI contract**

Проверить source/renderer contract:

- testID today-screen, today-heading, today-resume-cta, today-metrics, today-recommendation;
- один resume CTA;
- три metrics;
- одна recommendation;
- t.correctText на accent CTA;
- compass accessible=false и no-hide-descendants;
- useRuntimeActive + useReduceMotion;
- cancelAnimation в cleanup;
- no Sensor, Magnetometer, Location, requestPermissions;
- no BlurView/runtime blur;
- no Animated width/height/top/left;
- no fullscreen loading spinner.
- TodayScreen не имеет static import `snapshot_builder`, `recommendation_catalog`, trainer, flashcards, daily_tasks или arena readers;
- full builder загружается только dynamic import после readiness/owner scheduling;
- транзитивный static-import graph TodayScreen/TodayStudyTimeTracker/TodayWarmCoordinator/hydration_coordinator не достигает recommendation_catalog, recommendation_selector, snapshot_builder или secondary readers;
- greeting, date labels, CTA, metric labels, neutral estimate, discovery hint и accessibility actions имеют все ru/uk/es/pt-BR/vi/id/tr/pl варианты.
- CTA имеет minHeight >= 56 и полный label: действие + title + estimate/neutral context.
- recommendation press target имеет minHeight >= 44, role=button, полный label и hint направления.
- при fontScale=2 текст не обрезается `numberOfLines`, CTA/recommendation растут по высоте, metrics переходят на wrap без overlap.
- при normal fontScale renderer резервирует стабильные min-height slots для context label, title two-line slot, estimate line, metrics group и recommendation two-line slot; fallback lesson 1 -> long plan title/recommendation не сдвигает нижние блоки;
- при large Dynamic Type slots могут естественно расти, но не имеют fixed height и не клипуют текст.

**Step 2: Запустить test**

Run:

    npx jest --runTestsByPath tests/today_screen_contract.test.ts tests/today_screen_accessibility.test.tsx tests/today_warm_coordinator.test.tsx tests/today_cold_graph_contract.test.ts --no-cache --runInBand

Expected: FAIL.

**Step 3: Реализовать композицию TodayScreen**

Сначала создать lib/today/copy.ts с типизированным PlannedTriLangCopy для greeting по времени суток, heading, CTA modes, estimate fallback, трёх metric labels, unknown metric, recommendation prefix, discovery hint и accessibility actions. TodayScreen/TodayDiscoveryHint не содержат русские hardcoded fallback strings вне этого реестра.

Вертикальная структура:

1. малое персональное greeting;
2. heading Сегодня / локализованный эквивалент;
3. локализованная дата через Intl.DateTimeFormat;
4. атмосферный compass;
5. context label + title + estimate/neutral line;
6. accent CTA minHeight 56;
7. единый metrics row с короткими separators;
8. одна tonal recommendation row;
9. bottom padding из useTabContentBottomPad.

Использовать BouncyScrollView/вертикальный ScrollView для компактных устройств. Не создавать три отдельные metric cards и тяжёлую рамку вокруг hero.

Это реализует три выбранных UX-принципа: один dominant action создаёт ясную visual hierarchy; metrics объединены по Gestalt proximity вместо трёх конкурирующих карточек; одна recommendation использует progressive disclosure и не заставляет пользователя выбирать между множеством равноправных сущностей.

CTA copy:

- start: Начать урок;
- continue lesson: Продолжить урок;
- repeat: Повторить урок;
- plan: Продолжить личный план;
- estimate null: Можно продолжить с этого места.

Metrics copy:

- complete zero отображается цифрой 0;
- unknown_before_tracking отображается «—» с accessibility label «Нет достоверных данных за часть сегодняшнего дня»;
- UI не подменяет null нулём во время hydration.

Accessibility/dynamic type:

- CTA: `accessibilityRole="button"`, label вида «Продолжить урок. Путешествия. Около 8 минут» или нейтральный эквивалент;
- recommendation: `accessibilityRole="button"`, label включает recommendation text и destination, hint объясняет, что откроется;
- recommendation row имеет `minHeight: 48` и вертикальные padding, CTA `minHeight: 56`; ни один Pressable не меньше 44x44;
- не задавать фиксированную height текстовым контейнерам и не ставить `numberOfLines` на CTA title/recommendation;
- metrics container использует `flexWrap: 'wrap'`; separator скрывается на переносе/large font, чтобы не оказаться отдельной строкой;
- Text сохраняет font scaling; тест renderer с mocked `PixelRatio.getFontScale() = 2` проверяет отсутствие clipping props и доступность всех labels.

Layout stability:

- normal fontScale использует `minHeight`, не fixed `height`, для context label, two-line CTA title slot, estimate line, metrics group и two-line recommendation slot;
- CTA/recommendation copy в каталоге ограничена так, чтобы на компактной ширине помещаться в two-line slot при normal fontScale;
- при поздней hydration текст может замениться внутри уже зарезервированных slots, но следующие блоки не меняют вертикальную позицию;
- при Dynamic Type >= 1.4 slots перестают быть жёсткой визуальной сеткой и позволяют естественный wrap/growth без clipping;
- device QA: открыть Today на slow hydration, показать fallback lesson 1, затем long personal-plan title + long recommendation; на normal fontScale нет vertical reflow, на 200% нет обрезания.

**Step 4: Реализовать TodayAmbientCompass**

SVG содержит ring, ticks, cardinal marks и needle. Внешние glows — статические LinearGradient/View layers.

Motion:

- glow breathe: 8.8 s total;
- secondary drift: 13.2 s total;
- needle: ±3 degrees, 9.6 s total;
- только opacity и transform;
- CTA/text неподвижны.

~~~ts
const todayRuntimeActive = useRuntimeActive(runtimeOwnerId === 'today');
const reduceMotion = useReduceMotion();

useEffect(() => {
  cancelAnimation(breathe);
  cancelAnimation(drift);
  cancelAnimation(needle);

  if (!todayRuntimeActive || reduceMotion) {
    breathe.value = 0.45;
    drift.value = 0;
    needle.value = 0;
    return undefined;
  }

  breathe.value = withRepeat(
    withTiming(1, { duration: 4_400, easing: Easing.inOut(Easing.sin) }),
    -1,
    true,
  );
  drift.value = withRepeat(
    withTiming(1, { duration: 6_600, easing: Easing.inOut(Easing.sin) }),
    -1,
    true,
  );
  needle.value = withRepeat(
    withTiming(3, { duration: 4_800, easing: Easing.inOut(Easing.sin) }),
    -1,
    true,
  );

  return () => {
    cancelAnimation(breathe);
    cancelAnimation(drift);
    cancelAnimation(needle);
  };
}, [reduceMotion, todayRuntimeActive]);
~~~

Reduced Motion оставляет статичное мягкое свечение.

**Step 5: Подключить отложенный snapshot lifecycle без нагрузки на первый Home frame**

Создать `TodayWarmCoordinator` и смонтировать его в app/_layout.tsx рядом с `TodayStudyTimeTracker`, внутри Lang/StudyTarget providers, но выше/вне frozen TabSlider. Это единственное место одноразового hidden warm:

- coordinator подписывается на replayable `app_first_content_ready`, после первого callback немедленно снимает эту subscription и планирует one-shot через `InteractionManager.runAfterInteractions`;
- task сначала `await ensureTodayHydrated(token)`, затем делает `const { buildTodaySnapshotCandidate } = await import('../../lib/today/snapshot_builder')`; после build заново вызывает `rebuildCurrentTodayScope(...)` и только при точном совпадении patch-ит snapshot вместе с validation metadata;
- warm запускается только при AppState active; если readiness пришёл в background, временная AppState subscription существует лишь до первого active и затем сама снимается;
- cleanup удаляет оставшиеся one-shot subscriptions и вызывает `interactionTask.cancel()`; после success coordinator не держит timers/listeners;
- slow-hydration test доказывает, что dynamic import/full builder не вызывается до hydration barrier.

В самом TodayScreen:

- статически импортировать только types, scope helpers, snapshot_store, light fallback/copy и UI components;
- owner refresh сначала `await ensureTodayHydrated(token)`, затем загружает full builder только через dynamic import после `InteractionManager.runAfterInteractions`;
- continuous event/AppState/midnight subscriptions существуют только пока `runtimeOwnerId === 'today'`; при уходе с Today они снимаются до freeze;
- на owner entry refresh нужен, если record `validatedSourceRevision !== peekTodaySourceRevision()` или `lastValidatedAt` старше 45 s; так изменения, случившиеся во время freeze, не теряются без hidden subscription;
- owner build также capture-ит requested scope и перед patch повторяет full account/target/locale/date/timezone check; stale candidate не попадает даже в bounded cache;
- на owner entry, до первого refresh, вызвать `beginTodayRecommendationSession({ scope, epoch: todaySessionEpoch, warmSnapshotRecommendation: snapshot.recommendation })`, чтобы уже видимая/warm recommendation стала pin exact scope+epoch;
- owner build передаёт `todaySessionEpoch`; warm build передаёт `todaySessionEpoch: null`;
- impression/tap и refresh внутри того же `todaySessionEpoch` не меняют recommendation; смена account/target/locale/local-date/timezone или выход с Today вызывает `endTodayRecommendationSession(scope, epoch)`;
- пока owner активен, `today_state_changed` коалесит refresh, но не запускает больше одного builder одновременно;
- AppState active перепроверяет scope/timezone;
- one-shot timer до следующей локальной полуночи;
- no setInterval;
- equal refresh обновляет только `lastValidatedAt`, без patch/render; content patch только при normalized difference;
- recommendation pin по todaySessionEpoch.

Не запускать full builder просто от TodayScreen mount. Source contract запрещает static import graph, а coordinator test мокает readiness, InteractionManager и hydration: до всех трёх gates тяжёлые readers не вызваны; после них вызваны один раз; cleanup отменяет pending task.

tests/today_cold_graph_contract.test.ts строит cold graph: рекурсивный граф только статических relative imports от TodayScreen, TodayStudyTimeTracker, TodayWarmCoordinator и hydration_coordinator (dynamic `import(...)` намеренно не ребро). Assert forbidden targets: `recommendation_catalog`, `recommendation_selector`, `snapshot_builder`, trainer, flashcards, daily_tasks и arena reader modules. Дополнительно проверить, что app/_layout.tsx подключает coordinator/tracker, но не catalog/builder напрямую.

**Step 6: Запустить tests**

Run:

    npx jest --runTestsByPath tests/today_screen_contract.test.ts tests/today_screen_accessibility.test.tsx tests/today_warm_coordinator.test.tsx tests/today_cold_graph_contract.test.ts tests/runtime_lifecycle_ratchet.test.ts tests/perf_freeze_contract.test.ts --no-cache --runInBand

Expected: PASS.

**Step 7: Commit**

    git add -- components/today/TodayScreen.tsx components/today/TodayAmbientCompass.tsx components/today/TodayWarmCoordinator.tsx lib/today/copy.ts tests/today_screen_contract.test.ts tests/today_screen_accessibility.test.tsx tests/today_warm_coordinator.test.tsx tests/today_cold_graph_contract.test.ts
    git add -p -- app/_layout.tsx tests/runtime_lifecycle_ratchet.test.ts tests/perf_freeze_contract.test.ts
    git diff --cached --check
    git diff --cached
    git commit -m "feat: build animated Today compass screen"

---

### Task 8: Встроить Today в TabSlider и сохранить один runtime owner

**Files:**

- Modify: app/TabSlider.tsx
- Modify: app/TabContext.tsx
- Modify: app/(tabs)/_layout.tsx
- Modify: app/(tabs)/home.tsx
- Modify: components/today/TodayScreen.tsx
- Create: components/today/TodayPaneBoundary.tsx
- Create: components/today/TodayDiscoveryHint.tsx
- Create: tests/today_navigation_contract.test.ts
- Create: tests/today_pane_scope_safety.test.tsx
- Modify: tests/tab_slider_container_width_contract.test.ts
- Modify: tests/tabbar_scroll_chrome_contract.test.ts
- Modify: tests/tab_deferred_mount_contract.test.ts
- Modify: tests/home_runtime_animation_contract.test.ts
- Modify: tests/owner_direction_runtime_contract.test.ts
- Modify: tests/navigation_back_underlay_contract.test.ts only when adding positive Today Back assertions; существующие запреты не ослаблять

**Step 1: Написать падающий navigation contract**

Проверить:

- six physical children и five tab buttons;
- Today находится первым child;
- TabSlider получает physicalPageIdx;
- logical tab routes по-прежнему 0..4;
- Home tab tap из Today переводит physical 0 -> 1, даже если logical activeIdx уже 0;
- deep link Home стартует на physical 1;
- Today не добавлен в TAB_KEYS, TAB_PATH_SUFFIXES и Stack routes;
- Back на physical Today возвращает Home;
- Home остаётся visualIdx 0;
- inactive page a11y hidden;
- former owner получает deactivation commit перед freeze.
- frozen Today neighbor не показывает old account/target/locale/date/timezone snapshot во время edge drag после scope change.

**Step 2: Запустить tests**

Run:

    npx jest --runTestsByPath tests/today_navigation_contract.test.ts tests/today_pane_scope_safety.test.tsx tests/tab_slider_container_width_contract.test.ts tests/tabbar_scroll_chrome_contract.test.ts tests/tab_deferred_mount_contract.test.ts --no-cache --runInBand

Expected: FAIL.

**Step 3: Расширить TabContext без изменения публичной логики tabs**

Добавить:

~~~ts
physicalPageIdx: PhysicalPageIndex;
runtimeOwnerId: TabRuntimeOwnerId;
todaySessionEpoch: number;
todayFocusRequestTick: number;
homeFocusRequestTick: number;
openToday: (source: 'swipe' | 'accessibility') => void;
returnHomeFromToday: (source: 'swipe' | 'tab' | 'back' | 'accessibility') => void;
~~~

activeIdx и goToTab остаются logical API для существующих экранов.

**Step 4: Перевести layout на physical state**

~~~ts
const initialLogical = tabIdxFromRouter(pathname, segments) ?? 0;
const [activeIdx, setActiveIdx] = useState<LogicalTabIndex>(initialLogical);
const [visualIdx, setVisualIdx] = useState<LogicalTabIndex>(initialLogical);
const [physicalPageIdx, setPhysicalPageIdx] = useState<PhysicalPageIndex>(
  logicalTabToPhysicalPage(initialLogical),
);
const runtimeOwnerId = physicalPageToRuntimeOwner(physicalPageIdx);
~~~

Callbacks TabSlider принимают physical index и затем явно map-ят его. Router никогда не получает physical 0.

Physical children:

1. TodayScreen — всегда смонтирован;
2. HomeScreen — всегда смонтирован;
3. Lessons;
4. Arena;
5. Friends;
6. Settings.

visitedTabs и mountedTabs продолжают хранить только logical indices 0..4.

**Step 5: Реализовать безопасный owner handoff**

TabPane:

~~~ts
function TabPane({ isRuntimeOwner, children }: Props) {
  const [mayFreeze, setMayFreeze] = useState(false);

  useEffect(() => {
    if (isRuntimeOwner) {
      setMayFreeze(false);
      return;
    }
    setMayFreeze(true);
  }, [isRuntimeOwner]);

  return (
    <View
      style={styles.fill}
      pointerEvents={isRuntimeOwner ? 'auto' : 'none'}
      accessibilityElementsHidden={!isRuntimeOwner}
      importantForAccessibility={isRuntimeOwner ? 'auto' : 'no-hide-descendants'}
    >
      <Freeze freeze={ENABLE_TAB_FREEZE && !isRuntimeOwner && mayFreeze}>
        {children}
      </Freeze>
    </View>
  );
}
~~~

Почему два commit: при owner true -> false mayFreeze ещё false, поэтому ребёнок получает runtimeOwnerId=false и чистит effects. Только следующий commit включает Freeze.

Во время drag physicalPageIdx не меняется. onSwipeStart меняет только visual highlight/mount intent; onSwipeComplete один раз меняет owner.

**Step 6: Добавить privacy-safe TodayPaneBoundary для frozen neighbor**

Создать `components/today/TodayPaneBoundary.tsx` и lightweight `scopeSafetyKey` outside Freeze. Boundary оборачивает Today physical child, но сам находится выше frozen subtree. Он получает:

~~~ts
scopeSafetyKey: string; // account generation/stableId + target + locale + local date + timezone
isRuntimeOwner: boolean;
children: ReactNode;
~~~

`scopeSafetyKey` вычисляется в tab layout вне TodayScreen из referentially stable account external store, study target, locale, local date и timezone. Для local date rollover использовать один root/layout one-shot timeout до следующей локальной полуночи + AppState active recheck; без `setInterval`. Добавить этот timeout в `tests/owner_direction_runtime_contract.test.ts` allowlist с причиной `Today scope privacy rollover`, не ослабляя остальные запреты.

Boundary хранит `sanitizedScopeKey`. Если key изменился, пока Today не owner:

- runtime owner остаётся Home, `pointerEvents="none"`, `importantForAccessibility="no-hide-descendants"`;
- boundary показывает opaque theme-colored safe shell поверх Today pane, чтобы stale subtree не просвечивал во время edge drag;
- на один commit принудительно thaw-ит Today pane (`forceThaw=true`), чтобы TodayScreen отрисовал safe scoped baseline для нового scope, при этом все owner-gated effects остаются выключенными;
- TodayScreen получает `scopeSafetyKey` и вызывает `onScopeRendered(scopeSafetyKey)` из layout effect после render нового scoped baseline;
- boundary обновляет `sanitizedScopeKey`, снимает shell и возвращает обычный freeze;
- если account stableId null/blank или account transition active, key становится `unavailable:<generation>`, shell остаётся нейтральным и не показывает старые данные.

Safe shell может показывать только theme background + neutral skeleton geometry или current scoped baseline, вычисленный вне старого frozen subtree. Он не содержит title/recommendation старого snapshot. Boundary не запускает full builder, recommendation selector, timers TodayScreen или continuous subscriptions; это только privacy/render guard.

В tests/today_pane_scope_safety.test.tsx проверить: отрисовать A, заморозить Today, переключить A→B; до swipe/snap visible neighbor не содержит A title/recommendation, owner всё ещё Home, Today loops/subscriptions не стартуют. Повторить для target, locale, local-date и timezone changes. Проверить, что after `onScopeRendered(newKey)` shell снимается и normal two-commit owner handoff продолжает работать.

**Step 7: Обновить Home runtime gates**

В home.tsx заменить смысловые проверки activeIdx === 0 на:

~~~ts
const homeOwnerVisible = runtimeOwnerId === 'home';
const homeRuntimeActive = useRuntimeActive(homeOwnerVisible);
~~~

Применить к:

- Home entrance/loop effects;
- focus refresh conditions;
- app_first_content_ready condition;
- NotificationCenterButton isHomeTabActive.

Logical activeIdx сохранять только там, где действительно нужен tab selection.

**Step 8: Back, focus и custom accessibility action**

- Android BackHandler активен только при physical Today и currentRouteIsTab.
- На Home добавить невидимый accessibilityRole="header" элемент с label Главная и custom action openToday.
- На Today heading добавить custom action returnHome.
- После successful swipe/accessibility entry вызвать AccessibilityInfo.setAccessibilityFocus для today heading.
- После accessibility return вызвать focus для Home hidden heading.
- Все focus calls после requestAnimationFrame и проверки текущего owner.

**Step 9: Discovery hint**

TodayDiscoveryHint:

- pointerEvents="none";
- тонкий theme-aware световой edge слева + локализованный текст из `copy.todayDiscoveryHint` (RU: Потяни вправо);
- виден только когда Home runtime owner;
- device-local, не account scoped;
- исчезает только после successful snap/accessibility open;
- Reduced Motion не пульсирует;
- bootstrap hydration предотвращает flash для уже знакомого пользователя.
- navigation/source contract проверяет, что компонент не содержит literal-only русского текста и использует все 8 locale variants из copy registry.

**Step 10: Смягчить snap**

В TabSlider изменить оба successful withTiming:

~~~ts
{ duration: 280, easing: Easing.out(Easing.cubic) }
~~~

Cancel spring оставить существующим, без overshoot-heavy настройки.

**Step 11: Запустить navigation/runtime tests**

Run:

    npx jest --runTestsByPath tests/today_navigation_contract.test.ts tests/today_pane_scope_safety.test.tsx tests/tab_slider_container_width_contract.test.ts tests/tabbar_scroll_chrome_contract.test.ts tests/tab_deferred_mount_contract.test.ts tests/home_runtime_animation_contract.test.ts tests/owner_direction_runtime_contract.test.ts tests/navigation_back_underlay_contract.test.ts --no-cache --runInBand

Expected: PASS.

**Step 12: Commit**

    git add -- components/today/TodayDiscoveryHint.tsx components/today/TodayPaneBoundary.tsx tests/today_navigation_contract.test.ts tests/today_pane_scope_safety.test.tsx
    git add -p -- app/TabSlider.tsx app/TabContext.tsx "app/(tabs)/_layout.tsx" "app/(tabs)/home.tsx" components/today/TodayScreen.tsx tests/tab_slider_container_width_contract.test.ts tests/tabbar_scroll_chrome_contract.test.ts tests/tab_deferred_mount_contract.test.ts tests/home_runtime_animation_contract.test.ts tests/owner_direction_runtime_contract.test.ts tests/navigation_back_underlay_contract.test.ts
    git diff --cached --check
    git diff --cached
    git commit -m "feat: add swipe-only Today page"

---

### Task 9: Добавить безопасную навигацию CTA и минимальную analytics

**Files:**

- Create: lib/today/analytics.ts
- Create: lib/today/action_revalidation.ts
- Modify: lib/today/snapshot_store.ts
- Modify: components/today/TodayScreen.tsx
- Modify: app/analytics.ts
- Create: tests/today_analytics_contract.test.ts
- Create: tests/today_action_revalidation.test.ts

**Step 1: Написать падающий contract**

Проверить события:

- today_open_first
- today_open
- today_resume_impression
- today_resume_tap
- today_recommendation_impression
- today_recommendation_tap
- today_return_home
- today_stale_target_discarded

Проверить:

- имена <= 40 chars;
- нет свободного пользовательского текста;
- impression один раз на session epoch;
- analytics promise не await-ится перед navigation;
- first open device-local и idempotent;
- stale target revalidation заменяет action до navigation.
- CTA handler не вызывает full `buildTodaySnapshotCandidate` и не читает trainer/flashcards/daily tasks/arena.
- recommendation handler проверяет только выбранный destination; stale destination безопасно заменяется typed Lessons fallback.
- после каждого awaited import/read проверяется не только account generation, но полный актуальный account/target/locale/local-date/timezone scope.
- TodayScreen не имеет static import action_revalidation; модуль загружается только после CTA/recommendation tap.

**Step 2: Запустить test**

Run:

    npx jest --runTestsByPath tests/today_analytics_contract.test.ts tests/today_action_revalidation.test.ts --no-cache --runInBand

Expected: FAIL.

**Step 3: Добавить event names в AnalyticsEvent**

Не добавлять новый SDK и не обходить существующий consent gate. Использовать trackEvent.

Разрешённые props:

- entry: swipe | accessibility;
- resume_kind: lesson | plan;
- resume_mode: start | continue | repeat;
- rule_id;
- destination_id;
- study_target;
- session_epoch;
- stale_reason enum.

Не отправлять title, user name, scopeKey, stableId или локализованный recommendation text.

**Step 4: Реализовать pre-navigation revalidation**

~~~ts
const requestedScope = scope;
const { revalidateTodayResume } = await import('../../lib/today/action_revalidation');
const freshAction = await revalidateTodayResume(requestedScope, token);
const currentScope = rebuildCurrentTodayScope(
  requestedScope,
  getStableAccountGenerationSnapshot(),
  studyTargetRef.current,
  uiLocaleRef.current,
  new Date(),
);
if (!currentScope) return;

const action = freshAction ?? rendered.resume;
if (actionSemanticId(action) !== actionSemanticId(rendered.resume)) {
  patchTodaySnapshotResume(token, currentScope, action, Date.now());
  void trackTodayStaleTargetDiscarded(rendered.resume, action);
}

navigateTodayResume(action, router);
~~~

`patchTodaySnapshotResume` меняет только resume + contentUpdatedAt и намеренно не продвигает full-builder `lastValidatedAt/validatedSourceRevision`, потому что узкая CTA-проверка не читала metrics или recommendation facts.

UI не показывает Applying, spinner или disabled close. Это только локальная короткая проверка lesson/plan. Если проверка падает, использовать последний валидный action только если rendered snapshot всё ещё принадлежит точному текущему scope; wrong-account action никогда не открывать.

lib/today/action_revalidation.ts остаётся лёгким entry module: resume path динамически импортирует только lesson tab state, personal-plan state и общий lesson resolver; destination path через typed switch динамически импортирует только источник выбранного destination. Он не импортирует snapshot_builder или recommendation_catalog.

Recommendation press через тот же dynamic module вызывает только `revalidateTodayDestinationAvailability(requestedScope, token, rendered.recommendation.destinationId)`, затем заново выполняет `rebuildCurrentTodayScope(...)`. Если scope сменился — ничего не открывать. Если destination недоступен при том же scope, использовать typed `today.lessons.explore`, обновить recommendation row и открыть Lessons; не строить заново все RecommendationFacts на tap.

В tests/today_action_revalidation.test.ts замокать `getTrainerTotalDue`, `loadFlashcards`, `getTodayTasksSafe`, `loadTodayProgress`, `getDailyArenaPlaysLeft` и доказать zero calls для CTA. Отдельно проверить changed lesson, completed plan, rejected promise, stale account token, unavailable recommendation destination и deferred promise, во время которого по очереди меняются target, locale, local date и timezone: во всех четырёх scope-race случаях navigation не вызывается.

**Step 5: Запустить tests**

Run:

    npx jest --runTestsByPath tests/today_analytics_contract.test.ts tests/today_action_revalidation.test.ts tests/today_snapshot_builder.test.ts tests/today_recommendation_selector.test.ts tests/today_resume_selector.test.ts --no-cache --runInBand

Expected: PASS.

**Step 6: Commit**

    git add -- lib/today/analytics.ts lib/today/action_revalidation.ts tests/today_analytics_contract.test.ts tests/today_action_revalidation.test.ts
    git add -p -- lib/today/snapshot_store.ts components/today/TodayScreen.tsx app/analytics.ts
    git diff --cached --check
    git diff --cached
    git commit -m "feat: instrument Today actions safely"

---

### Task 10: Добавить focused gesture smoke и провести финальную проверку

**Files:**

- Create: maestro/flows/today_swipe_smoke.yaml
- Review only: all files touched by Tasks 1–9

**Step 1: Добавить testIDs, нужные Maestro**

- screen-home
- today-screen
- today-heading
- today-resume-cta
- today-recommendation
- tab-home

Не менять видимый tab bar ради теста.

**Step 2: Создать Maestro flow**

~~~yaml
appId: app.phraseman
---
- launchApp:
    clearState: false
- extendedWaitUntil:
    visible:
      id: "screen-home"
    timeout: 90000
- swipe:
    start: 10%, 50%
    end: 88%, 50%
    duration: 700
- extendedWaitUntil:
    visible:
      id: "today-screen"
    timeout: 10000
- assertVisible:
    id: "today-resume-cta"
- assertVisible:
    id: "today-recommendation"
- swipe:
    start: 88%, 50%
    end: 10%, 50%
    duration: 700
- assertVisible:
    id: "screen-home"
~~~

**Step 3: Запустить полный узкий Jest gate**

Run:

    npx jest --runTestsByPath tests/today_tab_page_model.test.ts tests/today_scope.test.ts tests/today_account_isolation.test.ts tests/today_metrics_store.test.ts tests/today_xp_integration.test.ts tests/today_study_route_classifier.test.ts tests/today_lesson_availability.test.ts tests/today_plan_progress_integration.test.ts tests/today_interaction_store.test.ts tests/today_resume_selector.test.ts tests/today_recommendation_catalog.test.ts tests/today_recommendation_selector.test.ts tests/today_recommendation_history_store.test.ts tests/today_recommendation_session.test.ts tests/today_snapshot_store.test.ts tests/today_snapshot_builder.test.ts tests/today_discovery_store.test.ts tests/today_hydration_coordinator.test.ts tests/today_source_revision.test.ts tests/today_navigation_contract.test.ts tests/today_pane_scope_safety.test.tsx tests/today_screen_contract.test.ts tests/today_screen_accessibility.test.tsx tests/today_warm_coordinator.test.tsx tests/today_cold_graph_contract.test.ts tests/today_analytics_contract.test.ts tests/today_action_revalidation.test.ts tests/local_account_data.test.ts tests/perf_freeze_contract.test.ts tests/navigation_back_underlay_contract.test.ts tests/owner_direction_runtime_contract.test.ts tests/runtime_lifecycle_ratchet.test.ts tests/home_runtime_animation_contract.test.ts tests/tab_slider_container_width_contract.test.ts tests/tabbar_scroll_chrome_contract.test.ts tests/tab_deferred_mount_contract.test.ts tests/app_snapshot_bootstrap_contract.test.ts tests/xp_award_callers_contract.test.ts tests/progress_event_type_contract.test.ts tests/personal_plan_state.test.ts tests/personal_plan_lesson_progress_contract.test.ts tests/personal_plan_flashcards_completion_contract.test.ts tests/personal_plan_practice_seeded_review_contract.test.ts tests/personal_plan_trainer_weak_spot_completion_contract.test.ts --no-cache --runInBand

Expected: PASS, 0 snapshots updated, 0 source writes by tests.

**Step 4: Проверить статические запреты**

Run:

    rg -n "Magnetometer|DeviceMotion|Location|requestForegroundPermissions|BlurView" components/today lib/today

Expected: no matches.

Run:

    rg -n "setInterval|withRepeat" components/today lib/today

Expected:

- no setInterval;
- withRepeat только в TodayAmbientCompass;
- рядом присутствуют useRuntimeActive, useReduceMotion и cancelAnimation.

Run:

    rg -n "^import .*snapshot_builder|^import .*recommendation_catalog|^import .*trainer|^import .*flashcards|^import .*daily_tasks|^import .*arena" components/today/TodayScreen.tsx components/today/TodayWarmCoordinator.tsx

Expected: no matches. `snapshot_builder` появляется только внутри `import(...)` после readiness/owner gate.

**Step 5: Ручная проверка на реальном Android/iOS**

Матрица:

1. compact phone, large phone;
2. light/dark плюс lime/volt theme;
3. swipe Home -> Today -> Home;
4. короткий отменённый drag;
5. Home tab tap из Today;
6. Android Back из Today;
7. cold Home launch не открывает Today;
8. VoiceOver/TalkBack custom open/return focus;
9. системный font size 200%: CTA/recommendation не обрезаны, metrics переносятся без overlap, оба press targets >=44x44;
10. Reduced Motion;
11. app background на Today минимум 20 секунд — compass loops остановлены;
12. account switch во время delayed Today write/hydration, target switch, locale switch, timezone/local-midnight rollover;
13. offline;
14. stale lesson/plan target перед CTA tap; убедиться по instrumentation, что trainer/flashcards/tasks/arena не читаются;
15. recommendation destination availability;
16. tab bar всё время содержит пять прежних кнопок и Home подсвечен на Today.

Во время проверки снять screenshots Today для compact/light, compact/dark, large/light и large/dark. Артефакты хранить только в qa-artifacts/ или maestro-results/, не в app/assets.

**Step 6: Запустить Maestro, если dev build/device доступен**

Run:

    maestro test maestro/flows/today_swipe_smoke.yaml

Expected: PASS.

Если device/dev build недоступен, явно записать это как непроверенный пункт; Jest gate не выдавать за device verification.

**Step 7: Проверить diff и отсутствие случайных удалений**

Run:

    git diff --check
    git status --short
    git diff --stat

Проверить, что не менялись:

- пять существующих tab definitions;
- routes Arena/Challenges/Flashcards;
- существующие feature flags;
- unrelated dirty files.

Сопоставить hunks в `app/(tabs)/home.tsx`, `app/_layout.tsx` и `app/analytics.ts` с preflight из Task 0. Ни один исходный пользовательский hunk не должен исчезнуть или оказаться в Today commits без явной необходимости.

**Step 8: Commit**

    git add -- maestro/flows/today_swipe_smoke.yaml
    git diff --cached --check
    git diff --cached
    git commit -m "test: cover Today swipe journey"

---

## Acceptance gate

Работа считается готовой только если одновременно выполнено:

- все focused Jest tests зелёные;
- Advisor review actual final diff возвращает DECISION: APPROVED;
- Today открывается только swipe/custom accessibility action;
- пять tab buttons не изменены;
- owner invariant доказан тестом и ручным drag/snap;
- первый кадр не содержит loader или ложный cross-scope snapshot;
- four account-scoped Today keys входят в backup/wipe, two device keys не входят, delayed write/hydration race зелёная;
- same-account delayed raw объединяется с concurrent mutation для всех четырёх stores, а warm ждёт merged async hydration barrier;
- metrics соответствуют указанной семантике;
- current install day честно остаётся unknown до полной локальной даты; timezone change также не создаёт ложный complete;
- CTA revalidation не открывает stale/wrong-account destination и не запускает full builder;
- target/locale/date/timezone change во время CTA/recommendation await отменяет navigation;
- frozen-neighbor privacy guard не показывает старые title/recommendation при account/target/locale/date/timezone change до первого swipe/snap;
- catalog содержит минимум 40 personalized rules плюс typed fallback;
- Lessons и Today используют один resolver доступности free/premium/noLimits уроков;
- CTA/recommendation проходят 44x44, full-label и 200% font-size gate;
- motion выключается при blur/background/Reduced Motion;
- cold Home static graph не загружает full recommendation catalog/heavy Today builder;
- compact/light/dark screenshots просмотрены;
- существующие функции не удалены.

## План отката

Если в device QA обнаруживается проблема жеста или runtime owner:

1. не удалять Today data stores и instrumentation;
2. временно выключить только вставку physical Today child локальным feature flag, сохранив прежние пять physical pages;
3. не менять логические tab indices;
4. исправить mapping/gesture и повторить весь navigation/runtime gate;
5. не ослаблять perf_freeze_contract или navigation_back_underlay_contract.
