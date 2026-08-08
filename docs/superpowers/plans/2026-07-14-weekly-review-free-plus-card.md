# Weekly Review Free / Plus Card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the nested weekly-review interface with one paywall-opening value card for Free users and an immediately visible full review for Plus users.

**Architecture:** `trainer.tsx` owns the tier-level composition: Free renders only the standalone teaser, while Plus renders the existing analytics container and embeds the review content. `WeeklyReviewCard.tsx` owns the two presentations but keeps the existing client, cache, analytics, and verified action routing. User-facing copy describes learning value rather than the underlying AI implementation.

**Tech Stack:** React Native, Expo Router, TypeScript, Jest source contracts, existing theme and localization helpers.

---

## File map

- `app/WeeklyReviewCard.tsx`: render the Free teaser immediately; render the complete Plus review without nested surfaces or accordion controls.
- `app/trainer.tsx`: select the Free teaser or the full Plus analytics block; remove this block's generic blur gate only.
- `app/weekly_review_copy.ts`: provide concise Free value copy and AI-neutral Plus statuses for every supported locale.
- `app/weekly_review_client.ts`: remove the remaining visible AI wording from the local Plus fallback note.
- `tests/weekly_review_card_states_contract.test.ts`: guard the single Free pressable, full Plus content, touch size, and absence of obsolete controls.
- `tests/weekly_review_client_contract.test.ts`: retain the Free server boundary and assert the always-visible Plus review.
- `tests/trainer_weekly_review_order_contract.test.ts`: guard explicit Free/Plus composition and removal of the local blur wrapper.
- `tests/accordion_motion_accessibility_contract.test.ts`: stop treating WeeklyReviewCard as an accordion owner.
- `tests/home_runtime_animation_contract.test.ts`: stop requiring the removed decorative sweep while retaining runtime ownership.

### Task 1: Lock the simplified tier contract with failing tests

**Files:**
- Modify: `tests/weekly_review_card_states_contract.test.ts`
- Modify: `tests/weekly_review_client_contract.test.ts`
- Modify: `tests/trainer_weekly_review_order_contract.test.ts`
- Modify: `tests/accordion_motion_accessibility_contract.test.ts`
- Modify: `tests/home_runtime_animation_contract.test.ts`

- [ ] **Step 1: Replace the old Free-list, accordion, and sweep assertions**

Add source-contract assertions equivalent to:

```ts
expect(card).toContain('if (!isPremium)');
expect(card).toContain('<FreeReviewTeaser');
expect(card).toContain('onPress={onPaywall}');
expect(card).toContain('minHeight: 96');
expect(card).not.toContain('copy.aiBadge');
expect(card).not.toContain('accessibilityState={{ expanded }}');
expect(card).not.toContain('Animated.timing(sweep');
expect(card).toContain('review.patterns.map');
expect(card).toContain('review.plan.map');
```

Guard the trainer composition with:

```ts
expect(source).not.toContain('<StatsPremiumBlur isPremium={hasPremium} context="patterns">');
expect(source).toContain('isPremium={false}');
expect(source).toContain('isPremium={true}');
expect(source.indexOf('isPremium={false}')).toBeLessThan(source.indexOf('styles.analyticsBlock'));
```

Retain the existing client assertion that Free returns `free_eligible` before any callable request.

- [ ] **Step 2: Run the focused tests and confirm the old UI fails the new contract**

Run:

```powershell
npx jest --runTestsByPath tests/weekly_review_card_states_contract.test.ts tests/weekly_review_client_contract.test.ts tests/trainer_weekly_review_order_contract.test.ts tests/accordion_motion_accessibility_contract.test.ts tests/home_runtime_animation_contract.test.ts --no-cache --runInBand
```

Expected: FAIL because the current source still has the AI badge, Free value list/button, accordion, sweep animation, and `StatsPremiumBlur` wrapper.

### Task 2: Implement one Free value card and an always-open Plus review

**Files:**
- Modify: `app/WeeklyReviewCard.tsx`
- Modify: `app/weekly_review_copy.ts`
- Modify: `app/weekly_review_client.ts`
- Test: `tests/weekly_review_card_states_contract.test.ts`
- Test: `tests/weekly_review_client_contract.test.ts`

