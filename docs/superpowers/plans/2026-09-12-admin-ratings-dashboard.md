# Admin Ratings Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make «Оценки» the first admin section, add one-click source/comment/period filters, and show exact full-selection star statistics above the feedback feed.

**Architecture:** Keep the existing `max-feedback` route and two feedback collections. Add a small pure server module for validated filters, filtered pagination, and aggregation; reuse it from both existing list callables and a new aggregate-only callable. Update only the live admin surface, with request-generation guards so stale asynchronous responses cannot overwrite a newer filter choice.

**Tech Stack:** TypeScript, Firebase Functions v2 callable APIs, Firestore Admin SDK, single-file HTML/CSS/JavaScript admin, Jest/ts-jest.

---

## File map

- Create `functions/src/feedback_admin_logic.ts`: pure filter parsing, matching, pagination orchestration, and aggregate calculation.
- Create `functions/src/feedback_admin_logic.test.ts`: deterministic tests for validation, comments, rating, cursor behavior, and totals.
- Create `functions/src/feedback_admin_stats.ts`: authenticated read-only callable returning aggregate data only.
- Create `functions/src/feedback_admin_stats.test.ts`: privacy/security/export contract tests for the callable source.
- Modify `functions/src/feedback_entries.ts`: apply server-side rating/comment filters to the general feedback feed.
- Modify `functions/src/max_voice_feedback.ts`: apply the same filters to MAX feedback.
- Modify `functions/src/index.ts`: export `adminGetFeedbackStats`.
- Modify `functions/src/admin_sensitive_writes.test.ts`: assert the new admin callable keeps `ENFORCE_APP_CHECK_ADMIN` and does not alter the owner-controlled App Check boundary.
- Modify `admin/v2/legacy.html`: labels, forced top navigation placement, toolbar, statistics, filter state, rendering, and stale-request guards.
- Create `tests/admin_ratings_dashboard_contract.test.ts`: focused live-surface/UI contract.

No worktree or branch is created: project rules prohibit either without an explicit owner request. No Firestore document schema, rules, or Jarvis reader changes are required because the feature reads existing fields and returns ephemeral aggregates.

### Task 1: Pure feedback filter and aggregation logic

**Files:**
- Create: `functions/src/feedback_admin_logic.ts`
- Create: `functions/src/feedback_admin_logic.test.ts`

- [ ] **Step 1: Write the failing validation and aggregation tests**

```ts
import {
  aggregateAdminFeedback,
  collectFilteredFeedbackPage,
  parseAdminFeedbackFilters,
} from './feedback_admin_logic';

describe('parseAdminFeedbackFilters', () => {
  it('accepts supported comment and rating filters', () => {
    expect(parseAdminFeedbackFilters({ commentMode: 'with', rating: 5 }))
      .toEqual({ commentMode: 'with', rating: 5 });
    expect(parseAdminFeedbackFilters({ commentMode: 'all' }))
      .toEqual({ commentMode: 'all', rating: null });
  });

  it.each([
    { commentMode: 'sometimes' },
    { rating: 7 },
    { rating: '5' },
  ])('rejects malformed filters: %p', (input) => {
    expect(() => parseAdminFeedbackFilters(input)).toThrow('feedback_filter_invalid');
  });
});

describe('collectFilteredFeedbackPage', () => {
  it('scans past nonmatching rows and uses the last returned row as cursor', async () => {
    const source = [
      { id: 'a', rating: 5, message: '' },
      { id: 'b', rating: 4, message: 'useful' },
      { id: 'c', rating: 3, message: '' },
      { id: 'd', rating: 2, message: 'clear' },
      { id: 'e', rating: 1, message: 'extra' },
    ];
    const loadBatch = jest.fn(async (cursor: string | null) => {
      const start = cursor ? source.findIndex((row) => row.id === cursor) + 1 : 0;
      const rows = source.slice(start, start + 2);
      return { rows, exhausted: start + rows.length >= source.length };
    });

    const page = await collectFilteredFeedbackPage(loadBatch, { commentMode: 'with', rating: null }, 2, null);
    expect(page.items.map((row) => row.id)).toEqual(['b', 'd']);
    expect(page.nextCursor).toBe('d');
  });
});

describe('aggregateAdminFeedback', () => {
  it('returns exact distribution without returning source text', () => {
    const result = aggregateAdminFeedback([
      { rating: 5, message: 'private one' },
      { rating: 5, message: '' },
      { rating: 3, message: 'private two' },
      { rating: 0, message: 'text only' },
    ], 'all');
    expect(result).toEqual({
      total: 4,
      ratedTotal: 3,
      withComments: 3,
      unrated: 1,
      average: 4.33,
      distribution: { 1: 0, 2: 0, 3: 1, 4: 0, 5: 2 },
    });
    expect(JSON.stringify(result)).not.toMatch(/private/);
  });
});
```

