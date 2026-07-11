# Instant UI and Battery Performance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Показывать последние реальные данные на первом кадре пяти подтверждённых экранов и убрать дублирующиеся секундные energy timers без изменения серверно-авторитетных начислений и arena semantics.

**Architecture:** Каждый экран получает небольшой keyed module cache с TTL и synchronous peek; stale data остаются видимыми во время quiet revalidation. Energy countdown получает один shared active clock вместо отдельного interval на каждого consumer, при этом clock выключается при полном/безлимитном запасе энергии и background `AppState`.

**Tech Stack:** React Native, Expo Router, TypeScript, Jest, AsyncStorage, Firebase callable APIs.

---

## Карта файлов

- `app/account_scope_key.ts` — чистое построение cache key из `AccountGenerationToken` без изменения auth semantics.
- `app/phrase_analytics_screen.tsx` — TTL существующего warm snapshot.
- `app/arena_season_top_cache.ts` — bounded cache сезонного рейтинга.
- `app/arena_season_leaderboard.tsx` — synchronous hydration и quiet refresh рейтинга.
- `app/lingman_youtube_cache.ts` — bounded cache каталога Lingman.
- `app/lingman_videos.tsx` — первый кадр из cache.
- `app/daily_tasks_screen_cache.ts` — day/target-scoped snapshot заданий.
- `app/daily_tasks_screen.tsx` — hydration и параллельная загрузка независимых метаданных.
- `app/referrals_cache.ts` — memory peek поверх существующего persistent cache.
- `app/referrals.tsx` — hydration и единый агрегированный pending UI.
- `components/energy_countdown_clock.ts` — shared foreground clock.
- `components/EnergyContext.tsx` — подписка countdown hook на shared clock.
- `tests/instant_ui_cache_contract.test.ts` — cache/TTL contracts.
- `tests/energy_countdown_clock.test.ts` — lifecycle shared clock.
- `tests/referral_screens_contract.test.ts` — агрегированный claim UI.
- `tests/owner_direction_runtime_contract.test.ts` — запрет consumer-local energy intervals.

### Task 0.5: единый account scope helper

**Files:**
- Create: `app/account_scope_key.ts`
- Create: `tests/account_scope_key.test.ts`

- [ ] **Step 1: написать RED unit test**

```ts
expect(accountScopeKey({ generation: 3, stableId: 'alice', phase: 'active' })).toBe('generation:3:uid:alice');
expect(accountScopeKey({ generation: 3, stableId: 'bob', phase: 'active' })).not.toBe('generation:3:uid:alice');
expect(accountScopeKey({ generation: 4, stableId: 'alice', phase: 'active' })).not.toBe('generation:3:uid:alice');
expect(accountScopeKey({ generation: 3, stableId: 'alice', phase: 'transitioning' })).toBeNull();
```

- [ ] **Step 2: запустить RED** — `npx jest tests/account_scope_key.test.ts --runInBand`; expected FAIL: module missing.
- [ ] **Step 3: реализовать чистый helper**

```ts
export function accountScopeKey(token: AccountGenerationToken): string | null {
  if (token.phase !== 'active') return null;
  return `generation:${token.generation}:uid:${token.stableId ?? 'none'}`;
}
```

- [ ] **Step 4: запустить GREEN** — та же команда; expected PASS.

## Обязательный контракт для всех cache tasks

Этот контракт имеет приоритет над сокращёнными примерами ниже:

- TTL не удаляет value: read API возвращает `{ value, isFresh }`; stale value рисуется первым кадром и запускает одну background revalidation.
- Для account-scoped peek сначала берётся `const token = captureAccountGeneration()`. При `token.phase !== 'active'` peek запрещён. Ключ строится только через `accountScopeKey(token)`, возвращающий `generation:${token.generation}:uid:${token.stableId ?? 'none'}`; объект token никогда не интерполируется напрямую. Перед commit обязательны `isCurrentAccountGeneration(token)` и совпадение key/request id.
- Каждый async refresh получает монотонный request id. Только последний request текущего key/generation может менять cache и React state; ошибка сохраняет last-known value.
- Season commit дополнительно требует `result.seasonId === expectedSeasonId`.
- Analytics key: account scope + studyTarget + sourceLocale. Season: account scope + season. Lingman: account scope + channel. Daily: account scope + day + studyTarget. Persistent referrals key/payload обязательно содержит stable UID; generation служит только session/late-response guard. Тест persistent referrals моделирует restart с тем же generation и другим stable UID.
- Daily optimistic claim patch-ит snapshot; rollback инвалидирует его. Trio claim и reroll после успеха инвалидируют snapshot. Lingman mark-seen patch-ит cached unread overlay. Referral claim success инвалидирует cache до forced reload.
- Все caches bounded. Daily/referrals используют максимум 2 записи и удаляют самую старую по `updatedAt`; тест добавляет третью запись и проверяет eviction.

