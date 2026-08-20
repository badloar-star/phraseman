# Arena Instant Offline-First Hub Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `/arena` render a complete truthful hub immediately, without skeletons, while local and remote data hydrate silently and offline failures remain distinct from server gates.

**Architecture:** Represent each home-data half as a monotonic `neutral -> cached -> current` slot, and classify transport failures with a pure presentation policy. Make rank, daily goals, wallet, and today progress explicitly nullable so unknown data renders as an em dash rather than factual zero; `/arena` always mounts the final card geometry and never branches to `ArenaHubSkeleton`.

**Tech Stack:** React Native, Expo Router, TypeScript, AsyncStorage, Jest/ts-jest, existing Arena V2 UI primitives.

---

## File map

- Create `modules/arena/hub_presentation.ts`: pure monotonic hydration slots and remote-failure classification.
- Create `tests/arena_hub_presentation.test.ts`: slot precedence and offline/server classification tests.
- Modify `modules/arena/hub_view.ts`: preserve unknown rank and daily-goal state rather than coercing it to zero.
- Modify `tests/arena_hub_view.test.ts`: prove unknown is distinct from a real zero.
- Modify `components/arena/ArenaHubLive.tsx`: stable neutral rank card.
- Modify `components/arena/ArenaDailyGoals.tsx`: stable neutral goal geometry.
- Modify `components/arena/ArenaExpansionUI.tsx`: nullable Arena progress.
- Create `components/arena/ArenaConnectionNotice.tsx`: compact localized offline notice with retry.
- Modify `modules/arena/copy.ts`: localized unknown/offline copy.
- Modify `app/arena.tsx`: slots, unconditional hub cards, separated failures, no hub skeleton.
- Modify `tests/arena_home_cache.test.ts`: immediate skeleton-free first-frame contract.
- Keep `components/arena/ArenaHubSkeleton.tsx`; only `/arena` stops importing it.

Guardrails: do not change `ARENA_HOME_CACHE_TTL_MS`, cache schema, future-clock rejection, daily-counter stripping, or active match/queue sanitization in `modules/arena/home_cache.ts`. The existing cache tests remain in the final gate so expired, corrupt, incompatible, and cold-start snapshots keep their current safety behavior.

### Task 1: Monotonic hydration and failure policy

**Files:**
- Create: `modules/arena/hub_presentation.ts`
- Create: `tests/arena_hub_presentation.test.ts`

- [ ] **Step 1: Write failing policy tests**

Create `tests/arena_hub_presentation.test.ts`:

```ts
import {
  arenaHubCached,
  arenaHubCurrent,
  arenaHubFailure,
  arenaHubNeutral,
} from '../modules/arena/hub_presentation';

describe('Arena hub presentation', () => {
  it('starts with a truthful neutral slot', () => {
    expect(arenaHubNeutral<{ rating: number }>()).toEqual({
      source: 'neutral', value: null,
    });
  });

  it('accepts disk cache only while the slot is neutral', () => {
    const neutral = arenaHubNeutral<{ rating: number }>();
    const cached = arenaHubCached(neutral, { rating: 700 });
    const current = arenaHubCurrent({ rating: 900 });
    expect(cached).toEqual({ source: 'cached', value: { rating: 700 } });
    expect(arenaHubCached(current, { rating: 700 })).toBe(current);
  });

  it('remote data always becomes current', () => {
    expect(arenaHubCurrent({ rating: 900 })).toEqual({
      source: 'current', value: { rating: 900 },
    });
  });

  it.each([
    new Error('Network request failed'),
    { code: 'functions/unavailable' },
    { code: 'functions/deadline-exceeded', message: 'timeout' },
    new Error('failed to fetch'),
  ])('classifies transport failures as offline', (error) => {
    expect(arenaHubFailure(error).kind).toBe('offline');
  });

  it.each([
    new Error('arena_disabled'),
    new Error('arena_client_update_required'),
    new Error('arena_config_incompatible:v3'),
    new Error('account_delete_pending'),
  ])('keeps server gates out of the offline notice', (error) => {
    expect(arenaHubFailure(error).kind).toBe('server');
  });

  it('keeps the useful server message as diagnostic code', () => {
    expect(arenaHubFailure({
      code: 'functions/failed-precondition', message: 'arena_disabled',
    })).toEqual({ kind: 'server', code: 'arena_disabled' });
  });
});
```

