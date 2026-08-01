# Daily Phrase Premium Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the home “Daily Phrase” entry compact, theme-aware, and premium, then modernize the existing quiz sheet without changing phrase selection, localized literal/meaning/explanation data, XP, pronunciation, or flashcard behavior.

**Architecture:** Keep `DailyPhraseCard` as the single owner of the home plaque and detail modal. Extend the existing `DailyPhraseChrome` theme contract with semantic CTA colors, isolate the compact `homeAdditional` markup from the preserved default/gate markup, and add only one-shot `Animated` transitions guarded by reduced-motion preference. Lock all behavior with focused Jest source-contract and logic tests before visual emulator QA.

**Tech Stack:** React Native, Expo, TypeScript, React Native `Animated`, existing theme context and `DailyPhraseChrome`, Jest/ts-jest source-contract tests, Android emulator/ADB.

**Approved design:** [`docs/superpowers/specs/2026-08-01-daily-phrase-premium-redesign-design.md`](../specs/2026-08-01-daily-phrase-premium-redesign-design.md)

---

## Non-negotiable contracts

- The home `homeAdditional` card contains only the localized “Фраза дня” title, English phrase, localized “Проверить себя” CTA, and the existing themed phrases asset.
- The home card does not reveal the meaning after the quiz and does not restore the old “Нажми и угадай…” teaser. Its geometry stays stable before and after answering.
- `phraseCopy.literal`, `phraseCopy.meaning`, and `phraseCopy.text` remain sourced through `dailyPhraseCopyForLang`; no phrase content is rewritten or shortened.
- All existing quest behavior remains: three meaning options, one XP award, wrong-answer shake, correct-answer success state, previously-answered skip, pronunciation after reveal, and full `AddToFlashcard` locale metadata.
- CTA/action colors come from the active theme chrome. Bright green/lime surfaces always use a dark foreground and every action pair must pass WCAG AA contrast.
- Motion is one-shot, transform/opacity-only, and immediately resolves when reduced motion is enabled. No infinite animation or background timer is introduced.
- The existing default card and target-closed gate remain functional. In particular, the gate still uses `homeAdditionalPlaque`, `homeAdditionalTitle`, and `homeAdditionalSub`.

## File map

- Modify: `app/daily_phrase_chrome.ts`
- Modify: `components/DailyPhraseCard.tsx`
- Add: `tests/daily_phrase_chrome.test.ts`
- Modify: `tests/daily_phrase_quest_card_contract.test.ts`
- Modify: `tests/daily_phrase_locale.test.ts`
- Verify unchanged behavior: `tests/daily_phrase_quest.test.ts`
- Verify target gates: `tests/gustav_french_daily_phrase_target_gate.test.ts`
- Verify home filter: `tests/gustav_french_daily_tasks_target_filter.test.ts`
- Visual artifacts only: `.codex-tmp/daily-phrase-redesign/`

## Task 0: Protect the dirty workspace and establish a baseline

- [ ] **Step 1: Confirm the current branch and preserve unrelated changes**

Run:

```powershell
git status --short
git branch --show-current
git diff -- components/DailyPhraseCard.tsx app/daily_phrase_chrome.ts tests/daily_phrase_quest_card_contract.test.ts tests/daily_phrase_locale.test.ts
```

Expected: the repository may be broadly dirty, but any pre-existing changes in the four target files are identified before editing. Do not reset, stash, or rewrite unrelated work.

- [ ] **Step 2: Run the focused baseline suite**

Run:

```powershell
npx jest --runTestsByPath tests/daily_phrase_quest_card_contract.test.ts tests/daily_phrase_quest.test.ts tests/daily_phrase_locale.test.ts tests/gustav_french_daily_phrase_target_gate.test.ts tests/gustav_french_daily_tasks_target_filter.test.ts --no-cache --runInBand
```

Expected: PASS before edits. If a test already fails, save the decisive failure separately and do not attribute it to this change.

## Task 1: Add semantic, accessible action colors to every theme

**Files:**

- Add: `tests/daily_phrase_chrome.test.ts`
- Modify: `app/daily_phrase_chrome.ts`

- [ ] **Step 1: Write the failing theme-contract test**

