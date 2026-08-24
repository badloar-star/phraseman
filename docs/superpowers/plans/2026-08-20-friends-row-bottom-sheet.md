# Friends Row and Bottom Sheet Simplification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the dense Friends list row with separate avatar/profile and row/details targets, while moving every existing friend action and state into one accessible bottom sheet.

**Architecture:** Extract the minimal row into a focused presentational component with two sibling press targets. Expand the existing `FriendTogetherSheet` into the single friend-details surface with optional Together data, so the row/details interaction remains available when the Together kill switch is off. Keep all network, economy, navigation, confirmation, and optimistic handlers in `app/(tabs)/friends.tsx` as the source of truth.

**Tech Stack:** React Native 0.81, Expo Router, TypeScript, `HybridSheetShell`, `PressableHybrid`, React Native Testing Library, Jest, ESLint text-integrity guard.

**Approved design:** `docs/superpowers/specs/2026-08-20-friends-row-bottom-sheet-design.md`

**Workspace constraint:** Work in the current checkout. Do not create a worktree or branch. The tree contains unrelated staged Arena files; every commit below names every intended path after `git commit --only` so those files remain staged and untouched.

---

## File Map

- Create `components/friends_together/FriendListRow.tsx`: minimal list presentation and the two independent press targets only.
- Modify `components/friends_together/FriendTogetherSheet.tsx`: optional Together hero, large state messages, large vertical actions, and general-details fallback.
- Modify `app/(tabs)/friends.tsx`: select a friend for the sheet and route existing handlers into the new components.
- Create `tests/friend_list_row.test.tsx`: interaction and accessibility tests for avatar versus row body.
- Create `tests/friend_together_sheet.test.tsx`: render and interaction tests for the expanded sheet.
- Modify `jest.rntl.config.cjs`: include both new RNTL suites.
- Modify `tests/friends_tab_gift_interaction_contract.test.ts`: guard removal of the compact action cluster and preservation of handler wiring.
- Modify `tests/friends_together_ui_contract.test.ts`: guard optional Together fallback and vertical action geometry.
- Modify `config/text-integrity-baseline.json` only if focused ESLint reports a stale `friends.tsx` or new-component baseline entry; shrink only the exact obsolete entries.

### Task 1: Build the minimal friend row with independent targets

**Files:**
- Create: `components/friends_together/FriendListRow.tsx`
- Create: `tests/friend_list_row.test.tsx`
- Modify: `jest.rntl.config.cjs`

- [ ] **Step 1: Add the new test file to the RNTL config**

Add this exact entry to `testMatch` in `jest.rntl.config.cjs`:

```js
'<rootDir>/tests/friend_list_row.test.tsx',
```

- [ ] **Step 2: Write the failing row interaction tests**

Create `tests/friend_list_row.test.tsx` with mocks for `AvatarView`,
`ThemeContext`, and `LangContext`, then render the component with these core
assertions:

```tsx
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import FriendListRow from '../components/friends_together/FriendListRow';

jest.mock('../components/AvatarView', () => {
  const React = require('react');
  const { View } = require('react-native');
  return (props: any) => React.createElement(View, { testID: 'mock-avatar', ...props });
});
jest.mock('../components/ThemeContext', () => ({
  useTheme: () => ({
    theme: { bgSurface: '#202829', textPrimary: '#f7f8f7', textSecond: '#b5bfbd', textMuted: '#899391' },
    f: { body: 16, sub: 14 },
  }),
}));
jest.mock('../components/LangContext', () => ({ useLang: () => ({ lang: 'ru' }) }));

const baseProps = {
  friendUid: 'friend-1',
  friendName: 'Алексей Очень Длинное Имя',
  avatar: 'avatar-1',
  totalXp: 420,
  auraId: undefined,
  daysTogether: 14,
};

describe('FriendListRow', () => {
  it('routes avatar and row body to different callbacks', () => {
    const onOpenProfile = jest.fn();
    const onOpenDetails = jest.fn();
    const screen = render(
      <FriendListRow {...baseProps} onOpenProfile={onOpenProfile} onOpenDetails={onOpenDetails} />,
    );

    fireEvent.press(screen.getByTestId('friend-row-avatar-friend-1'));
    expect(onOpenProfile).toHaveBeenCalledTimes(1);
    expect(onOpenDetails).not.toHaveBeenCalled();

    fireEvent.press(screen.getByTestId('friend-row-body-friend-1'));
    expect(onOpenDetails).toHaveBeenCalledTimes(1);
    expect(onOpenProfile).toHaveBeenCalledTimes(1);
  });

  it('shows only name, one relationship line, and disclosure affordance', () => {
    const screen = render(
      <FriendListRow {...baseProps} onOpenProfile={jest.fn()} onOpenDetails={jest.fn()} />,
    );
    expect(screen.getByText('Алексей Очень Длинное Имя')).toBeTruthy();
    expect(screen.getByText('14 дней вместе')).toBeTruthy();
    expect(screen.queryByTestId('friend-row-actions-friend-1')).toBeNull();
    expect(screen.getByTestId('friend-row-avatar-friend-1').props.accessibilityRole).toBe('button');
    expect(screen.getByTestId('friend-row-body-friend-1').props.accessibilityRole).toBe('button');
  });
});
```