- [ ] **Step 2: Acquire the shared heavy-test slot and confirm RED**

Run:

```powershell
& 'C:\Program Files\Git\bin\bash.exe' -lc 'cd /c/appsprojects/phraseman && .claude/semaphore/slot.sh acquire "jest feedback admin logic RED"'
npm --prefix functions test -- --runTestsByPath src/feedback_admin_logic.test.ts --runInBand
& 'C:\Program Files\Git\bin\bash.exe' -lc 'cd /c/appsprojects/phraseman && .claude/semaphore/slot.sh release'
```

Expected: Jest fails because `feedback_admin_logic.ts` does not exist. Always run the release command even when Jest fails.

- [ ] **Step 3: Implement the pure contract**

```ts
export type FeedbackCommentMode = 'all' | 'with' | 'without';
export type AdminFeedbackFilters = { commentMode: FeedbackCommentMode; rating: number | null };
export type AdminFeedbackRow = { id?: string; rating: number; message: string };

export function parseAdminFeedbackFilters(input: Record<string, unknown>): AdminFeedbackFilters {
  const commentMode = input.commentMode ?? 'all';
  const rating = input.rating ?? null;
  if (!['all', 'with', 'without'].includes(String(commentMode))) throw new Error('feedback_filter_invalid');
  if (rating !== null && (!Number.isInteger(rating) || Number(rating) < 0 || Number(rating) > 5)) {
    throw new Error('feedback_filter_invalid');
  }
  return { commentMode: commentMode as FeedbackCommentMode, rating: rating === null ? null : Number(rating) };
}

export function matchesAdminFeedback(row: AdminFeedbackRow, filters: AdminFeedbackFilters): boolean {
  const hasComment = String(row.message || '').trim().length > 0;
  if (filters.commentMode === 'with' && !hasComment) return false;
  if (filters.commentMode === 'without' && hasComment) return false;
  return filters.rating === null || row.rating === filters.rating;
}

export async function collectFilteredFeedbackPage<T extends AdminFeedbackRow & { id: string }>(
  loadBatch: (cursor: string | null) => Promise<{ rows: T[]; exhausted: boolean }>,
  filters: AdminFeedbackFilters,
  limit: number,
  startCursor: string | null,
): Promise<{ items: T[]; nextCursor: string | null }> {
  const matches: T[] = [];
  let scanCursor = startCursor;
  let exhausted = false;
  while (matches.length < limit + 1 && !exhausted) {
    const page = await loadBatch(scanCursor);
    if (!page.rows.length) break;
    for (const row of page.rows) {
      scanCursor = row.id;
      if (matchesAdminFeedback(row, filters)) matches.push(row);
      if (matches.length >= limit + 1) break;
    }
    exhausted = page.exhausted;
  }
  const items = matches.slice(0, limit);
  return { items, nextCursor: matches.length > limit ? items[items.length - 1]?.id ?? null : null };
}

export function aggregateAdminFeedback(rows: AdminFeedbackRow[], commentMode: FeedbackCommentMode) {
  const filtered = rows.filter((row) => matchesAdminFeedback(row, { commentMode, rating: null }));
  const distribution: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let sum = 0;
  let ratedTotal = 0;
  let withComments = 0;
  for (const row of filtered) {
    if (String(row.message || '').trim()) withComments += 1;
    if (row.rating >= 1 && row.rating <= 5) {
      distribution[row.rating as 1 | 2 | 3 | 4 | 5] += 1;
      ratedTotal += 1;
      sum += row.rating;
    }
  }
  return {
    total: filtered.length,
    ratedTotal,
    withComments,
    unrated: filtered.length - ratedTotal,
    average: ratedTotal ? Number((sum / ratedTotal).toFixed(2)) : null,
    distribution,
  };
}
```