Create `tests/daily_phrase_chrome.test.ts` with explicit coverage of all current theme modes:

```ts
import type { ThemeMode } from '../constants/theme';
import { DAILY_PHRASE_CHROME, dailyPhraseChromeFor } from '../app/daily_phrase_chrome';

const MODES: ThemeMode[] = [
  'dark', 'gold', 'coral', 'minimalDark', 'business', 'businessLight',
  'midnight', 'ember', 'aurora', 'volt', 'candyBlue', 'indigo',
];

function channel(value: number): number {
  const normalized = value / 255;
  return normalized <= 0.03928
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const value = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((offset) => channel(parseInt(value.slice(offset, offset + 2), 16)));
  return (0.2126 * r) + (0.7152 * g) + (0.0722 * b);
}

function contrast(a: string, b: string): number {
  const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (lighter + 0.05) / (darker + 0.05);
}

describe('daily phrase chrome action roles', () => {
  it.each(MODES)('%s exposes a readable themed action pair', (mode) => {
    const chrome = dailyPhraseChromeFor(mode);
    expect(chrome.actionBg).toMatch(/^#[0-9A-F]{6}$/i);
    expect(chrome.actionText).toMatch(/^#[0-9A-F]{6}$/i);
    expect(contrast(chrome.actionBg, chrome.actionText)).toBeGreaterThanOrEqual(4.5);
  });

  it('defines action colors on the static map instead of adding runtime fallbacks', () => {
    expect(Object.keys(DAILY_PHRASE_CHROME)).toHaveLength(MODES.length);
    expect(Object.values(DAILY_PHRASE_CHROME).every((chrome) => chrome.actionBg && chrome.actionText)).toBe(true);
  });
});
```

- [ ] **Step 2: Prove the new contract fails before implementation**

Run:

```powershell
npx jest --runTestsByPath tests/daily_phrase_chrome.test.ts --no-cache --runInBand
```

Expected: FAIL because `actionBg` and `actionText` do not exist yet.

- [ ] **Step 3: Extend `DailyPhraseChrome` and populate every theme**

Add semantic fields to the interface:

```ts
/** Compact CTA fill for the home Daily Phrase plaque. */
actionBg: string;
/** High-contrast text/icon color rendered on actionBg. */
actionText: string;
```

Add these pairs to the corresponding entries in `DAILY_PHRASE_CHROME`:

| Theme | `actionBg` | `actionText` | Contrast |
|---|---:|---:|---:|
| dark | `#58CC89` | `#07110A` | 9.52:1 |
| gold | `#D6B35A` | `#1B1205` | 9.21:1 |
| coral | `#FF7F50` | `#2A100A` | 7.14:1 |
| minimalDark | `#6EA8FF` | `#09152A` | 7.56:1 |
| business | `#0095F6` | `#061624` | 5.78:1 |
| businessLight | `#0095F6` | `#061624` | 5.78:1 |
| midnight | `#8FA0FF` | `#0D1030` | 7.62:1 |
| ember | `#FFCC55` | `#2A1A02` | 11.24:1 |
| aurora | `#3DE8A6` | `#052A1C` | 9.81:1 |
| volt | `#C6FF34` | `#182002` | 14.25:1 |
| candyBlue | `#B2D5E5` | `#13252D` | 10.18:1 |
| indigo | `#C8C3FF` | `#17162B` | 10.71:1 |

Do not derive the pair inside the component; the theme map remains the source of truth.

- [ ] **Step 4: Run the focused contract and commit**

Run:

```powershell
npx jest --runTestsByPath tests/daily_phrase_chrome.test.ts --no-cache --runInBand
git diff --check -- app/daily_phrase_chrome.ts tests/daily_phrase_chrome.test.ts
```

Expected: PASS and no whitespace errors.

Commit only these files:

```powershell
git add app/daily_phrase_chrome.ts tests/daily_phrase_chrome.test.ts
git commit -m "feat: add themed daily phrase actions"
```

## Task 2: Replace the tall home plaque with the approved compact card

**Files:**

- Modify: `tests/daily_phrase_quest_card_contract.test.ts`
- Modify: `tests/daily_phrase_locale.test.ts`
- Modify: `components/DailyPhraseCard.tsx`