### Task 0: доказать фоновую нагрузку до production-правки

**Files:**
- Inspect: `components/EnergyContext.tsx`, `components/EnergyBar.tsx`, `components/LessonEnergyLightning.tsx`, `components/NoEnergyModal.tsx`
- Inspect: `components/LeagueChatPanel.tsx`, `components/HomeTheoAdvisorCard.tsx`, `components/LingmanVideosButton.tsx`
- Create: `.codex-tmp/perf/first-batch-timer-trace.md`

- [ ] **Step 1: записать lifecycle trace** — для каждого recurring call site зафиксировать mount owner, одновременных consumers, focus/AppState guards, cleanup и возможное число параллельных instances.
- [ ] **Step 2: измерить energy consumers** — в Jest/RNTL harness временно поставить spies на `global.setInterval`, `global.clearInterval`, `AppState.addEventListener` и `subscription.remove`, смонтировать одновременно `EnergyBar` + скрытый `NoEnergyModal`, затем выполнить пять rerender visibility/focus и mocked AppState циклов. Записать вызовы/живые handles в `.codex-tmp/perf/first-batch-timer-trace.md`; production source на этом шаге не менять.
- [ ] **Step 3: принять GO/NO-GO** — Task 6 выполняется только если доказаны параллельные intervals, ticking на blur/background или утечка после cleanup.
- [ ] **Step 4: сохранить положительные эталоны** — не менять `HomeTheoAdvisorCard`/`LingmanVideosButton`, если их guards корректны; `LeagueChatPanel` исправлять только при доказанном фоне.

### Task 1: TTL для аналитики фраз

**Files:**
- Create: `app/phrase_analytics_warm_cache.ts`
- Modify: `app/phrase_analytics_screen.tsx:371-419`
- Create: `tests/phrase_analytics_warm_cache.test.ts`

- [ ] **Step 1: написать failing test**

```ts
test('fresh cache skips compute while stale cache remains readable', () => {
  putPhraseAnalyticsWarm(key, token, value, 1_000);
  expect(readPhraseAnalyticsWarm(key, token, 20_000)).toEqual({ value, isFresh: true });
  expect(readPhraseAnalyticsWarm(key, token, 60_000)).toEqual({ value, isFresh: false });
});

test('rejects wrong generation and late request commit', () => {
  expect(readPhraseAnalyticsWarm(key, otherAccountToken, 20_000)).toBeNull();
  expect(commitPhraseAnalyticsWarm(staleRequest, value)).toBe(false);
});
```

- [ ] **Step 2: подтвердить RED**

Run: `npx jest tests/phrase_analytics_warm_cache.test.ts --runInBand`

Expected: FAIL — TTL и `updatedAt` отсутствуют.

- [ ] **Step 3: добавить минимальную TTL-логику**

```ts
const token = captureAccountGeneration();
const cacheKey = token.phase === 'active'
  ? `${accountScopeKey(token)}:analytics:${warmKey}`
  : null;
const cached = cacheKey ? readPhraseAnalyticsWarm(cacheKey, token) : null;

const load = useCallback(async (options: { force?: boolean } = {}) => {
  const warm = cacheKey ? readPhraseAnalyticsWarm(cacheKey, token) : null;
  if (!options.force && warm?.isFresh) return;
  const request = beginPhraseAnalyticsRequest(cacheKey, token);
  if (!data) setLoading(true);
  try {
    const [result, resolved] = await Promise.all([/* existing calls unchanged */]);
    if (!request.isLatest() || !isCurrentAccountGeneration(token)) return;
    commitPhraseAnalyticsWarm(request, { data: result, resolved });
    setData(result);
    setResolvedPersonalTrainings(resolved);
  } catch {
    // Preserve cached/current value; do not write null or false empty state.
  } finally {
    setLoading(false);
  }
}, [analyticsSourceGateOpen, data, personalPracticeCoachEnabled, sourceLocale, studyTarget, warmKey]);
```

