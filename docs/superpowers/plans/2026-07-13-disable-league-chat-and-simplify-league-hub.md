# Disable League Chat And Simplify League Hub Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the league XP promotion banner to the top of the League screen, remove the Center Club block, and disable League Chat from active app surfaces while keeping Help Board and historical earned chat achievements safe.

**Architecture:** Add one small static availability module for League Chat compatibility decisions. Active UI surfaces stop importing League Chat panels/unread subscriptions. Achievement and notification compatibility stays data-preserving: old earned rewards remain visible, locked chat achievements and dead League Chat notifications are filtered out.

**Tech Stack:** Expo React Native, TypeScript, Jest contract tests, local source-inspection contracts.

---

## File Map

- Create `app/league_chat_availability.ts`: single source of truth for disabled League Chat, hidden achievement ids, and small pure helpers.
- Modify `app/club_screen.tsx`: remove League Chat modal/direct-open/unread/Center Club imports and render path; move `league-xp-promotion-banner` before `LeaguePodium`.
- Modify `components/CommunityChatHubButton.tsx`: keep the home community button and modal, but make it Help Board-only with no League Chat imports, tabs, unread badge, or league deep-link state.
- Modify `app/community_hub_deeplink.ts`: accept Help Board links only; reject or ignore legacy league links without storing pending navigation.
- Modify `app/(tabs)/home.tsx`: remove League Chat unread imports, hook call, and league tile unread badges.
- Modify `components/NotificationCenterButton.tsx`: hide `league_chat_reply` rows and make `nav.kind === 'league_chat'` a no-op.
- Inspect and modify `components/AppMessagesInbox.tsx` only if it displays active user notification rows for `league_chat_reply`.
- Modify `app/achievements.ts`: skip stored-counter and event-based unlocking for League Chat achievements while the availability flag is false.
- Modify `app/achievements_screen.tsx`: filter locked League Chat achievements out of lists/search/category/total counts while keeping unlocked or pending rewards visible.
- Update or replace tests:
  - `tests/league_chat_unread_badge_contract.test.ts`
  - `tests/league_club_hub_contract.test.ts`
  - `tests/league_xp_promotion_remote_mode_contract.test.ts`
  - `tests/help_board_contract.test.ts`
  - `tests/home_social_notifications_contract.test.ts`
  - `tests/achievements.test.ts`
  - new or focused contract for achievement-screen filtering if no existing coverage fits.

## Task 1: Write Disabled-Chat Contracts First

**Files:**
- Create or modify: `tests/league_chat_disabled_contract.test.ts`
- Modify: `tests/league_chat_unread_badge_contract.test.ts`
- Modify: `tests/league_club_hub_contract.test.ts`
- Modify: `tests/league_xp_promotion_remote_mode_contract.test.ts`
- Modify: `tests/home_social_notifications_contract.test.ts`

- [ ] **Step 1: Add a source contract for active UI surfaces**

Add checks that assert:

```ts
const club = read('app/club_screen.tsx');
expect(club).not.toContain('LeagueChatPanel');
expect(club).not.toContain('useLeagueChatUnread');
expect(club).not.toContain('LeagueClubHero');
expect(club).not.toContain('openChat');
expect(club.indexOf('testID="league-xp-promotion-banner"')).toBeGreaterThan(-1);
expect(club.indexOf('testID="league-xp-promotion-banner"')).toBeLessThan(club.indexOf('<LeaguePodium'));
expect(club).toContain('<LeagueBonusMission');

const home = read('app/(tabs)/home.tsx');
expect(home).not.toContain('useLeagueChatUnread');
expect(home).not.toContain('home-league-chat-unread-badge');

const hub = read('components/CommunityChatHubButton.tsx');
expect(hub).toContain('HelpBoardPanel');
expect(hub).not.toContain('LeagueChatPanel');
expect(hub).not.toContain('useLeagueChatUnread');
expect(hub).not.toContain('community-chat-league-tab');
```

- [ ] **Step 2: Add deep-link and notification contracts**

Assert that:

```ts
const deeplink = read('app/community_hub_deeplink.ts');
expect(deeplink).not.toContain("tab: 'league'");
expect(deeplink).toContain("tab: 'help'");

const notifications = read('components/NotificationCenterButton.tsx');
expect(notifications).toContain('isUserNotificationVisible');
expect(notifications).not.toContain("openCommunityHub({ tab: 'league'");
```

- [ ] **Step 3: Run focused tests and confirm they fail**

Run:

```bash
npx jest tests/league_chat_disabled_contract.test.ts tests/league_chat_unread_badge_contract.test.ts tests/league_club_hub_contract.test.ts tests/league_xp_promotion_remote_mode_contract.test.ts tests/home_social_notifications_contract.test.ts --runInBand
```

Expected: FAIL because current source still imports/renders League Chat, Center Club, unread badges, and league deep links.

## Task 2: Add Compatibility Helpers

**Files:**
- Create: `app/league_chat_availability.ts`
- Modify: `app/user_notifications.ts`

- [ ] **Step 1: Add the feature flag and helpers**

Create:

```ts
export const LEAGUE_CHAT_ENABLED = false as const;

export const LEAGUE_CHAT_ACHIEVEMENT_IDS = new Set<string>([
  'league_chat_first',
  'league_chat_10',
  'league_chat_50',
  'league_chat_100',
]);

export function isLeagueChatAchievementId(id: string): boolean {
  return LEAGUE_CHAT_ACHIEVEMENT_IDS.has(id);
}

export function shouldShowLeagueChatAchievement(id: string, unlocked: boolean): boolean {
  return LEAGUE_CHAT_ENABLED || !isLeagueChatAchievementId(id) || unlocked;
}

export function isLeagueChatNotificationType(type: string): boolean {
  return type === 'league_chat_reply';
}
```

- [ ] **Step 2: Add visible notification helper**

In `app/user_notifications.ts`, add:

```ts
import { LEAGUE_CHAT_ENABLED, isLeagueChatNotificationType } from './league_chat_availability';

export function isUserNotificationVisible(notification: Pick<UserNotification, 'type'>): boolean {
  return LEAGUE_CHAT_ENABLED || !isLeagueChatNotificationType(notification.type);
}
```

Use the local exported notification type name that already exists in the file.

## Task 3: Simplify Active League And Help Board UI

**Files:**
- Modify: `app/club_screen.tsx`
- Modify: `components/CommunityChatHubButton.tsx`
- Modify: `app/community_hub_deeplink.ts`
- Modify: `app/(tabs)/home.tsx`

- [ ] **Step 1: Remove League Chat and Center Club from League screen**

Delete the imports and state/effects for `LeagueChatPanel`, `useLeagueChatUnread`, `LeagueClubHero`, `buildLeagueClubHeroModel`, `openChat`, and modal-only chat profile state that has no remaining consumer.

- [ ] **Step 2: Move XP promotion banner**

Render the `league-xp-promotion-banner` conditional block before `<LeaguePodium ... />`. Keep the existing banner markup and testID unchanged.

- [ ] **Step 3: Keep mission and participants intact**

Leave `LeagueBonusMission`, boost, like, reward, podium profile opening, crown logic, and the virtualized participants list wired as before.

- [ ] **Step 4: Make the community button Help Board-only**

Remove League Chat imports, league tab state, unread hook, unread badge, and `LeagueChatPanel`. Keep `HelpBoardPanel`, the modal shell, and Help Board deep-link handling.

- [ ] **Step 5: Reject legacy league deep links**

Change `CommunityHubDeepLink` to `{ tab: 'help'; topicId: string; commentId?: string }`. Make any call path with legacy league data return without setting a pending link.

- [ ] **Step 6: Remove home league unread badges**

Delete `formatLeagueChatUnreadBadge`, `useLeagueChatUnread`, `homeLeagueChatUnreadCount`, and both `home-league-chat-unread-badge` render blocks.

## Task 4: Hide Dead Notifications And Preserve Help Board

**Files:**
- Modify: `components/NotificationCenterButton.tsx`
- Modify: `components/AppMessagesInbox.tsx` if inspection confirms it renders `league_chat_reply`
- Modify: `tests/home_social_notifications_contract.test.ts`
- Modify: `tests/help_board_contract.test.ts`

- [ ] **Step 1: Filter notification rows and counts**

