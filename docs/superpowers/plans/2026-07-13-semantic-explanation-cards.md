# Semantic Explanation Cards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the approved compact-intro semantic card layout to mistake-breakdown and quiz-answer explanation surfaces without changing requests, caches, limits, analytics, or navigation.

> **2026-07-13 user correction:** `ExplainSheet` / «Простыми словами» is intentionally excluded from the semantic-cloud redesign. It should stay a simple explanatory sheet: phrase block plus plain paragraphs. Do not route it through `LearningSemanticBlock`, `buildSimpleExplanationBlocks`, or any “Почему / Запомни / Правильно” block scheme.

**Architecture:** A pure presentation adapter converts existing unstructured explanation text plus explicit user/target answers into ordered semantic blocks. A shared React Native primitive renders those blocks with theme-derived tonal backgrounds, a 4 px semantic stripe, neutral readable text, and no borders; existing lesson mistake, quiz, dormant ELI5, and intro renderers consume it. `ExplainSheet` remains outside this adapter.

**Tech Stack:** React Native, Expo, TypeScript, Jest/ts-jest, existing `ThemeContext`, `Ionicons`, existing localization helpers.

---

## File map

- Create `app/explanation_presentation.ts`: pure block model, paragraph preservation, explicit remember-prefix handling, and conservative duplicate-target removal.
- Create `components/LearningSemanticBlock.tsx`: shared borderless semantic surface and ordered block renderer.
- Modify `components/AiMistakeCard.tsx`: replace green prose card with explicit user/why/correct blocks while preserving states and report/retry behavior.
- Preserve `components/ExplainSheet.tsx` as a plain simple-explanation sheet; add tests that it does not consume the shared semantic block renderer.
- Modify `components/MistakeEli5Modal.tsx`: use the shared presentation for ready content without mounting the dormant modal anywhere.
- Modify `app/(tabs)/quizzes.tsx`: use the same renderer for thematic AI and static quiz explanations.
- Modify `app/lesson_intro_rich.tsx`: route existing rich intro lines through the common primitive with visual override values that preserve the current intro appearance.
- Create `tests/explanation_presentation.test.ts`: unit tests for ordering, paragraphs, explicit labels, and duplicate protection.
- Create `tests/semantic_explanation_ui_contract.test.ts`: source contracts for all surfaces, borderless styling, and theme-safe long text.
- Modify `tests/explain_sheet.test.ts`: keep the plain paragraph-rendering contract for `ExplainSheet` and guard it from semantic renderer drift.
- Modify `tests/quiz_explain_ai_only_contract.test.ts`: keep AI-only behavior while asserting the new renderer integration.
- Modify `tests/ai_mistake_explain_client_contract.test.ts`: assert semantic cards without changing the callable contract.

### Task 1: Pure explanation presentation adapter

**Files:**
- Create: `app/explanation_presentation.ts`
- Test: `tests/explanation_presentation.test.ts`

- [ ] **Step 1: Write failing adapter tests**

```ts
import {
  buildMistakeExplanationBlocks,
  buildQuizExplanationBlocks,
  stripDuplicateTargetTail,
} from '../app/explanation_presentation';

const labels = {
  userAnswer: 'Твой вариант',
  why: 'Почему',
  remember: 'Запомни',
  correct: 'Правильно',
  phrase: 'Фраза',
};

describe('explanation presentation', () => {
  it('builds user, preserved explanation paragraphs, and correct blocks in order', () => {
    expect(buildMistakeExplanationBlocks({
      explanation: 'Первый абзац.\n\nВторой абзац.',
      userAnswer: 'a slower car',
      targetAnswer: 'They work more slowly now.',
      labels,
      rememberPrefixes: ['Запомни'],
    })).toEqual([
      expect.objectContaining({ tone: 'wrong', label: 'Твой вариант', text: 'a slower car', explicitStudyText: true }),
      expect.objectContaining({ tone: 'insight', label: 'Почему', text: 'Первый абзац.' }),
      expect.objectContaining({ tone: 'insight', text: 'Второй абзац.' }),
      expect.objectContaining({ tone: 'correct', label: 'Правильно', text: 'They work more slowly now.', explicitStudyText: true }),
    ]);
  });

  it('uses remember tone only for an explicit localized prefix', () => {
    const blocks = buildMistakeExplanationBlocks({
      explanation: 'Почему это важно.\n\nЗапомни: adverb описывает действие.',
      targetAnswer: 'They work slowly.',
      labels,
      rememberPrefixes: ['Запомни'],
    });
    expect(blocks[1]).toEqual(expect.objectContaining({ tone: 'remember', label: 'Запомни', text: 'adverb описывает действие.' }));
  });

  it('removes only a trailing target duplicate after a known label', () => {
    expect(stripDuplicateTargetTail(
      'Правило.\n\nПравильное предложение: "They work more slowly now."',
      'They work more slowly now.',
    )).toBe('Правило.');
    expect(stripDuplicateTargetTail(
      'Похожий пример: They worked more slowly yesterday.',
      'They work more slowly now.',
    )).toBe('Похожий пример: They worked more slowly yesterday.');
  });

  it('keeps quiz explanations semantic without touching ExplainSheet', () => {
    expect(buildQuizExplanationBlocks({
      lang: 'ru',
      correct: false,
      pickedAnswer: 'a slower car',
      correctAnswer: 'They work more slowly now.',
      explanation: 'Сначала смысл.\n\nПотом деталь.',
    }).map((block) => block.text)).toEqual([
      'a slower car',
      'Сначала смысл.',
      'Потом деталь.',
    ]);
  });
});
```