- [ ] **Step 4: Run the focused test and confirm GREEN**

Run the same slot-wrapped Jest command from Step 2. Expected: one suite passes with no failed tests.

- [ ] **Step 5: Commit only the two logic files**

```powershell
git add -- functions/src/feedback_admin_logic.ts functions/src/feedback_admin_logic.test.ts
git commit -m "feat(admin): add feedback filter logic"
```

If an unrelated repository guard blocks the commit, do not bypass or weaken it; preserve the files, unstage only these paths, and report the blocked checkpoint.

### Task 2: Server-side filtered pagination in both feeds

**Files:**
- Modify: `functions/src/feedback_entries.ts:224-280`
- Modify: `functions/src/max_voice_feedback.ts:146-204`
- Test: `functions/src/feedback_admin_logic.test.ts`

- [ ] **Step 1: Extend the pagination test with next-page coverage**

```ts
it('continues after the prior returned cursor without duplicates', async () => {
  const source = [
    { id: 'a', rating: 5, message: 'one' },
    { id: 'b', rating: 4, message: '' },
    { id: 'c', rating: 3, message: 'two' },
    { id: 'd', rating: 2, message: 'three' },
  ];
  const loadBatch = async (cursor: string | null) => {
    const start = cursor ? source.findIndex((row) => row.id === cursor) + 1 : 0;
    const rows = source.slice(start, start + 2);
    return { rows, exhausted: start + rows.length >= source.length };
  };
  const filters = { commentMode: 'with' as const, rating: null };
  const first = await collectFilteredFeedbackPage(loadBatch, filters, 2, null);
  const second = await collectFilteredFeedbackPage(loadBatch, filters, 2, first.nextCursor);
  expect(first.items.map((row) => row.id)).toEqual(['a', 'c']);
  expect(second.items.map((row) => row.id)).toEqual(['d']);
});
```

- [ ] **Step 2: Run RED with the slot wrapper**

Expected: the test exposes any cursor/exhaustion error in the first implementation.

- [ ] **Step 3: Wire the shared filters into each callable**

In `feedback_entries.ts`, build the existing normalized response inside the loader:

```ts
const FEEDBACK_ADMIN_SCAN_BATCH = 100;
let filters;
try {
  filters = parseAdminFeedbackFilters(asRecord(request.data));
} catch {
  throw new HttpsError('invalid-argument', 'feedback_filter_invalid');
}
let baseQuery: FirebaseFirestore.Query = db.collection(FEEDBACK_ENTRIES_COLLECTION);
if (kindFilter) baseQuery = baseQuery.where('kind', '==', kindFilter);
baseQuery = baseQuery.orderBy('createdAtMs', 'desc');
const page = await collectFilteredFeedbackPage(async (scanCursor) => {
  let pageQuery = baseQuery.limit(FEEDBACK_ADMIN_SCAN_BATCH);
  if (scanCursor) {
    const cursorSnap = await db.collection(FEEDBACK_ENTRIES_COLLECTION).doc(scanCursor).get();
    if (cursorSnap.exists) pageQuery = pageQuery.startAfter(cursorSnap);
  }
  const snap = await pageQuery.get();
  return {
    rows: snap.docs.map((doc) => {
      const d = doc.data() || {};
      return {
        id: doc.id, uid: String(d.uid ?? ''), kind: String(d.kind ?? ''),
        entityId: String(d.entityId ?? ''), entityLabel: d.entityLabel ? String(d.entityLabel) : null,
        message: String(d.message ?? ''), rating: sanitizeFeedbackRating(d.rating),
        status: String(d.status ?? 'new'), userName: d.userName ? String(d.userName) : null,
        lang: d.lang ? String(d.lang) : null, platform: String(d.platform ?? 'unknown'),
        appVersion: String(d.appVersion ?? 'unknown'), createdAtMs: Number(d.createdAtMs) || 0,
      };
    }),
    exhausted: snap.docs.length < FEEDBACK_ADMIN_SCAN_BATCH,
  };
}, filters, limit, cursor || null);
return { ok: true, items: page.items, nextCursor: page.nextCursor };
```