Не менять compute-функции, premium gate или условие `loading && !data`.

Перед первым `await` захватить `requestToken`, `requestKey` и `requestId`. Dependency list включает `cacheKey`, поля token и loader inputs. После `await` commit использует только captured token/key/id, поэтому account switch не может записать результат через новую closure.

Добавить loader-helper behavioral test со spy: fresh cache вызывает loader 0 раз; stale cache сразу возвращает value и вызывает loader ровно 1 раз; rejected loader сохраняет value; поздний request не commit-ится.

- [ ] **Step 4: подтвердить GREEN**

Run: `npx jest tests/phrase_analytics_warm_cache.test.ts --runInBand`

Expected: PASS.

### Task 2: тёплый seasonal leaderboard

**Files:**
- Create: `app/arena_season_top_cache.ts`
- Modify: `app/arena_season_leaderboard.tsx:112-126`
- Modify: `tests/instant_ui_cache_contract.test.ts`

- [ ] **Step 1: написать failing cache tests**

```ts
import { readSeasonTop, putSeasonTop, resetSeasonTopCacheForTests } from '../app/arena_season_top_cache';

test('season cache is keyed and reports stale without hiding rows', () => {
  resetSeasonTopCacheForTests();
  putSeasonTop(keyA, token, sample, 1_000);
  expect(readSeasonTop(keyA, token, 30_000)).toEqual({ value: sample, isFresh: true });
  expect(readSeasonTop(keyB, token, 30_000)).toBeNull();
  expect(readSeasonTop(keyA, token, 40_001)).toEqual({ value: sample, isFresh: false });
});

test('rejects wrong account, mismatched server season and late request', () => {
  expect(readSeasonTop(keyA, otherAccountToken, 30_000)).toBeNull();
  expect(commitSeasonTop(request, { ...sample, seasonId: 'other' })).toBe(false);
});
```

- [ ] **Step 2: подтвердить RED**

Run: `npx jest tests/instant_ui_cache_contract.test.ts --runInBand`

Expected: FAIL — module отсутствует.

- [ ] **Step 3: реализовать bounded cache**

```ts
import type { SeasonTopResult } from './services/arena_season_client';

const TTL_MS = 30_000;
let entry: { key: string; generation: number; value: SeasonTopResult; updatedAt: number } | null = null;

export function readSeasonTop(key: string, token: AccountGenerationToken, now = Date.now()) {
  if (token.phase !== 'active' || entry?.key !== key || entry.generation !== token.generation) return null;
  return { value: entry.value, isFresh: now - entry.updatedAt <= TTL_MS };
}
export function putSeasonTop(key: string, token: AccountGenerationToken, value: SeasonTopResult, now = Date.now()): void {
  entry = { key, generation: token.generation, value, updatedAt: now };
}
export function resetSeasonTopCacheForTests(): void { entry = null; }
```

Экран строит key через `accountScopeKey(token)` + season, инициализирует `data` из value даже при stale и `loading` только при отсутствии value. Commit проверяет latest request, `isCurrentAccountGeneration(token)`, expected season и авторитетный `result.seasonId`.

- [ ] **Step 4: проверить cache и UI contract**

Run: `npx jest tests/instant_ui_cache_contract.test.ts tests/owner_direction_runtime_contract.test.ts --runInBand`

Expected: PASS.

### Task 3: тёплый каталог Lingman

**Files:**
- Create: `app/lingman_youtube_cache.ts`
- Modify: `app/lingman_videos.tsx:44-154`
- Modify: `tests/instant_ui_cache_contract.test.ts`
- Modify: `tests/lingman_youtube_quality_gate.test.ts`

- [ ] **Step 1: написать failing test**

```ts
test('Lingman cache keeps stale catalog visible and isolates user overlay', () => {
  resetLingmanSnapshotCacheForTests();
  putLingmanSnapshot(keyA, token, snapshot, 1_000);
  expect(readLingmanSnapshot(keyA, token, 20_000)).toEqual({ value: snapshot, isFresh: true });
  expect(readLingmanSnapshot(keyB, token, 20_000)).toBeNull();
  expect(readLingmanSnapshot(keyA, token, 61_001)).toEqual({ value: snapshot, isFresh: false });
});
```

- [ ] **Step 2: подтвердить RED**