- [ ] **Step 2: Run the test and confirm RED**

Run:

```powershell
npx jest --runTestsByPath tests/arena_hub_presentation.test.ts --runInBand
```

Expected: FAIL because `modules/arena/hub_presentation.ts` does not exist.

- [ ] **Step 3: Implement the pure policy**

Create `modules/arena/hub_presentation.ts`:

```ts
export type ArenaHubSource = 'neutral' | 'cached' | 'current';

export type ArenaHubSlot<T> = Readonly<{
  source: ArenaHubSource;
  value: T | null;
}>;

export type ArenaHubFailure = Readonly<{
  kind: 'offline' | 'server';
  code: string;
}>;

export function arenaHubNeutral<T>(): ArenaHubSlot<T> {
  return { source: 'neutral', value: null };
}

export function arenaHubCached<T>(
  current: ArenaHubSlot<T>,
  value: T | null,
): ArenaHubSlot<T> {
  if (current.source !== 'neutral' || value === null) return current;
  return { source: 'cached', value };
}

export function arenaHubCurrent<T>(value: T): ArenaHubSlot<T> {
  return { source: 'current', value };
}

function errorParts(error: unknown): { code: string; text: string } {
  const raw = error as { code?: unknown; message?: unknown } | null | undefined;
  const message = typeof raw?.message === 'string' ? raw.message : '';
  const transportCode = typeof raw?.code === 'string' ? raw.code : '';
  const fallback = typeof error === 'string' ? error : String(error ?? '');
  const code = (message || transportCode || fallback || 'unknown').slice(0, 80);
  return { code, text: `${transportCode} ${message || fallback}`.toLowerCase() };
}

export function arenaHubFailure(error: unknown): ArenaHubFailure {
  const { code, text } = errorParts(error);
  const offline = text.includes('unavailable')
    || text.includes('network')
    || text.includes('offline')
    || text.includes('failed to fetch')
    || text.includes('timeout')
    || text.includes('deadline-exceeded')
    || text.includes('econn');
  return { kind: offline ? 'offline' : 'server', code };
}
```

- [ ] **Step 4: Run the policy test and confirm GREEN**

```powershell
npx jest --runTestsByPath tests/arena_hub_presentation.test.ts --runInBand
```

Expected: PASS, all cases green.

- [ ] **Step 5: Commit only the policy files**

```powershell
git add -- modules/arena/hub_presentation.ts tests/arena_hub_presentation.test.ts
git commit --only -m "fix(arena): add monotonic hub hydration policy" -- modules/arena/hub_presentation.ts tests/arena_hub_presentation.test.ts
```

Expected: the commit contains exactly the two named files; unrelated staged work remains staged.

### Task 2: Truthful unknown rank, goals, and progress

**Files:**
- Modify: `modules/arena/hub_view.ts`
- Modify: `tests/arena_hub_view.test.ts`
- Modify: `modules/arena/copy.ts`
- Modify: `components/arena/ArenaHubLive.tsx`
- Modify: `components/arena/ArenaDailyGoals.tsx`
- Modify: `components/arena/ArenaExpansionUI.tsx`

- [ ] **Step 1: Change model tests to forbid fabricated zeroes**

Replace the final model block in `tests/arena_hub_view.test.ts` with:

```ts
describe('модель целиком', () => {
  it('пустой вход сохраняет неизвестность и не выдумывает нули', () => {
    const model = arenaHubModel({});
    expect(model.rank).toBeNull();
    expect(model.goals).toBeNull();
    expect(model.lastMatch).toBeNull();
    expect(model.friends).toEqual([]);
    expect(model.searchingNow).toBeNull();
  });

  it('настоящий нулевой рейтинг остаётся известным нулём', () => {
    const model = arenaHubModel({ rating: 0 });
    expect(model.rank?.rp).toBe(0);
  });
});
```

