# Conversational Post-Update Modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the stale release notes campaign with the owner-approved conversational variant B and show it once to pre-existing users after they install build 118 or newer.

**Architecture:** Reuse the existing `ReleaseNotesModal`, overlay arbitration, and AsyncStorage eligibility gate. Keep copy in its dedicated eight-locale module, update the campaign constants without touching root layout wiring, and lock the behavior with focused Jest contracts.

**Tech Stack:** React Native, Expo, TypeScript, AsyncStorage, Jest, Ionicons.

---

### Task 1: Lock the new campaign and copy contract with failing tests

**Files:**
- Modify: `tests/release_notes_modal.test.ts`
- Create: `tests/release_notes_conversational_copy.test.ts`

- [ ] **Step 1: Write the campaign tests**

Update the mocked build to 118 and assert that an eligible pre-release installation sees the enabled modal, build 117 does not, a new install does not, and dismissal is durable.

- [ ] **Step 2: Write the copy tests**

Assert all eight locales have exactly seven items, the Russian title is `Мы тут снова всё поменяли`, the CTA is `Пойти посмотреть`, expected chapter titles are present, the Russian visible copy contains no internal development labels, and all item icons resolve to stable Ionicons names.

- [ ] **Step 3: Run RED**

Run:

```powershell
npx jest tests/release_notes_modal.test.ts tests/release_notes_conversational_copy.test.ts --runInBand
```

Expected: FAIL because the old campaign targets build 104 and the old copy contains four unrelated items.

### Task 2: Replace the release-note copy in all locales

**Files:**
- Modify: `components/release_notes_copy.ts`

- [ ] **Step 1: Replace the old release copy**

Keep the `ReleaseNotesTexts` interface and locale picker. Give every locale these seven semantic chapters in the same order: energy at session start, three attempts, earning runes, avatars and auras, Arena return, Route retirement, and MAX tutor. Use locale-natural second-person wording rather than translating Russian syntax mechanically.

- [ ] **Step 2: Replace payment-specific styling metadata**

Change `reassuring?: boolean` to `tone?: 'gold' | 'blue'` so the selected visual alternates meaningful icon accents without mislabelling every highlighted row as a payment concern.

- [ ] **Step 3: Preserve the tournament owner lock**

Keep the existing retired-tournament filter; none of the new Arena copy may contain tournament route terminology.

### Task 3: Match the selected conversational-chapters layout

**Files:**
- Modify: `components/ReleaseNotesModal.tsx`
- Modify: `tests/release_update_modals_locale_runtime.test.ts`

- [ ] **Step 1: Update the row tone rendering**

Use `item.tone === 'gold'` to choose gold or blue icon foreground/background. Keep 34×34 icon containers, flat rows, readable line height, and no nested cards.

- [ ] **Step 2: Use the localized pill and remove stale chips**

Render `tx.pill` in the hero pill, remove the old pearls/tournament/free chip dictionary and chip strip, and keep the existing scroll plus fixed 54 px CTA.

- [ ] **Step 3: Update the locale runtime contract**

Replace chip/version-label assertions with assertions that the modal uses `tx.pill`, `pickReleaseNotesTexts(lang)`, and no stale chip dictionary.

### Task 4: Activate the new one-time release campaign

**Files:**
- Modify: `app/release_notes_modal.ts`

- [ ] **Step 1: Update release constants**

Set `RELEASE_NOTES_MIN_BUILD_ID = 118`, `RELEASE_NOTES_NEW_USER_CUTOFF_MS = Date.UTC(2026, 7, 28, 0, 0, 0, 0)`, and use a new private dismissal key `release_notes_dismissed_2026_08_28_v1612`.

- [ ] **Step 2: Keep existing eligibility semantics**

Do not change the Expo Go, onboarding, invalid install date, cutoff, or durable dismissal behavior.

- [ ] **Step 3: Run GREEN**

Run:

```powershell
npx jest tests/release_notes_modal.test.ts tests/release_notes_conversational_copy.test.ts tests/release_notes_tournament_lock.test.ts tests/release_update_modals_locale_runtime.test.ts --runInBand
```

Expected: four suites pass with zero failed tests.

- [ ] **Step 4: Run static diff checks**

Run:

```powershell
git diff --check -- components/ReleaseNotesModal.tsx components/release_notes_copy.ts app/release_notes_modal.ts tests/release_notes_modal.test.ts tests/release_notes_conversational_copy.test.ts tests/release_update_modals_locale_runtime.test.ts
```

Expected: no output and exit code 0.

- [ ] **Step 5: Review exact scope**

Confirm no changes were made to `app/_layout.tsx`, mechanics, remote configuration, publishing, or unrelated user work.