Also read the component source in the second test and assert it contains no
`numberOfLines`, contains `minWidth: 0`, and contains no `friend-row-actions-`,
so long names reflow without reintroducing a compact cluster.

- [ ] **Step 3: Run the tests to verify RED**

Run:

```powershell
npx jest --config jest.rntl.config.cjs tests/friend_list_row.test.tsx --runInBand --no-cache
```

Expected: FAIL because `FriendListRow` does not exist.

- [ ] **Step 4: Implement the focused row component**

Create `components/friends_together/FriendListRow.tsx` with this public
contract and structure:

```tsx
export interface FriendListRowProps {
  friendUid: string;
  friendName: string;
  avatar: string;
  totalXp: number;
  auraId?: string;
  daysTogether: number | null;
  onOpenProfile: () => void;
  onOpenDetails: () => void;
}

export default function FriendListRow(props: FriendListRowProps) {
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const relationship = props.daysTogether === null
    ? triLang(lang as any, {
        ru: 'Ваш друг', uk: 'Ваш друг', es: 'Tu amigo', 'pt-BR': 'Seu amigo',
        vi: 'Bạn của bạn', id: 'Temanmu', tr: 'Arkadaşın', pl: 'Twój znajomy',
      })
    : triLang(lang as any, {
        ru: `${props.daysTogether} дней вместе`, uk: `${props.daysTogether} днів разом`,
        es: `${props.daysTogether} días juntos`, 'pt-BR': `${props.daysTogether} dias juntos`,
        vi: `${props.daysTogether} ngày cùng nhau`, id: `${props.daysTogether} hari bersama`,
        tr: `${props.daysTogether} gün birlikte`, pl: `${props.daysTogether} dni razem`,
      });

  return (
    <View testID={`friend-row-${props.friendUid}`} style={[styles.card, { backgroundColor: t.bgSurface }]}> 
      <Pressable
        testID={`friend-row-avatar-${props.friendUid}`}
        onPress={props.onOpenProfile}
        accessibilityRole="button"
        accessibilityLabel={triLang(lang as any, {
          ru: `Открыть профиль ${props.friendName}`, uk: `Відкрити профіль ${props.friendName}`,
          es: `Abrir perfil de ${props.friendName}`, 'pt-BR': `Abrir perfil de ${props.friendName}`,
          vi: `Mở hồ sơ ${props.friendName}`, id: `Buka profil ${props.friendName}`,
          tr: `${props.friendName} profilini aç`, pl: `Otwórz profil ${props.friendName}`,
        })}
        style={styles.avatarTarget}
      >
        <AvatarView avatar={props.avatar} totalXP={props.totalXp} size={56} auraId={props.auraId} />
      </Pressable>
      <Pressable
        testID={`friend-row-body-${props.friendUid}`}
        onPress={props.onOpenDetails}
        accessibilityRole="button"
        accessibilityLabel={triLang(lang as any, {
          ru: `Открыть действия с ${props.friendName}`, uk: `Відкрити дії з ${props.friendName}`,
          es: `Abrir acciones con ${props.friendName}`, 'pt-BR': `Abrir ações com ${props.friendName}`,
          vi: `Mở hành động với ${props.friendName}`, id: `Buka tindakan dengan ${props.friendName}`,
          tr: `${props.friendName} ile işlemleri aç`, pl: `Otwórz działania z ${props.friendName}`,
        })}
        style={styles.bodyTarget}
      >
        <View style={styles.identity}>
          <FlowText testID={`friend-row-name-${props.friendUid}`} provenance="user" style={{ color: t.textPrimary, fontSize: Math.max(16, f.body), fontWeight: '700' }}>
            {props.friendName}
          </FlowText>
          <FlowText testID={`friend-row-relationship-${props.friendUid}`} provenance="authored" style={{ color: t.textSecond, fontSize: Math.max(14, f.sub), fontWeight: '400' }}>
            {relationship}
          </FlowText>
        </View>
        <Ionicons name="chevron-forward" size={24} color={t.textMuted} accessibilityElementsHidden />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { minHeight: 84, borderRadius: 18, marginBottom: 10, padding: 8, flexDirection: 'row', alignItems: 'stretch' },
  avatarTarget: { width: 68, minHeight: 68, alignItems: 'center', justifyContent: 'center' },
  bodyTarget: { flex: 1, minWidth: 0, minHeight: 68, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center' },
  identity: { flex: 1, minWidth: 0, gap: 4 },
});
```

