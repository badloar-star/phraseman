# Disable League Chat And Simplify League Hub Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the League XP promotion banner above the podium, remove the League Club Center block, and disable League Chat from active user surfaces while keeping Help Board and earned chat achievements intact.

**Architecture:** Add one small availability contract for League Chat and use it only where compatibility needs a shared decision. Remove active imports and UI mounts from League, Home, Community Hub, notification navigation, and achievement unlocking/visibility paths. Preserve dormant League Chat source/backend data and update contracts so the disabled state cannot silently regress.

**Tech Stack:** Expo Router, React Native, TypeScript, Jest source/behavior contracts, AsyncStorage achievement state.

---

## File Structure

- Create `app/league_chat_availability.ts`: single source of truth for disabled League Chat and helper predicates for chat achievement visibility.
- Modify `app/club_screen.tsx`: remove chat route/modal/unread/Club Center, move XP promotion banner above `LeaguePodium`, keep podium, weekly goal, participants, profile cards, boost/like/claim behavior.
- Modify `components/CommunityChatHubButton.tsx`: keep the home communication button and fullscreen modal, but make it Help Board only with no League Chat imports, tab, unread badge, or league deep link state.
- Modify `app/community_hub_deeplink.ts`: accept Help Board links only; ignore legacy League Chat links without storing them as pending.
- Modify `components/NotificationCenterButton.tsx`: filter hidden notifications before counts/list/mark-read and stop handling `nav.kind === 'league_chat'`.
- Modify `app/user_notifications.ts`: expose `isUserNotificationVisible` so cache, refresh, and UI can consistently hide `league_chat_reply` while preserving raw types for backward compatibility.
- Modify `app/(tabs)/home.tsx`: remove League Chat unread hook/imports and both league tile unread badges.
- Modify `app/achievements.ts`: prevent disabled League Chat from unlocking new chat achievements via backfill or `league_chat_message`, and export helper availability for UI.
- Modify `app/achievements_screen.tsx`: hide locked League Chat achievements from sections, totals, nearest locked cards, and selection/detail while keeping unlocked/pending rewards visible.
- Modify/delete `app/league_club_hub_model.ts` only if needed: remove only the `LeagueClubHero` model if no consumer remains; keep bonus mission and podium builders.
- Delete `components/league/LeagueClubHero.tsx` if no consumer remains.
- Update focused tests in `tests/league_club_hub_contract.test.ts`, `tests/league_club_hub_model.test.ts`, `tests/league_chat_unread_badge_contract.test.ts`, `tests/help_board_contract.test.ts`, `tests/header_theme_accent_buttons.test.ts`, `tests/achievements.test.ts`, and add/update a dedicated disabled-contract test if cleaner.

## Task 1: Protective Contracts First

**Files:**
- Modify: `tests/league_club_hub_contract.test.ts`
- Modify: `tests/league_chat_unread_badge_contract.test.ts`
- Modify: `tests/help_board_contract.test.ts`
- Modify: `tests/header_theme_accent_buttons.test.ts`
- Modify: `tests/achievements.test.ts`
- Add: `tests/league_chat_disabled_contract.test.ts` if consolidation is clearer than overloading old tests.

- [ ] **Step 1: Update League screen source contract**

Assert:

```ts
const screen = read('app/club_screen.tsx');
expect(screen).not.toContain('LeagueChatPanel');
expect(screen).not.toContain('useLeagueChatUnread');
expect(screen).not.toContain('LeagueClubHero');
expect(screen).not.toContain('openChat');
expect(screen.indexOf('testID="league-xp-promotion-banner"')).toBeGreaterThan(-1);
expect(screen.indexOf('testID="league-xp-promotion-banner"')).toBeLessThan(screen.indexOf('<LeaguePodium'));
expect(screen).toContain('<LeagueBonusMission');
expect(screen).toContain('renderLeagueMember');
```

- [ ] **Step 2: Update Help Board/community hub contract**

Assert:

```ts
const hub = read('components/CommunityChatHubButton.tsx');
expect(hub).toContain('HelpBoardPanel');
expect(hub).not.toContain('LeagueChatPanel');
expect(hub).not.toContain('useLeagueChatUnread');
expect(hub).not.toContain('community-chat-league-tab');
expect(hub).not.toContain('home-community-chat-unread-badge');
```

