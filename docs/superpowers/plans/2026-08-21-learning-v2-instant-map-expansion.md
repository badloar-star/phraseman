# Learning V2 Instant Map Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the inline 56-session Learning V2 lesson map respond in the first frame without canonical topology hashing, synchronous mass mounting, network, or storage in the tap path.

**Architecture:** Replace the full-course accordion projection with a bounded coordinate-based projection and a small semantic cache. Flatten chapter/session rows into the existing outer `FlatList` so list windowing mounts only the viewport, prewarm the likely expansion before press, and keep motion visible from the first frame on the UI thread.

**Tech Stack:** React Native 0.81, React 19, Expo Router, Reanimated 4, TypeScript, Jest.

---

## File responsibilities

- `modules/learning-v2/map/course_accordion_map_model_v1.ts` — bounded, fail-closed accordion projection and cache; no canonical topology/hash.
- `app/(tabs)/lessons.tsx` — flat V2 list composition, idle/press-in preparation, virtualized row rendering and navigation.
- `components/LearningV2InlineNodeReveal.tsx` — first-frame-visible UI-thread settle animation.
- `tests/learning_v2_course_accordion_map_model_v1.test.ts` — projection behavior, strict validation and cache identity.
- `tests/learning_v2_instant_map_hot_path.test.ts` — deterministic source-level regression guard for the interaction architecture.

### Task 1: Remove canonical topology/hash from the accordion projection

**Files:**
- Modify: `tests/learning_v2_course_accordion_map_model_v1.test.ts`
- Create: `tests/learning_v2_instant_map_hot_path.test.ts`
- Modify: `modules/learning-v2/map/course_accordion_map_model_v1.ts`

- [ ] **Step 1: Write failing model and hot-path tests**

Add a cache identity case to the model suite:

```ts
test("reuses the immutable projection for the same semantic input", () => {
  const input = {
    projectionScopeKey: "account-1:en",
    expandedLessonOrdinal: 1,
    completedSessionIds: [learningV2CourseSessionIdV1(1, 1)],
    currentSessionId: learningV2CourseSessionIdV1(1, 2),
  } as const;
  expect(buildLearningV2CourseAccordionMapModelV1(input)).toBe(
    buildLearningV2CourseAccordionMapModelV1(input),
  );
});
```

Create a source guard:

```ts
import fs from "node:fs";
import path from "node:path";

const read = (relativePath: string) =>
  fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");

test("accordion interaction projection never builds or hashes canonical topology", () => {
  const source = read("modules/learning-v2/map/course_accordion_map_model_v1.ts");
  expect(source).not.toContain("buildLearningV2CourseTopologyV1");
  expect(source).not.toContain("hashCanonicalBody");
  expect(source).toContain("LEARNING_V2_LESSON_SESSION_COUNT_V1");
});
```

- [ ] **Step 2: Run RED**

Run:

```powershell
npx jest --runTestsByPath tests/learning_v2_course_accordion_map_model_v1.test.ts tests/learning_v2_instant_map_hot_path.test.ts --no-cache --runInBand
```

Expected: FAIL because the input has no `projectionScopeKey` contract/cache and the source still calls `buildLearningV2CourseTopologyV1`.

- [ ] **Step 3: Implement the bounded projection**

Replace full topology construction with existing constants/helpers:

```ts
import {
  LEARNING_V2_CHAPTER_SESSION_COUNT_V1,
  LEARNING_V2_COURSE_LESSON_COUNT_V1,
  LEARNING_V2_LESSON_SESSION_COUNT_V1,
  learningV2CourseLessonIdV1,
  learningV2CourseSessionIdV1,
  learningV2CourseSessionRoleV1,
  type LearningV2CourseSessionRoleV1,
} from "../content/course_topology_v1";
```

Add `projectionScopeKey: string` to the input, parse exact session IDs by strict
coordinates, reject duplicates/unknown IDs, build only 32 lesson rows plus the
selected lesson's 7 chapter/56 session rows, and cache a bounded number of
immutable results by scope + expanded lesson + current ID + sorted completed IDs.

- [ ] **Step 4: Run GREEN**

Run the command from Step 2. Expected: 2 suites PASS with the existing ordering,
checkpoint, final-exam and fail-closed assertions unchanged.

### Task 2: Flatten the inline map into the outer virtualized list

**Files:**
- Modify: `tests/learning_v2_instant_map_hot_path.test.ts`
- Modify: `tests/lessons_v2_surface_contract.test.ts`
- Modify: `app/(tabs)/lessons.tsx`

- [ ] **Step 1: Add RED architecture assertions**

```ts
test("renders V2 chapter and session rows as outer virtualized list items", () => {
  const source = read("app/(tabs)/lessons.tsx");
  expect(source).toContain('kind: "v2_chapter"');
  expect(source).toContain('kind: "v2_session"');
  expect(source).toContain("LearningV2InlineMapRow");
  expect(source).not.toContain("function LearningV2InlineMap(");
  expect(source).not.toMatch(/<LearningV2InlineMap\s/);
});
```

Update the existing surface contract to require the row renderer rather than
the rejected nested map component.

- [ ] **Step 2: Run RED**

Run:

```powershell
npx jest --runTestsByPath tests/learning_v2_instant_map_hot_path.test.ts tests/lessons_v2_surface_contract.test.ts --no-cache --runInBand
```

Expected: FAIL because the active surface still renders all 56 nodes inside one
outer lesson item.

- [ ] **Step 3: Implement flat row composition**

Extend local `ListItem` with:

```ts
| { kind: "v2_chapter"; row: Extract<LearningV2CourseAccordionRowV1, { kind: "chapter" }> }
| { kind: "v2_session"; row: Extract<LearningV2CourseAccordionRowV1, { kind: "session" }> };
```

When `page === "v2"`, map `learningV2Accordion.rows` directly into lesson,
chapter and session list items. Extend `keyExtractor` with `row.id`. Replace
`LearningV2InlineMap` with `LearningV2InlineMapRow`, a memoized component that
renders one chapter or one session using the existing geometry, labels,
accessibility state and session press contract.

Move the current session preload/modal selection lambda into a stable
`handleLearningV2SessionPress` callback and pass it to each row.

- [ ] **Step 4: Run GREEN**

Run the command from Step 2. Expected: both suites PASS.

### Task 3: Prewarm expansion and remove loading-like motion

**Files:**
- Modify: `tests/learning_v2_instant_map_hot_path.test.ts`
- Modify: `components/LearningV2InlineNodeReveal.tsx`
- Modify: `app/(tabs)/lessons.tsx`

- [ ] **Step 1: Add RED first-frame assertions**

```ts
test("keeps map rows visible from their first frame without a long stagger hold", () => {
  const source = read("components/LearningV2InlineNodeReveal.tsx");
  expect(source).toContain("FIRST_FRAME_OPACITY");
  expect(source).not.toContain("REVEAL_MAX_DELAY_MS = 130");
  expect(source).not.toMatch(/opacity:\s*progress\.value[,}]/);
});

test("prepares an expansion before the confirmed press", () => {
  const source = read("app/(tabs)/lessons.tsx");
  expect(source).toContain("onLearningV2PressIn");
  expect(source).toContain("InteractionManager.runAfterInteractions");
});
```

- [ ] **Step 2: Run RED**

Run the hot-path suite alone. Expected: FAIL on missing first-frame opacity and
preparation wiring.

- [ ] **Step 3: Implement preparation and bounded UI-thread motion**

Add `onLearningV2PressIn` to `LessonCard`; call it after starting the existing
Reanimated press scale. Prewarm the current lesson with
`InteractionManager.runAfterInteractions` when the V2 page/progress scope is
stable, and prepare any other lesson idempotently on press-in.

Change node reveal to a 140–180 ms settle with opacity visible from frame one:

```ts
const FIRST_FRAME_OPACITY = 0.88;
const REVEAL_STEP_MS = 4;
const REVEAL_MAX_DELAY_MS = 24;
const REVEAL_DURATION_MS = 150;

opacity: FIRST_FRAME_OPACITY + progress.value * (1 - FIRST_FRAME_OPACITY)
```

Shorten the global layout transition to 160 ms. Reduced-motion continues to
render the final state immediately.

- [ ] **Step 4: Run GREEN**

Run:

```powershell
npx jest --runTestsByPath tests/learning_v2_instant_map_hot_path.test.ts tests/learning_v2_course_accordion_map_model_v1.test.ts tests/lessons_v2_surface_contract.test.ts --no-cache --runInBand
```

Expected: all focused suites PASS.

### Task 4: Focused regression and performance evidence

**Files:**
- Verify only; update `docs/v2/HANDOVER.md` only if its existing dirty owner can be safely preserved.

- [ ] **Step 1: Run the complete focused regression set**

```powershell
npx jest --runTestsByPath tests/learning_v2_instant_map_hot_path.test.ts tests/learning_v2_course_accordion_map_model_v1.test.ts tests/lessons_v2_surface_contract.test.ts tests/learning_v2_lesson_map_screen_contract.test.ts tests/layout_stability_contract.test.ts --no-cache --runInBand
```

Expected: all suites PASS with zero failures.

- [ ] **Step 2: Run targeted TypeScript checking**

Use the repository's narrow TypeScript command if present; otherwise run the
project typecheck with output redirected through `scripts/codex-safe-run.mjs`
and report only diagnostics belonging to changed files.

- [ ] **Step 3: Re-run the pure model benchmark**

Use 30 iterations of `buildLearningV2CourseAccordionMapModelV1` with a unique
scope per measured series. Record min/median/max and compare with the verified
148.62 ms baseline. This diagnostic is evidence, not a flaky CI gate.

- [ ] **Step 4: Device verification**

In a release/minified build, record 20 cold-after-navigation and 20 warm reopen
runs of `press -> first map row painted`, React commit timeline, JS/UI FPS and
long tasks. Required budgets are those in the approved design. If no device is
attached, report device evidence as NOT RUN rather than inferring PASS.

- [ ] **Step 5: Scope and drift checks**

Confirm the diff contains no content, locale, SessionKind, progress authority,
economy, Firestore, Jarvis, deploy or release changes. Record `ON TRACK`; do not
call it Learning V2 PASS.