Change earlier goal assertions to `model.goals!` because those inputs contain a real `todayKey`.

Update the three rank tests so nullable typing is deliberate:

```ts
const rank = arenaHubModel({ rating: 150 }).rank!;
expect(rank.rp).toBe(150);
expect(rank.progress).toBeCloseTo(0.5, 3);
expect(rank.rpToNextRank).toBe(50);

expect(arenaHubModel({ rating: 999_999 }).rank?.top).toBe(true);

for (const rating of [null, undefined, NaN, -100, 'много']) {
  expect(arenaHubModel({ rating }).rank).toBeNull();
}
```

- [ ] **Step 2: Run the hub-view test and confirm RED**

```powershell
npx jest --runTestsByPath tests/arena_hub_view.test.ts --runInBand
```

Expected: FAIL because empty input still creates Bronze/zero rank and zero goals.

- [ ] **Step 3: Preserve unknown in `ArenaHubModel`**

In `modules/arena/hub_view.ts`, use nullable rank and goals:

```ts
export type ArenaHubModel = Readonly<{
  rank: ArenaHubRankCard | null;
  goals: ArenaDailyGoals | null;
  lastMatch: ArenaHistoryRow | null;
  streak: number;
  friends: readonly ArenaHubFriend[];
  searchingNow: number | null;
}>;
```

At the start of `arenaHubModel`, replace the rating coercion with:

```ts
const rating = typeof input.rating === 'number'
  && Number.isFinite(input.rating)
  && input.rating >= 0
  ? input.rating
  : null;
const view = rating === null ? null : arenaRankView(rating);
const goalsKnown = typeof input.todayKey === 'string' && input.todayKey.length > 0;
```

Return nullable values without changing history, friends, or searching logic:

```ts
rank: view ? {
  rp: view.rp,
  tierIndex: view.tierIndex,
  tierKey: view.tierKey,
  division: view.division,
  progress: view.rpForRank > 0 ? Math.max(0, Math.min(1, view.rpInRank / view.rpForRank)) : 1,
  rpToNextRank: view.top ? 0 : Math.max(0, view.rpForRank - view.rpInRank),
  top: view.top,
} : null,
goals: goalsKnown ? arenaDailyGoals({
  storedDayKey: input.dailyDayKey,
  todayKey: input.todayKey!,
  matchesToday: input.dailyMatches,
  firstAnswersToday: input.dailyFirstAnswers,
  winsToday: input.dailyWins,
}) : null,
```

- [ ] **Step 4: Render neutral rank geometry**

First add the accessible unknown-value copy to `modules/arena/copy.ts`:

```ts
valueUnknown: ['Данные пока недоступны', 'Дані поки недоступні', 'Datos no disponibles todavía', 'Dados ainda indisponíveis', 'Dữ liệu hiện chưa có', 'Data belum tersedia', 'Veri henüz kullanılamıyor', 'Dane są chwilowo niedostępne'],
```

In `components/arena/ArenaHubLive.tsx`, add `const rank = model.rank;` and replace the rank card contents with nullable rendering:

```tsx
<Text
  accessibilityLabel={rank ? undefined : arenaText(lang, 'valueUnknown')}
  numberOfLines={1}
  adjustsFontSizeToFit
  minimumFontScale={0.75}
  style={[styles.rankName, { color: P.text }]}
>
  {rank ? `${arenaText(lang, TIER_COPY[rank.tierIndex])} · ${ROMAN[rank.division]}` : '—'}
</Text>
<Text numberOfLines={1} style={[styles.rp, { color: P.muted }]}>{rank?.rp ?? '—'}</Text>
{rank?.top ? (
  <Text style={[styles.meta, { color: P.gold }]}>{arenaText(lang, 'rankTop')}</Text>
) : (
  <>
    <RankBar progress={rank?.progress ?? 0} reduceMotion={reduceMotion} />
    <Text style={[styles.meta, { color: P.muted }]}>
      {arenaText(lang, 'rankProgress')}: {rank?.rpToNextRank ?? '—'}
    </Text>
  </>
)}
```