- [ ] **Step 3: Update Home unread badge contract**

Assert:

```ts
const home = read('app/(tabs)/home.tsx');
expect(home).not.toContain('useLeagueChatUnread');
expect(home).not.toContain('formatLeagueChatUnreadBadge');
expect(home).not.toContain('home-league-chat-unread-badge');
```

- [ ] **Step 4: Add deep link and notification disabled contract**

Assert:

```ts
const deepLink = read('app/community_hub_deeplink.ts');
expect(deepLink).toContain("tab: 'help'");
expect(deepLink).not.toContain("tab: 'league'");

const notifications = read('components/NotificationCenterButton.tsx');
expect(notifications).toContain('isUserNotificationVisible');
expect(notifications).not.toContain("openCommunityHub({ tab: 'league'");
```

- [ ] **Step 5: Add achievement disabled behavior tests**

Add tests that load an unlocked `league_chat_first` state and a locked `league_chat_10` state, then assert helper visibility keeps the unlocked row and hides the locked row. Add a `checkAchievements({ type: 'league_chat_message' })` assertion that returns no newly unlocked chat achievement when disabled.

- [ ] **Step 6: Run focused tests and confirm expected failures**

Run:

```bash
npx jest tests/league_club_hub_contract.test.ts tests/league_chat_unread_badge_contract.test.ts tests/help_board_contract.test.ts tests/header_theme_accent_buttons.test.ts tests/achievements.test.ts --runInBand
```

Expected: FAIL on old League Chat/Club Center expectations before implementation.

## Task 2: League Screen Simplification

**Files:**
- Modify: `app/club_screen.tsx`
- Modify: `app/league_club_hub_model.ts`
- Delete: `components/league/LeagueClubHero.tsx` if unused.
- Modify: `tests/league_club_hub_model.test.ts`

- [ ] **Step 1: Remove active chat imports and state**

Remove imports for `LeagueChatPanel`, `useLeagueChatUnread`, and `LeagueClubHero`. Remove `openChat` search param logic, `chatModalVisible`, `chatProfilePlayer`, `closeChatModal`, `leagueChatUnreadCount`, and the full chat modal.

- [ ] **Step 2: Remove Club Center model/render**

Remove `buildLeagueClubHeroModel` usage and the `<LeagueClubHero />` render block. Keep `buildLeagueBonusMissionModel`, `buildLeaguePodium`, `LeagueBonusMission`, and `LeaguePodium`.

- [ ] **Step 3: Move XP promotion banner**

In `ListHeaderComponent`, render the `league-xp-promotion-banner` block before `<LeaguePodium />`. Keep existing banner copy and styling.

- [ ] **Step 4: Keep league profile and weekly goal behavior**

Verify all remaining callbacks still compile: `openLeagueMemberProfile`, `openActiveBoostBuyerProfile`, `renderLeagueMemberAvatar`, `renderLeagueMemberName`, boost/like/claim handlers.

## Task 3: Help Board Only Hub And Deep Links

**Files:**
- Modify: `components/CommunityChatHubButton.tsx`
- Modify: `app/community_hub_deeplink.ts`
- Modify: `app/(tabs)/home.tsx`

- [ ] **Step 1: Simplify community hub**

Keep the header button and modal, but remove tab state, League unread state, and `LeagueChatPanel`. The button opens Help Board directly and deep links only populate `helpDeepLink`.

- [ ] **Step 2: Reject legacy League Chat deep links**

Change the deep link type/API so only Help Board links are stored and emitted. If compatibility requires a broader input type, ignore `tab !== 'help'` immediately and do not set `pendingLink`.

- [ ] **Step 3: Remove Home League unread badge**

Remove `useLeagueChatUnread`, `formatLeagueChatUnreadBadge`, `homeLeagueChatUnreadCount`, and both `home-league-chat-unread-badge` render branches.

## Task 4: Notification Visibility And Navigation

**Files:**
- Modify: `app/user_notifications.ts`
- Modify: `components/NotificationCenterButton.tsx`

- [ ] **Step 1: Add visibility helper**

