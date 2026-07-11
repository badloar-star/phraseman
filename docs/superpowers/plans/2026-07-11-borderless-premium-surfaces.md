# Borderless Premium Surfaces Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace decorative outlined production containers with premium, static tonal surfaces while preserving semantic borders, behavior, accessibility, theme contrast, and runtime performance.

**Architecture:** Use the existing `GlassSurface`/`glassFill` system as the single surface primitive. Build a read-only raw scan, reconcile it into a stable reviewed ledger, then migrate production UI in bounded waves and enforce the resulting policy with a source-level guard test. The data flow is always `scan → reconcile → reviewed ledger → strict guard`: rescans update only `scanState` (`present | missing | ambiguous`) and may never overwrite the human `status` (`pending | migrated | kept`), classification, or migration history. Each wave changes only visual surface styling and is independently testable and revertible.

**Tech Stack:** React Native, Expo Router, TypeScript, Jest source-contract tests, Node.js read-only audit scripts.

---

## Preconditions and working rules

- Execute in an isolated `codex/` worktree or a clean branch created from the intended integration base. The current workspace may contain unrelated user changes; never include them in commits.
- Read `docs/superpowers/specs/2026-07-11-borderless-premium-surfaces-design.md` before every implementation wave.
- Do not modify `admin/index.html`, admin UI, `_admin_*`, `*dev*`, `*lab*`, or tester routes in this plan.
- Do not remove functionality, navigation, handlers, test IDs, accessibility props, loading/error/empty states, or touch geometry.
- Do not remove `KEEP_STATE`, `KEEP_STRUCTURE`, or `KEEP_ART` borders.
- Do not run broad Jest/typecheck gates automatically. Use the narrow commands listed per task.
- Tests remain read-only. Audit output may be written only to `docs/reports/` or `.codex-tmp/`.

## File map

**Create**

- `scripts/audit_borderless_surfaces.mjs` — read-only production source inventory and report generator.
- `.codex-tmp/borderless-surfaces/latest-scan.json` — disposable timestamped raw scan; never committed.
- `tests/borderless_surface_audit.test.ts` — tests audit classification, exclusions, and report schema.
- `tests/glass_surface_contract.test.ts` — locks the static, borderless, theme-aware primitive contract.
- `tests/borderless_surface_guard.test.ts` — prevents new unclassified decorative container borders.
- `docs/reports/borderless_surface_inventory.json` — reviewed inventory and migration ledger.

**Modify**

- `components/GlassSurface.tsx` — only if Task 2 tests reveal a missing static tone/pressed contract; do not create another surface primitive.
- Common shared components listed in Task 3.
- Main tabs listed in Task 4.
- Learning and cards surfaces listed in Task 5.
- Social, progress, reward, premium, and production modal surfaces listed in Tasks 6–7.
- `package.json` — add only the narrow audit/guard scripts.

## Task 1: Build the read-only production border inventory

**Files:**

- Create: `scripts/audit_borderless_surfaces.mjs`
- Create: `tests/borderless_surface_audit.test.ts`
- Create: `docs/reports/borderless_surface_inventory.json`
- Modify: `package.json`

- [ ] **Step 1: Write the failing audit contract test**

Create `tests/borderless_surface_audit.test.ts` with fixtures under `.codex-tmp/borderless-surface-test/` only. Test these exact behaviors:

```ts
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

describe('borderless surface audit', () => {
  it('classifies production borders and excludes admin/dev/test paths', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'phraseman-border-audit-'));
    fs.mkdirSync(path.join(tmp, 'app'), { recursive: true });
    fs.mkdirSync(path.join(tmp, 'components'), { recursive: true });
    fs.writeFileSync(path.join(tmp, 'app', 'home.tsx'), `
      const s = StyleSheet.create({ card: { borderWidth: 1, borderColor: t.border } });
    `);
    fs.writeFileSync(path.join(tmp, 'app', '_admin_lab.tsx'), `
      const s = { borderWidth: 1 };
    `);
    fs.writeFileSync(path.join(tmp, 'components', 'Input.tsx'), `
      const s = { borderWidth: focused ? 2 : 0, borderColor: t.accent };
    `);

    const out = path.join(tmp, 'latest-scan.json');
    const ledger = path.join(tmp, 'ledger.json');
    execFileSync('node', [
      'scripts/audit_borderless_surfaces.mjs',
      '--root', tmp,
      '--scan-output', out,
      '--ledger', ledger,
      '--reconcile',
    ], { cwd: path.resolve(__dirname, '..') });

    const report = JSON.parse(fs.readFileSync(ledger, 'utf8'));
    expect(report.entries).toEqual(expect.arrayContaining([
      expect.objectContaining({ file: 'app/home.tsx', category: 'UNREVIEWED' }),
      expect.objectContaining({ file: 'components/Input.tsx', suggestedCategory: 'KEEP_STATE' }),
    ]));
    expect(report.entries.some((entry: { file: string }) => entry.file.includes('_admin_'))).toBe(false);
  });
});
```