Use the exact imports required by this code: `Pressable`, `StyleSheet`, `View`,
`Ionicons`, `AvatarView`, `FlowText`, `useTheme`, `useLang`, and `triLang`.
Do not add rank, badges, progress bars, or action icons.

- [ ] **Step 5: Run the row tests to verify GREEN**

Run the command from Step 3.

Expected: 1 suite PASS, 2 tests PASS.

- [ ] **Step 6: Commit only the row unit**

```powershell
git add -- components/friends_together/FriendListRow.tsx tests/friend_list_row.test.tsx jest.rntl.config.cjs
git commit --only -m "feat: add minimal friend list row" -- components/friends_together/FriendListRow.tsx tests/friend_list_row.test.tsx jest.rntl.config.cjs
```

### Task 2: Expand the bottom sheet into the complete friend-details surface

**Files:**
- Modify: `components/friends_together/FriendTogetherSheet.tsx`
- Create: `tests/friend_together_sheet.test.tsx`
- Modify: `jest.rntl.config.cjs`
- Modify: `tests/friends_together_ui_contract.test.ts`

- [ ] **Step 1: Register and write failing sheet tests**

Add this `testMatch` entry:

```js
'<rootDir>/tests/friend_together_sheet.test.tsx',
```

Create `tests/friend_together_sheet.test.tsx` with this preamble, followed by
the two cases below:

```tsx
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import FriendTogetherSheet from '../components/friends_together/FriendTogetherSheet';

jest.mock('../components/modal_fx/HybridSheetShell', () => {
  const React = require('react');
  const { View } = require('react-native');
  return ({ visible, children, testID }: any) => visible
    ? React.createElement(View, { testID }, children)
    : null;
});
jest.mock('../components/PressableHybrid', () => {
  const React = require('react');
  const { Pressable } = require('react-native');
  return ({ children, onPress, disabled, ...props }: any) => React.createElement(
    Pressable,
    { onPress: disabled ? undefined : onPress, disabled, ...props },
    children,
  );
});
jest.mock('../components/AvatarView', () => {
  const React = require('react');
  const { View } = require('react-native');
  return (props: any) => React.createElement(View, { testID: `avatar-${props.avatar}` });
});
jest.mock('../components/text-integrity', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return { FlowText: ({ children, ...props }: any) => React.createElement(Text, props, children) };
});
jest.mock('../components/ThemeContext', () => ({
  useTheme: () => ({
    theme: {
      accent: '#d8f45a', accentBg: '#344015', bgSurface2: '#283233',
      textPrimary: '#f5f7f6', textSecond: '#b4bfbd', textMuted: '#899391',
      gold: '#d7ad42', goldBg: '#443818', wrong: '#f29595', wrongBg: '#4a2929',
      correct: '#80d6a3', correctBg: '#183b28',
    },
    f: { h3: 22, body: 16, sub: 14 },
  }),
}));
jest.mock('../components/LangContext', () => ({ useLang: () => ({ lang: 'ru' }) }));
```

Test these two cases:

```tsx
it('exposes every action as a full-width control when Together data exists', () => {
  const handlers = {
    onNudge: jest.fn(), onGift: jest.fn(), onHighFive: jest.fn(),
    onDuel: jest.fn(), onDelete: jest.fn(), onClose: jest.fn(),
  };
  const screen = render(
    <FriendTogetherSheet
      visible friendName="Алексей" friendUid="friend-1" friendAvatar="a" friendTotalXp={400}
      myAvatar="me" myTotalXp={900} weeklyXp={120} streak={7} rank={2} highFived={false}
      together={{ days: 14, level: 2, progressPercent: 66, nextLevelName: 'Близкие', nudged: false, learnedToday: false, incomingNudge: true, giftReady: true }}
      {...handlers}
    />,
  );
  expect(screen.getByTestId('friend-together-sheet-weekly-xp')).toBeTruthy();
  expect(screen.getByTestId('friend-together-sheet-streak')).toBeTruthy();
  expect(screen.getByTestId('friend-together-sheet-rank')).toBeTruthy();
  expect(screen.getByTestId('friend-together-sheet-status-nudge')).toBeTruthy();
  expect(screen.getByTestId('friend-together-sheet-status-gift')).toBeTruthy();
  for (const id of ['nudge', 'gift', 'high-five', 'duel', 'delete']) {
    fireEvent.press(screen.getByTestId(`friend-together-sheet-${id}`));
  }
  expect(handlers.onNudge).toHaveBeenCalledTimes(1);
  expect(handlers.onGift).toHaveBeenCalledTimes(1);
  expect(handlers.onHighFive).toHaveBeenCalledTimes(1);
  expect(handlers.onDuel).toHaveBeenCalledTimes(1);
  expect(handlers.onDelete).toHaveBeenCalledTimes(1);
});

it('keeps general friend actions when Together is disabled', () => {
  const screen = render(
    <FriendTogetherSheet
      visible friendName="Алексей" friendUid="friend-1" friendAvatar="a" friendTotalXp={400}
      myAvatar="me" myTotalXp={900} weeklyXp={120} streak={7} rank={2} highFived
      together={null} onClose={jest.fn()} onNudge={null} onGift={jest.fn()}
      onHighFive={jest.fn()} onDuel={jest.fn()} onDelete={jest.fn()}
    />,
  );
  expect(screen.queryByTestId('friend-together-sheet-progress')).toBeNull();
  expect(screen.queryByTestId('friend-together-sheet-nudge')).toBeNull();
  expect(screen.getByTestId('friend-together-sheet-gift')).toBeTruthy();
  expect(screen.getByTestId('friend-together-sheet-high-five')).toBeTruthy();
  expect(screen.getByTestId('friend-together-sheet-delete')).toBeTruthy();
});
```

Add source assertions to `tests/friends_together_ui_contract.test.ts`:

```ts
test('friend sheet uses large vertical actions and an optional Together model', () => {
  const source = readComponent('FriendTogetherSheet.tsx');
  expect(source).toContain('together: FriendTogetherDisplay | null');
  expect(source).toContain("flexDirection: 'column'");
  expect(source).toContain('minHeight: 52');
  expect(source).toContain('<ScrollView');
  expect(source).not.toContain('numberOfLines');
  expect(source).toContain('testID="friend-together-sheet-high-five"');
  expect(source).toContain('testID="friend-together-sheet-delete"');
  expect(source).not.toContain("flexDirection: 'row',\n    gap: 8,\n    marginTop: 20");
});
```

Add `'FriendListRow.tsx'` to `COMPONENT_FILES` so the existing font-weight,
translation, no-truncation, and no-caption contracts also cover the extracted
row.

- [ ] **Step 2: Run both suites to verify RED**

```powershell
npx jest --config jest.rntl.config.cjs tests/friend_together_sheet.test.tsx --runInBand --no-cache
npx jest tests/friends_together_ui_contract.test.ts --runInBand --no-cache
```

Expected: FAIL because the current sheet has mandatory Together fields,
horizontal actions, and no high-five/delete controls.

- [ ] **Step 3: Replace scalar Together props with one optional display model**

In `FriendTogetherSheet.tsx`, define and use:

```ts
export interface FriendTogetherDisplay {
  days: number;
  level: number;
  progressPercent: number | null;
  nextLevelName: string | null;
  nudged: boolean;
  learnedToday: boolean;
  incomingNudge: boolean;
  giftReady: boolean;
}

export interface FriendTogetherSheetProps {
  visible: boolean;
  onClose: () => void;
  friendName: string;
  friendUid: string;
  friendAvatar: string;
  friendTotalXp: number;
  friendAura?: string;
  myAvatar: string;
  myTotalXp: number;
  weeklyXp: number;
  streak: number;
  rank: number | null;
  highFived: boolean;
  together: FriendTogetherDisplay | null;
  onNudge: (() => void) | null;
  onGift: () => void;
  onHighFive: () => void;
  onDuel: (() => void) | null;
  onDelete: (() => void) | null;
}
```