Use `isUserNotificationVisible` before rendering notification rows and before calculating the visible unread count/badge in `NotificationCenterButton`.

- [ ] **Step 2: Make `league_chat` navigation no-op**

Remove the `openCommunityHub({ tab: 'league', messageId })` call. If the old type remains for data compatibility, leave it as an ignored branch.

- [ ] **Step 3: Keep Help Board notification navigation**

Leave `help_board_comment`, `help_board_reply`, and `help_board_like` icons/copy/navigation behavior intact.

## Task 5: Achievement Compatibility

**Files:**
- Modify: `app/achievements.ts`
- Modify: `app/achievements_screen.tsx`
- Modify: `tests/achievements.test.ts`
- Add or modify: `tests/achievements_screen_contract.test.ts`

- [ ] **Step 1: Prevent new chat unlocks**

Import `LEAGUE_CHAT_ENABLED` and guard the stored chat counter unlock block and `league_chat_message` event block so they do not call `unlock`/`u` while false. Preserve the counter key and existing stored value.

- [ ] **Step 2: Filter locked chat achievements from the screen**

Import `shouldShowLeagueChatAchievement` into `achievements_screen.tsx`. Build achievement lists and totals from definitions whose state is unlocked/pending or whose id is not a disabled League Chat id.

- [ ] **Step 3: Add tests**

Add or update tests to assert:

```ts
await checkAchievements({ type: 'league_chat_message' });
expect(unlockedIds).not.toContain('league_chat_first');
```

For screen/source contract, assert that `achievements_screen.tsx` imports `shouldShowLeagueChatAchievement` and uses it before total/category/list generation.

## Task 6: Verify, Commit, And Review

**Files:**
- All touched files

- [ ] **Step 1: Run focused verification**

Run:

```bash
npx jest tests/league_chat_disabled_contract.test.ts tests/league_chat_unread_badge_contract.test.ts tests/league_club_hub_contract.test.ts tests/league_xp_promotion_remote_mode_contract.test.ts tests/home_social_notifications_contract.test.ts tests/help_board_contract.test.ts tests/achievements.test.ts --runInBand
```

- [ ] **Step 2: Run source safety checks**

Run:

```bash
git diff --check
git diff -- app/club_screen.tsx components/CommunityChatHubButton.tsx app/community_hub_deeplink.ts "app/(tabs)/home.tsx" components/NotificationCenterButton.tsx app/user_notifications.ts app/achievements.ts app/achievements_screen.tsx tests
```

- [ ] **Step 3: Commit scoped changes only**

Stage only files touched for this feature. Do not stage unrelated existing dirty files.

```bash
git status --short
git add app/league_chat_availability.ts app/user_notifications.ts app/club_screen.tsx components/CommunityChatHubButton.tsx app/community_hub_deeplink.ts "app/(tabs)/home.tsx" components/NotificationCenterButton.tsx app/achievements.ts app/achievements_screen.tsx tests/league_chat_disabled_contract.test.ts tests/league_chat_unread_badge_contract.test.ts tests/league_club_hub_contract.test.ts tests/league_xp_promotion_remote_mode_contract.test.ts tests/home_social_notifications_contract.test.ts tests/help_board_contract.test.ts tests/achievements.test.ts
git diff --cached --check
git commit -m "feat: disable league chat surfaces"
```

- [ ] **Step 4: Advisor final review**

Send final diff, affected paths, and verification evidence to `advisor`. Completion is allowed only after `DECISION: APPROVED`.

## Acceptance Criteria

- League screen top order is XP promotion banner, podium, rank-change banner, weekly goal, participants.
- Center Club and League Chat are absent from active League screen.
- Home community entry opens Help Board only.
- Active app surfaces no longer import League Chat panel or unread hook.
- Home league tile has no League Chat unread badge.
- Help Board links and notifications still work.
- League Chat links/notifications do not open dead UI and user-visible `league_chat_reply` rows are hidden.
- Earned League Chat achievements remain visible/claimable; locked ones are hidden and excluded from totals.
- `league_chat_message` no longer unlocks chat achievements while disabled.
- Focused tests pass, staged diff is clean, and advisor final review approves.