- [ ] **Step 2: Run the focused test and verify failure**

Run:

```powershell
npx jest --runTestsByPath tests/borderless_surface_audit.test.ts --no-cache --runInBand
```

Expected: FAIL because `scripts/audit_borderless_surfaces.mjs` does not exist.

- [ ] **Step 3: Implement the audit script**

Implement a dependency-free Node script that:

- recursively scans only `app/**/*.ts(x)` and `components/**/*.ts(x)`;
- excludes `_admin_`, `/admin`, `/dev`, `/lab`, `/tester`, tests, generated data, and non-UI files;
- records file, 1-based diagnostic line, matched property, nearby source excerpt, nearest stable anchor (`testID`, named style key, or component/function name), normalized declaration fingerprint, `UNREVIEWED` category, and a conservative suggested category;
- never edits source;
- writes a disposable raw scan with `generatedAt` only to `--scan-output`;
- reconciles raw scan into the deterministic reviewed `--ledger`: preserve existing `id`, `category`, `tone`, `reason`, human `status`, and review history; add only genuinely new fingerprints as `UNREVIEWED`; update only `scanState` to `present`, `missing`, or `ambiguous` based on scan evidence;
- assigns a human-readable immutable ledger ID on first reconciliation, derived from file and stable anchor with a collision suffix, for example `surface:app-home:home-stats-card:1`; later line movement must not change it;
- exits non-zero on invalid roots or output outside `docs/reports`, `.codex-tmp`, or the supplied test root.

Use these separate shapes. Raw scan (disposable and allowed to contain time):

```js
{
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  entries: [{
    file: 'app/home.tsx',
    line: 3261,
    property: 'borderWidth',
    anchor: { kind: 'testID', value: 'home-stats-card' },
    fingerprint: 'app/home.tsx|testID:home-stats-card|borderWidth:1|borderColor:leagueBonusPalette.border',
    excerpt: 'borderWidth: 1, borderColor: ...',
    suggestedCategory: 'MIGRATE',
  }],
}
```

Reviewed ledger (committed and deterministic; no timestamp):

```js
{
  schemaVersion: 1,
  scope: ['app', 'components'],
  excludedKinds: ['admin', 'dev', 'lab', 'tester', 'test', 'generated'],
  entries: [{
    id: 'surface:app-home:home-stats-card:1',
    file: 'app/home.tsx',
    property: 'borderWidth',
    anchor: { kind: 'testID', value: 'home-stats-card' },
    fingerprint: 'app/home.tsx|testID:home-stats-card|borderWidth:1|borderColor:leagueBonusPalette.border',
    lastSeenLine: 3261,
    excerpt: 'borderWidth: 1, borderColor: ...',
    category: 'UNREVIEWED',
    suggestedCategory: 'MIGRATE',
    tone: null,
    reason: '',
    status: 'pending',
    scanState: 'present',
    history: [],
  }],
}
```

Reconciliation matching order is: exact immutable ledger ID supplied by an inline audit annotation if present; otherwise exact fingerprint; otherwise same file + stable anchor + property with a single unambiguous candidate. Ambiguous matches remain new `UNREVIEWED` entries and set plausible prior entries to `scanState: 'ambiguous'`; unmatched prior entries remain in the ledger with `scanState: 'missing'`. The script must never guess, overwrite reviewed data, or convert `status: 'pending'` to `migrated`/`kept`.

- [ ] **Step 4: Add narrow package scripts**

Add only:

```json
"audit:borderless-surfaces": "node scripts/audit_borderless_surfaces.mjs --root . --scan-output .codex-tmp/borderless-surfaces/latest-scan.json --ledger docs/reports/borderless_surface_inventory.json --reconcile",
"test:borderless-surfaces": "jest --runTestsByPath tests/borderless_surface_audit.test.ts tests/glass_surface_contract.test.ts tests/borderless_surface_guard.test.ts --no-cache --runInBand"
```

