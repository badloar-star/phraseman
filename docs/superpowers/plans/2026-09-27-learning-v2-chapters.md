# Learning V2 Chapters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Learning V2 open as the approved chapter view, with the existing lesson list retained as explicit navigation rather than the primary map.

**Architecture:** Reuse the authoritative Learning V2 accordion-progress model and all existing session access/navigation callbacks. Replace only the primary `LearningV2PulseCourse` visual projection: one current lesson displays seven chapter cards, each card owns eight existing session states. Retain the list sheet as “Все уроки” for direct lesson jumps; do not change onboarding, rewards, access rules, or session routes.

**Tech Stack:** Expo Router, React Native, Reanimated, existing `modules/learning-v2/map/course_accordion_map_model_v1.ts`, Jest/node contract tests.

---

### Task 1: Derive chapter cards from the canonical model

**Files:**

- Create: `components/learning-v2/LearningV2ChaptersCourse.tsx`
- Test: `tests/learning_v2_chapters_contract.test.mjs`

- [ ] **Step 1: Write the failing source contract**

```js
assert.match(SOURCE, /buildLearningV2CourseAccordionMapFromPreparedProgressV1/);
assert.match(SOURCE, /chapterOrdinal/);
assert.match(SOURCE, /onSessionPress\(lesson, session, state\)/);
assert.match(SOURCE, /Все уроки/);
assert.doesNotMatch(SOURCE, /pulseMapOffsetX/);
```

- [ ] **Step 2: Run the contract and verify it fails**

Run: `node tests/learning_v2_chapters_contract.test.mjs`

Expected: FAIL because the chapter projection does not exist.

- [ ] **Step 3: Implement the small, pure projection boundary**

```ts
const rows = buildLearningV2CourseAccordionMapFromPreparedProgressV1({
  projectionScopeKey: scopeKey,
  expandedLessonOrdinal: lessonOrdinal,
  preparedProgress,
}).rows;
const chapters = groupRowsByChapter(rows, lessonOrdinal);
```

`groupRowsByChapter` must retain every canonical session `state` and `role`; it must not derive access from card position. A card opens/collapses only its local eight-session grid. Tapping a session calls the existing `onSessionPress` with exactly the model's state.

- [ ] **Step 4: Run the contract after implementation**

Run: `node tests/learning_v2_chapters_contract.test.mjs`

Expected: PASS.

### Task 2: Make Chapters the active Learning V2 route surface

**Files:**

- Modify: `app/(tabs)/lessons.tsx`
- Modify: `components/learning-v2/LearningV2PulseCourse.tsx`
- Test: `tests/learning_v2_chapters_route_contract.test.mjs`

- [ ] **Step 1: Write the failing route contract**

```js
assert.match(LESSONS, /LearningV2ChaptersCourse/);
assert.match(LESSONS, /onSessionPress/);
assert.doesNotMatch(ACTIVE_ROUTE, /LearningV2PulseCourse/);
```

- [ ] **Step 2: Run it and verify it fails**

Run: `node tests/learning_v2_chapters_route_contract.test.mjs`

Expected: FAIL while the active route mounts the pulse/snake view.

- [ ] **Step 3: Wire the new component without changing product contracts**

```tsx
<LearningV2ChaptersCourse
  preparedProgress={learningV2PreparedProgress}
  currentSessionId={learningV2CurrentSessionId}
  onSessionPress={handleLearningV2SessionPress}
  onLegacyLessons={leaveLearningV2}
  {...existingSafeAreaAndHeaderProps}
/>
```

The header keeps existing safe-area padding and resource HUD. The explicit “Все уроки” sheet remains available for direct lesson navigation. Do not alter entitlement checks, Plus locks, energy, course content, session completion, or any onboarding route. Delete neither the old component nor unrelated legacy code in this task; make it unreachable from the active V2 route only after the new path passes.

- [ ] **Step 4: Run the route contract**

Run: `node tests/learning_v2_chapters_route_contract.test.mjs`

Expected: PASS.

### Task 3: Verify active behavior and layout safety

**Files:**

- Test: `tests/learning_v2_chapters_contract.test.mjs`
- Test: `tests/learning_v2_chapters_route_contract.test.mjs`

- [ ] **Step 1: Run focused verification**

Run: `node tests/learning_v2_chapters_contract.test.mjs; node tests/learning_v2_chapters_route_contract.test.mjs; git diff --check -- components/learning-v2/LearningV2ChaptersCourse.tsx app/(tabs)/lessons.tsx`

Expected: all tests pass and no whitespace errors.

- [ ] **Step 2: Inspect each state before reporting**

Verify from the canonical rows: completed/current/next/locked/Plus session visibility; seventh chapter's final session retains its exam role; chapter checkpoint sessions retain their checkpoint role; an unknown/unavailable current session does not become tappable.

- [ ] **Step 3: Do not use a broad build or emulator unless focused checks reveal a route/type failure**

The user explicitly requested proportionate verification. Report any pre-existing blockers separately; do not repair unrelated files.

## Coverage review

- Primary layout is Chapters: Task 2.
- Direct “Все уроки” navigation remains secondary: Tasks 1–2.
- Existing real progress, gates, energy, routes, and chapter/exam roles remain authoritative: Tasks 1–3.
- Safe area and no-onboarding change: Task 2.
- No map/snake in the active V2 route: Task 2.