- [ ] **Step 5: Render neutral daily-goal geometry**

In `components/arena/ArenaDailyGoals.tsx`, import the order and targets and accept a nullable model:

```ts
import {
  ARENA_GOAL_ORDER,
  ARENA_GOAL_TARGETS,
  type ArenaDailyGoals as ArenaDailyGoalsModel,
  type ArenaGoalKey,
} from '../../modules/arena/daily_goals';
```

Change the function signature to `ArenaDailyGoalsModel | null`. Immediately after the existing `playSound` hook, insert:

```tsx
const visibleGoals = model?.goals ?? ARENA_GOAL_ORDER.map((key) => ({
    key,
    done: null,
    target: ARENA_GOAL_TARGETS[key],
    progress: 0,
    complete: false,
  }));
  const completedCount = model?.completedCount ?? null;
```

Replace the completion-sound effect with:

```tsx
useEffect(() => {
  if (!model) return;
  const done = model.completedCount;
  if (seenRef.current === null) { seenRef.current = done; return; }
  if (done > seenRef.current) playSound('goalComplete');
  seenRef.current = done;
}, [model, playSound]);

<Text
  accessibilityLabel={completedCount === null ? arenaText(lang, 'valueUnknown') : undefined}
  numberOfLines={1}
  style={[styles.counter, { color: model?.allComplete ? P.accent : P.muted }]}
>
  {completedCount ?? '—'} / {visibleGoals.length}
</Text>

{visibleGoals.map((goal, index) => (
  <Animated.View
    key={goal.key}
    entering={reduceMotion ? FadeIn.duration(120) : FadeInDown.delay(index * 60).duration(240)}
    style={styles.goal}
  >
    <View style={styles.goalHead}>
      <Ionicons
        name={goal.complete ? 'checkmark-circle' : GOAL_ICON[goal.key]}
        size={18}
        color={goal.complete ? P.accent : P.muted}
      />
      <Text style={[styles.goalName, { color: goal.complete ? P.accent : P.text }]}>
        {arenaText(lang, GOAL_COPY[goal.key])}
      </Text>
      <Text style={[styles.goalCount, { color: P.muted }]}>
        {goal.done ?? '—'}/{goal.target}
      </Text>
    </View>
    <GoalBar progress={goal.progress} complete={goal.complete} reduceMotion={reduceMotion} />
  </Animated.View>
))}

{model?.allComplete ? (
  <Text accessibilityLiveRegion="polite" style={[styles.done, { color: P.accent }]}>
    {arenaText(lang, 'goalsAllDone')}
  </Text>
) : null}
```

- [ ] **Step 6: Make Arena progress explicitly nullable**

Replace `ArenaProgress` in `components/arena/ArenaExpansionUI.tsx` with:

```tsx
export function ArenaProgress({ value, max, label }: {
  value: number | null;
  max: number;
  label: string;
}) {
  const P = useTournamentPalette();
  const knownValue = value === null ? null : Math.max(0, Math.min(max, value));
  const ratio = knownValue !== null && max > 0 ? knownValue / max : 0;
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={knownValue === null ? { text: '—' } : { min: 0, max, now: knownValue }}
      style={styles.progressWrap}
    >
      <View style={[styles.progressTrack, { backgroundColor: P.elev2 }]}>
        <View style={[styles.progressFill, { backgroundColor: P.accent, width: `${ratio * 100}%` }]} />
      </View>
      <Text style={[styles.progressText, { color: P.muted }]}>{knownValue ?? '—'} / {max}</Text>
    </View>
  );
}
```

- [ ] **Step 7: Run the model test and confirm GREEN**

```powershell
npx jest --runTestsByPath tests/arena_hub_view.test.ts --runInBand
```

Expected: PASS with unknown and real-zero cases both covered.

- [ ] **Step 8: Commit only truthful model/UI files**