In `max_voice_feedback.ts`, use the same structure with its existing MAX shape:

```ts
const FEEDBACK_ADMIN_SCAN_BATCH = 100;
let filters;
try {
  filters = parseAdminFeedbackFilters(asRecord(request.data));
} catch {
  throw new HttpsError('invalid-argument', 'feedback_filter_invalid');
}
const baseQuery = db.collection(VOICE_FEEDBACK_COLLECTION).orderBy('createdAtMs', 'desc');
const page = await collectFilteredFeedbackPage(async (scanCursor) => {
  let pageQuery = baseQuery.limit(FEEDBACK_ADMIN_SCAN_BATCH);
  if (scanCursor) {
    const cursorSnap = await db.collection(VOICE_FEEDBACK_COLLECTION).doc(scanCursor).get();
    if (cursorSnap.exists) pageQuery = pageQuery.startAfter(cursorSnap);
  }
  const snap = await pageQuery.get();
  return {
    rows: snap.docs.map((doc) => {
      const d = doc.data() || {};
      return {
        id: doc.id, uid: String(d.uid ?? ''), sessionId: String(d.sessionId ?? ''),
        message: String(d.message ?? ''), rating: sanitizeVoiceFeedbackRating(d.rating),
        status: String(d.status ?? 'new'), userName: d.userName ? String(d.userName) : null,
        lang: d.lang ? String(d.lang) : null, cefr: d.cefr ? String(d.cefr) : null,
        format: d.format ? String(d.format) : null, callSeconds: Number(d.callSeconds) || 0,
        platform: String(d.platform ?? 'unknown'), appVersion: String(d.appVersion ?? 'unknown'),
        createdAtMs: Number(d.createdAtMs) || 0,
      };
    }),
    exhausted: snap.docs.length < FEEDBACK_ADMIN_SCAN_BATCH,
  };
}, filters, limit, cursor || null);
return { ok: true, items: page.items, nextCursor: page.nextCursor };
```

Use the existing collection-specific normalizers and keep their response shapes unchanged. Catch `feedback_filter_invalid` and convert it to `new HttpsError('invalid-argument', 'feedback_filter_invalid')`. Keep `ENFORCE_APP_CHECK_ADMIN`, `admin === true`, role validation, and `reports.read` exactly in place.

- [ ] **Step 4: Run the focused functions test and confirm GREEN**

Expected: validation and both pagination tests pass.

- [ ] **Step 5: Commit only the list integration**

```powershell
git add -- functions/src/feedback_admin_logic.test.ts functions/src/feedback_entries.ts functions/src/max_voice_feedback.ts
git commit -m "feat(admin): filter feedback feeds on server"
```

Do not bypass a failing project guard.

### Task 3: Exact aggregate-only callable

**Files:**
- Create: `functions/src/feedback_admin_stats.ts`
- Create: `functions/src/feedback_admin_stats.test.ts`
- Modify: `functions/src/index.ts:274-284,464-471`
- Modify: `functions/src/admin_sensitive_writes.test.ts:60-72`

- [ ] **Step 1: Write failing privacy and contract tests**

```ts
import { aggregateAdminFeedback } from './feedback_admin_logic';

describe('adminGetFeedbackStats contract', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const source = fs.readFileSync(path.join(__dirname, 'feedback_admin_stats.ts'), 'utf8');

  it('requires admin reports.read and uses the owner-controlled App Check option', () => {
    expect(source).toContain('enforceAppCheck: ENFORCE_APP_CHECK_ADMIN');
    expect(source).toContain("hasPermission(role, 'reports.read')");
    expect(source).toContain("new HttpsError('permission-denied', 'Admin only')");
  });

  it('returns aggregates without serializing messages', () => {
    const result = aggregateAdminFeedback([{ rating: 5, message: 'secret' }], 'all');
    expect(result.ratedTotal).toBe(1);
    expect(result).not.toHaveProperty('items');
    expect(JSON.stringify(result)).not.toContain('secret');
  });

  it('is exported from the functions entry point', () => {
    const index = fs.readFileSync(path.join(__dirname, 'index.ts'), 'utf8');
    expect(index).toContain('adminGetFeedbackStats');
    expect(index).toContain('exports.adminGetFeedbackStats = adminGetFeedbackStats');
  });
});
```