- [ ] **Step 1: Add concise AI-neutral copy for all locales**

Replace the Free list/CTA keys with two result-oriented strings:

```ts
freeTitle: L(lang, {
  ru: 'Персональный разбор практики',
  uk: 'Персональний розбір практики',
  es: 'Análisis personal de práctica',
  'pt-BR': 'Análise pessoal da prática',
  vi: 'Phân tích luyện tập cá nhân',
  id: 'Analisis latihan pribadi',
  tr: 'Kişisel pratik analizi',
  pl: 'Osobista analiza ćwiczeń',
}),
freeBody: L(lang, {
  ru: 'Покажет, какие ошибки повторяются и что повторить первым.',
  uk: 'Покаже, які помилки повторюються і що повторити спочатку.',
  es: 'Muestra qué errores se repiten y qué repasar primero.',
  'pt-BR': 'Mostra quais erros se repetem e o que revisar primeiro.',
  vi: 'Cho biết lỗi nào lặp lại và nên ôn gì trước.',
  id: 'Menunjukkan kesalahan berulang dan apa yang perlu diulang lebih dulu.',
  tr: 'Tekrarlanan hataları ve önce neyi çalışman gerektiğini gösterir.',
  pl: 'Pokazuje powtarzające się błędy i co najpierw powtórzyć.',
}),
```

Change visible Plus statuses such as `ready` and `updating` to “Разбор готов” and “Компас обновляет рекомендации…”. Remove unused `aiBadge`, `valueTitle`, `values`, `cta`, `expand`, and `collapse` keys. Change the local fallback coverage note in `weekly_review_client.ts` to “Это краткий локальный снимок до следующего обновления рекомендаций.” and equivalent existing locales.

- [ ] **Step 2: Render the Free teaser before asynchronous state geometry**

In `WeeklyReviewCard`, return the Free presentation before the loading-state branch:

```tsx
if (!isPremium) {
  return (
    <FreeReviewTeaser
      copy={copy}
      onPress={onPaywall}
      iconSource={weeklyCompassIconSource(themeMode)}
      themeMode={themeMode}
      backgroundColor={t.bgCard}
      borderColor={t.border}
      textColor={t.textPrimary}
      mutedColor={t.textSecond}
    />
  );
}
```

`FreeReviewTeaser` must return one outer `Pressable` with `accessibilityRole="button"`, `onPress={onPress}`, `minHeight: 96`, a 22px radius, the Compass image, title/body, `PlusBadge`, and a forward chevron. It must not render metrics, progress, a nested button, or AI wording.

- [ ] **Step 3: Remove the accordion and decorative nested surface from Plus**

Delete `expanded`, `onToggle`, `onGenerate`, sweep animation state/effects, and the expand button. Render the review sections directly:

```tsx
{review ? (
  <PlusReview
    review={review}
    copy={copy}
    onAction={onAction}
    textColor={t.textPrimary}
    mutedColor={t.textSecond}
    accent={t.accent}
    accentText={t.correctText ?? '#07110A'}
    fontSize={f.body}
  />
) : (
  <View style={styles.pendingBlock}>
    <Text style={[styles.pendingTitle, { color: t.textPrimary }]}>{statusText}</Text>
  </View>
)}
```

For `embedded`, `CardShell` must be a transparent `View`; only the non-embedded branch may apply `backgroundColor`, `borderColor`, and a 22px radius. Remove the `signalPanel` background/border and keep the exercise `Pressable` elements in `review.plan` with dark foreground on the bright accent.

- [ ] **Step 4: Run the component/client contract tests**

Run:

```powershell
npx jest --runTestsByPath tests/weekly_review_card_states_contract.test.ts tests/weekly_review_client_contract.test.ts --no-cache --runInBand
```

Expected: PASS.

### Task 3: Make trainer composition explicit by tier

**Files:**
- Modify: `app/trainer.tsx`
- Test: `tests/trainer_weekly_review_order_contract.test.ts`
- Test: `tests/home_runtime_animation_contract.test.ts`
- Test: `tests/accordion_motion_accessibility_contract.test.ts`