```powershell
git commit --only -m "fix(arena): preserve unknown hub values" -- modules/arena/hub_view.ts tests/arena_hub_view.test.ts modules/arena/copy.ts components/arena/ArenaHubLive.tsx components/arena/ArenaDailyGoals.tsx components/arena/ArenaExpansionUI.tsx
```

Expected: exactly the six named files in the commit.

### Task 3: Compact localized connection notice

**Files:**
- Modify: `modules/arena/copy.ts`
- Create: `components/arena/ArenaConnectionNotice.tsx`
- Create: `tests/arena_connection_notice_contract.test.ts`

- [ ] **Step 1: Write the notice contract test**

Create `tests/arena_connection_notice_contract.test.ts`:

```ts
import * as fs from 'fs';
import * as path from 'path';
import { arenaText } from '../modules/arena/copy';

const source = fs.readFileSync(
  path.resolve(__dirname, '..', 'components/arena/ArenaConnectionNotice.tsx'),
  'utf8',
);

describe('Arena connection notice', () => {
  it('has localized copy in every supported language', () => {
    for (const lang of ['ru', 'uk', 'es', 'pt', 'vi', 'id', 'tr', 'pl'] as const) {
      expect(arenaText(lang, 'hubOffline')).toBeTruthy();
      expect(arenaText(lang, 'hubOfflineHint')).toBeTruthy();
      expect(arenaText(lang, 'valueUnknown')).toBeTruthy();
    }
  });

  it('is compact, announced politely, and exposes retry', () => {
    expect(source).toContain('testID="arena-hub-offline"');
    expect(source).toContain('accessibilityLiveRegion="polite"');
    expect(source).toContain("arenaText(lang, 'retry')");
    expect(source).toContain('onRetry');
  });
});
```

- [ ] **Step 2: Run the contract and confirm RED**

```powershell
npx jest --runTestsByPath tests/arena_connection_notice_contract.test.ts --runInBand
```

Expected: FAIL because the component and copy keys do not exist.

- [ ] **Step 3: Add localized copy**

Add these keys to `C` in `modules/arena/copy.ts`, preserving language order `ru, uk, es, pt, vi, id, tr, pl`:

```ts
hubOffline: ['Нет подключения', 'Немає з’єднання', 'Sin conexión', 'Sem conexão', 'Không có kết nối', 'Tidak ada koneksi', 'Bağlantı yok', 'Brak połączenia'],
hubOfflineHint: ['Свежие данные появятся, когда вернётся сеть. Для матча нужна сеть.', 'Свіжі дані з’являться, коли повернеться мережа. Для матчу потрібна мережа.', 'Los datos actuales aparecerán cuando vuelva la conexión. Necesitas conexión para jugar.', 'Os dados atuais aparecem quando a conexão voltar. É preciso conexão para jogar.', 'Dữ liệu mới sẽ xuất hiện khi có mạng lại. Cần mạng để bắt đầu trận.', 'Data terbaru muncul saat jaringan kembali. Perlu jaringan untuk bertanding.', 'Güncel veriler ağ geri gelince görünecek. Maç için ağ gerekli.', 'Aktualne dane pojawią się po powrocie sieci. Do meczu potrzebna jest sieć.'],
```

- [ ] **Step 4: Implement the compact notice**

Create `components/arena/ArenaConnectionNotice.tsx`:

```tsx
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLang } from '../LangContext';
import { useTournamentPalette } from '../tournament/tournament_theme';
import { arenaText } from '../../modules/arena/copy';

export function ArenaConnectionNotice({ onRetry }: { onRetry: () => void }) {
  const { lang } = useLang();
  const P = useTournamentPalette();
  return (
    <View
      testID="arena-hub-offline"
      accessibilityLiveRegion="polite"
      style={[styles.root, { backgroundColor: P.elev, borderColor: P.chipEdge }]}
    >
      <Ionicons name="cloud-offline-outline" size={20} color={P.muted} />
      <View style={styles.copy}>
        <Text style={[styles.title, { color: P.text }]}>{arenaText(lang, 'hubOffline')}</Text>
        <Text style={[styles.body, { color: P.muted }]}>{arenaText(lang, 'hubOfflineHint')}</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={arenaText(lang, 'retry')}
        onPress={onRetry}
        style={[styles.retry, { backgroundColor: P.accent }]}
      >
        <Text style={[styles.retryText, { color: P.okInk }]}>{arenaText(lang, 'retry')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { minHeight: 64, borderWidth: 1, borderRadius: 18, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  copy: { flex: 1, minWidth: 0, gap: 2 },
  title: { fontSize: 14, fontWeight: '900' },
  body: { fontSize: 12, lineHeight: 16 },
  retry: { minHeight: 44, paddingHorizontal: 12, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  retryText: { fontSize: 13, fontWeight: '900' },
});
```