- [ ] **Step 5: Run the focused test and generate the real inventory**

Run:

```powershell
npx jest --runTestsByPath tests/borderless_surface_audit.test.ts --no-cache --runInBand
npm run audit:borderless-surfaces
```

Expected: test PASS; raw scan and reconciled ledger exist; the ledger contains only production candidates and no timestamp churn.

- [ ] **Step 6: Prove reconciliation preserves reviewed data**

Extend the test to classify one fixture entry, change its source line number without changing its anchor, rerun reconciliation, and assert that `id`, `category`, `tone`, `reason`, `status`, and `history` remain unchanged while `scanState` remains `present`. Then remove the source declaration, reconcile again, and assert the ledger entry remains present with its human `status` unchanged and `scanState: 'missing'`. Add a strict-mode assertion that `category: 'MIGRATE' + status: 'pending' + scanState: 'missing'` fails rather than being treated as migrated.

- [ ] **Step 7: Manually classify every report entry**

For each entry, inspect the containing component and its interaction state. Replace `UNREVIEWED` with exactly one of:

- `MIGRATE`
- `KEEP_STATE`
- `KEEP_STRUCTURE`
- `KEEP_ART`
- `REVIEW_SPECIAL`

For `MIGRATE`, set `tone` to `card`, `subtle`, or `raised`. For every `KEEP_*`, write a concrete reason. Do not begin source migration until the report has zero `UNREVIEWED` rows.

- [ ] **Step 8: Commit the inventory foundation**

```powershell
git add scripts/audit_borderless_surfaces.mjs tests/borderless_surface_audit.test.ts docs/reports/borderless_surface_inventory.json package.json
git commit -m "test: inventory production container borders"
```

## Task 2: Lock the premium, static surface primitive contract

**Files:**

- Create: `tests/glass_surface_contract.test.ts`
- Modify if required: `components/GlassSurface.tsx`

- [ ] **Step 1: Write the failing source contract**

The test must read `components/GlassSurface.tsx` and assert:

```ts
expect(source).toContain("export type GlassTone = 'card' | 'subtle' | 'raised'");
expect(source).toContain("backgroundColor");
expect(source).not.toMatch(/BlurView|backdropFilter|withRepeat|Animated\.loop/);
expect(source).not.toMatch(/borderLeftWidth|borderRightWidth|borderBottomWidth/);
expect(source).toContain('borderTopWidth: 1');
expect(source).toContain('themeMode === \'businessLight\'');
```

Also assert that `glassFill` is exported for list items that should not gain wrappers.

- [ ] **Step 2: Run the focused test**

```powershell
npx jest --runTestsByPath tests/glass_surface_contract.test.ts --no-cache --runInBand
```

Expected: PASS if the existing primitive already satisfies the approved design. If it fails, the failure defines the minimal required primitive change.

- [ ] **Step 3: Make only the minimal primitive change, if needed**

Allowed changes:

- keep `card/subtle/raised` as the only tones;
- keep fills static;
- preserve flat business behavior and dense `businessLight` fills;
- allow only the optional top highlight;
- do not add blur, per-surface gradients, repeating animation, or large shadows.

- [ ] **Step 4: Re-run the focused contract**

Expected: PASS.

- [ ] **Step 5: Commit the primitive contract**

```powershell
git add components/GlassSurface.tsx tests/glass_surface_contract.test.ts
git commit -m "test: lock premium tonal surface contract"
```

## Task 3: Migrate high-reuse shared production components

**Files:**

- Modify: `components/AppMessagesInbox.tsx`
- Modify: `components/AiMistakeCard.tsx`
- Modify: `components/AiLimitUpsellCard.tsx`
- Modify: `components/CertificateNameModal.tsx`
- Modify: `components/ActivityHeatmap365.tsx`
- Modify: `components/PlayerProfileModal.tsx`
- Modify: `components/RegistrationPromptModal.tsx`
- Modify: `components/SurveyTaskCard.tsx`
- Modify: `components/WordDrillCard.tsx`
- Modify: `components/HelpBoardPanel.tsx`
- Test: add or update the existing narrow `*_contract.test.ts` for each touched behavior group