- [ ] **Step 1: Remove only the local patterns blur wrapper**

Remove the unused `StatsPremiumBlur` import from `trainer.tsx`. Replace the wrapper with a tier branch shaped as:

```tsx
{hasPremium ? (
  <View style={[styles.analyticsBlock, isCompassTheme && styles.compassClip, isCompassTheme && compassShadow(2), {
    backgroundColor: isCompassTheme ? COMPASS_RICH.charcoalRaised : isGoldTheme ? 'rgba(8,8,6,0.94)' : t.bgCard,
    borderColor: isCompassTheme ? COMPASS_RICH.hairline : isGoldTheme ? GOLD_RICH.hairlineQuiet : '#FACC1533',
    borderWidth: 0,
    borderRadius: trainerRadius,
  }]}>
    <WeeklyReviewCard active={trainerRuntimeActive} isPremium={true} studyTarget={studyTarget} stableLayout embedded />
  </View>
) : (
  <WeeklyReviewCard active={trainerRuntimeActive} isPremium={false} studyTarget={studyTarget} stableLayout />
)}
```

Only the opening wrapper, the `WeeklyReviewCard` tier prop, and the closing branch change. Keep the current analytics header between the opening `<View>` and `WeeklyReviewCard`, and keep the current tabs/rows between `WeeklyReviewCard` and the closing `</View>` byte-for-byte unless formatting requires indentation.

Do not change the analytics header, tabs, rows, route to `/phrase_analytics_screen`, or any other use of `StatsPremiumBlur` elsewhere in the app.

- [ ] **Step 2: Run the complete focused regression set**

Run:

```powershell
npx jest --runTestsByPath tests/weekly_review_card_states_contract.test.ts tests/weekly_review_client_contract.test.ts tests/weekly_review_client.test.ts tests/weekly_review_analytics.test.ts tests/trainer_weekly_review_order_contract.test.ts tests/accordion_motion_accessibility_contract.test.ts tests/home_runtime_animation_contract.test.ts --no-cache --runInBand
```

Expected: all suites PASS with zero failed tests.

- [ ] **Step 3: Run TypeScript-aware lint on the affected files**

Run:

```powershell
npx eslint app/WeeklyReviewCard.tsx app/weekly_review_copy.ts app/weekly_review_client.ts app/trainer.tsx tests/weekly_review_card_states_contract.test.ts tests/weekly_review_client_contract.test.ts tests/trainer_weekly_review_order_contract.test.ts tests/accordion_motion_accessibility_contract.test.ts tests/home_runtime_animation_contract.test.ts
```

Expected: exit code 0. If existing unrelated lint failures prevent a clean run, record the exact affected file/line and do not broaden the change.

- [ ] **Step 4: Inspect the final diff and commit only task files**

Run `git diff --check` for the affected paths, inspect that the pre-existing unrelated working-tree changes remain untouched, then stage only the files listed in this plan and commit with:

```powershell
git commit -m "fix: simplify weekly practice review card"
```

### Task 4: Final evidence and visual-risk review

**Files:**
- Inspect: `app/WeeklyReviewCard.tsx`
- Inspect: `app/trainer.tsx`
- Inspect: focused Jest output

- [ ] **Step 1: Verify acceptance criteria from source and tests**

Confirm that Free has one Pressable and no nested CTA/metrics; Plus has all review sections without a disclosure control; embedded content has no second background or radius `0`; Free routes to `premium_modal` with `context: 'weekly_review'`; bright accent plan actions retain dark foreground.

- [ ] **Step 2: Record visual verification limits honestly**

If a running app/device is available, inspect Free and Plus at approximately 360px and 390px widths in standard and Compass themes. If runtime access is unavailable, report that source/tests were verified but device rendering remains unverified.

- [ ] **Step 3: Submit the actual final diff and verification evidence to the mandatory advisor review**

Expected: `DECISION: APPROVED`. If the advisor returns `CHANGES_REQUIRED`, apply only relevant fixes and rerun the focused verification before resubmission.