This uses dark `P.okInk` on the bright accent surface, preserving the project contrast rule.

- [ ] **Step 5: Run the contract and confirm GREEN**

```powershell
npx jest --runTestsByPath tests/arena_connection_notice_contract.test.ts --runInBand
```

Expected: PASS, 2 tests passing.

- [ ] **Step 6: Commit only the notice files**

```powershell
git add -- components/arena/ArenaConnectionNotice.tsx tests/arena_connection_notice_contract.test.ts
git commit --only -m "feat(arena): add compact offline hub notice" -- modules/arena/copy.ts components/arena/ArenaConnectionNotice.tsx tests/arena_connection_notice_contract.test.ts
```

Expected: exactly the three named files in the commit.

### Task 4: Wire the immediate first frame into `/arena`

**Files:**
- Modify: `app/arena.tsx`
- Modify: `tests/arena_home_cache.test.ts`

- [ ] **Step 1: Strengthen the source contract before changing the screen**

In `tests/arena_home_cache.test.ts`, add:

```ts
it('никогда не подменяет первый кадр скелетоном', () => {
  expect(source).not.toContain('ArenaHubSkeleton');
  expect(source).not.toContain('SkeletonSwap');
  expect(source).not.toContain('hubLoading');
  expect(source).not.toContain('arena-hub-skeleton');
});

it('монтирует финальную геометрию даже без home и expansion', () => {
  expect(source).toContain('<ArenaHubLive model={hub} />');
  expect(source).toContain('<ArenaDailyGoals model={hub.goals} />');
  expect(source).toContain('value={today?.completedTasks ?? null}');
  expect(source).not.toContain('{home ? <ArenaHubLive');
  expect(source).not.toContain('{home ? <ArenaDailyGoals');
});

it('различает офлайн и серверный отказ', () => {
  expect(source).toContain('arenaHubFailure');
  expect(source).toContain('<ArenaConnectionNotice onRetry={load} />');
  expect(source).toContain("baseFailure?.kind === 'server'");
  expect(source).toContain("expansionFailure?.kind === 'server'");
});
```

- [ ] **Step 2: Run the cache contract and confirm RED**

```powershell
npx jest --runTestsByPath tests/arena_home_cache.test.ts --runInBand
```

Expected: FAIL because `/arena` still renders the skeleton swap.

- [ ] **Step 3: Replace nullable data with monotonic slots**

In `app/arena.tsx`, remove `ArenaHubSkeleton`, `SkeletonSwap`, `arenaErrorCode`, `baseError`, `baseErrorCode`, and `expansionError`. Add:

```ts
import { ArenaConnectionNotice } from '../components/arena/ArenaConnectionNotice';
import {
  arenaHubCached,
  arenaHubCurrent,
  arenaHubFailure,
  arenaHubNeutral,
  type ArenaHubFailure,
  type ArenaHubSlot,
} from '../modules/arena/hub_presentation';
```

Replace home/expansion state initialization with:

```ts
const warm = useMemo(() => arenaPeekHomeWarm(Date.now()), []);
const [homeSlot, setHomeSlot] = useState<ArenaHubSlot<ArenaHomeResponse>>(() =>
  warm?.home
    ? { source: 'cached', value: warm.home as ArenaHomeResponse }
    : arenaHubNeutral<ArenaHomeResponse>());
const [expansionSlot, setExpansionSlot] = useState<ArenaHubSlot<ArenaExpansionHome>>(() =>
  warm?.expansion
    ? { source: 'cached', value: warm.expansion as ArenaExpansionHome }
    : arenaHubNeutral<ArenaExpansionHome>());
const home = homeSlot.value;
const expansion = expansionSlot.value;
const [baseFailure, setBaseFailure] = useState<ArenaHubFailure | null>(null);
const [expansionFailure, setExpansionFailure] = useState<ArenaHubFailure | null>(null);
```