- [ ] **Step 1: Add failing source assertions for the selected `MIGRATE` rows**

Each assertion must target a stable `testID`, style name, or component block. It must reject the exact decorative full-border declaration, not every `borderWidth` in the file. Preserve focus/error/selection and art borders.

Example:

```ts
const source = fs.readFileSync(path.join(ROOT, 'components', 'AiMistakeCard.tsx'), 'utf8');
const cardBlock = source.slice(source.indexOf('testID="ai-mistake-card"'), source.indexOf('testID="ai-mistake-limit-card"'));
expect(cardBlock).toMatch(/GlassSurface|glassFill/);
expect(cardBlock).not.toMatch(/borderWidth:\s*[1-9]/);
```

- [ ] **Step 2: Run only the touched component contract tests and verify failure**

Use `npx jest --runTestsByPath ... --no-cache --runInBand` with the exact test files edited in Step 1.

- [ ] **Step 3: Migrate ordinary containers**

Use these transformations:

```tsx
// Wrapper-friendly standalone card
<GlassSurface tone="card" radius={existingRadius} style={existingLayoutStyle}>
  {children}
</GlassSurface>

// Dense list or animated surface; avoid another wrapper
style={[existingStyle, {
  backgroundColor: glassFill(t.bgCard, 0.46),
  borderWidth: 0,
}]}
```

For nested blocks use `tone="subtle"`; for clearly prioritized blocks use `tone="raised"` with `highlight` only when the inventory says so. Do not change padding, radius, dimensions, handlers, refs, or animation styles.

- [ ] **Step 4: Re-run the touched component contracts**

Expected: PASS.

- [ ] **Step 5: Visual smoke-check shared components in `dark`, `businessLight`, and one vivid theme**

Check normal, pressed, selected, disabled, loading, empty, and error states where present. Record results in the inventory ledger.

- [ ] **Step 6: Commit the shared-component wave**

```powershell
git add components/AppMessagesInbox.tsx components/AiMistakeCard.tsx components/AiLimitUpsellCard.tsx components/CertificateNameModal.tsx components/ActivityHeatmap365.tsx components/PlayerProfileModal.tsx components/RegistrationPromptModal.tsx components/SurveyTaskCard.tsx components/WordDrillCard.tsx components/HelpBoardPanel.tsx tests docs/reports/borderless_surface_inventory.json
git commit -m "refactor: adopt tonal shared surfaces"
```

## Task 4: Migrate the five main tabs

**Files:**

- Modify: `app/(tabs)/home.tsx`
- Modify: `app/(tabs)/lessons.tsx`
- Modify: `app/(tabs)/quizzes.tsx`
- Modify: `app/(tabs)/friends.tsx`
- Modify: `app/(tabs)/settings.tsx`
- Create: `tests/main_tabs_borderless_surfaces_contract.test.ts`
- Update: `docs/reports/borderless_surface_inventory.json`

- [ ] **Step 1: Freeze target IDs and write a failing main-tab contract**

Before editing a tab, copy its current immutable ledger IDs where `category === 'MIGRATE' && status === 'pending'` into a non-empty `TARGET_IDS` constant in the test. From its first run, the test must assert the final contract for every frozen ID: the row exists, remains `MIGRATE`, has human `status === 'migrated'`, has `scanState === 'missing'` after reconciliation, and its stable source anchor contains no positive decorative full border. These expectations intentionally fail before source migration and must not be edited during the red→green cycle. The test must also fail if a target disappears from the ledger or is reclassified without a non-empty reason.

Use this shape:

```ts
const TARGET_IDS = [
  'surface:app-tabs-settings:settings-vip-card:1',
] as const;

expect(TARGET_IDS.length).toBeGreaterThan(0);
for (const id of TARGET_IDS) {
  const row = ledger.entries.find((entry: { id: string }) => entry.id === id);
  expect(row).toBeDefined();
  expect(row.category).toBe('MIGRATE');
  expect(row.status).toBe('migrated');
  expect(row.scanState).toBe('missing');
  expect(sourceBlockForAnchor(row)).not.toMatch(/borderWidth:\s*[1-9]/);
}
```

- [ ] **Step 2: Run the new contract and verify failure**

```powershell
npx jest --runTestsByPath tests/main_tabs_borderless_surfaces_contract.test.ts --no-cache --runInBand
```

