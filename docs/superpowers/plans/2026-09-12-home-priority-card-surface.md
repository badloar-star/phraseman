# Home Priority Card Surface Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the shared “last lesson / my mistakes” card reuse exactly the same themed outer surface as the “Lessons” and “Cards” quick-start tiles without changing its geometry or behavior.

**Architecture:** Keep the change inside the existing home screen. Promote the quick-start fill and paper-theme border decisions into shared render tokens, consume those tokens from both the square quick-start tiles and horizontal priority card, and replace only the priority card’s inner gradient wrapper with a plain `View`.

**Tech Stack:** React Native 0.81, Expo 54, TypeScript, Jest source-contract tests.

**Workspace constraint:** Execute in the current checkout because this repository forbids creating a branch, worktree, or delegated coding session without an explicit owner request.

---

## File map

- Modify `tests/home_learning_cta_contract.test.ts`: protect the exact shared-surface relationship and removal of the priority card gradient.
- Modify `app/(tabs)/home.tsx`: define and reuse the shared surface tokens; keep all card content and interactions intact.

### Task 1: Share the quick-start surface with the priority card

**Files:**

- Modify: `tests/home_learning_cta_contract.test.ts`
- Modify: `app/(tabs)/home.tsx:1305-1325`
- Modify: `app/(tabs)/home.tsx:4231-4271`
- Modify: `app/(tabs)/home.tsx:4315-4370`

- [x] **Step 1: Write the failing source-contract test**

Add this test inside the existing `describe('home learning CTA contract', ...)` block:

```ts
it('reuses the quick-start surface material for the priority card', () => {
  const quickStartStart = source.indexOf('{visibleQuickItems.map((item, index) => {');
  const priorityStart = source.indexOf("testID={showMistakesCard ? 'home-mistakes-card' : 'home-continue-lesson'}");
  const priorityEnd = source.indexOf('{/* «Задание»', priorityStart);
  const quickStartSource = source.slice(quickStartStart, priorityStart);
  const prioritySource = source.slice(priorityStart, priorityEnd);

  expect(source).toContain(
    "const homeQuickTilePanelBg = isGoldTheme ? goldPanelBg : isPaperHomeTheme ? lightPanelBg : 'rgba(255,255,255,0.055)';",
  );
  expect(source).toContain('const homeQuickTileBorderWidth = isPaperHomeTheme ? 1 : 0;');
  expect(source).toContain("const homeQuickTileBorderColor = isPaperHomeTheme ? homeThemePanelBorder : 'transparent';");
  expect(quickStartSource).toContain('backgroundColor: homeQuickTilePanelBg');
  expect(prioritySource).toContain('backgroundColor: homeQuickTilePanelBg');
  expect(prioritySource).toContain('borderWidth: homeQuickTileBorderWidth');
  expect(prioritySource).toContain('borderColor: homeQuickTileBorderColor');
  expect(prioritySource).not.toContain('<LinearGradient colors={homeThemePanelGradient}');
});
```

- [x] **Step 2: Run the focused test and confirm RED**

Acquire the shared heavy-process slot, run only the focused test, and always release the slot:

```bash
bash .claude/semaphore/slot.sh acquire "jest (home priority card surface RED)"
npx jest --runTestsByPath tests/home_learning_cta_contract.test.ts --no-cache --runInBand
bash .claude/semaphore/slot.sh release
```

Expected: FAIL in `reuses the quick-start surface material for the priority card` because `homeQuickTilePanelBg` does not exist and the priority card still uses `homeThemePanelGradient`.

- [x] **Step 3: Define the shared surface tokens**

Immediately after `homeThemePanelBorder` in `app/(tabs)/home.tsx`, add:

```ts
const homeQuickTilePanelBg = isGoldTheme ? goldPanelBg : isPaperHomeTheme ? lightPanelBg : 'rgba(255,255,255,0.055)';
const homeQuickTileBorderWidth = isPaperHomeTheme ? 1 : 0;
const homeQuickTileBorderColor = isPaperHomeTheme ? homeThemePanelBorder : 'transparent';
```