Replace `load` with:

```ts
const load = useCallback(() => {
  setBaseFailure(null);
  setExpansionFailure(null);
  void arenaV2Home().then((response) => {
    setHomeSlot(arenaHubCurrent(response));
    arenaRememberHomeWarm({ home: response, wallNowMs: Date.now(), store: warmStore });
  }).catch((error: unknown) => {
    const failure = arenaHubFailure(error);
    setBaseFailure(failure);
    if (__DEV__) console.warn('[arena] arenaV2Home failed:', failure.code, error);
  });
  void arenaExpansionHome().then((response) => {
    setExpansionSlot(arenaHubCurrent(response));
    arenaRememberHomeWarm({ expansion: response, wallNowMs: Date.now(), store: warmStore });
  }).catch((error: unknown) => {
    const failure = arenaHubFailure(error);
    setExpansionFailure(failure);
    if (__DEV__) console.warn('[arena] arenaExpansionHome failed:', failure.code, error);
  });
  void arenaFetchMatchHistory(10).then(setHistory).catch(() => setHistory([]));
  void arenaV2FriendsBoard().then((board) => setFriends(board.rows)).catch(() => {});
}, []);
```

Replace disk hydration with:

```ts
useEffect(() => {
  let alive = true;
  void arenaLoadHomeWarm(warmStore, Date.now()).then((stored) => {
    if (!alive || !stored) return;
    setHomeSlot((current) => arenaHubCached(
      current, stored.home as ArenaHomeResponse | null,
    ));
    setExpansionSlot((current) => arenaHubCached(
      current, stored.expansion as ArenaExpansionHome | null,
    ));
  }).catch(() => {});
  return () => { alive = false; };
}, []);
```

Delete `hubLoading`.

- [ ] **Step 4: Always render the final hub geometry**

Render rank and goals unconditionally:

```tsx
<ArenaHubLive model={hub} />
<ArenaDailyGoals model={hub.goals} />
```

Use a truthful header subtitle:

```tsx
subtitle={home?.profile.rankName
  ?? (home ? `${arenaText(lang, 'ranks')} ${(home.profile.rank ?? 0) + 1}` : '—')}
```

Replace the conditional today-card branch with an unconditional card. Keep its current header/body geometry and use these exact progress/action branches:

```tsx
<ArenaProgress
  value={today?.completedTasks ?? null}
  max={10}
  label={arenaExpansionText(lang, 'todayTitle')}
/>
{today?.state === 'complete' ? (
  <Text accessibilityLiveRegion="polite" style={[styles.complete, { color: P.accent }]}>
    {arenaExpansionText(lang, 'todayComplete')}
  </Text>
) : (
  <V2Cta
    disabled={!baseEnabled || !expansion?.availability.today || !today || today.state === 'unavailable'}
    onPress={() => router.push('/arena_today' as never)}
  >
    {todayAction}
  </V2Cta>
)}
```

Replace the `SkeletonSwap` block with `{todayContent}`.

- [ ] **Step 5: Separate offline notice from server diagnostics**

Replace the existing `baseEnabled` declaration and derive all three values together:

```ts
const offline = baseFailure?.kind === 'offline' || expansionFailure?.kind === 'offline';
const serverFailure = baseFailure?.kind === 'server' ? baseFailure : null;
const expansionServerFailure = expansionFailure?.kind === 'server' ? expansionFailure : null;
const baseEnabled = home?.availability.enabled === true && !offline && !serverFailure;
```

Render before `todayContent`:

```tsx
{offline ? <ArenaConnectionNotice onRetry={load} /> : null}
{serverFailure ? (
  <ArenaStateCard
    state="unavailable"
    title={arenaText(lang, 'arenaNotDeployed')}
    body={`${arenaText(lang, 'arenaNotDeployedHint')}\n\n${serverFailure.code}`}
  />
) : null}
{expansionServerFailure ? <ArenaStateNotice state="error" onRetry={load} /> : null}
{todayContent}
```

Preserve the report-blocked and maintenance cards. The expansion error card remains available for a server/configuration failure, but transport failure uses only the compact offline notice so one failure cannot create two error surfaces.

- [ ] **Step 6: Run the focused hub tests and confirm GREEN**

```powershell
npx jest --runTestsByPath tests/arena_home_cache.test.ts tests/arena_hub_presentation.test.ts tests/arena_hub_view.test.ts tests/arena_connection_notice_contract.test.ts --runInBand
```

Expected: PASS, 4 suites green.

- [ ] **Step 7: Commit only hub wiring and its contract**

```powershell
git commit --only -m "fix(arena): render hub instantly without skeletons" -- app/arena.tsx tests/arena_home_cache.test.ts
```

Expected: exactly the two named files in the commit.

### Task 5: Focused verification and handoff

**Files:**
- Verify only; no source edits expected.

- [ ] **Step 1: Run the complete focused Arena gate**

```powershell
npx jest --runTestsByPath tests/arena_home_cache.test.ts tests/arena_hub_presentation.test.ts tests/arena_hub_view.test.ts tests/arena_connection_notice_contract.test.ts tests/arena_warm_cache.test.ts tests/arena_chrome_layout.test.ts --runInBand
```

Expected: PASS, 6 suites passing with 0 failed tests.

- [ ] **Step 2: Run file-scoped lint**

```powershell
npx eslint app/arena.tsx modules/arena/hub_presentation.ts modules/arena/hub_view.ts modules/arena/copy.ts components/arena/ArenaHubLive.tsx components/arena/ArenaDailyGoals.tsx components/arena/ArenaExpansionUI.tsx components/arena/ArenaConnectionNotice.tsx tests/arena_hub_presentation.test.ts tests/arena_hub_view.test.ts tests/arena_home_cache.test.ts tests/arena_connection_notice_contract.test.ts
```

Expected: exit code 0 with no errors.

- [ ] **Step 3: Run the visible-loading audit**

```powershell
npm run audit:no-visible-loading
```

Expected: exit code 0 and no Arena hub violation.

- [ ] **Step 4: Inspect only implementation paths**

```powershell
git status --short -- app/arena.tsx modules/arena/hub_presentation.ts modules/arena/hub_view.ts modules/arena/copy.ts components/arena/ArenaHubLive.tsx components/arena/ArenaDailyGoals.tsx components/arena/ArenaExpansionUI.tsx components/arena/ArenaConnectionNotice.tsx tests/arena_hub_presentation.test.ts tests/arena_hub_view.test.ts tests/arena_home_cache.test.ts tests/arena_connection_notice_contract.test.ts
git diff --check -- app/arena.tsx modules/arena/hub_presentation.ts modules/arena/hub_view.ts modules/arena/copy.ts components/arena/ArenaHubLive.tsx components/arena/ArenaDailyGoals.tsx components/arena/ArenaExpansionUI.tsx components/arena/ArenaConnectionNotice.tsx tests/arena_hub_presentation.test.ts tests/arena_hub_view.test.ts tests/arena_home_cache.test.ts tests/arena_connection_notice_contract.test.ts
```

Expected: named paths are clean after their commits and `git diff --check` reports no whitespace errors. Unrelated dirty/staged files may remain and must not be reset, staged, or committed.

- [ ] **Step 5: Report the device boundary honestly**

If no real device was available, include this exact handoff note rather than claiming the visual symptom passed:

```text
Manual device check pending: force-stop the app, disable network, launch, open Arena, and confirm the complete neutral hub appears on the first visible frame with no skeleton flash.
```

No broad Jest suite, whole-project typecheck, Firebase deployment, branch, worktree, or unrelated cleanup belongs to this plan.