In `app/user_notifications.ts`, import `LEAGUE_CHAT_ENABLED` and add:

```ts
export function isUserNotificationVisible(row: UserNotification): boolean {
  if (!LEAGUE_CHAT_ENABLED && row.type === 'league_chat_reply') return false;
  if (!LEAGUE_CHAT_ENABLED && row.nav?.kind === 'league_chat') return false;
  return true;
}
```

- [ ] **Step 2: Filter displayed/cache-fed lists in NotificationCenterButton**

Apply `isUserNotificationVisible` before `setItems`, unread counts, empty-state checks, mark-read IDs, and selected lookup.

- [ ] **Step 3: Remove League Chat navigation action**

Remove the `nav.kind === 'league_chat'` branch from `openNotification`. Help Board and friends/report behavior remain unchanged.

## Task 5: Achievement Compatibility

**Files:**
- Create: `app/league_chat_availability.ts`
- Modify: `app/achievements.ts`
- Modify: `app/achievements_screen.tsx`
- Modify: `tests/achievements.test.ts`

- [ ] **Step 1: Add availability helpers**

Create:

```ts
export const LEAGUE_CHAT_ENABLED = false as const;
export const LEAGUE_CHAT_ACHIEVEMENT_IDS = new Set([
  'league_chat_first',
  'league_chat_10',
  'league_chat_50',
  'league_chat_100',
]);
export function isLeagueChatAchievementId(id: string): boolean {
  return LEAGUE_CHAT_ACHIEVEMENT_IDS.has(id);
}
export function isLeagueChatAchievementVisible(id: string, unlocked: boolean): boolean {
  return LEAGUE_CHAT_ENABLED || !isLeagueChatAchievementId(id) || unlocked;
}
```

- [ ] **Step 2: Guard unlock logic**

In `backfillAchievementsFromLocalState`, skip chat counter unlock checks when `LEAGUE_CHAT_ENABLED` is false. In `checkAchievements`, make `league_chat_message` break without bumping/unlocking when disabled.

- [ ] **Step 3: Filter achievements screen**

Use `isLeagueChatAchievementVisible(a.id, !!stateMap.get(a.id)?.unlockedAt)` for visible definitions, category totals, header totals, nearest locked list, and selection safety. Do not hide unlocked rows or pending shard rewards.

- [ ] **Step 4: Keep counters and cloud sync keys**

Do not delete `achievement_league_chat_message_count` from `app/cloud_sync.ts` or storage key lists.

## Task 6: Verification And Advisor Review

**Files:**
- All touched files from prior tasks.

- [ ] **Step 1: Run focused tests**

Run:

```bash
npx jest tests/league_club_hub_contract.test.ts tests/league_chat_unread_badge_contract.test.ts tests/help_board_contract.test.ts tests/header_theme_accent_buttons.test.ts tests/achievements.test.ts --runInBand
```

Expected: PASS.

- [ ] **Step 2: Run source hygiene checks**

Run:

```bash
git diff --check
rg -n "LeagueChatPanel|useLeagueChatUnread|openChat|LeagueClubHero" app/club_screen.tsx components/CommunityChatHubButton.tsx "app/(tabs)/home.tsx"
rg -n "openCommunityHub\\(\\{ tab: 'league'|home-league-chat-unread-badge|home-community-chat-unread-badge" app components tests
```

Expected: no active-surface hits except dormant source/tests intentionally preserved.

- [ ] **Step 3: Check Metro**

Run:

```bash
curl.exe -s http://localhost:8085/status
```

Expected: `packager-status:running` or a clear note that Metro must be restarted.

- [ ] **Step 4: Final advisor review**

Send objective, constraints, touched paths, final diff summary, exact tests, and source hygiene results to `/root/advisor`. Completion requires `DECISION: APPROVED`.

## Self-Review

- Spec coverage: banner order, Club Center removal, active League Chat disable, Help Board preservation, notifications/deep links, achievement preservation/filtering, and focused verification all have tasks.
- Placeholder scan: no TBD/TODO/fill-later steps remain.
- Type consistency: shared helpers use `LEAGUE_CHAT_ENABLED`, `isLeagueChatAchievementId`, and `isLeagueChatAchievementVisible` consistently across achievements and UI.