- [ ] **Step 2: Run the test and verify the missing-module failure**

Run:

```powershell
npx jest --runTestsByPath tests/explanation_presentation.test.ts --no-cache --runInBand
```

Expected: FAIL because `app/explanation_presentation.ts` does not exist.

- [ ] **Step 3: Implement the pure adapter**

Create these public types and functions:

```ts
export type ExplanationBlockTone = 'accent' | 'wrong' | 'insight' | 'remember' | 'correct';

export interface ExplanationLabels {
  userAnswer: string;
  why: string;
  remember: string;
  correct: string;
  phrase: string;
}

export interface ExplanationPresentationBlock {
  id: string;
  tone: ExplanationBlockTone;
  label?: string;
  text: string;
  explicitStudyText?: boolean;
}

interface MistakePresentationInput {
  explanation: string;
  userAnswer?: string | null;
  targetAnswer?: string | null;
  labels: ExplanationLabels;
  rememberPrefixes?: readonly string[];
}

interface SimplePresentationInput {
  phrase: string;
  explanation: string;
  labels: ExplanationLabels;
}

function paragraphs(text: string): string[] {
  return String(text ?? '').split(/\n\s*\n/).map((value) => value.trim()).filter(Boolean);
}

function comparable(text: string): string {
  return text
    .normalize('NFKC')
    .toLocaleLowerCase()
    .replace(/["“”«»'‘’]/g, '')
    .replace(/[.!?]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function stripDuplicateTargetTail(explanation: string, targetAnswer?: string | null): string {
  const sourceParagraphs = paragraphs(explanation);
  const target = comparable(targetAnswer ?? '');
  if (!target || sourceParagraphs.length === 0) return sourceParagraphs.join('\n\n');
  const last = sourceParagraphs[sourceParagraphs.length - 1];
  const candidate = last.includes(':') ? last.slice(last.lastIndexOf(':') + 1) : last;
  if (comparable(candidate) !== target) return sourceParagraphs.join('\n\n');
  return sourceParagraphs.slice(0, -1).join('\n\n');
}
```

Implement `buildMistakeExplanationBlocks` so it trims explicit answers, adds the wrong block only when `userAnswer` is non-empty, calls `stripDuplicateTargetTail`, preserves every remaining paragraph, recognizes only `^<rememberPrefix>\s*[:—-]\s*`, labels only the first normal explanation block as `labels.why`, and ends with the correct block when `targetAnswer` is non-empty. Implement `buildQuizExplanationBlocks` for quiz explanations with the same semantic tones. Do not implement a builder for `ExplainSheet`; that sheet stays plain. Builders assign stable ids from the block role and paragraph index.

- [ ] **Step 4: Run the adapter test and verify it passes**

Run the Step 2 command.

Expected: PASS.

- [ ] **Step 5: Commit the adapter**

```powershell
git add -- app/explanation_presentation.ts tests/explanation_presentation.test.ts
git commit -m "feat: model semantic explanation blocks"
```

### Task 2: Shared borderless semantic block primitive

**Files:**
- Create: `components/LearningSemanticBlock.tsx`
- Create: `tests/semantic_explanation_ui_contract.test.ts`
- Modify: `app/lesson_intro_rich.tsx`

- [ ] **Step 1: Write the failing UI contract**

The test must read the component sources and assert:

```ts
expect(semanticSource).toContain("export type LearningSemanticTone = ExplanationBlockTone | 'neutral'");
expect(semanticSource).toContain('width: 4');
expect(semanticSource).toContain('borderWidth: 0');
expect(semanticSource).toContain('color: t.textPrimary');
expect(semanticSource).not.toContain('color: toneColor');
expect(introSource).toContain('<LearningSemanticBlock');
```