Render the Together hero and nudge control only inside `together !== null`.
Disable the nudge action when `together.nudged || together.learnedToday`; use
distinct localized labels for “already invited today” and “already studied
today” so the two states are not conflated.
Render weekly XP and streak in large information blocks. Render incoming nudge
and gift-ready as authored `FlowText` messages inside full-width status blocks
with `accessibilityRole="text"` and stable test IDs. Do not render an icon-only
status. Give the three information blocks stable IDs
`friend-together-sheet-weekly-xp`, `friend-together-sheet-streak`, and
`friend-together-sheet-rank` (omit the rank block when `rank === null`).

- [ ] **Step 4: Replace the horizontal action strip with vertical controls**

Keep `PressableHybrid`, but update the shared styles and test IDs:

```tsx
const primaryForeground = buttonForegroundForBackground(t.accent);

<View style={styles.actions}>
  {together && onNudge && (
    <PressableHybrid
      testID="friend-together-sheet-nudge"
      onPress={onNudge}
      disabled={together.nudged || together.learnedToday}
      variant={together.nudged || together.learnedToday ? 'secondary' : 'primary'}
      style={[styles.actionBtn, { backgroundColor: together.nudged || together.learnedToday ? t.bgSurface2 : t.accent }]}
    >
      <FlowText testID="friend-together-sheet-nudge-label" provenance="authored" style={[styles.actionLabel, { color: together.nudged || together.learnedToday ? t.textSecond : primaryForeground }]}>{nudgeLabel}</FlowText>
    </PressableHybrid>
  )}
  <PressableHybrid testID="friend-together-sheet-gift" onPress={onGift} style={[styles.actionBtn, { backgroundColor: t.bgSurface2 }]}>
    <FlowText testID="friend-together-sheet-gift-label" provenance="authored" style={[styles.actionLabel, { color: t.textPrimary }]}>{giftLabel}</FlowText>
  </PressableHybrid>
  <PressableHybrid testID="friend-together-sheet-high-five" onPress={onHighFive} accessibilityState={{ selected: highFived }} style={[styles.actionBtn, { backgroundColor: t.bgSurface2 }]}>
    <FlowText testID="friend-together-sheet-high-five-label" provenance="authored" style={[styles.actionLabel, { color: t.textPrimary }]}>{highFiveLabel}</FlowText>
  </PressableHybrid>
  {onDuel && (
    <PressableHybrid testID="friend-together-sheet-duel" onPress={onDuel} style={[styles.actionBtn, { backgroundColor: t.bgSurface2 }]}>
      <FlowText testID="friend-together-sheet-duel-label" provenance="authored" style={[styles.actionLabel, { color: t.textPrimary }]}>{duelLabel}</FlowText>
    </PressableHybrid>
  )}
  {onDelete && (
    <PressableHybrid testID="friend-together-sheet-delete" onPress={onDelete} style={[styles.actionBtn, styles.deleteBtn, { backgroundColor: t.wrongBg }]}>
      <FlowText testID="friend-together-sheet-delete-label" provenance="authored" style={[styles.actionLabel, { color: t.wrong }]}>{deleteLabel}</FlowText>
    </PressableHybrid>
  )}
</View>
```

Use these geometry rules:

```ts
actions: { flexDirection: 'column', gap: 10, marginTop: 20 },
actionBtn: { width: '100%', minHeight: 52, paddingHorizontal: 16 },
deleteBtn: { marginTop: 8 },
actionLabel: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
```

Import `buttonForegroundForBackground` from `constants/color_contrast`. All
labels go through the existing eight-language `L`/`triLang` helper. Keep
only font weights 400 and 700. Use dark foreground on lime/neon primary fills.
The sheet stays on `HybridSheetShell`; do not add a second modal.

Wrap the body content in a `ScrollView` with
`contentContainerStyle={styles.body}` and
`showsVerticalScrollIndicator={false}`. Keep the header and close control above
that scroll region so all actions remain reachable at compact height and 200%
text scaling.

- [ ] **Step 5: Run the sheet tests to verify GREEN**