- [ ] **Step 3: Migrate one tab at a time**

Order: Settings → Friends → Quizzes → Lessons → Home. After each file:

1. change only inventory rows marked `MIGRATE`;
2. preserve gold/premium gradients as `REVIEW_SPECIAL` until manually approved;
3. preserve quiz correctness, lesson lock/current, friend request status, settings selection, and input focus borders;
4. update row status and tone in the inventory;
5. run the main-tab contract before moving to the next tab.

- [ ] **Step 4: Run performance/navigation invariants**

```powershell
npx jest --runTestsByPath tests/perf_freeze_contract.test.ts tests/navigation_back_underlay_contract.test.ts tests/owner_direction_runtime_contract.test.ts --no-cache --runInBand
```

Expected: PASS; no new loops, hot hidden tabs, or navigation background changes.

- [ ] **Step 5: Visual smoke-check all five tabs**

Check all ten themes at least once across the wave. Check `dark`, `gold`, `business`, and `businessLight` on every main tab. Verify no geometry shift after border removal and no white text/icons on lime surfaces.

- [ ] **Step 6: Commit each tab separately**

Use one commit per tab, for example:

```powershell
git add 'app/(tabs)/settings.tsx' tests/main_tabs_borderless_surfaces_contract.test.ts docs/reports/borderless_surface_inventory.json
git commit -m "refactor: use tonal settings surfaces"
```

Repeat with the corresponding tab name and only its files.

## Task 5: Migrate learning and flashcard production surfaces

**Files:**

- Modify: `app/flashcards.tsx`
- Modify: `app/flashcards_collection.tsx`
- Modify: `app/flashcards_swipe.tsx`
- Modify: `app/flashcards_audio.tsx`
- Modify: `app/flashcards/FlashcardsCategoryHub.tsx`
- Modify: `app/flashcards/FlashcardListItem.tsx`
- Modify: `app/lesson1.tsx`
- Modify: `app/lesson_words.tsx`
- Modify: `app/lesson_irregular_verbs.tsx`
- Modify: `app/level_exam.tsx`
- Modify: `app/personal_plan_exercise.tsx`
- Modify: `app/trainer_phrases_session.tsx`
- Create: `tests/learning_borderless_surfaces_contract.test.ts`
- Update: `docs/reports/borderless_surface_inventory.json`

- [ ] **Step 1: Write failing contracts for only `MIGRATE` rows**

Explicitly preserve:

- flashcard pack-art accent borders (`KEEP_ART`/`REVIEW_SPECIAL`);
- selected filters and input focus (`KEEP_STATE`);
- answer correctness and exam states (`KEEP_STATE`);
- split-card geometry and progress art (`KEEP_ART`).

- [ ] **Step 2: Migrate dense lists with `glassFill`, not wrappers**

`FlashcardListItem`, vocabulary lists, and other long lists must keep the existing view count and virtualization behavior. Use static background colors and set the decorative full-border width to zero only for classified rows.

- [ ] **Step 3: Migrate standalone learning panels with `GlassSurface`**

Use `card` for exercises, `subtle` for explanations/details, and `raised` for the active learning action. Do not touch answer handlers, timers, audio, scrolling, or loader boundaries.

- [ ] **Step 4: Run focused learning contracts**

```powershell
npx jest --runTestsByPath tests/learning_borderless_surfaces_contract.test.ts tests/flashcard_details_no_context_contract.test.ts tests/flashcards_audio_contract.test.ts tests/lesson_card_contrast_contract.test.ts tests/perf_freeze_contract.test.ts --no-cache --runInBand
```

- [ ] **Step 5: Visual smoke-check list density and states**

Verify 30+ row lists do not gain extra wrappers or frame drops. Check front/back flashcards, details expansion, deletion overlay, answer correct/wrong, locked/current lesson, and offline content.

- [ ] **Step 6: Commit learning and flashcards as two bounded commits**

```powershell
git add app/flashcards.tsx app/flashcards_collection.tsx app/flashcards_swipe.tsx app/flashcards_audio.tsx app/flashcards tests/learning_borderless_surfaces_contract.test.ts docs/reports/borderless_surface_inventory.json
git commit -m "refactor: use tonal flashcard surfaces"

git add app/lesson1.tsx app/lesson_words.tsx app/lesson_irregular_verbs.tsx app/level_exam.tsx app/personal_plan_exercise.tsx app/trainer_phrases_session.tsx tests/learning_borderless_surfaces_contract.test.ts docs/reports/borderless_surface_inventory.json
git commit -m "refactor: use tonal learning surfaces"
```