Also import `DARK`, `GOLD`, `CORAL`, `MINIMAL_DARK`, `MIDNIGHT`, `EMBER`, `AURORA`, `VOLT`, `BUSINESS`, and `BUSINESS_LIGHT` from `constants/theme`. In the test, composite each `wrongBg`, `goldBg`, `accentBg`, and `correctBg` RGBA value over `bgCard`, calculate WCAG relative luminance, and assert `contrast(theme.textPrimary, compositedBackground) >= 4.5` for every theme/tone.

- [ ] **Step 2: Run the UI contract and verify it fails**

Run:

```powershell
npx jest --runTestsByPath tests/semantic_explanation_ui_contract.test.ts --no-cache --runInBand
```

Expected: FAIL because the shared component is missing and intro does not use it.

- [ ] **Step 3: Implement `LearningSemanticBlock`**

Use the following public API:

```ts
export type LearningSemanticTone = ExplanationBlockTone | 'neutral';

interface LearningSemanticBlockProps {
  tone: LearningSemanticTone;
  label?: string;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  children: React.ReactNode;
  compact?: boolean;
  testID?: string;
  backgroundColorOverride?: string;
  stripeColorOverride?: string;
}
```

Map tones to theme chrome:

```ts
const chrome = {
  accent: { backgroundColor: t.accentBg, stripeColor: t.accent, icon: 'sparkles-outline' },
  wrong: { backgroundColor: t.wrongBg, stripeColor: t.wrong, icon: 'close-circle-outline' },
  insight: { backgroundColor: t.goldBg, stripeColor: t.gold, icon: 'bulb-outline' },
  remember: { backgroundColor: t.goldBg, stripeColor: t.gold, icon: 'bookmark-outline' },
  correct: { backgroundColor: t.correctBg, stripeColor: t.correct, icon: 'checkmark-circle-outline' },
  neutral: { backgroundColor: t.bgSurface2, stripeColor: t.textMuted, icon: 'information-circle-outline' },
}[tone];
```

Render a root `View` with `borderWidth: 0`, `borderRadius: 12`, `overflow: 'hidden'`, and `position: 'relative'`; render an absolute 4 px stripe; render the optional icon and label using the icon color for the icon but `t.textPrimary` for the label. The child text must be supplied by the caller and never inherit the stripe color.

- [ ] **Step 4: Reuse the primitive in `RichIntroLineView`**

Replace the framed line wrapper with:

```tsx
<LearningSemanticBlock
  tone="neutral"
  backgroundColorOverride={semanticLineBg}
  stripeColorOverride={semanticColor}
>
  <RichTextParts ... />
</LearningSemanticBlock>
```

For unframed intro lines, preserve the existing plain `View`. Pass the existing formula padding/font styles so intro geometry and colors remain unchanged.

- [ ] **Step 5: Run the UI contract and existing intro contracts**

Run:

```powershell
npx jest --runTestsByPath tests/semantic_explanation_ui_contract.test.ts tests/lesson_intro_single_gate_contract.test.ts tests/lesson_intro_screens_locale.test.ts --no-cache --runInBand
```

Expected: PASS.

- [ ] **Step 6: Commit the primitive**

```powershell
git add -- components/LearningSemanticBlock.tsx app/lesson_intro_rich.tsx tests/semantic_explanation_ui_contract.test.ts
git commit -m "feat: add borderless learning semantic blocks"
```

### Task 3: Lesson mistake card and dormant ELI5 surface

**Files:**
- Modify: `components/AiMistakeCard.tsx`
- Modify: `components/MistakeEli5Modal.tsx`
- Modify: `tests/ai_mistake_explain_client_contract.test.ts`

- [ ] **Step 1: Extend the failing contract**

Add assertions that `AiMistakeCard` imports and calls `buildMistakeExplanationBlocks`, renders `LearningSemanticBlock` for each ready block, uses `t.textPrimary` for block text, and has `borderWidth: 0`. Assert that `MistakeEli5Modal` uses the same mistake/breakdown presentation internally and does not gain a new call site.

- [ ] **Step 2: Run the contract and verify it fails**

```powershell
npx jest --runTestsByPath tests/ai_mistake_explain_client_contract.test.ts --no-cache --runInBand
```

Expected: FAIL on the new semantic-block assertions.

- [ ] **Step 3: Wire `AiMistakeCard`**

