# Супервоскресенье — ×2 руны Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (\`- [ ]\`) syntax for tracking.

**Goal:** Каждое воскресенье UTC начислять завершённые заработанные руны текущего scope (practice + Arena + Friends) как ×2 ровно один раз, показать плашку на реальном экране лиги и обновить объяснение. Learning V2 явно исключён решением владельца.

**Architecture:** Один чистый общий модуль определяет UTC-окно и итоговую сумму. Владелец каждой награды применяет его до fingerprint/receipt/проекции, а журнал хранит уже финальную сумму и отклоняет конфликтный повтор. Экран лиги использует тот же UTC-расчёт и локальные часы, без сетевого опроса.

**Tech Stack:** TypeScript, React Native Animated, Firebase Functions, Jest.

---

## File map

| File | Responsibility |
| --- | --- |
| \`modules/economy/super_sunday_runes.ts\` | Pure Sunday predicate, amount transform and end-of-Sunday timestamp. |
| \`functions/src/stars_ledger.ts\` | Exact replay comparison; no reward multiplier. |
| \`functions/src/{arena_v2,arena_expansion,friends_together}.ts\` | Finalize server-owned earned rewards before every projection. |
| \`app/practice_rune_settlement.ts\` | Seal client-owned practice amount before local receipt/fingerprint. |
| \`app/league_week_runes.ts\`, \`app/xp_manager.ts\` | Remove obsolete duplicate hot-hours layers. |
| \`components/league/LeagueSuperSundayBanner.tsx\`, \`app/club_screen.tsx\` | Focus-safe banner above the actual competition scene. |
| \`components/LeagueRulesSheet.tsx\` | New League and Super Sunday copy in all nine locales. |

### Task 1: Shared UTC policy

**Files:**
- Create: \`modules/economy/super_sunday_runes.ts\`
- Create: \`tests/super_sunday_runes.test.ts\`

- [ ] **Step 1: Write the failing boundary test.**

\`\`\`ts
import { applySuperSundayRuneMultiplier, isSuperSundayUtc, superSundayEndsAtUtcMs }
  from '../modules/economy/super_sunday_runes';

it.each([
  ['2026-09-06T00:00:00.000Z', true],
  ['2026-09-06T23:59:59.999Z', true],
  ['2026-09-05T23:59:59.999Z', false],
  ['2026-09-07T00:00:00.000Z', false],
])('classifies Sunday window', (iso, expected) =>
  expect(isSuperSundayUtc(Date.parse(iso))).toBe(expected));
it('doubles only inside it', () => {
  expect(applySuperSundayRuneMultiplier(17, Date.parse('2026-09-06T12:00:00.000Z'))).toBe(34);
  expect(applySuperSundayRuneMultiplier(17, Date.parse('2026-09-07T00:00:00.000Z'))).toBe(17);
});
\`\`\`

- [ ] **Step 2: Run red.**

Run: \`npx jest --runInBand tests/super_sunday_runes.test.ts\`  
Expected: FAIL; the module does not exist.

- [ ] **Step 3: Implement the pure transform.**

\`\`\`ts
export const SUPER_SUNDAY_MULTIPLIER = 2;
export function isSuperSundayUtc(earnedAtMs: number): boolean {
  return Number.isFinite(earnedAtMs) && new Date(earnedAtMs).getUTCDay() === 0;
}
export function applySuperSundayRuneMultiplier(baseAmount: number, earnedAtMs: number): number {
  if (!Number.isSafeInteger(baseAmount) || baseAmount < 0) throw new Error('invalid rune amount');
  const m = isSuperSundayUtc(earnedAtMs) ? SUPER_SUNDAY_MULTIPLIER : 1;
  if (baseAmount > Number.MAX_SAFE_INTEGER / m) throw new Error('rune amount overflow');
  return baseAmount * m;
}
export function superSundayEndsAtUtcMs(nowMs: number): number {
  const end = new Date(nowMs); end.setUTCHours(24, 0, 0, 0); return end.getTime();
}
\`\`\`

- [ ] **Step 4: Add invalid/overflow/countdown cases and run green.**

\`\`\`ts
expect(() => applySuperSundayRuneMultiplier(-1, Date.parse('2026-09-06T12:00:00.000Z'))).toThrow('invalid rune amount');
expect(new Date(superSundayEndsAtUtcMs(Date.parse('2026-09-06T12:00:00.000Z'))).toISOString())
  .toBe('2026-09-07T00:00:00.000Z');
\`\`\`

Run: \`npx jest --runInBand tests/super_sunday_runes.test.ts\`  
Expected: PASS.

- [ ] **Step 5: Commit.**

\`\`\`bash
git add modules/economy/super_sunday_runes.ts tests/super_sunday_runes.test.ts
git commit -m "feat: add super sunday rune policy"
\`\`\`

### Task 2: Make replay exactly idempotent

**Files:**
- Modify: \`functions/src/stars_ledger.ts\`
- Modify: \`functions/src/stars_ledger.test.ts\`

- [ ] **Step 1: Write the failing conflicting-opId test.**

\`\`\`ts
const original = starOp({ opId: 'sunday-replay', delta: 20, earnedAtMs: SUNDAY });
await commitStarOperations(ctx, [original]);
await expect(commitStarOperations(ctx, [original])).resolves.toMatchObject({ status: 'already_applied' });
await expect(commitStarOperations(ctx, [{ ...original, delta: 10 }]))
  .resolves.toMatchObject({ status: 'rejected', code: 'op_conflict' });
expect(await readBalance(ctx)).toBe(20);
\`\`\`

- [ ] **Step 2: Run red.**

Run: \`npm --prefix functions test -- --runInBand src/stars_ledger.test.ts\`  
Expected: FAIL; changed bytes currently return \`already_applied\`.

- [ ] **Step 3: Add canonical receipt comparison.**

Add \`sameOperation(existing, requested)\` for \`opId\`, \`delta\`, \`reason\`, \`sourceKind\`, \`sourceId\`, \`ruleVersion\`, normalized \`earnedAtMs\`, and stable serialized \`meta\`. In the prior-receipt branch return \`already_applied\` only for equality; return \`{ status: 'rejected', code: 'op_conflict' }\` otherwise. Do not multiply here.

- [ ] **Step 4: Add changed source/time/rule/meta cases and run green.**

Run: \`npm --prefix functions test -- --runInBand src/stars_ledger.test.ts\`  
Expected: PASS; balance remains 20 after every conflict.

- [ ] **Step 5: Commit.**

\`\`\`bash
git add functions/src/stars_ledger.ts functions/src/stars_ledger.test.ts
git commit -m "fix: reject conflicting rune operation replays"
\`\`\`

### Task 3: Finalize every server-owned earn before projections

**Files:**
- Modify: \`functions/src/arena_v2.ts:1188-1209\`
- Modify: \`functions/src/arena_expansion.ts:534-599,1864-1900\`
- Modify: \`functions/src/friends_together.ts:220-243,395-426\`
- Modify: focused existing Arena/Friends test files and \`functions/src/stars_ledger.test.ts\`

- [ ] **Step 1: Add red Sunday/Monday cases to Arena match, Today/mastery/partner, Friends level/chest.**

\`\`\`ts
expect(result.starsEarned).toBe(baseStars * 2);
expect(starOperations[0]).toMatchObject({ delta: baseStars * 2, earnedAtMs: SUNDAY_NOON });
// Duplicate each case with MONDAY_START and expect baseStars.
\`\`\`

- [ ] **Step 2: Run red.**

Run: \`npm --prefix functions test -- --runInBand src/arena_v2_backend_contract.test.ts src/arena_v2_receipt_contract.test.ts src/friends_together.test.ts\`  
Expected: FAIL on Sunday base values.

- [ ] **Step 3: Apply the policy once at each listed boundary.**

\`\`\`ts
const earnedAtMs = now.getTime();
const awardedRunes = applySuperSundayRuneMultiplier(baseAwardedRunes, earnedAtMs);
\`\`\`

Use \`awardedRunes\` for all returned/profile fields and \`StarOpRequest.delta\`, preserving existing \`opId\` and identifiers. Apply only live \`earn\` reasons. Do not transform grants or spends.

- [ ] **Step 4: Test all included Arena/Friends earn rows and run green.**

Add a source/behavior contract: every included Arena/Friends \`earn\` uses \`2N\`
on Sunday and the exact final amount reaches both result and ledger receipt.
Learning V2 remains unchanged; \`grant\` and \`spend\` remain outside the policy.

Run: \`npm --prefix functions test -- --runInBand src/stars_ledger.test.ts src/arena_v2_backend_contract.test.ts src/arena_v2_receipt_contract.test.ts src/friends_together.test.ts\`  
Expected: PASS.

- [ ] **Step 5: Commit.**

\`\`\`bash
git add functions/src/arena_v2.ts functions/src/arena_expansion.ts functions/src/friends_together.ts functions/src/*.test.ts
git commit -m "feat: double server earned runes on super sunday"
\`\`\`

### Task 4: Preserve client practice receipts

**Files:**
- Modify: \`app/practice_rune_settlement.ts:160-208\`
- Modify: \`tests/practice_rune_settlement.test.ts\`, \`functions/src/practice_rune_grant.test.ts\`

- [ ] **Step 1: Write red practice sealing tests.**

\`\`\`ts
const first = await settlePractice({ pendingRunes: 11, durableCreatedAtMs: SUNDAY_NOON });
expect(first.amount).toBe(22);
expect(localReceipt(first.opId).amount).toBe(22);
const retry = await retryPractice(first, MONDAY_START);
expect(retry).toMatchObject({ opId: first.opId, amount: 22, fingerprint: first.fingerprint });
\`\`\`

- [ ] **Step 2: Run red.**

Run: \`npx jest --runInBand tests/practice_rune_settlement.test.ts tests/practice_rune_no_caps_contract.test.ts\`  
Expected: FAIL; sealed amount is still base.

- [ ] **Step 3: Transform before practice fingerprint/local commit.**

\`\`\`ts
const amount = applySuperSundayRuneMultiplier(earnings.pendingRunes, createdAtMs);
const operation: PracticeRuneOperation = { ...existingIdentity, amount, createdAtMs };
\`\`\`

Fingerprint this final operation and retain existing local commit. The function validates/replays the client composite; it must not calculate another multiplier.

- [ ] **Step 4: Run green.**

Run: \`npx jest --runInBand tests/practice_rune_settlement.test.ts tests/practice_rune_no_caps_contract.test.ts\`  
Run: \`npm --prefix functions test -- --runInBand src/practice_rune_grant.test.ts\`  
Expected: PASS.

- [ ] **Step 5: Commit.**

\`\`\`bash
git add app/practice_rune_settlement.ts tests/practice_rune_settlement.test.ts tests/practice_rune_no_caps_contract.test.ts functions/src/practice_rune_grant.test.ts
git commit -m "feat: seal super sunday rewards before receipts"
\`\`\`

### Task 5: Retire two-hour duplicate logic and add the real-screen banner

**Files:**
- Modify: \`app/league_hot_hours.ts\`, \`tests/league_hot_hours.test.ts\`
- Modify: \`app/league_week_runes.ts\`, \`app/xp_manager.ts\`
- Create: \`components/league/LeagueSuperSundayBanner.tsx\`
- Modify: \`app/club_screen.tsx\`
- Modify: \`tests/league_points_are_runes_contract.test.ts\`, \`tests/xp_manager_register_xp.test.ts\`, \`tests/profile_card_xp_perk.test.ts\`, \`tests/runtime_lifecycle_ratchet.test.ts\`

- [ ] **Step 1: Replace rank-gated tests with Sunday and XP-invariance tests.**

\`\`\`ts
expect(resolveLeagueHotHoursMultiplier({ now: SUNDAY_NOON, group: relegationGroup })).toBe(2);
expect(resolveLeagueHotHoursMultiplier({ now: SUNDAY_NOON, group: promotionGroup })).toBe(2);
expect(resolveLeagueHotHoursMultiplier({ now: MONDAY_START, group: relegationGroup })).toBe(1);
expect(registerXp(SUNDAY_NOON, baseXp)).toEqual(registerXp(MONDAY_START, baseXp));
\`\`\`

- [ ] **Step 2: Run red.**

Run: \`npx jest --runInBand tests/league_hot_hours.test.ts tests/league_points_are_runes_contract.test.ts tests/xp_manager_register_xp.test.ts tests/profile_card_xp_perk.test.ts\`  
Expected: FAIL; \`hotBonus\` and \`hotHoursM\` still exist.

- [ ] **Step 3: Remove old duplicate award layers.**

Keep the old module path only as a compatibility facade over the shared policy, with no group/rank condition. Remove \`hotBonus\`, its persistent contribution and lazy import from \`league_week_runes.ts\`; historic saved \`hotBonus\` is ignored. Remove \`hotHoursM\` and all XP multiplication.

- [ ] **Step 4: Implement a guarded full-width banner.**

\`\`\`tsx
<Animated.View testID="league-super-sunday-banner" accessibilityRole="text"
  accessibilityLabel={superSundayAccessibilityLabel(lang, countdown)}>
  <Text>СУПЕРВОСКРЕСЕНЬЕ</Text>
  <Text>×2 руны весь день</Text>
  <Text>Все заработанные руны удваиваются</Text>
  <Text>До финиша: {countdown}</Text>
</Animated.View>
\`\`\`

Return \`null\` outside Sunday. Start \`Animated.loop\` only while focused, foreground and motion is enabled; stop/reset otherwise. Register it in lifecycle ratchet. No \`setInterval\`, network read, or \`loadData\`.

- [ ] **Step 5: Insert it immediately before the real \`LeagueCompetitionScene\`.**

Use existing \`visibleWallClock\` state, retain normal header countdown, remove \`LeagueHotHoursChip\`, and rewrite all race-feed two-hour/relegation lines to Super Sunday copy.

- [ ] **Step 6: Run UI/contract tests green and commit.**

Run: \`npx jest --runInBand tests/league_hot_hours.test.ts tests/league_points_are_runes_contract.test.ts tests/xp_manager_register_xp.test.ts tests/profile_card_xp_perk.test.ts tests/runtime_lifecycle_ratchet.test.ts\`  
Expected: PASS.

\`\`\`bash
git add app/league_hot_hours.ts app/league_week_runes.ts app/xp_manager.ts app/club_screen.tsx components/league/LeagueSuperSundayBanner.tsx tests
git commit -m "feat: show super sunday league bonus"
\`\`\`

### Task 6: Rewrite the nine locale descriptions

**Files:**
- Modify: \`components/LeagueRulesSheet.tsx\`
- Modify: \`tests/league_rules_sheet_contract.test.ts\`

- [ ] **Step 1: Add a failing content contract.**

\`\`\`ts
for (const locale of ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl']) {
  expect(source).toContain(\"'\" + locale + \"':\");
}
expect(source).toContain('Супервоскресенье');
expect(source).toContain('Подарочные руны таблицу не двигают');
expect(source).not.toMatch(/последние два часа|зона вылета|last two hours/i);
\`\`\`

- [ ] **Step 2: Run red.**

Run: \`npx jest --runInBand tests/league_rules_sheet_contract.test.ts\`  
Expected: FAIL on obsolete public copy.

- [ ] **Step 3: Update only the two explanatory sections in every existing locale.**

“What is League” states that runes earned in lessons/games are the current week’s table score, while gift runes do not move it. Rename promotion copy to the localized “Super Sunday” and state all earned runes double every Sunday until week end. Preserve unrelated rules.

- [ ] **Step 4: Run green and commit.**

Run: \`npx jest --runInBand tests/league_rules_sheet_contract.test.ts\`  
Expected: PASS.

\`\`\`bash
git add components/LeagueRulesSheet.tsx tests/league_rules_sheet_contract.test.ts
git commit -m "copy: explain super sunday league rewards"
\`\`\`

### Task 7: Focused final evidence

**Files:** verify the changed files only.

- [ ] **Step 1: Acquire the required heavy-test slot and run focused suites serially.**

\`\`\`powershell
& 'C:\\Program Files\\Git\\bin\\bash.exe' .claude/semaphore/slot.sh acquire 'Super Sunday focused Jest verification'
npx jest --runInBand tests/super_sunday_runes.test.ts tests/league_hot_hours.test.ts tests/league_points_are_runes_contract.test.ts tests/league_rules_sheet_contract.test.ts tests/runtime_lifecycle_ratchet.test.ts tests/practice_rune_settlement.test.ts tests/practice_rune_no_caps_contract.test.ts tests/xp_manager_register_xp.test.ts tests/profile_card_xp_perk.test.ts
npm --prefix functions test -- --runInBand src/stars_ledger.test.ts src/practice_rune_grant.test.ts src/arena_v2_backend_contract.test.ts src/arena_v2_receipt_contract.test.ts src/friends_together.test.ts
& 'C:\\Program Files\\Git\\bin\\bash.exe' .claude/semaphore/slot.sh release
\`\`\`

Expected: PASS. Actual runner uses \`try/finally\` so the semaphore is released on a failure.

- [ ] **Step 2: Run static safety checks.**

\`\`\`powershell
git diff --check
git status --short
rg -n "hotBonus|hotHoursM|LeagueHotHoursChip|последние два часа|зона вылета" app components tests functions/src -g '!node_modules'
\`\`\`

Expected: no diff errors and no live old multiplier/public copy.

- [ ] **Step 3: Inspect the Sunday screen.**

Verify the order: navigation header → full-width Super Sunday banner → podium/race scene → room mission → leaderboard. Verify local countdown changes with no network request and reduced motion is static.

- [ ] **Step 4: Commit only feature files; Learning V2 is explicitly out of scope.**