Run both commands from Step 2.

Expected: both suites PASS.

- [ ] **Step 6: Commit only the sheet unit**

```powershell
git add -- components/friends_together/FriendTogetherSheet.tsx tests/friend_together_sheet.test.tsx tests/friends_together_ui_contract.test.ts jest.rntl.config.cjs
git commit --only -m "feat: expand friend details sheet" -- components/friends_together/FriendTogetherSheet.tsx tests/friend_together_sheet.test.tsx tests/friends_together_ui_contract.test.ts jest.rntl.config.cjs
```

### Task 3: Wire the minimal row and preserve every existing action

**Files:**
- Modify: `app/(tabs)/friends.tsx`
- Modify: `tests/friends_tab_gift_interaction_contract.test.ts`

- [ ] **Step 1: Replace the old row contract with failing integration guards**

Update the row test in `tests/friends_tab_gift_interaction_contract.test.ts`
to assert the imported component and sheet wiring rather than the deleted
compact controls:

```ts
it('routes avatar to profile and the row body to the complete friend sheet', () => {
  const source = read('app/(tabs)/friends.tsx');
  expect(source).toContain("from '../../components/friends_together/FriendListRow'");
  expect(source).toContain('onOpenProfile={() => openProfile(profile)}');
  expect(source).toContain('onOpenDetails={() => setTogetherSheetFriendUid(profile.uid)}');
  expect(source).not.toContain('function FriendRow(');
  expect(source).not.toContain('friend-row-actions-');
  expect(source).not.toContain('friend-together-incoming-${profile.uid}');
  expect(source).not.toContain('friend-together-gift-ready-${profile.uid}');
});

it('wires all relocated actions through their existing handlers', () => {
  const source = read('app/(tabs)/friends.tsx');
  const sheet = extract(source, '<FriendTogetherSheet', '/>');
  expect(sheet).toContain('onGift={() =>');
  expect(sheet).toContain('openGiftPicker(friendProfile)');
  expect(sheet).toContain('onHighFive={() =>');
  expect(sheet).toContain('handleHighFive(friendProfile)');
  expect(sheet).toContain('onDelete={() =>');
  expect(sheet).toContain('handleDeleteConfirm(friendProfile.uid, friendProfile.name)');
  expect(sheet).toContain("router.push('/arena_friend_duel' as never)");
});
```

- [ ] **Step 2: Run the contract to verify RED**

```powershell
npx jest tests/friends_tab_gift_interaction_contract.test.ts --runInBand --no-cache
```

Expected: FAIL because `friends.tsx` still owns and renders the dense row.

- [ ] **Step 3: Replace the in-file row with `FriendListRow`**

Import the new component and replace the render call with:

```tsx
<FriendListRow
  friendUid={profile.uid}
  friendName={profile.name}
  avatar={profile.avatar}
  totalXp={profile.totalXp}
  auraId={getEffectiveAvatarAuraId(profile.aura, profile.isPremium, profile.isVip)}
  daysTogether={together?.days ?? null}
  onOpenProfile={() => openProfile(profile)}
  onOpenDetails={() => setTogetherSheetFriendUid(profile.uid)}
/>
```

Add `days: number` to `FriendRowTogether` and populate it for real pairs and
DEV bots. Then remove the obsolete in-file `FriendRow`, `HighFiveButton`, and
their row-only animation/status imports. Do not remove any handler, state, or
feature implementation used by the sheet.

- [ ] **Step 4: Make the sheet available even without Together data**

Change the render gate from:

```tsx
{friendsTogetherUiEnabled && togetherSheetFriendUid && (() => {
```

to:

```tsx
{togetherSheetFriendUid && (() => {
```

Resolve `friendProfile` first. Treat `pair` as optional, and create:

```ts
const togetherDisplay = pair && friendsTogetherUiEnabled
  ? {
      days: pair.days,
      level: pair.level,
      progressPercent,
      nextLevelName,
      nudged: devBot
        ? devBot.nudgedByMe
        : optimisticNudgedUids.has(togetherSheetFriendUid) || isNudgedToday(togetherSheetFriendUid),
      learnedToday: togetherByUid[togetherSheetFriendUid]?.learnedToday === true,
      incomingNudge: togetherByUid[togetherSheetFriendUid]?.incomingNudge === true,
      giftReady: togetherByUid[togetherSheetFriendUid]?.giftReady === true,
    }
  : null;
```

