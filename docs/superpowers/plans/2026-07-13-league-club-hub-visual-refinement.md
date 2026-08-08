# League Club Hub Visual Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Сделать экран Лиги компактным центром клуба с подиумом сверху, безопасными публичными именами, заметным чатом и единственной общей недельной целью без дублирующих карточек.

**Architecture:** Приватность реализуется чистой presentation-функцией, не меняющей Firestore или исходные объекты. Экран продолжает использовать cache-first данные и `Reanimated.FlatList`; удаляются только явно отклонённые пользователем презентационные блоки, а действия профиля, чата, буста, лайка и награды переносятся в оставшиеся компоненты.

**Tech Stack:** React Native, Expo Router, TypeScript, Jest contract/unit tests, React Native Reanimated.

---

### Task 1: Единое безопасное публичное имя

**Files:**
- Create: `app/league_public_name.ts`
- Create: `tests/league_public_name.test.ts`
- Modify: `app/league_club_hub_model.ts`

- [ ] **Step 1: Write the failing unit tests**

```ts
import { leaguePublicName } from '../app/league_public_name';

expect(leaguePublicName('Анна', 'uid-42')).toBe('Анна');
expect(leaguePublicName('person@example.com', 'stable-uid')).toMatch(/^Игрок \d{4}$/);
expect(leaguePublicName(' person@example.com ', 'stable-uid')).toBe(leaguePublicName('', 'stable-uid'));
expect(leaguePublicName('first@second', 'stable-uid')).not.toContain('@');
expect(leaguePublicName('', 'stable-uid')).toBe(leaguePublicName('', 'stable-uid'));
```

- [ ] **Step 2: Run the test and verify RED**

Run: `npx jest tests/league_public_name.test.ts --runInBand`

Expected: FAIL because `app/league_public_name.ts` does not exist.

- [ ] **Step 3: Implement the minimal presentation helper**

```ts
export function leaguePublicName(rawName: unknown, stableKey: unknown): string {
  const candidate = typeof rawName === 'string' ? rawName.trim() : '';
  if (candidate && !looksLikeEmail(candidate)) return candidate;
  return `Игрок ${stableFourDigits(stableKey)}`;
}
```

The helper must use a deterministic small string hash, return four digits, and never rewrite source data. `buildLeaguePodium` must call it using `uid ?? botId ?? name` as the stable key.

- [ ] **Step 4: Run the unit tests and verify GREEN**

Run: `npx jest tests/league_public_name.test.ts tests/league_club_hub_model.test.ts --runInBand`

Expected: PASS with no email in podium names.

### Task 2: Lock the refined composition with failing contracts

**Files:**
- Modify: `tests/league_club_hub_contract.test.ts`
- Modify: `tests/league_xp_promotion_remote_mode_contract.test.ts`

- [ ] **Step 1: Replace obsolete activity/swipe expectations**

Add source contracts that assert:

```ts
expect(screen.indexOf('<LeaguePodium')).toBeLessThan(screen.indexOf('<LeagueClubHero'));
expect(screen).not.toContain('<LeagueActivityPreview');
expect(screen).not.toContain('leaguePreviewPanResponder');
expect(screen).not.toContain('league-current-icon');
expect(screen).toContain('<LeagueBonusMission');
expect(screen).toContain('<Reanimated.FlatList');
expect(screen).toContain('leaguePublicName');
expect(hero).toContain('testID="league-club-chat-action"');
expect(hero).toContain('minHeight: 44');
expect(row).not.toContain('promotionPill');
expect(row).not.toContain('promotionText');
```

Keep the remote promotion test ID by moving `xpPromotionBadgeTestID` onto the existing place/arrow indicator instead of a text pill.

- [ ] **Step 2: Run the focused contract and verify RED**

Run: `npx jest tests/league_club_hub_contract.test.ts tests/league_xp_promotion_remote_mode_contract.test.ts --runInBand`

Expected: FAIL because the old swipe card, activity preview and promotion pill are still rendered.

### Task 3: Refine podium, club center and participant rows

**Files:**
- Modify: `components/league/LeagueClubHero.tsx`
- Modify: `components/league/LeaguePodium.tsx`
- Modify: `components/league/LeagueLeaderboardRow.tsx`

- [ ] **Step 1: Make chat an explicit hero action**

Replace the adaptive `help_club` CTA with a permanent `Чат Лиги` `Pressable`, unread badge and `testID="league-club-chat-action"`. Keep `minHeight: 44`, dark `palette.accentText` on the lime surface, and route only to `open_chat`. Keep compact rank, weekly XP and goal percent metrics; remove crown/boost live chips.