- [ ] **Step 2: Run both feedback suites under one acquired slot and confirm RED**

```powershell
& 'C:\Program Files\Git\bin\bash.exe' -lc 'cd /c/appsprojects/phraseman && .claude/semaphore/slot.sh acquire "jest feedback admin stats RED"'
npm --prefix functions test -- --runTestsByPath src/feedback_admin_logic.test.ts src/feedback_admin_stats.test.ts --runInBand
& 'C:\Program Files\Git\bin\bash.exe' -lc 'cd /c/appsprojects/phraseman && .claude/semaphore/slot.sh release'
```

Expected: failure because the callable file/export does not exist.

- [ ] **Step 3: Implement `adminGetFeedbackStats`**

The callable must:

```ts
export const adminGetFeedbackStats = onCall(
  {
    region: 'us-central1',
    enforceAppCheck: ENFORCE_APP_CHECK_ADMIN,
    timeoutSeconds: 30,
    memory: '256MiB',
    maxInstances: 10,
  },
  async (request) => {
    const role = request.auth?.token?.adminRole;
    if (request.auth?.token?.admin !== true || !hasAdminRole(role) || !hasPermission(role, 'reports.read')) {
      throw new HttpsError('permission-denied', 'Admin only');
    }
    const data = asRecord(request.data);
    const kind = parseFeedbackStatsKind(data.kind);
    const periodDays = parseFeedbackStatsPeriod(data.periodDays);
    const { commentMode } = parseAdminFeedbackFilters({ commentMode: data.commentMode });
    const sinceMs = periodDays > 0 ? Date.now() - periodDays * 86_400_000 : 0;
    const rows = await loadAllFeedbackAggregateRows(admin.firestore(), kind, sinceMs);
    return { ok: true, kind, periodDays, commentMode, ...aggregateAdminFeedback(rows, commentMode) };
  },
);
```

Implement the parsers and loader in the same module so there are no undefined helper names:

```ts
const FEEDBACK_STATS_KINDS = ['max_call', ...FEEDBACK_KINDS] as const;
type FeedbackStatsKind = (typeof FEEDBACK_STATS_KINDS)[number];
const FEEDBACK_STATS_PERIODS = new Set([0, 7, 30, 90]);
const FEEDBACK_STATS_BATCH = 500;

function parseFeedbackStatsKind(value: unknown): FeedbackStatsKind {
  if (typeof value !== 'string' || !(FEEDBACK_STATS_KINDS as readonly string[]).includes(value)) {
    throw new HttpsError('invalid-argument', 'feedback_kind_invalid');
  }
  return value as FeedbackStatsKind;
}

function parseFeedbackStatsPeriod(value: unknown): number {
  const period = Number(value);
  if (!Number.isInteger(period) || !FEEDBACK_STATS_PERIODS.has(period)) {
    throw new HttpsError('invalid-argument', 'feedback_period_invalid');
  }
  return period;
}

async function loadAllFeedbackAggregateRows(
  db: FirebaseFirestore.Firestore,
  kind: FeedbackStatsKind,
  sinceMs: number,
) {
  const collectionName = kind === 'max_call' ? VOICE_FEEDBACK_COLLECTION : FEEDBACK_ENTRIES_COLLECTION;
  let baseQuery: FirebaseFirestore.Query = db.collection(collectionName);
  if (kind !== 'max_call') baseQuery = baseQuery.where('kind', '==', kind);
  if (sinceMs > 0) baseQuery = baseQuery.where('createdAtMs', '>=', sinceMs);
  baseQuery = baseQuery.orderBy('createdAtMs', 'desc').select('rating', 'message', 'createdAtMs');
  const rows: Array<{ rating: number; message: string }> = [];
  let cursor: FirebaseFirestore.QueryDocumentSnapshot | null = null;
  for (;;) {
    let pageQuery = baseQuery.limit(FEEDBACK_STATS_BATCH);
    if (cursor) pageQuery = pageQuery.startAfter(cursor);
    const snap = await pageQuery.get();
    snap.docs.forEach((doc) => {
      const data = doc.data() || {};
      const rating = kind === 'max_call'
        ? sanitizeVoiceFeedbackRating(data.rating)
        : sanitizeFeedbackRating(data.rating);
      rows.push({ rating, message: String(data.message ?? '') });
    });
    if (snap.docs.length < FEEDBACK_STATS_BATCH) break;
    cursor = snap.docs[snap.docs.length - 1] || null;
  }
  return rows;
}
```