- [ ] **Step 1: Replace obsolete home-reveal assertions with the approved stable-card contract**

In `tests/daily_phrase_quest_card_contract.test.ts`, replace the test named `hides the meaning on the home plaque until the quest is answered` with:

```ts
it('keeps the compact home plaque stable before and after the quest', () => {
  expect(source).toContain('const homeActionLabel = triLang(lang, {');
  expect(source).toContain('{homeActionLabel}');
  expect(source).toContain('backgroundColor: chrome.actionBg');
  expect(source).toContain('color={chrome.actionText}');
  expect(source).not.toContain('cardQuestAnswered');
  expect(source).not.toContain('questTeaser');
  expect(source).not.toContain('homeAdditionalMeaning');
});
```

In `tests/daily_phrase_locale.test.ts`, replace the two tests that expect the meaning on the home plaque with:

```ts
it('localizes the compact home action without exposing phrase meaning', () => {
  const componentPath = path.join(__dirname, '..', 'components', 'DailyPhraseCard.tsx');
  const source = fs.readFileSync(componentPath, 'utf8');

  expect(source).toContain("ru: 'Проверить себя'");
  expect(source).toContain("uk: 'Перевірити себе'");
  expect(source).toContain("es: 'Ponte a prueba'");
  expect(source).toContain('{homeActionLabel}');
  expect(source).not.toContain('{homeAdditionalMeaning}');
});
```

Keep the existing themed-asset test unchanged.

- [ ] **Step 2: Prove the new home contract fails**

Run:

```powershell
npx jest --runTestsByPath tests/daily_phrase_quest_card_contract.test.ts tests/daily_phrase_locale.test.ts --no-cache --runInBand
```

Expected: FAIL because the component still contains `cardQuestAnswered`, `questTeaser`, and the meaning branch.

- [ ] **Step 3: Remove only home-specific answered-state plumbing**

In `components/DailyPhraseCard.tsx`:

- Remove `cardQuestAnswered` state and its effect that mirrors `hasDailyPhraseQuestAnswered` onto the plaque.
- Remove only the corresponding `setCardQuestAnswered(...)` calls from `openDetails` and answer handling.
- Keep `hasDailyPhraseQuestAnswered`, `questPreviouslyAnswered`, `questAnswered`, and all modal logic intact.
- Remove `questTeaser` and `homeAdditionalMeaning` constants.
- Add a localized `homeActionLabel` using every locale already handled by the component. Required values include Russian `Проверить себя`, Ukrainian `Перевірити себе`, Spanish `Ponte a prueba`, and English fallback `Check yourself`.

- [ ] **Step 4: Render a fixed-geometry compact `homeAdditional` branch**

Keep the default plaque and the gate branch unchanged. For the live `homeAdditional` branch, render this information hierarchy inside the existing `Pressable` and themed gradient:

```tsx
<View style={styles.homeAdditionalContent}>
  <Text
    style={[styles.homeAdditionalKicker, { color: chrome.title, fontSize: Math.max(12, f.caption) }]}
    numberOfLines={1}
  >
    {title}
  </Text>
  <Text
    style={[styles.homeAdditionalPhrase, { color: chrome.phrase, fontSize: Math.max(22, f.h2) }]}
    numberOfLines={2}
  >
    {phrase.english}
  </Text>
  <View pointerEvents="none" style={[styles.homeAdditionalAction, { backgroundColor: chrome.actionBg }]}>
    <Text style={[styles.homeAdditionalActionText, { color: chrome.actionText, fontSize: Math.max(13, f.label) }]}>
      {homeActionLabel}
    </Text>
    <Ionicons name="arrow-forward" size={15} color={chrome.actionText} />
  </View>
</View>
```

Set the home `Pressable` accessibility label to include the title, phrase, and action label. Do not add a second nested `Pressable`; the whole plaque remains the single touch target.

- [ ] **Step 5: Apply compact styles without constraining accessibility text**

Update only live-home styles:

- `homeAdditionalPlaque`: target `minHeight: 124`, 16px vertical padding, existing outer margins, 20px radius.
- `homeAdditionalContent`: reserve approximately 70px on the right for the existing asset; no fixed height.
- `homeAdditionalGhostWrap` / `homeAdditionalGhostImage`: approximately 68–72px; keep `pointerEvents="none"`.
- `homeAdditionalKicker`: uppercase/letter-spaced visual label, strong but smaller than the phrase.
- `homeAdditionalPhrase`: strong hierarchy, two lines, `flexShrink: 1`, no `adjustsFontSizeToFit`.
- `homeAdditionalAction`: compact intrinsic-width pill with at least 32px height and dark text on bright fills.

Do not remove `homeAdditionalTitle` or `homeAdditionalSub`, because the target-closed gate still uses them.

- [ ] **Step 6: Run focused tests and commit**

Run:

```powershell
npx jest --runTestsByPath tests/daily_phrase_quest_card_contract.test.ts tests/daily_phrase_quest.test.ts tests/daily_phrase_locale.test.ts tests/gustav_french_daily_phrase_target_gate.test.ts tests/gustav_french_daily_tasks_target_filter.test.ts --no-cache --runInBand
git diff --check -- components/DailyPhraseCard.tsx tests/daily_phrase_quest_card_contract.test.ts tests/daily_phrase_locale.test.ts
```

Expected: PASS; no meaning or teaser on home; quest and target-gate tests remain green.

Commit only task files:

```powershell
git add components/DailyPhraseCard.tsx tests/daily_phrase_quest_card_contract.test.ts tests/daily_phrase_locale.test.ts
git commit -m "feat: compact the daily phrase home card"
```

## Task 3: Modernize the quiz sheet while preserving its content contract

**Files:**

- Modify: `tests/daily_phrase_quest_card_contract.test.ts`
- Modify: `components/DailyPhraseCard.tsx`

- [ ] **Step 1: Add source contracts for content preservation and the new structure**

Append tests that assert both the old data paths and new presentation markers:

```ts
it('preserves every explanation and flashcard locale field', () => {
  expect(source).toContain('{phraseCopy.literal}');
  expect(source).toContain('{phraseCopy.meaning}');
  expect(source).toContain('{phraseCopy.text}');
  expect(source).toContain('literalRu={phrase.literal}');
  expect(source).toContain('literalUk={phrase.literal_uk}');
  expect(source).toContain('literalEs={phrase.literal_es}');
  expect(source).toContain('explanationRu={phrase.text}');
  expect(source).toContain('explanationUk={phrase.text_uk}');
  expect(source).toContain('explanationEs={phrase.text_es}');
  expect(source).toContain('exampleRu={phrase.example_ru}');
  expect(source).toContain('exampleUk={phrase.example_uk}');
  expect(source).toContain('exampleEs={phrase.example_es}');
});

it('uses numbered answer markers and a dedicated explanation story rail', () => {
  expect(source).toContain('questOptions.map((option, optionIndex) =>');
  expect(source).toContain('styles.optionMarker');
  expect(source).toContain('{optionIndex + 1}');
  expect(source).toContain('styles.explanationRail');
});
```

- [ ] **Step 2: Run the test and confirm only the new presentation contract fails**

Run:

```powershell
npx jest --runTestsByPath tests/daily_phrase_quest_card_contract.test.ts --no-cache --runInBand
```

Expected: the preservation assertions pass; the numbered-marker/story-rail assertion fails.

- [ ] **Step 3: Refine the pre-answer option hierarchy**

Change the existing option loop to `questOptions.map((option, optionIndex) => ...)`. Inside each existing option `Pressable`, add a fixed circular/squircle marker showing `optionIndex + 1`, then render the complete existing option label beside it.

Preserve:

- the original `option.id` key and `onPress` handler;
- correct/wrong border and text colors;
- disabled state after answering;
- the entire localized meaning string without truncation.

- [ ] **Step 4: Refine the revealed explanation hierarchy**

Keep all three content values and labels, but style them as:

- literal translation: quiet compact block;
- exact meaning: stronger block with theme accent/border treatment;
- long explanation: a dedicated `View`/`TonalSurface` containing `styles.explanationRail` plus the full `{phraseCopy.text}`.