Pass the general state and existing handlers:

```tsx
weeklyXp={friendProfile.weeklyXp}
streak={friendProfile.streak}
rank={sortedFriends.findIndex(friend => friend.uid === friendProfile.uid) + 1 || null}
highFived={highFivedUids.has(friendProfile.uid)}
together={togetherDisplay}
onNudge={togetherDisplay ? () => {
  if (devBot) void handleDevNudge(devBot.uid);
  else void handleNudgeFriend(togetherSheetFriendUid, friendProfile.name);
} : null}
onGift={() => {
  if (devBot) {
    void handleDevGiftReady(devBot.uid);
    return;
  }
  setTogetherSheetFriendUid(null);
  openGiftPicker(friendProfile);
}}
onHighFive={() => {
  if (devBot) {
    setHighFivedUids(current => {
      const next = new Set(current);
      if (next.has(friendProfile.uid)) next.delete(friendProfile.uid);
      else next.add(friendProfile.uid);
      return next;
    });
    return;
  }
  void handleHighFive(friendProfile);
}}
onDuel={() => { setTogetherSheetFriendUid(null); router.push('/arena_friend_duel' as never); }}
onDelete={devBot ? null : () => {
  setTogetherSheetFriendUid(null);
  handleDeleteConfirm(friendProfile.uid, friendProfile.name);
}}
```

Add reconciliation beside the sheet-selection state so disappearing data
dismisses the sheet rather than fabricating days or levels:

```ts
useEffect(() => {
  if (!togetherSheetFriendUid) return;
  const existsInProfiles = profiles[togetherSheetFriendUid] !== undefined;
  const existsAsDevBot = __DEV__ && devBots.some(bot => bot.uid === togetherSheetFriendUid);
  if (!existsInProfiles && !existsAsDevBot) setTogetherSheetFriendUid(null);
}, [devBots, profiles, togetherSheetFriendUid]);
```

- [ ] **Step 5: Run the integration contract to verify GREEN**

Run the command from Step 2.

Expected: 1 suite PASS, including the two new routing/wiring guards.

- [ ] **Step 6: Commit only the screen integration**

```powershell
git add -- "app/(tabs)/friends.tsx" tests/friends_tab_gift_interaction_contract.test.ts
git commit --only -m "feat: move friend actions into details sheet" -- "app/(tabs)/friends.tsx" tests/friends_tab_gift_interaction_contract.test.ts
```

### Task 4: Run focused static and behavioral verification

**Files:**
- Modify only if required: `config/text-integrity-baseline.json`

- [ ] **Step 1: Run focused ESLint and record decisive output**

```powershell
npx eslint "app/(tabs)/friends.tsx" "components/friends_together/FriendListRow.tsx" "components/friends_together/FriendTogetherSheet.tsx" "tests/friend_list_row.test.tsx" "tests/friend_together_sheet.test.tsx" "tests/friends_tab_gift_interaction_contract.test.ts" "tests/friends_together_ui_contract.test.ts"
```

Expected: exit 0. If the only errors say a committed text-integrity baseline
site is missing, identify exact fingerprints with
`scripts/text-integrity/inventory-core.cjs` and remove only obsolete groups for
the touched files. Never run a broad baseline update in the dirty tree.

- [ ] **Step 2: Run the two RNTL interaction suites**

```powershell
npx jest --config jest.rntl.config.cjs tests/friend_list_row.test.tsx tests/friend_together_sheet.test.tsx --runInBand --no-cache
```

Expected: 2 suites PASS, all tests PASS.

- [ ] **Step 3: Run the complete focused client feature set**

```powershell
npx jest tests/friends_together_chest_model.test.ts tests/friends_tab_gift_interaction_contract.test.ts tests/friends_together_claims_client.test.ts tests/friends_together_config.test.ts tests/friends_together_days.test.ts tests/friends_together_dev_bots.test.ts tests/friends_together_nudge_client.test.ts tests/friends_together_ui_contract.test.ts tests/friends_together_xp_multiplier.test.ts --runInBand --no-cache
```

Expected: 9 suites PASS, all tests PASS.

- [ ] **Step 4: Run the DEV sheet and server feature tests**

```powershell
npx jest --config jest.rntl.config.cjs tests/friends_together_dev_bots_sheet.test.tsx --runInBand --no-cache
Push-Location functions
npx jest src/friends_together_core.test.ts src/friends_together.test.ts --runInBand --no-cache
Pop-Location
```