This loader reads only `rating`, `message`, and `createdAtMs`, continues until exhaustion, and never returns source rows outside the module.

Add the require/export pair in `functions/src/index.ts` and add a source assertion for `feedback_admin_stats.ts` to `admin_sensitive_writes.test.ts`.

- [ ] **Step 4: Run GREEN**

Run the same slot-wrapped command from Step 2. Expected: both suites pass.

- [ ] **Step 5: Commit the aggregate callable**

```powershell
git add -- functions/src/feedback_admin_stats.ts functions/src/feedback_admin_stats.test.ts functions/src/index.ts functions/src/admin_sensitive_writes.test.ts
git commit -m "feat(admin): add exact feedback statistics"
```

Do not deploy functions in this task.

### Task 4: Live admin «Оценки» UI

**Files:**
- Modify: `admin/v2/legacy.html:11950-12005,14744-14788,19018-19020,24694-24916,25055-25124,32254-32427,49866-49889,51635-51640`
- Create: `tests/admin_ratings_dashboard_contract.test.ts`

- [ ] **Step 1: Write the failing live-surface contract**

```ts
import fs from 'node:fs';
import path from 'node:path';

const html = fs.readFileSync(path.join(process.cwd(), 'admin/v2/legacy.html'), 'utf8');

describe('admin ratings dashboard', () => {
  it('uses the user-facing name Оценки and keeps the legacy route', () => {
    expect(html).toContain("switchTab('max-feedback')");
    expect(html).toContain("'max-feedback': 'Оценки'");
    expect(html).not.toContain("'max-feedback': 'Отзывы MAX'");
  });

  it('offers six one-click sources and three comment modes', () => {
    for (const kind of ['max_call', 'lesson', 'vocab', 'dialogue', 'arena_blitz', 'arena_rating']) {
      expect(html).toContain(`data-feedback-kind="${kind}"`);
    }
    for (const mode of ['all', 'with', 'without']) {
      expect(html).toContain(`data-feedback-comments="${mode}"`);
    }
  });

  it('renders exact aggregate fields and uses the stats callable', () => {
    for (const id of ['feedback-stat-average', 'feedback-stat-total', 'feedback-stat-comments', 'feedback-rating-breakdown']) {
      expect(html).toContain(`id="${id}"`);
    }
    expect(html).toContain("httpsCallable(functionsUs, 'adminGetFeedbackStats')");
  });

  it('forces ratings to the visible first navigation position', () => {
    expect(html).toContain("const ADMIN_REQUIRED_FIRST_TAB = 'max-feedback'");
    expect(html).toContain("hiddenSet.delete(ADMIN_REQUIRED_FIRST_TAB)");
    expect(html).toContain("requiredFirst ? [requiredFirst, ...withoutRequiredFirst]");
  });
});
```

- [ ] **Step 2: Run the focused admin contract under a slot and confirm RED**

```powershell
& 'C:\Program Files\Git\bin\bash.exe' -lc 'cd /c/appsprojects/phraseman && .claude/semaphore/slot.sh acquire "jest admin ratings RED"'
npx jest --runTestsByPath tests/admin_ratings_dashboard_contract.test.ts --no-cache --runInBand
& 'C:\Program Files\Git\bin\bash.exe' -lc 'cd /c/appsprojects/phraseman && .claude/semaphore/slot.sh release'
```

