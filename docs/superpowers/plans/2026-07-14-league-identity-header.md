# League Identity Header Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show the active league name in the league screen header and show the active league heraldry in the podium heading.

**Architecture:** `app/club_screen.tsx` already owns `myLeague`, localized names, and the existing `LeagueIcon` renderer. `components/league/LeaguePodium.tsx` should receive a rendered non-interactive league icon and keep podium behavior unchanged.

**Tech Stack:** React Native, Expo Router, TypeScript, Jest source contracts.

---

## File Map

- Modify `tests/league_club_hub_contract.test.ts`: add source contracts for the dynamic header title, podium league icon props, and removal of the heading trophy only.
- Modify `app/club_screen.tsx`: replace the generic header copy with `leagueNameForLang(myLeague, lang)` and pass the active `LeagueIcon` to `LeaguePodium`.
- Modify `components/league/LeaguePodium.tsx`: add a `leagueIcon` prop and render it in a fixed-size heading slot instead of the generic trophy icon.

## Tasks

### Task 1: Contract Test

**Files:**
- Modify: `tests/league_club_hub_contract.test.ts`

- [ ] **Step 1: Add the failing source contract**

```ts
it('shows active league identity in the header and podium art', () => {
  const screen = read('app/club_screen.tsx');
  const podium = read('components/league/LeaguePodium.tsx');

  expect(screen).toContain('{leagueNameForLang(myLeague, lang)}');
  expect(screen).not.toContain("ru: 'Лига недели'");
  expect(screen).toContain('leagueIcon={<LeagueIcon');
  expect(screen).toContain('league={myLeague}');
  expect(screen).toContain('alignContent={false}');
  expect(podium).toContain('leagueIcon: React.ReactNode');
  expect(podium).toContain('testID="league-current-heraldry"');
  expect(podium).not.toContain('<Ionicons name="trophy" size={24}');
  expect(podium).toContain('<Ionicons name="trophy" size={12}');
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `npx jest --runTestsByPath tests/league_club_hub_contract.test.ts --no-cache --runInBand`

Expected: FAIL because the screen still contains the generic league title and `LeaguePodium` still renders the 24px trophy.

### Task 2: Minimal UI Fix

**Files:**
- Modify: `app/club_screen.tsx`
- Modify: `components/league/LeaguePodium.tsx`

- [ ] **Step 1: Update the screen header and pass the icon**

```tsx
<Text
  numberOfLines={1}
  adjustsFontSizeToFit
  minimumFontScale={0.72}
  style={{ color:sx.primary, fontSize: f.h2, fontWeight:'700', marginLeft:8, flex:1 }}
>
  {leagueNameForLang(myLeague, lang)}
</Text>
```

```tsx
<LeaguePodium
  podium={hubPodium}
  lang={lang}
  palette={hubPalette}
  leagueIcon={<LeagueIcon league={myLeague} size={50} active alignContent={false} themeMode={themeMode} />}
  ...
/>
```

- [ ] **Step 2: Replace only the podium heading trophy**

```tsx
<View style={styles.headingCopy}>
  ...
</View>
<View style={styles.leagueIconSlot} testID="league-current-heraldry" accessible={false} importantForAccessibility="no-hide-descendants">
  {leagueIcon}
</View>
```

- [ ] **Step 3: Run focused verification**

Run: `npx jest --runTestsByPath tests/league_club_hub_contract.test.ts tests/league_current_icon_content_alignment.test.ts tests/league_icon_assets.test.ts --no-cache --runInBand`

Expected: PASS, or report any pre-existing unrelated guard drift separately.