Do not replace the long text with a summary, excerpt, collapsed control, or generated copy. Keep pronunciation and save controls in their current conditional positions.

- [ ] **Step 5: Polish the sheet without changing modal ownership**

Keep the current `Modal`, `ScrollView`, `TonalSurface`, close control, answer state, success overlay, and save row. Limit visual changes to spacing, radii, typography, borders, and tonal grouping. Use only active theme values (`t.*` and `chrome.*`); do not introduce a fixed dark/light palette.

- [ ] **Step 6: Run regressions and commit**

Run:

```powershell
npx jest --runTestsByPath tests/daily_phrase_quest_card_contract.test.ts tests/daily_phrase_quest.test.ts tests/daily_phrase_locale.test.ts --no-cache --runInBand
git diff --check -- components/DailyPhraseCard.tsx tests/daily_phrase_quest_card_contract.test.ts
```

Expected: PASS, including all literal/meaning/explanation and flashcard field assertions.

Commit:

```powershell
git add components/DailyPhraseCard.tsx tests/daily_phrase_quest_card_contract.test.ts
git commit -m "feat: modernize daily phrase quiz details"
```

## Task 4: Add restrained entrance and feedback motion with reduced-motion support

**Files:**

- Modify: `tests/daily_phrase_quest_card_contract.test.ts`
- Modify: `components/DailyPhraseCard.tsx`

- [ ] **Step 1: Write the reduced-motion source contract**

Append:

```ts
it('guards one-shot modal and feedback motion with reduced-motion preference', () => {
  expect(source).toContain("import { useReduceMotion } from '../hooks/use_reduce_motion';");
  expect(source).toContain('const reduceMotion = useReduceMotion();');
  expect(source).toContain('const modalEntranceAnim = useRef(new Animated.Value(0)).current;');
  expect(source).toContain('useNativeDriver: true');
  expect(source).toContain('if (reduceMotion)');
  expect(source).not.toContain('Animated.loop');
});
```

- [ ] **Step 2: Confirm the contract fails**

Run:

```powershell
npx jest --runTestsByPath tests/daily_phrase_quest_card_contract.test.ts --no-cache --runInBand
```

Expected: FAIL because the modal does not yet use `useReduceMotion` or `modalEntranceAnim`.

- [ ] **Step 3: Add a one-shot modal entrance**

In `DailyPhraseCard.tsx`:

- import and call `useReduceMotion`;
- create `modalEntranceAnim`;
- when `detailsVisible` becomes true, set the value directly to `1` under reduced motion; otherwise animate from `0` to `1` over roughly 220ms with `Animated.timing`, `Easing.out(Easing.cubic)`, and `useNativeDriver: true`;
- apply opacity to the backdrop and opacity + `translateY: 14 → 0` + `scale: 0.985 → 1` to the sheet;
- keep the backdrop press target accessible and keep `shakeAnim` in the sheet transform list.

Do not add an exit animation that delays closing or changes modal state ownership.

- [ ] **Step 4: Guard existing answer animations**

For wrong-answer shake, explanation reveal, and correct success feedback:

- set final values immediately when `reduceMotion` is true;
- keep the existing finite animations otherwise;
- retain `useNativeDriver: true`;
- do not add `Animated.loop`, `setInterval`, or a repeating shimmer.

- [ ] **Step 5: Run tests and commit**

Run:

```powershell
npx jest --runTestsByPath tests/daily_phrase_quest_card_contract.test.ts tests/daily_phrase_quest.test.ts --no-cache --runInBand
git diff --check -- components/DailyPhraseCard.tsx tests/daily_phrase_quest_card_contract.test.ts
```

Expected: PASS and no infinite motion.

Commit:

```powershell
git add components/DailyPhraseCard.tsx tests/daily_phrase_quest_card_contract.test.ts
git commit -m "feat: polish daily phrase motion"
```

## Task 5: Run the focused automated verification gate

- [ ] **Step 1: Run all Daily Phrase and target-filter contracts together**

Run:

```powershell
npx jest --runTestsByPath tests/daily_phrase_chrome.test.ts tests/daily_phrase_quest_card_contract.test.ts tests/daily_phrase_quest.test.ts tests/daily_phrase_locale.test.ts tests/gustav_french_daily_phrase_target_gate.test.ts tests/gustav_french_daily_tasks_target_filter.test.ts --no-cache --runInBand
```

Expected: all suites PASS.

- [ ] **Step 2: Run narrow linting and diff validation**

Run:

```powershell
npx eslint components/DailyPhraseCard.tsx app/daily_phrase_chrome.ts tests/daily_phrase_chrome.test.ts tests/daily_phrase_quest_card_contract.test.ts tests/daily_phrase_locale.test.ts
git diff --check HEAD -- components/DailyPhraseCard.tsx app/daily_phrase_chrome.ts tests/daily_phrase_chrome.test.ts tests/daily_phrase_quest_card_contract.test.ts tests/daily_phrase_locale.test.ts
git status --short
```

Expected: no lint or whitespace errors. Review status to ensure no unrelated file was staged or committed. Do not run a whole-project typecheck or broad Jest suite unless a focused failure requires it.

## Task 6: Verify the real app in the visible Android emulator

- [ ] **Step 1: Launch the existing isolated development AVD visibly**

Use the existing `phraseman_pixel8` AVD and Metro on port 8081. Do not run the emulator headless. Confirm the launcher/app window is visible before continuing.

- [ ] **Step 2: Capture the compact card in representative themes**

Create `.codex-tmp/daily-phrase-redesign/` and capture screenshots for at least:

- one dark theme (`dark` or `minimalDark`);
- one light theme (`businessLight` or `candyBlue`);
- one vivid theme (`volt`, `coral`, or `aurora`).

For each theme verify:

- the card stays compact and does not dominate the home screen;
- title, English phrase, CTA, and existing themed asset are visible;
- CTA text/icon contrast is readable, especially on lime/green;
- a two-line phrase grows naturally without clipping;
- no translation or old teaser appears before or after answering.

- [ ] **Step 3: Exercise every modal state using real phrase data**

On the isolated emulator, verify and capture:

1. unopened home card;
2. pre-answer sheet with all three complete meaning options;
3. wrong answer feedback;
4. correct answer feedback and XP result;
5. revealed literal translation, exact meaning, and full long explanation;
6. pronunciation control after reveal;
7. flashcard save row with the same content;
8. previously-answered reopening behavior.

Use the real current phrase record; do not substitute mock display copy for screenshot QA.

- [ ] **Step 4: Verify accessibility motion and text sizing**

Enable Android “Remove animations”/reduced motion and confirm the modal and feedback resolve instantly without an intermediate invisible state. Increase system font size one step and confirm the card can expand, the phrase does not use `adjustsFontSizeToFit`, CTA remains readable, and modal text/options do not clip.

- [ ] **Step 5: Check runtime logs only for new failures**

Inspect Metro and `adb logcat` around the interaction. Record only decisive new warnings/errors in `.codex-tmp/daily-phrase-redesign/verification.txt`; do not paste broad logs into the task.

Expected: no new React warnings, animation driver errors, missing assets, or exceptions.

## Task 7: Final review and handoff

- [ ] **Step 1: Review the final diff against the approved spec**

Run:

```powershell
git diff HEAD~4..HEAD -- components/DailyPhraseCard.tsx app/daily_phrase_chrome.ts tests/daily_phrase_chrome.test.ts tests/daily_phrase_quest_card_contract.test.ts tests/daily_phrase_locale.test.ts
git log -4 --oneline
```

Confirm every non-negotiable contract at the top of this plan and verify there are no unrelated edits.

- [ ] **Step 2: Re-run the deterministic gate after any QA fix**

If visual QA required a code change, re-run Task 5 in full and create a narrowly scoped follow-up commit. A screenshot alone is not evidence that logic tests still pass.

- [ ] **Step 3: Report completion with evidence**

Report:

- the exact files changed;
- the focused test command and passing suite/test counts;
- lint/diff-check status;
- visible emulator themes and modal states inspected;
- screenshot artifact directory;
- confirmation that literal translation, exact meaning, full explanation, XP, pronunciation, and flashcard metadata were preserved.