Expected: failures for the old label and missing dashboard controls.

- [ ] **Step 3: Rename and force the navigation item first**

Update the static tab text, `ADMIN_CLEAN_TAB_LABELS`, `PM_V5_SECTION_FALLBACK_LABELS`, `SECTION_META`, and any user-facing map to «Оценки». Put `max-feedback` first in `ADMIN_TAB_KEYS`.

Add:

```js
const ADMIN_REQUIRED_FIRST_TAB = 'max-feedback';
```

Inside `applyAdminNavLayout`, remove this key from `hiddenSet`, then construct the final DOM order with it first even when `layout.order` or `layout.pinned` exists:

```js
hiddenSet.delete(ADMIN_REQUIRED_FIRST_TAB);
const requiredFirst = byKey.get(ADMIN_REQUIRED_FIRST_TAB);
const withoutRequiredFirst = pinnedFirst.filter((el) => el !== requiredFirst);
const finalOrder = requiredFirst ? [requiredFirst, ...withoutRequiredFirst] : withoutRequiredFirst;
```

Use `finalOrder` for both the key comparison and fragment append.

- [ ] **Step 4: Replace the toolbar and add statistics markup/CSS**

Use semantic buttons with `data-feedback-kind`, `data-feedback-comments`, and `data-feedback-period`. Add `aria-pressed`, visible focus rings, 44 px narrow-screen targets, wrapping layouts, and reduced-motion handling. The active lime surface must use dark text.

Required markup skeleton:

```html
<div class="feedback-kind-switch" role="group" aria-label="Раздел оценок">…six buttons…</div>
<div class="feedback-filter-switches">
  <div role="group" aria-label="Комментарии">…all/with/without buttons…</div>
  <div role="group" aria-label="Период">…7/30/90/0 buttons…</div>
</div>
<section class="feedback-stats" aria-labelledby="feedback-stats-title">
  <h3 id="feedback-stats-title">Статистика оценок</h3>
  <div id="feedback-stat-average">—</div>
  <div id="feedback-stat-total">—</div>
  <div id="feedback-stat-comments">—</div>
  <div id="feedback-rating-breakdown"></div>
  <div id="feedback-stats-status" role="status" aria-live="polite"></div>
</section>
```

Keep the existing AI summary block and its explicit button below the deterministic statistics.

- [ ] **Step 5: Implement filter state, server requests, and stale-response protection**

Use a single state object:

```js
const feedbackViewState = {
  kind: 'max_call',
  periodDays: 7,
  commentMode: 'all',
  rating: null,
  generation: 0,
  statsCache: new Map(),
};
```

`setFeedbackKind`, `setFeedbackPeriod`, and `setFeedbackCommentMode` update state, sync every `aria-pressed`, increment `generation`, clear pagination, then request the list and statistics in parallel. `setFeedbackRating` changes the server-side feed filter while leaving the full distribution visible. Each async renderer captures its generation and discards a response when it no longer equals `feedbackViewState.generation`.

Update `loadFeedbackSummary` to read `feedbackViewState.kind` and `feedbackViewState.periodDays`; keep the current conversion of all-time (`0`) to the bounded server value `3650`. This preserves AI-summary behavior after removing the old selects.

Pass exact filters from `fetchFeedbackPage`:

```js
const payload = {
  limit: FEEDBACK_PAGE,
  cursor: cursor || undefined,
  kind: kind === FEEDBACK_MAX_CALL_KIND ? undefined : kind,
  rating: feedbackViewState.rating === null ? undefined : feedbackViewState.rating,
  commentMode: feedbackViewState.commentMode,
};
```

Load statistics with:

```js
const call = httpsCallable(functionsUs, 'adminGetFeedbackStats');
const res = await call({
  kind: feedbackViewState.kind,
  periodDays: feedbackViewState.periodDays,
  commentMode: feedbackViewState.commentMode,
});
```

Render every star row as a button containing `N★`, the exact count, the percentage of `ratedTotal`, a visible bar, and `aria-pressed` for the active rating filter. Display «Нет оценок по выбранным фильтрам» plus a `resetFeedbackFilters()` button when the aggregate total is zero. Keep stats and list errors isolated.