Run: `npx jest tests/instant_ui_cache_contract.test.ts --runInBand`

Expected: FAIL — Lingman cache API отсутствует.

- [ ] **Step 3: реализовать single-entry keyed cache**

Cache повторяет Task 2 с TTL `60_000`; key включает account generation + channel. Stale value остаётся первым кадром и запускает background refresh. Latest-request/current-generation guards защищают commit.

Серверный `markLingmanYoutubeCatalogSeen(video.id)` не меняется; тот же локальный updater обязан patch-ить cached `unreadCount`, чтобы старый unread не воскрес при remount.

- [ ] **Step 4: проверить GREEN**

Run: `npx jest tests/instant_ui_cache_contract.test.ts tests/lingman_youtube_quality_gate.test.ts --runInBand`

Expected: PASS.

### Task 4: day/target snapshot ежедневных заданий

**Files:**
- Create: `app/daily_tasks_screen_cache.ts`
- Modify: `app/daily_tasks_screen.tsx:1701-1854`
- Create: `tests/daily_tasks_screen_cache.test.ts`

- [ ] **Step 1: написать failing tests**

```ts
test('does not reuse tasks across day or study target', () => {
  putDailyTasksScreenSnapshot(token, { key: dayEnKey, tasks, progress, updatedAt: 1 });
  expect(peekDailyTasksScreenSnapshot(dayEnKey, token)?.value.tasks).toBe(tasks);
  expect(peekDailyTasksScreenSnapshot(nextDayEnKey, token)).toBeNull();
  expect(peekDailyTasksScreenSnapshot(dayFrKey, token)).toBeNull();
});

test('keeps stale value, evicts oldest third entry and rejects old account', () => {
  putDailyTasksScreenSnapshot(token, first);
  putDailyTasksScreenSnapshot(token, second);
  putDailyTasksScreenSnapshot(token, third);
  expect(peekDailyTasksScreenSnapshot(first.key, token, lateNow)).toBeNull();
  expect(peekDailyTasksScreenSnapshot(third.key, token, lateNow)?.isFresh).toBe(false);
  expect(peekDailyTasksScreenSnapshot(third.key, otherAccountToken, lateNow)).toBeNull();
});
```

- [ ] **Step 2: подтвердить RED**

Run: `npx jest tests/daily_tasks_screen_cache.test.ts --runInBand`

Expected: FAIL — cache API отсутствует.

- [ ] **Step 3: реализовать cache и hydration**

```ts
export type DailyTasksScreenSnapshot = {
  key: string;
  tasks: DailyTask[];
  progress: TaskProgress[];
  trioShardsClaimed: boolean;
  rerollsLeft: number;
  updatedAt: number;
};

const MAX_ENTRIES = 2;
const TTL_MS = 30_000;
const entries = new Map<string, DailyTasksScreenSnapshot>();
```

`useState` читает value по `${accountScopeKey(token)}:${getTodayKey()}:${studyTarget}` только при `token.phase === 'active'`, даже если запись stale. Map удаляет самую старую запись при третьем key. Request/account guards защищают commit. После progress независимые metadata reads идут через `Promise.all`.

Не распараллеливать `loadTodayProgress` с получением task list: progress зависит от списка.

Optimistic claim patch-ит snapshot; rollback инвалидирует его. Успешные trio claim и reroll инвалидируют snapshot до forced refresh.

- [ ] **Step 4: проверить claims и target isolation**

Run: `npx jest tests/daily_tasks_screen_cache.test.ts tests/daily_tasks_claim_optimistic_contract.test.ts tests/daily_tasks_claim.test.ts tests/cloud_sync_daily_tasks_merge.test.ts --runInBand`

Expected: PASS.

### Task 5: рефералы — synchronous peek и единый pending

**Files:**
- Create: `app/referrals_cache.ts`
- Modify: `app/referrals.tsx:60-135,225-320,390-405`
- Modify: `tests/referral_screens_contract.test.ts`

- [ ] **Step 1: написать failing UI contract**