## Task 6: Migrate social, progress, arena, and reward surfaces

**Files:**

- Modify: `app/arena_lobby.tsx`
- Modify: `app/arena_game.tsx`
- Modify: `app/streak_stats.tsx`
- Modify: `app/achievements.tsx`
- Modify: `app/club_screen.tsx`
- Modify: `app/constellation_lobby_card.tsx`
- Modify: `app/constellation_match.tsx`
- Modify: `app/constellation_results.tsx`
- Modify: `components/LeagueChatPanel.tsx`
- Modify: `components/LeagueChatReactions.tsx`
- Create: `tests/social_progress_borderless_surfaces_contract.test.ts`
- Update: `docs/reports/borderless_surface_inventory.json`

- [ ] **Step 1: Write failing targeted contracts**

Reject only decorative closed card borders. Preserve avatar rings, charts, heatmaps, progress arcs, map geometry, rank/rarity art, selected reactions, result success/error, and live-game state borders.

- [ ] **Step 2: Migrate ordinary lobby, stats, feed, and chat containers**

Use `glassFill` in virtualized feeds and live-game paths to avoid component-depth changes. Use `GlassSurface` for standalone summary cards and modals that are not updated every frame.

- [ ] **Step 3: Run focused behavior and performance tests**

```powershell
npx jest --runTestsByPath tests/social_progress_borderless_surfaces_contract.test.ts tests/arena_timer_after_answer_contract.test.ts tests/league_chat_cache_first.test.ts tests/perf_freeze_contract.test.ts --no-cache --runInBand
```

- [ ] **Step 4: Visual smoke-check real-time and art-heavy screens**

Check that timers, opponent state, charts, rarity, rank, and selected reactions remain unambiguous. Confirm there are no new animations or frame-time regressions.

- [ ] **Step 5: Commit the wave in social and progress halves**

Use one commit for arena/social and one for progress/achievement surfaces, staging only listed files and the inventory/test updates.

## Task 7: Migrate remaining production modals, premium panels, and system screens

**Files:**

- Modify all remaining files with inventory category `MIGRATE` or approved `REVIEW_SPECIAL` under `app/` and `components/`, excluding the scope exclusions.
- Create: `tests/remaining_borderless_surfaces_contract.test.ts`
- Update: `docs/reports/borderless_surface_inventory.json`

- [ ] **Step 1: Freeze the remaining target list**

Export from the inventory a deterministic list where `status === 'pending'` and category is `MIGRATE` or `REVIEW_SPECIAL`. Paste that exact list into the task commit message/body so scope cannot drift.

- [ ] **Step 2: Write a failing contract for the frozen row IDs**

The contract must fail for any pending `MIGRATE` row and must require an explicit reason before changing a `REVIEW_SPECIAL` row to migrated or kept.

- [ ] **Step 3: Migrate ordinary modal/system cards**

Preserve overlay opacity, dismissal behavior, focus trapping, safe areas, keyboard behavior, and button hierarchy. Tonal changes must remain inside the existing modal geometry.

- [ ] **Step 4: Review premium/gold surfaces one by one**

Do not flatten branded gradients or reward art automatically. Remove only decorative closed borders that compete with the approved tonal hierarchy. Keep accent art borders documented as `KEEP_ART`.

- [ ] **Step 5: Run only the contracts related to each modal/system group**

Include `tests/overlay_arbiter.test.ts` for overlay hosts and the existing narrow contract for each touched modal. Do not run the entire suite as a substitute for targeted checks.

- [ ] **Step 6: Commit in groups of no more than 10 production files**

Each commit includes the related test and inventory updates. This keeps visual regressions bisectable.

## Task 8: Add the permanent guard and close the ledger

**Files:**

- Create: `tests/borderless_surface_guard.test.ts`
- Modify: `scripts/audit_borderless_surfaces.mjs`
- Modify: `docs/reports/borderless_surface_inventory.json`
- Modify: `package.json`

- [ ] **Step 1: Write the failing final guard**

The guard must:

- run the audit in memory or in `.codex-tmp/`;
- require zero `UNREVIEWED` entries;
- require zero pending `MIGRATE` entries;
- fail on every `MIGRATE + scanState: missing` row unless a human explicitly set `status: migrated`;
- fail on every `scanState: ambiguous` row;
- require a non-empty reason for every `KEEP_*`/`REVIEW_SPECIAL` entry;
- fail when a new positive full-border declaration appears outside the reviewed ledger;
- ignore `borderRadius` and documented top highlights;
- remain read-only toward app source and tests.

- [ ] **Step 2: Run the full narrow borderless gate**

```powershell
npm run test:borderless-surfaces
```

Expected: FAIL until all ledger rows and guard integration are complete.

- [ ] **Step 3: Complete the ledger and script strict mode**

Add `--strict` to reconcile the fresh raw scan with the existing reviewed ledger and preserve reviewed/history fields. Enforce this exact matrix:

- fail on every `scanState: ambiguous`;
- fail on `category: MIGRATE + status: pending + scanState: missing`;
- pass `category: MIGRATE + status: migrated + scanState: missing`;
- require `KEEP_STATE`, `KEEP_STRUCTURE`, and `KEEP_ART` entries to remain `scanState: present`; an unexpected `missing` entry fails until a human records a concrete reason and explicitly updates its status/history;
- fail on every new `UNREVIEWED` decorative border.

Update the package script:

```json
"audit:borderless-surfaces:strict": "node scripts/audit_borderless_surfaces.mjs --root . --scan-output .codex-tmp/borderless-surfaces/latest-scan.json --ledger docs/reports/borderless_surface_inventory.json --reconcile --strict"
```

- [ ] **Step 4: Run all narrow final checks**

```powershell
npm run audit:borderless-surfaces:strict
npm run test:borderless-surfaces
npx jest --runTestsByPath tests/perf_freeze_contract.test.ts tests/navigation_back_underlay_contract.test.ts tests/owner_direction_runtime_contract.test.ts tests/overlay_arbiter.test.ts --no-cache --runInBand
```

Expected: all commands exit 0 with no source writes.

- [ ] **Step 5: Perform the final visual matrix**

For each of `dark`, `gold`, `coral`, `minimalDark`, `midnight`, `ember`, `aurora`, `volt`, `business`, and `businessLight`, inspect at least:

- Home
- Lessons
- Quizzes
- Friends
- Settings
- one long list
- one modal
- one error/focus/selected state
- one premium/gold or reward surface

Record device/platform, theme, screen, state, and result in the inventory report metadata. Confirm dark foreground on all lime/neon-green filled surfaces.

- [ ] **Step 6: Verify the final diff contains no scope leakage**

```powershell
git diff --name-only <base-commit>...HEAD
git diff --check <base-commit>...HEAD
```

Confirm there are no admin/dev/tester changes and no unrelated user files.

- [ ] **Step 7: Request final code review and Advisor approval**

Provide the reviewer with the spec, plan, final diff, inventory totals by category, narrow test evidence, theme matrix, and unresolved uncertainty. Do not claim completion without `DECISION: APPROVED`.

- [ ] **Step 8: Commit the guard and closure evidence**

```powershell
git add scripts/audit_borderless_surfaces.mjs tests/borderless_surface_guard.test.ts docs/reports/borderless_surface_inventory.json package.json
git commit -m "test: guard borderless production surfaces"
```

## Completion checklist

- [ ] Production inventory contains zero `UNREVIEWED` and zero pending `MIGRATE` entries.
- [ ] Every remaining full border has a semantic/art/structural reason.
- [ ] All ten themes pass the visual matrix.
- [ ] No blur, repeating decoration, per-row gradient, or heavy shadow was introduced.
- [ ] No functionality, route, handler, accessibility contract, or touch geometry was removed.
- [ ] Narrow behavior, performance, navigation, overlay, audit, and guard tests pass.
- [ ] Admin/dev/tester files are absent from the final diff.
- [ ] Advisor returns `DECISION: APPROVED` on the actual final implementation state.

## Находки и предложения

- The migration should remain ledger-driven permanently; a raw repository count is not a safe quality metric because borders have different meanings.
- Dense lists should prefer `glassFill` to avoid wrapper depth and preserve virtualization performance.
- Premium/gold art needs manual review even after the guard passes; a source guard cannot judge composition quality.
- Admin UI should receive a separate design and plan governed by `docs/design/ADMIN_UI_BIBLE.md`.