Expected: DEV sheet PASS; 2 function suites PASS.

- [ ] **Step 5: Check syntax, diff hygiene, and staged-file isolation**

```powershell
node -e "const fs=require('fs');const p=require('@babel/parser');for(const f of ['app/(tabs)/friends.tsx','components/friends_together/FriendListRow.tsx','components/friends_together/FriendTogetherSheet.tsx'])p.parse(fs.readFileSync(f,'utf8'),{sourceType:'module',plugins:['typescript','jsx']});console.log('syntax OK')"
git diff --ignore-space-at-eol --check -- "app/(tabs)/friends.tsx" components/friends_together/FriendListRow.tsx components/friends_together/FriendTogetherSheet.tsx tests/friend_list_row.test.tsx tests/friend_together_sheet.test.tsx tests/friends_tab_gift_interaction_contract.test.ts tests/friends_together_ui_contract.test.ts jest.rntl.config.cjs config/text-integrity-baseline.json
git diff --cached --name-only
```

Expected: syntax and diff check exit 0; unrelated staged Arena paths remain
present and unchanged.

- [ ] **Step 6: Commit a baseline-only shrink if Step 1 required it**

```powershell
git add -- config/text-integrity-baseline.json
git commit --only -m "chore: shrink friend text integrity baseline" -- config/text-integrity-baseline.json
```

Skip this step when no baseline change is needed.

### Task 5: Verify the approved interaction on Android

**Files:**
- Evidence only: `C:/Temp/phraseman-friends-row-sheet-2026-08-20/`

- [ ] **Step 1: Preflight the shared checkout before launching Metro**

```powershell
Test-Path -LiteralPath app/trainer_store.ts
adb devices
```

Expected: `app/trainer_store.ts=True` and one authorized emulator. If the file
is still deleted by unrelated concurrent work, do not restore it from Git and
do not loop Metro; report the external bundle blocker and continue with the
deterministic gates above.

- [ ] **Step 2: Start one Metro instance and launch the existing dev client**

```powershell
$env:PHRASEMAN_NO_WATCHMAN='1'
$env:EXPO_METRO_STRIP_MULTIPART='1'
npx expo start --dev-client --port 8081
```

In a second terminal:

```powershell
adb shell monkey -p app.phraseman -c android.intent.category.LAUNCHER 1
```

Expected: Friends screen bundles without an unresolved-module error. Do not
start a second Metro process.

- [ ] **Step 3: Exercise the two routing targets**

Using the Friends DEV bot panel:

1. Add at least one bot.
2. Tap only the avatar; verify the existing player profile card opens and the
   friend-details sheet does not.
3. Close the profile card.
4. Tap the name/body; verify the bottom sheet opens and the profile card does
   not.

Capture screenshots after steps 2 and 4 in the evidence directory.

- [ ] **Step 4: Exercise every relocated state and action**

Use the DEV controls and the sheet to verify:

1. long friend name wraps without clipping;
2. incoming nudge appears as a large message in the sheet only;
3. gift-ready appears as a large message in the sheet only;
4. nudge changes to its completed state;
5. high five toggles;
6. gift opens the existing gift picker;
7. duel closes the sheet before navigation;
8. delete opens the existing confirmation and never deletes directly;
9. no small action/status cluster remains in the list row.

Capture one list screenshot and one fully populated sheet screenshot.

- [ ] **Step 5: Verify the kill-switch fallback**

With Together disabled through the existing local/remote-config test path,
reopen the same friend row. Verify the general sheet still contains gift, high
five, duel, and delete, while days, level, progress, nudge, and Together state
messages are absent.

- [ ] **Step 6: Stop only the Metro process started in Step 2**

Send Ctrl+C to that Metro terminal. Leave the emulator running if another
session is using it. Report screenshot paths and any external blocker; do not
claim a runtime case that was not observed.

---

## Completion Criteria

- The list row contains no compact action/status cluster.
- Avatar and row-body presses lead to distinct, verified destinations.
- Every existing friend action remains reachable in the bottom sheet.
- Together-disabled fallback is truthful and functional.
- Focused lint, RNTL, client, server, syntax, and diff gates pass.
- Android evidence exists, or a precise unrelated bundle blocker is reported
  without retry loops or destructive restoration.