Build localized labels with the existing `triLang` languages. Memoize ready blocks from `explanation`, `userAnswer`, `targetAnswer`, and `lang`. In the ready path, render one `LearningSemanticBlock` per block and use:

```tsx
<Text style={{ color: t.textPrimary, fontSize: f.body, lineHeight: 20, fontWeight: block.explicitStudyText ? '800' : '500' }}>
  {block.text}
</Text>
```

Keep loading, limit, error fallback, report, and retry branches unchanged. Remove the ready-state `BilingualMistakeText` use. Change the outer `card` style to `borderWidth: 0`; do not add a colored outer border.

- [ ] **Step 4: Wire the dormant `MistakeEli5Modal` ready branch**

Use the shared mistake/breakdown presentation with no user answer so only explanation paragraphs render. Render the ready text through `LearningSemanticBlock`; keep the modal unreferenced and preserve loading/error/retry/close behavior.

- [ ] **Step 5: Run the focused tests**

```powershell
npx jest --runTestsByPath tests/explanation_presentation.test.ts tests/ai_mistake_explain_client_contract.test.ts tests/lesson_ai_mistake_card_contract.test.ts --no-cache --runInBand
```

Expected: PASS, except any pre-existing `MistakeEli5Modal` source-string drift must first be confirmed against the baseline and reported rather than hidden.

- [ ] **Step 6: Commit the lesson surfaces**

```powershell
git add -- components/AiMistakeCard.tsx components/MistakeEli5Modal.tsx tests/ai_mistake_explain_client_contract.test.ts
git commit -m "feat: restyle lesson mistake explanations"
```

### Task 4: Explain simply sheet boundary

**Files:**
- Modify: `components/ExplainSheet.tsx`
- Modify: `tests/explain_sheet.test.ts`

- [ ] **Step 1: Preserve the plain sheet contract**

Update the body-rendering tests to require `splitExplainParagraphs(display.text)`, `splitExplainSegments`, and the existing `bodyEn` highlighting for English segments. Add a source contract that `ExplainSheet` does not import `LearningSemanticBlock` and does not call any semantic explanation builder.

- [ ] **Step 2: Run the sheet test and verify the boundary**

```powershell
npx jest --runTestsByPath tests/explain_sheet.test.ts --no-cache --runInBand
```

Expected after the correction: existing unrelated failures may remain, but the `ExplainSheet` body contract must assert plain paragraphs rather than semantic cards.

- [ ] **Step 3: Keep the sheet implementation plain**

Keep `resolveExplainDisplay`, loading/limit/degraded branches, the standalone phrase block, paragraph rendering, `ExplainReportButton`, footer, close button, animation, analytics, credit callback, retry, and all existing `testID` values. Do not add “Почему / Запомни / Правильно” semantic blocks to this surface.

- [ ] **Step 4: Run sheet and request tests**

```powershell
npx jest --runTestsByPath tests/explain_sheet.test.ts --no-cache --runInBand
```

Expected: any remaining failures must be unrelated baseline failures; the simple-sheet source contract should pass.

- [ ] **Step 5: Commit the sheet**

```powershell
git add -- components/ExplainSheet.tsx tests/explain_sheet.test.ts
git commit -m "fix: keep simple explanations plain"
```

### Task 5: Thematic and static quiz explanations

**Files:**
- Modify: `app/(tabs)/quizzes.tsx`
- Modify: `tests/quiz_explain_ai_only_contract.test.ts`
- Modify: `tests/semantic_explanation_ui_contract.test.ts`

- [ ] **Step 1: Write failing quiz integration assertions**

Keep the AI-only and retry assertions, but replace `expect(quizSource).toContain('{aiExplanation}')` with assertions for `buildMistakeExplanationBlocks`, `LearningSemanticBlock`, `explanation: aiExplanation`, and `explanation`. Assert both thematic and static branches pass `userAnswer` only when the answer is wrong and pass `quizCorrectEn` as the target.

- [ ] **Step 2: Run the quiz contracts and verify they fail**

```powershell
npx jest --runTestsByPath tests/quiz_explain_ai_only_contract.test.ts tests/semantic_explanation_ui_contract.test.ts --no-cache --runInBand
```

Expected: FAIL on the renderer integration assertions while existing AI-only behavior remains green.

- [ ] **Step 3: Add a local semantic explanation renderer in the quiz screen**

Extract a small memoized `QuizExplanationBlocks` component near the existing quiz helper components. Its props are `explanation`, `userAnswer`, `targetAnswer`, `lang`, `compact`, and optional report content. It calls `buildMistakeExplanationBlocks` and maps to `LearningSemanticBlock` with neutral `t.textPrimary` prose.