These tokens deliberately preserve the existing dark, paper/light, gold, and olive quick-start branches.

- [x] **Step 4: Make the quick-start tiles consume the shared tokens**

Inside `visibleQuickItems.map`, remove the local `tilePanelBg` declaration while keeping `tileIconBg`. Change the outer `TouchableOpacity` surface fields to:

```tsx
backgroundColor: homeQuickTilePanelBg,
borderWidth: homeQuickTileBorderWidth,
borderColor: homeQuickTileBorderColor,
```

Do not change the tile radius, icon plate, animation, labels, actions, or gold/olive shadows.

- [x] **Step 5: Apply the same surface to the priority card**

Extend the existing priority-card `TouchableOpacity` style with the shared surface tokens:

```tsx
style={[
  {
    marginHorizontal: 8,
    marginBottom: 12,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: homeQuickTilePanelBg,
    borderWidth: homeQuickTileBorderWidth,
    borderColor: homeQuickTileBorderColor,
  },
  isGoldTheme ? goldShadow(1) : isOliveTheme ? oliveShadow(1) : null,
]}
```

Replace only the inner priority-card gradient tags:

```tsx
<View style={{ borderRadius: 20, paddingHorizontal: 16, overflow: 'hidden' }}>
  {isGoldTheme && <GoldBevel radius={20} intensity="quiet"/>}
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, minHeight: 72 }}>
    <View style={{ width: homeLastLessonArtSlotWidth, height: homeLastLessonArtSlotHeight, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <LightSketchMenuImage source={priorityCardImage} width={priorityCardArtSize} height={priorityCardArtSize} lighten={false} contentFit="contain" cachePolicy="memory-disk"/>
    </View>
    <View style={{ flex: 1, minWidth: 0 }}>
      <FlowText testID={showMistakesCard ? 'home-mistakes-title' : 'home-continue-lesson-title'} provenance="authored" style={{ color: homeThemePanelText, fontSize: Math.max(15, f.body), fontWeight: '700' }}>
        {priorityCardTitle}
      </FlowText>
    </View>
    <View style={{ minWidth: 30, alignItems: 'flex-end', flexShrink: 0 }}>
      <Text style={{ color: homeThemePanelMuted, fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] /* guard-ok: правый счётчик прогресса */ }}>
        {priorityCardCounter}
      </Text>
    </View>
  </View>
</View>
```

- [x] **Step 6: Run the focused test and confirm GREEN**

```bash
bash .claude/semaphore/slot.sh acquire "jest (home priority card surface GREEN)"
npx jest --runTestsByPath tests/home_learning_cta_contract.test.ts --no-cache --runInBand
bash .claude/semaphore/slot.sh release
```

Expected: PASS, including the new shared-surface contract and the existing lesson/mistakes interaction contracts.

- [x] **Step 7: Inspect the narrow diff**

```bash
git diff --check -- app/(tabs)/home.tsx tests/home_learning_cta_contract.test.ts
git diff --unified=5 -- app/(tabs)/home.tsx tests/home_learning_cta_contract.test.ts
```

Expected: only the new test, three shared surface tokens, token reuse in the two card types, and the priority wrapper change. Existing unrelated edits in `home.tsx` remain untouched.

- [ ] **Step 8: Commit only the implementation files if repository guards permit it**

```bash
git add -- app/(tabs)/home.tsx tests/home_learning_cta_contract.test.ts
git commit --only -m "fix(home): match priority card surface" -- app/(tabs)/home.tsx tests/home_learning_cta_contract.test.ts
```

Expected: commit succeeds without including other staged files. If an unrelated repository guard fails, do not bypass it; leave the verified implementation in the working tree and report the exact guard failure.

Not executed: `app/(tabs)/home.tsx` already contained extensive unrelated working-tree changes before this task, so a path-level commit would capture work outside this plan. The repository pre-commit guard also currently blocks on unrelated Learning V2 audio wiring. The implementation remains verified in the shared working tree.