- [ ] **Step 6: Run the admin contract and confirm GREEN**

Run the slot-wrapped command from Step 2. Expected: one suite passes.

- [ ] **Step 7: Commit the live UI and its contract**

```powershell
git add -- admin/v2/legacy.html tests/admin_ratings_dashboard_contract.test.ts
git commit -m "feat(admin): add ratings dashboard"
```

Do not edit any other admin HTML file and do not deploy Hosting.

### Task 5: Focused verification and responsive evidence

**Files:**
- Verify: `admin/v2/legacy.html`
- Verify: `functions/src/feedback_admin_logic.ts`
- Verify: `functions/src/feedback_admin_stats.ts`
- Verify: focused tests above

- [ ] **Step 1: Run the functions gate under one slot**

```powershell
& 'C:\Program Files\Git\bin\bash.exe' -lc 'cd /c/appsprojects/phraseman && .claude/semaphore/slot.sh acquire "jest ratings functions final"'
npm --prefix functions test -- --runTestsByPath src/feedback_admin_logic.test.ts src/feedback_admin_stats.test.ts src/admin_sensitive_writes.test.ts --runInBand
& 'C:\Program Files\Git\bin\bash.exe' -lc 'cd /c/appsprojects/phraseman && .claude/semaphore/slot.sh release'
```

Expected: all selected suites pass, zero failures.

- [ ] **Step 2: Run the live-admin gates under one slot**

```powershell
& 'C:\Program Files\Git\bin\bash.exe' -lc 'cd /c/appsprojects/phraseman && .claude/semaphore/slot.sh acquire "jest ratings admin final"'
npx jest --runTestsByPath tests/admin_ratings_dashboard_contract.test.ts tests/admin_inline_script_syntax.test.ts tests/admin_single_surface_contract.test.ts --no-cache --runInBand
& 'C:\Program Files\Git\bin\bash.exe' -lc 'cd /c/appsprojects/phraseman && .claude/semaphore/slot.sh release'
```

Expected: all selected suites pass, zero failures.

- [ ] **Step 3: Run whitespace and source-boundary checks**

```powershell
git diff --check -- admin/v2/legacy.html functions/src/feedback_admin_logic.ts functions/src/feedback_admin_stats.ts functions/src/feedback_entries.ts functions/src/max_voice_feedback.ts functions/src/index.ts tests/admin_ratings_dashboard_contract.test.ts
git diff --name-only -- admin/v2/legacy.html admin/legacy.html admin/index.html admin/full.html admin/site.html
```

Expected: `git diff --check` prints nothing; the name-only command lists only `admin/v2/legacy.html`.

- [ ] **Step 4: Inspect responsive layouts at four widths**

Serve the admin locally in visual-test mode and inspect 375, 768, 1024, and 1440 px. At every width confirm: «Оценки» is the first visible nav item; source and filter buttons wrap; no whole-page horizontal scroll appears; active lime buttons use dark text; focus rings are visible; the statistics block does not cover the feed.

- [ ] **Step 5: Final requirements audit**

Re-read `docs/superpowers/specs/2026-09-12-admin-ratings-dashboard-design.md` and map every requirement to a passing test or visual observation. Report any unmet item as incomplete rather than weakening a gate.

- [ ] **Step 6: Stop the brainstorming companion server**

```powershell
& 'C:\Program Files\Git\bin\bash.exe' -lc 'export PATH=/usr/bin:/bin:$PATH; /c/Users/badlo/.agents/skills/brainstorming/scripts/stop-server.sh /c/appsprojects/phraseman/.superpowers/brainstorm/1614-1789215894'
```

Expected: the local mockup server exits. The `.superpowers/` mockup remains uncommitted and is not part of the product change.

## Deployment boundary

Implementation and verification stop before deployment. Enabling the new exact statistics in production requires a later owner-approved release of `adminListMaxVoiceFeedback`, `adminListFeedbackEntries`, `adminGetFeedbackStats`, the Functions export, and Hosting target `admin`. App Check configuration is not changed.