```ts
it('renders one aggregate pending state for aggregate referral claim', () => {
  const source = read('app/referrals.tsx');
  expect(source).toContain('testID="referrals-claim-pending"');
  expect(source).not.toContain('claiming && claimable ? <ActivityIndicator');
  expect(source).toContain('peekReferralInvites()');
});

test('referral cache remains stale-visible, bounded and account isolated', () => {
  putReferralInvites(token, rows, 1_000);
  expect(readReferralInvites(token, 20_000)).toEqual({ value: rows, isFresh: true });
  expect(readReferralInvites(token, 70_000)).toEqual({ value: rows, isFresh: false });
  expect(readReferralInvites(otherAccountToken, 20_000)).toBeNull();
  expect(readPersistedReferralInvites({ generation: token.generation + 1, stableId: token.stableId, phase: 'active' })).toEqual(rows);
  expect(readPersistedReferralInvites({ generation: token.generation, stableId: 'other-user', phase: 'active' })).toBeNull();
});
```

- [ ] **Step 2: подтвердить RED**

Run: `npx jest tests/referral_screens_contract.test.ts --runInBand`

Expected: FAIL — per-row spinner ещё существует.

- [ ] **Step 3: реализовать memory peek и aggregate pending**

```ts
const MAX_ENTRIES = 2;
const TTL_MS = 60_000;
const entries = new Map<string, { value: ReferralInvite[]; updatedAt: number }>();
```

Экран читает current-account value даже при stale. Persistent key/payload авторизуется по stable UID: same UID после restart принимается независимо от старой generation и перепривязывается к текущей generation в memory cache; different UID отклоняется даже при совпавшей generation. Legacy payload не становится account-authoritative первым кадром. Latest request/current token защищают commit. Claim success инвалидирует cache до forced reload.

- [ ] **Step 4: проверить GREEN**

Run: `npx jest tests/referral_screens_contract.test.ts --runInBand`

Expected: PASS.

### Task 6: один shared energy countdown clock — только после GO из Task 0

При NO-GO создать только evidence report Task 0 и не создавать/не изменять перечисленные ниже production/test файлы.

**Files:**
- Create: `components/energy_countdown_clock.ts`
- Modify: `components/EnergyContext.tsx:80-111`
- Modify: `components/EnergyBar.tsx`
- Modify: `components/LessonEnergyLightning.tsx`
- Modify: `components/NoEnergyModal.tsx`
- Create: `tests/energy_countdown_clock.test.ts`
- Modify: `tests/owner_direction_runtime_contract.test.ts`

- [ ] **Step 1: написать failing lifecycle tests с fake timers**

```ts
jest.useFakeTimers();

test('shares one interval across subscribers and stops after the last unsubscribe', () => {
  const a = subscribeEnergyClock(jest.fn(), { visible: true });
  const b = subscribeEnergyClock(jest.fn(), { visible: true });
  expect(getEnergyClockDebugState()).toEqual({ subscribers: 2, running: true });
  a();
  expect(getEnergyClockDebugState().running).toBe(true);
  b();
  expect(getEnergyClockDebugState()).toEqual({ subscribers: 0, running: false });
});

test('background state stops ticking and active state resumes', () => {
  appStateHarness.emit('background');
  expect(getEnergyClockDebugState().running).toBe(false);
  appStateHarness.emit('active');
  expect(getEnergyClockDebugState().running).toBe(true);
});

test('lazily attaches one AppState listener and removes it after last visible subscriber', () => {
  const a = subscribeEnergyClock(listener, { visible: true });
  const b = subscribeEnergyClock(other, { visible: false });
  expect(getEnergyClockDebugState()).toMatchObject({ subscribers: 1, intervals: 1, appStateListeners: 1 });
  a(); b();
  expect(getEnergyClockDebugState()).toMatchObject({ subscribers: 0, intervals: 0, appStateListeners: 0 });
});

test('starts backgrounded without ticking and emits immediately on resume', () => {
  appStateHarness.setCurrent('background');
  subscribeEnergyClock(listener, { visible: true });
  expect(getEnergyClockDebugState().running).toBe(false);
  appStateHarness.emit('active');
  expect(listener).toHaveBeenLastCalledWith(Date.now());
});

test('visibility true to false stops the last clock and false to true emits immediately', () => {
  const subscription = createEnergyClockSubscription(listener, { visible: true });
  subscription.update({ visible: false });
  expect(getEnergyClockDebugState()).toMatchObject({ intervals: 0, appStateListeners: 0 });
  subscription.update({ visible: true });
  expect(listener).toHaveBeenLastCalledWith(Date.now());
  expect(getEnergyClockDebugState()).toMatchObject({ intervals: 1, appStateListeners: 1 });
});

afterEach(() => {
  resetEnergyClockForTests();
  jest.clearAllTimers();
  jest.useRealTimers();
});
```