- [ ] **Step 2: Align the podium**

Use the existing order `[2, 1, 3]`, but render every person with the same padding, avatar container and avatar size:

```ts
style={styles.person}
renderAvatar(member, 58)
avatar: { width: 64, height: 64, borderRadius: 32 }
podiumRow: { alignItems: 'flex-start' }
```

Remove `firstPerson`, `firstAvatar`, and first-place accent border. Keep the real aura supplied by `renderAvatar`, place number, weekly points, `Вы`, profile action and crown state.

- [ ] **Step 3: Compact participant rows**

Set row geometry to approximately `minHeight: 68`, `borderRadius: 16`, `paddingVertical: 7`, `marginBottom: 4`. Remove the textual promotion pill while keeping place color and up/down arrow. Attach `xpPromotionBadgeTestID` to `placeColumn` so the existing remote-config contract remains observable.

- [ ] **Step 4: Run the contracts and verify the component-level GREEN state**

Run: `npx jest tests/league_club_hub_contract.test.ts tests/league_xp_promotion_remote_mode_contract.test.ts --runInBand`

Expected: component assertions pass; screen composition assertions may remain RED until Task 4.

### Task 4: Recompose the League screen without losing actions

**Files:**
- Modify: `app/club_screen.tsx`
- Modify: `components/league/LeagueBonusMission.tsx`
- Modify: `components/LeagueChatPanel.tsx`

- [ ] **Step 1: Remove rejected presentation paths**

Remove `PanResponder`, league swipe-preview imports/state/effects/constants/JSX, activity-preview imports/model/handlers/JSX, and the duplicated legacy bonus card. Do not remove chat modal, result modal, profile modal, boost state/subscription, purchase, like, claim or crown state.

- [ ] **Step 2: Create sanitized presentation members**

Build a memoized array from the sorted group:

```ts
const publicSortedGroup = useMemo(
  () => sortedGroup.map((member) => ({
    ...member,
    name: leaguePublicName(member.name, member.uid ?? member.botId ?? member.name),
  })),
  [sortedGroup],
);
```

Use it for podium, participant rows, contributor names, accessibility labels and profile payloads. Sanitize rank-change names, crown winner and boost buyer at the last presentation boundary while retaining UID-based identity and all original data writes.

- [ ] **Step 3: Render the approved order**

Inside the list header render exactly: operational banners, `LeaguePodium`, compact `LeagueClubHero`, `LeagueQuickStats`, one `LeagueBonusMission`, then participant heading. Keep `data={publicSortedGroup}`, `keyExtractor`, `renderItem`, cache-first hydration and virtualization settings.

- [ ] **Step 4: Preserve boost buyer profile and like actions in the mission**

Extend `LeagueBonusMission` with `onOpenBoostBuyer` and separate `onLikeBoost`. When a boost is active, the buyer name opens the same sanitized profile payload and the heart button invokes the existing optimistic like handler with its count/disabled state. When absent, the single `Ускорить весь клуб` control invokes purchase. Claim remains separate.

- [ ] **Step 5: Sanitize League chat presentation**

Use `leaguePublicName` for rendered `authorName`, reply labels and the author profile callback, while keeping message identity and reply storage unchanged.

- [ ] **Step 6: Run focused tests and verify GREEN**

Run: `npx jest tests/league_public_name.test.ts tests/league_club_hub_model.test.ts tests/league_club_hub_contract.test.ts tests/league_xp_promotion_remote_mode_contract.test.ts tests/league_chat_author_card_open.test.ts tests/league_chat_unread_badge_contract.test.ts --runInBand`

Expected: PASS.

### Task 5: Final verification and review

**Files:**
- Verify all modified paths above.

- [ ] **Step 1: Run focused TypeScript/Jest verification**

Run the focused Jest command from Task 4, then the repository's narrow TypeScript command if available. Run `git diff --check` and inspect `git diff --stat` plus the actual diff.

- [ ] **Step 2: Verify acceptance criteria in source**

Confirm podium precedes hero, no swipe/activity/duplicate legacy goal remains, chat target is >=44 px, all display-name paths sanitize emails, FlatList remains, boost/profile/like/claim callbacks remain wired, and lime surfaces use dark foreground.

- [ ] **Step 3: Request final Advisor review**

Send the approved spec, affected paths, final diff and fresh verification output. Apply all Critical/Important findings and resubmit until the Advisor returns `DECISION: APPROVED`.

- [ ] **Step 4: Commit only League refinement files**

Stage explicit paths so unrelated dirty workspace changes are preserved. Commit with `feat: refine league club hub mobile layout`.