Replace only the ready content in both quiz branches. Preserve `Animated.View`, loading skeletons, unavailable retry, `ExplainReportButton`, `numberOfLines` compact behavior, current analytics, and all answer-selection logic. Remove the old hard-coded blue/gold prose colors from explanation bodies; semantic colors remain on stripes and tonal backgrounds.

- [ ] **Step 4: Run focused quiz and borderless contracts**

```powershell
npx jest --runTestsByPath tests/quiz_explain_ai_only_contract.test.ts tests/personal_plan_quiz_screen_contract.test.ts tests/main_tabs_borderless_surfaces_contract.test.ts tests/borderless_top_bevel_contract.test.ts --no-cache --runInBand
```

Expected: PASS.

- [ ] **Step 5: Commit quiz integration**

```powershell
git add -- 'app/(tabs)/quizzes.tsx' tests/quiz_explain_ai_only_contract.test.ts tests/semantic_explanation_ui_contract.test.ts
git commit -m "feat: unify quiz explanation cards"
```

### Task 6: Focused verification and visual gate

**Files:**
- Verify only; do not update snapshots, fixtures, ledgers, generated source, or unrelated files.

- [ ] **Step 1: Run the complete focused Jest set**

```powershell
npx jest --runTestsByPath tests/explanation_presentation.test.ts tests/semantic_explanation_ui_contract.test.ts tests/ai_mistake_explain_client_contract.test.ts tests/lesson_ai_mistake_card_contract.test.ts tests/explain_sheet.test.ts tests/quiz_explain_ai_only_contract.test.ts tests/personal_plan_quiz_screen_contract.test.ts tests/main_tabs_borderless_surfaces_contract.test.ts tests/borderless_top_bevel_contract.test.ts --no-cache --runInBand
```

Expected: all focused tests PASS. Test runs must remain read-only under `tests/setup_jest_write_guard.js`.

- [ ] **Step 2: Run targeted lint/type diagnostics**

```powershell
npx eslint app/explanation_presentation.ts components/LearningSemanticBlock.tsx components/AiMistakeCard.tsx components/ExplainSheet.tsx components/MistakeEli5Modal.tsx app/lesson_intro_rich.tsx 'app/(tabs)/quizzes.tsx'
```

Expected: zero errors in changed files. Do not run the whole-project typecheck unless a focused diagnostic cannot isolate an error.

- [ ] **Step 3: Inspect the final diff and check whitespace/secrets**

```powershell
git diff --check
git diff -- app/explanation_presentation.ts components/LearningSemanticBlock.tsx components/AiMistakeCard.tsx components/ExplainSheet.tsx components/MistakeEli5Modal.tsx app/lesson_intro_rich.tsx 'app/(tabs)/quizzes.tsx' tests/explanation_presentation.test.ts tests/semantic_explanation_ui_contract.test.ts tests/ai_mistake_explain_client_contract.test.ts tests/explain_sheet.test.ts tests/quiz_explain_ai_only_contract.test.ts
```

Expected: no whitespace errors, no secrets, no OpenAI dev calls, no deleted functionality, and only the approved presentation changes.

- [ ] **Step 4: Perform the narrow visual review**

Check the ready state on a 360–375 px Android viewport in `dark`, `midnight`, `volt`, `coral`, `gold`, and one light/dev theme. Check Russian and Spanish or Portuguese copy at normal and large font sizes. Verify no green-on-green prose, no clipped labels, no horizontal overflow, and no borders around the semantic blocks.

- [ ] **Step 5: Request the mandatory final Advisor review**

Send the objective, project instructions, final affected paths, actual diff, focused test output, lint output, visual evidence, and unresolved baseline failures. If the decision is `CHANGES_REQUIRED`, fix and resubmit the final state. Completion requires `DECISION: APPROVED`.

- [ ] **Step 6: Confirm the approved final state is cleanly recorded**

```powershell
git status --short -- app/explanation_presentation.ts components/LearningSemanticBlock.tsx components/AiMistakeCard.tsx components/ExplainSheet.tsx components/MistakeEli5Modal.tsx app/lesson_intro_rich.tsx 'app/(tabs)/quizzes.tsx' tests/explanation_presentation.test.ts tests/semantic_explanation_ui_contract.test.ts tests/ai_mistake_explain_client_contract.test.ts tests/explain_sheet.test.ts tests/quiz_explain_ai_only_contract.test.ts
```

Expected: no uncommitted changes remain in the task-owned paths after the task commits and any Advisor-requested correction commit.