- [ ] **Step 2: подтвердить RED**

Run: `npx jest tests/energy_countdown_clock.test.ts --runInBand`

Expected: FAIL — shared clock отсутствует.

- [ ] **Step 3: реализовать shared clock**

```ts
type Listener = (now: number) => void;
const listeners = new Set<Listener>();
let interval: ReturnType<typeof setInterval> | null = null;
let active = AppState.currentState === 'active';
let appStateSub: { remove(): void } | null = null;

function reconcile(): void {
  if (active && listeners.size > 0 && interval === null) {
    interval = setInterval(() => {
      const now = Date.now();
      listeners.forEach(listener => listener(now));
    }, 1000);
  } else if ((!active || listeners.size === 0) && interval !== null) {
    clearInterval(interval);
    interval = null;
  }
}
```

AppState listener создаётся при первом visible subscriber и удаляется после последнего. `useEnergyCountdown({ visible })` подписывается только при visible + реально восстанавливающейся энергии. `EnergyBar`/`LessonEnergyLightning` передают `useIsScreenFocused()`, `NoEnergyModal` — окончательный `modalVisible`. Первый subscriber и resume немедленно получают `Date.now()`. Debug state считает subscribers, intervals и listeners; пять focus/blur циклов не увеличивают максимум.

- [ ] **Step 4: проверить timer contracts**

Run: `npx jest tests/energy_countdown_clock.test.ts tests/owner_direction_runtime_contract.test.ts tests/perf_freeze_contract.test.ts --runInBand`

Expected: PASS; в `EnergyContext.tsx` отсутствует consumer-local interval.

### Task 7: интеграционная проверка первого пакета

**Files:**
- Verify only; production changes запрещены на этом шаге.

- [ ] **Step 1: запустить узкую регрессию**

Run:

```powershell
npx jest tests/account_scope_key.test.ts tests/phrase_analytics_warm_cache.test.ts tests/instant_ui_cache_contract.test.ts tests/lingman_youtube_quality_gate.test.ts tests/daily_tasks_screen_cache.test.ts tests/daily_tasks_claim_optimistic_contract.test.ts tests/daily_tasks_claim.test.ts tests/cloud_sync_daily_tasks_merge.test.ts tests/referral_screens_contract.test.ts tests/owner_direction_runtime_contract.test.ts tests/perf_freeze_contract.test.ts tests/navigation_back_underlay_contract.test.ts --runInBand
```

Если Task 0 дал GO и Task 6 реализован, добавить `tests/energy_countdown_clock.test.ts` к этой команде. При NO-GO suite/module не ожидаются.

Expected: все перечисленные suites PASS, source-write guard не сообщает о записях.

- [ ] **Step 2: выполнить TypeScript gate**

Run: `npm run typecheck`

Expected: exit 0. Если в рабочем дереве есть заранее существующие ошибки, отдельно доказать, что новые файлы не добавили ошибок; не исправлять несвязанный код.

- [ ] **Step 3: runtime smoke на Android emulator**

Проверить вручную:

1. Cold open каждого из пяти экранов.
2. Возврат назад и повторный вход в пределах TTL: данные видны первым кадром.
3. Background 20 секунд и resume: countdown сразу показывает правильное абсолютное время.
4. Повторить focus/blur пять раз: не появляются дополнительные intervals/listeners.
5. Offline/error: last-known data не исчезают.
6. После account switch analytics, season personal fields, Lingman unread, daily progress и referrals не показывают previous generation.
7. Instrumented counters подтверждают: fresh cache пропускает fetch/compute, stale cache запускает ровно одну background revalidation.
8. Daily claim и referral claim сохраняют server-authoritative границы.

- [ ] **Step 4: проверить финальный diff**

Run: `git diff --check`

Expected: exit 0, нет whitespace errors. Просмотреть только перечисленные файлы; не включать пользовательские изменения.

---

## Отложенный timer audit

После первой партии отдельно трассируются `LeagueChatPanel`, `HomeTheoAdvisorCard`, `LingmanVideosButton`, `PromoBanner`, `shards_shop`, `streak_stats` и `ScreenGradient`. Изменение разрешено только при доказанном выполнении на blur/background или дублировании. Arena timers, purchases и auth не меняются без отдельного end-to-end дизайна.
