# Learning V2 Sound Discrimination Vertical Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` for task-by-task execution. This plan has one writer at a time; independent reviewers are read-only and do not repair source. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the first fully functional, replaceable Learning V2 activity, `sound-discrimination`, without allowing a visual redesign, preview, or route to alter governed learning behaviour.

**Architecture:** The core stays React-free: a frozen typed UI port turns runtime state into an immutable view model and accepts typed commands only. A separate UI-owned lazy renderer registry maps the stable `rendererKey` to the Codex baseline renderer; thin routes subscribe and dispatch, never score or persist. No implementation work may start until a separate critical evidence-gate hardening plan is GREEN and the owner has explicitly resolved the gate authority it exposes.

**Tech Stack:** TypeScript, Jest, React Native/Expo Router, React Native Testing Library, existing `modules/learning-v2` contracts and policies, existing V2 release/preview seams.

**Authoritative inputs (read before Task 0):** `AGENTS.md`, `docs/v2/HANDOVER.md`, `docs/v2/README.md`, `docs/superpowers/plans/2026-07-14-phraseman-v2-pilot-season.md`, `docs/superpowers/plans/2026-07-14-phraseman-v2-content-studio.md`, `docs/superpowers/specs/2026-07-18-learning-v2-replaceable-frontend-design.md`, `docs/v2/04-activity-catalog-and-storyboards.md`, and `docs/v2/reference-evidence/*`.

---

## Scope, ownership, and non-goals

### Exact ownership boundary

| Layer | Planned owner paths | Responsibility |
|---|---|---|
| Isolated UI port | `modules/learning-v2/ui-port/activity_ui_port_types.ts`, `sound_discrimination_fixture.ts`, `sound_discrimination_presenter.ts`, `sound_discrimination_controller.ts` | Pure state projection, command validation/order, result intent; no React, runtime import, or durable write |
| Ownership-resolved core correction | `modules/learning-v2/runtime/activity_registry.ts`, `activity_runtime.ts`, and their current caller/test surfaces | Retain `rendererKey`; remove `resolveRenderer` only after the runtime owner supplies a written ownership receipt and pre-change hashes |
| Presentation | `components/learning-v2/ActivityScaffold.tsx`, `components/learning-v2/renderers/sound-discrimination.tsx`, `components/learning-v2/renderer_registry.tsx` | Display only immutable model and emit allowed commands |
| Integration | discover existing V2 route owner with `rg -n "learning_v2_episode|learning_v2_activity|PreviewEnvelope" app modules`; then create the dedicated thin route only in that discovered V2 namespace | Read app port/session snapshot; render; dispatch; no policy/scoring/progress logic |
| Tests | New `tests/learning_v2_ui_port.test.ts`, `tests/learning_v2_sound_discrimination_controller.test.ts`, `tests/learning_v2_ui_port_import_boundary.test.ts`, `tests/learning_v2_sound_discrimination_route.test.tsx`, `tests/learning_v2_sound_discrimination_accessibility.test.tsx`, and `tests/learning_v2_sound_discrimination_preview.test.ts` | Behavioural and import-boundary coverage; the isolated packet never edits or invokes the existing registry test |
| Evidence and Kimi packet | Existing `docs/v2/reference-evidence/*`; new `docs/v2/frontend-handoff/**` only after approval | Lawful evidence, owner decision, and allowlisted renderer handoff |

### Immutable constraints

- Preserve legacy learning until the explicit Phase 14 owner decision; never silently fall back to legacy for invalid V2 content.
- Core may not import React, React Native, Expo Router, Firebase, AsyncStorage, presentation, themes, icons, animations, device capture providers, or backend writers.
- UI must not directly write progress/evidence/stars/access/analytics or choose policies. It sends only `ActivityCommand`; controller/runtime remains the sole outcome owner.
- Preview is no-progress: no reward, stars, durable progress, evidence, analytics, provider call, or server write.
- Do not create acoustic/pronunciation claims: this mode may use listening/selection correctness only until a separately approved/calibrated voice policy exists.
- No deploy, push, commit, production data, Firestore Rules/indexes, OpenAI API, asset generation, snapshot update, or content-generation task is authorised by this plan.
- All normal tests are read-only guards. Store only temporary test output under `.codex-tmp/` if needed.
- The current strict evidence result is aggregate RED: **15 blockers** (three for each of five selected modes). It is not permission for a per-mode implementation exception.

### Mandatory predecessor: critical evidence-gate hardening plan

This Sound Discrimination plan is **not executable** until a separate, approved critical plan has completed RED/GREEN and has an explicit owner authority receipt. That predecessor must establish, without inventing keys or silently choosing an authority:

1. a canonical mode-contract crosswalk that binds the authoritative mode identity to its activity type, family, renderer identity and applicable schema/version identities;
2. whether readiness is aggregate all-five only, or whether a separately versioned per-mode implementation gate exists while aggregate all-five remains release-only;
3. validation of real lawful evidence artifacts, exact hashes, current owner approval and crosswalk/schema drift;
4. a receipt for the real PreviewEnvelope seam: its canonical owner paths, release/activity/renderer validation boundary, no-progress semantics, and focused contract test command.

The predecessor must name its exact files, source-of-truth owners, RED/GREEN counts, crosswalk and receipt hashes, and owner decision. If it finds a conflict between the existing aggregate gate and a claimed per-mode exception, it must stop for owner resolution; this plan must not choose either result. No UI-port, runtime, evidence mutation, frontend, route, preview or Kimi-handoff file may be created or modified before this prerequisite is satisfied.

### Gate split

| Work item | May start before Phase 03 evidence approval? | Blocking evidence |
|---|---:|---|
| Isolated typed UI port, headless controller/presenter, deterministic fixtures/tests | **No** | Completed critical predecessor GREEN + explicit owner authority + approved implementation packet |
| Registry renderer decoupling and any runtime caller integration | **No** | Completed critical predecessor; runtime owner receipt; exact pre/post SHA-256 for `activity_registry.ts` and `activity_runtime.ts`; new bounded packet |
| Lawful capture ingestion, original contact sheet and owner review record | **No** | Completed critical predecessor defining real-artifact validation and the authoritative aggregate/per-mode rule; then human-supplied lawful inputs |
| Codex visual baseline, shared scaffold, renderer, UI visual regression, thin route, device preview and Kimi handoff | **No** | Completed predecessor GREEN, explicit owner authority, lawful approval at the authority-defined scope, runtime receipt and PreviewEnvelope seam receipt |

## Task 0: Freeze the gate and task packet (writer, 30 minutes)

**Files:**
- Read: all authoritative inputs above, the runtime collision receipt (including current hashes), `modules/learning-v2/reference-evidence/reference_evidence_gate.ts`, and `tests/learning_v2_reference_evidence_contract.test.ts`.
- Modify: none.

- [ ] **Step 1: Confirm the mandatory evidence RED before code.**

Run from `C:\Users\badlo\codex-worktrees\phraseman\learning-v2-pilot`:

```powershell
$env:PHRASEMAN_REQUIRE_V2_REFERENCE_APPROVAL='1'
npx jest --runTestsByPath tests/learning_v2_reference_evidence_contract.test.ts --no-cache --runInBand
```

Expected: aggregate FAIL with exactly **15 blockers**: missing lawful first-hand capture, original contact sheet, and current owner approval for each of the five selected modes, including `sound-discrimination`. Record the real count/message in the handover when a later implementation task begins; do not treat this planned expected RED as approval.

- [ ] **Step 2: Freeze the one-writer packet.**

Record the current branch/HEAD, dirty status, exact predecessor gate, the aggregate 15-blocker RED result, and that **no implementation task is currently allowed**. Preserve the receipt that `modules/learning-v2/runtime/` is untracked user work; stop immediately if a task would touch it or the existing registry test without a new ownership receipt.

**Acceptance:** The executor can name one writer, all dirty paths remain untouched, the strict gate is explicitly aggregate RED with 15 blockers, and the separate critical predecessor is recorded as the exact next action.

**Checkpoint at 30 minutes:** The current expected outcome is still aggregate RED with 15 blockers. Do not proceed to Task 1; prepare or request the separate critical predecessor plan. If its source-of-truth owner or authority cannot be identified, stop and ask the owner; do not invent a parallel runtime or a per-mode exception.

## Task 1: Freeze an isolated UI port and headless sound-discrimination state machine (BLOCKED)

**Files:**
- Create: `modules/learning-v2/ui-port/activity_ui_port_types.ts`.
- Create: `modules/learning-v2/ui-port/sound_discrimination_fixture.ts`.
- Create: `modules/learning-v2/ui-port/sound_discrimination_presenter.ts`.
- Create: `modules/learning-v2/ui-port/sound_discrimination_controller.ts`.
- Create: `tests/learning_v2_ui_port.test.ts`.
- Create: `tests/learning_v2_sound_discrimination_controller.test.ts`.
- Create: `tests/learning_v2_ui_port_import_boundary.test.ts`.

- [ ] **Step 1: Write RED state/command and isolation matrix.**

Use one deterministic fixture with two audio-labelled options, a correct option ID, replay availability, and a non-voice fallback. Test: immutable model; six states only; `audio.play` is allowed in prompt/active but does not mutate score; `answer.select` validates an option ID; `answer.submit` is rejected until selection; correct submit produces `success`; incorrect submit produces `needs_work`; retry clears selection; unknown/stale fixture gives `recovery`; offline audio absence exposes `listen_only`; repeated terminal submit emits no second result; and output has accessible label/role/state/instructions/one announcement token. The import-boundary test scans only `modules/learning-v2/ui-port/**` and rejects imports matching `runtime/`, `react`, `react-native`, `expo-router`, `firebase`, `@react-native-async-storage/async-storage`, and `components/learning-v2`.

- [ ] **Step 2: Run RED.**

```powershell
npx jest --runTestsByPath tests/learning_v2_ui_port.test.ts tests/learning_v2_sound_discrimination_controller.test.ts tests/learning_v2_ui_port_import_boundary.test.ts --no-cache --runInBand
```

Expected: FAIL because the isolated port, fixture, presenter, controller and boundary contract do not exist.

- [ ] **Step 3: Implement pure types and behavior.**

Define `PreviewState`, `ActivityCommand`, `ActivityViewModel`, `ActivityScreenProps`, `AccessibilityViewModel`, `PreviewConditions`, a readonly result-intent type, and a narrow readonly `SoundDiscriminationActivityDescriptor` in `activity_ui_port_types.ts`. The presenter returns only a frozen view model. The controller accepts one command at a time, rejects unavailable commands, and returns a pure next state plus at most one result intent. It neither imports nor calls persistence, analytics, network, device audio, React, or `modules/learning-v2/runtime/**`. The fixture is deterministic and contains no episode-specific remote content.

- [ ] **Step 4: Run GREEN.**

Run the Step 2 command and then:

```powershell
npx tsc --noEmit --pretty false --project tsconfig.json
```

Expected: focused tests PASS and TypeScript exits 0. If global TypeScript is pre-existing red, capture the first unrelated diagnostic and run the narrowest existing project configuration containing only the new files; do not suppress diagnostics.

**Acceptance:** The same fixture/command sequence produces the same view model/result intent, no provider/write occurs, and all source is newly created under `ui-port/**` plus new tests. This task makes no claim of registry integration.

**Checkpoint at 60 minutes:** Do not write Task 1 files while the critical predecessor or owner authority is missing. After both are GREEN/explicit, Task 1 must be GREEN before Task 2. If controller semantics require progress/evidence/stars/access changes, stop; this plan does not authorise a cross-contract change.

**Intended commit boundary (when commits are later authorised):** `feat(learning-v2): add isolated sound discrimination ui port`.

## Task 2: Ownership-resolved renderer decoupling (BLOCKED)

**Files:**
- Modify only after receipt: `modules/learning-v2/runtime/activity_registry.ts` and `modules/learning-v2/runtime/activity_runtime.ts`.
- Modify only after receipt: the exact existing caller/test paths identified by `rg -n "resolveRenderer|createActivityRegistry" modules/learning-v2/runtime tests`.
- Create: new narrowly named registry-decoupling tests only after their paths are confirmed unowned by another writer.

- [ ] **Step 1: Obtain and verify the ownership receipt.**

The critical predecessor must be GREEN and the owner authority must be explicit before this task is considered. Then the runtime owner must explicitly grant this packet ownership and provide the current SHA-256 values for `activity_registry.ts` and `activity_runtime.ts` (the audit receipt began at `c4c9b123...` and `90460262...`). Recompute both hashes immediately before RED. If either differs from the receipt, stop and obtain a replacement receipt; do not merge around user work.

- [ ] **Step 2: Write and run RED.**

```powershell
rg -n "resolveRenderer|createActivityRegistry" modules/learning-v2/runtime tests
```

Add tests against the confirmed caller surface: valid registration retains `rendererKey` without `resolveRenderer`; registry no longer exposes a renderer resolver; `activity_runtime.ts` passes a descriptor into the UI-owned resolver boundary; unknown renderer maps to typed recovery. Run only the exact confirmed test paths. Expected: RED because the current runtime still owns resolution.

- [ ] **Step 3: Implement the minimal runtime correction.**

Remove runtime component resolution while retaining `rendererKey`; adapt `activity_runtime.ts` only at the identified call site so it passes descriptor metadata to the UI-owned resolver. Do not import React or presentation code into the runtime; do not alter policy, progress, evidence, stars, access, persistence or release semantics.

- [ ] **Step 4: Run GREEN and record post-change hashes.**

```powershell
Get-FileHash -Algorithm SHA256 modules/learning-v2/runtime/activity_registry.ts,modules/learning-v2/runtime/activity_runtime.ts
```

Run the exact RED test command again plus scoped TypeScript. Expected: GREEN. Record pre/post hashes, owner receipt, caller paths and test counts in the handover.

**Acceptance:** The collision-prone runtime edit is authorised, hash-accounted, and limited to descriptor/renderer decoupling. The isolated Task 1 UI port remains React-free and runtime-independent.

**Checkpoint at 120 minutes:** If the critical predecessor, owner authority, runtime receipt, or PreviewEnvelope seam receipt is absent/stale, all implementation tasks stay blocked. If they are valid and Task 2 needs a change beyond renderer decoupling, stop for a new packet; Tasks 4–6 may not begin.

**Intended commit boundary:** `refactor(learning-v2): decouple runtime renderer resolution`.

## Task 3: Lawful `sound-discrimination` evidence and owner gate (BLOCKED)

**Files:**
- Modify: `docs/v2/reference-evidence/activity-mode-capture-ledger.json`.
- Modify: `docs/v2/reference-evidence/activity-mode-patterns.md`.
- Modify: `docs/v2/reference-evidence/phraseman-wireframes.md`.
- Create: `docs/v2/reference-evidence/contact-sheets/sound-discrimination.png`.
- Modify: `docs/v2/reference-evidence/activity-mode-ui-review.json`.
- Modify/Test: `tests/learning_v2_reference_evidence_contract.test.ts` only if the contract needs coverage for a newly valid record.

- [ ] **Step 1: Stop condition before evidence mutation.**

Do not acquire web material, scrape, download, or fabricate reference evidence. Do not mutate evidence records until the critical predecessor is GREEN and its explicit owner authority identifies the lawful artifact and readiness rule. Then continue only when the owner/human supplies lawful first-hand capture metadata and raw artifacts in the configured ignored evidence root, including source, capture date, rights basis, state coverage and SHA-256.

- [ ] **Step 2: Write the strict RED for this mode.**

Use only the exact structural test matrix and expected readiness scope established by the critical predecessor. It must reject a `sound-discrimination` record lacking a current sheet hash or current `approved` decision, and it must not weaken aggregate behavior. Do not add a per-mode implementation exception unless the predecessor contains the explicit owner-approved authority and versioned contract for it.

Run:

```powershell
$env:PHRASEMAN_REQUIRE_V2_REFERENCE_APPROVAL='1'
npx jest --runTestsByPath tests/learning_v2_reference_evidence_contract.test.ts --no-cache --runInBand
```

Expected now: aggregate FAIL with **15 blockers** for the five selected modes. Expected after the critical predecessor: use only its recorded authority-defined result; do not claim that a single valid mode makes the strict aggregate gate GREEN.

- [ ] **Step 3: Produce only the lawful, original evidence record.**

Index the supplied Tier-A metadata and raw-artifact hash. Create a Phraseman-original six-frame contact sheet that covers exactly `prompt`, `active`, `processing`, `success`, `needs_work`, and `recovery`, plus the documented orthogonal offline/permission/interruption/text-scale/reduced-motion conditions. Record a distinctiveness matrix and accessibility review. Do not place competitor screenshots, logos, lesson content, or trade dress in the committed contact sheet.

- [ ] **Step 4: Obtain the owner’s explicit hash-bound decision.**

Set `approved` only after the owner has reviewed the exact contact sheet. Persist reviewer, timestamp, revision, SHA-256 and notes in `activity-mode-ui-review.json`. Silence, a chat reaction, or approval of an older hash is not valid.

- [ ] **Step 5: Run GREEN.**

Run the Step 2 command only after the prerequisite evidence state exists. Expected: the authority-defined result recorded by the critical predecessor. Re-run without the environment variable and preserve the normal guard behaviour. Never treat an aggregate RED result as UI permission.

**Acceptance:** Approval is lawful, first-hand, current, hash-bound and independently reproducible at the exact scope defined by the critical predecessor. This plan does not declare what scope authorises presentation work.

**Intended commit boundary:** `docs(learning-v2): approve sound discrimination reference evidence`.

## Task 4: Build the complete Codex baseline renderer (BLOCKED by critical predecessor, owner authority, Tasks 2 and 3)

**Files:**
- Create: `components/learning-v2/ActivityScaffold.tsx`.
- Create: `components/learning-v2/renderer_registry.tsx`.
- Create: `components/learning-v2/renderers/sound-discrimination.tsx`.
- Create: `tests/learning_v2_sound_discrimination_accessibility.test.tsx`.
- Create: `tests/learning_v2_sound_discrimination_renderer.test.tsx`.

- [ ] **Step 1: Write RNTL RED tests.**

Test renderer lookup by stable `rendererKey`; unknown key returns a typed recovery component with retry/close controls; each canonical state has an accessible heading and correct action availability; option buttons expose selected/disabled state; feedback receives focus/one announcement exactly once; audio control is labelled; 200% text fixture has no horizontal scrolling contract; reduced-motion renders no looping animation; lime action surfaces use dark foreground; and the renderer calls only `dispatch` with the expected typed sequence.

- [ ] **Step 2: Run RED.**

```powershell
npx jest --config jest.rntl.config.cjs --runTestsByPath tests/learning_v2_sound_discrimination_accessibility.test.tsx tests/learning_v2_sound_discrimination_renderer.test.tsx --no-cache --runInBand
```

Expected: FAIL because the scaffold, UI-owned registry and renderer do not exist.

- [ ] **Step 3: Implement the smallest complete renderer.**

`ActivityScaffold` renders stable geometry for prompt/content/action/feedback/recovery. The registry lazy-loads only presentation components and maps an unknown key to recovery; it must not change `ActivityRegistration`. The sound renderer receives `ActivityScreenProps`, contains no fixture/policy/episode/progress logic, and emits the exact command types from the frozen port. Use focus/AppState-gated finite motion only; no `Animated.loop`, hot timer or subscription on hidden screens.

- [ ] **Step 4: Run GREEN and visual contract.**

Run the Step 2 command and the focused pure suite:

```powershell
npx jest --runTestsByPath tests/learning_v2_ui_port.test.ts tests/learning_v2_sound_discrimination_controller.test.ts tests/learning_v2_ui_port_import_boundary.test.ts --no-cache --runInBand
```

Expected: PASS. Add a visual/contact-sheet test only after the approved sheet is committed; it compares the implementation’s declared revision/hash rather than accepting a new snapshot.

**Acceptance:** Baseline UI is usable and complete, but all governed outcomes remain in the controller/runtime. No full-screen spinner, layout jump, hidden hot loop, direct storage/network/Firebase import, or route policy is introduced.

**Post-renderer checkpoint:** Stop for fresh review before route wiring. If accessibility requires additional command semantics, return to Task 1 RED; do not patch UI-only behavior around a missing core command.

**Intended commit boundary:** `feat(learning-v2): render sound discrimination activity`.

## Task 5: Thin route and no-progress PreviewEnvelope integration (BLOCKED by critical predecessor, owner authority, Tasks 2 and 3)

**Files:**
- Read first: the route discovered after Task 2 ownership resolution, the exact two receipt-authorised runtime files only, the existing PreviewEnvelope implementation and its tests.
- Create/Modify: only the discovered V2 route and its smallest adapter; record exact path in the execution packet before RED.
- Create: `tests/learning_v2_sound_discrimination_route.test.tsx`.
- Create: `tests/learning_v2_sound_discrimination_preview.test.ts`.

- [ ] **Step 1: Write RED integration tests.**

Use a fake `LearningV2AppPort` with a known session snapshot. Assert the route validates parameters, subscribes/unsubscribes on focus, passes the immutable model to the renderer, sends close/back through the app port, and never computes stars/gates/policies. For preview, dispatch play/select/submit/retry and assert zero progress/evidence/star/access/analytics writes and zero provider calls; stale release/activity/renderer returns recovery.

- [ ] **Step 2: Run RED.**

```powershell
npx jest --config jest.rntl.config.cjs --runTestsByPath tests/learning_v2_sound_discrimination_route.test.tsx --no-cache --runInBand
npx jest --runTestsByPath tests/learning_v2_sound_discrimination_preview.test.ts --no-cache --runInBand
```

Expected: FAIL because the thin route adapter and preview binding do not exist.

- [ ] **Step 3: Implement the route adapter.**

Validate identifiers, obtain the existing app port, subscribe to one session snapshot, render scaffold/renderer, dispatch commands to the controller/app port, and release subscriptions on blur/unmount. Hydrate first frame from a current snapshot or final-geometry skeleton. Invalid/stale data must map to recovery, never legacy content or success.

- [ ] **Step 4: Run GREEN.**

Run the Step 2 commands plus the Task 4 suites. Expected: PASS with no progress result from preview.

**Acceptance:** Route is thin, resilient and frozen-background compliant. Preview remains structurally useful but has no durable product effect.

**Intended commit boundary:** `feat(learning-v2): wire sound discrimination preview route`.

## Task 6: Kimi handoff, independent review, and final gates (BLOCKED by critical predecessor, owner authority and Tasks 2–5 GREEN)

**Files:**
- Create: `docs/v2/frontend-handoff/README.md`, `ownership.md`, `prohibited-writes.md`, `conformance-commands.md`.
- Create: `docs/v2/frontend-handoff/shared/renderer-port.ts`, `renderer-event-catalog.json`, `state-condition-schema.json`, `accessibility-matrix.md`.
- Create: `docs/v2/frontend-handoff/modes/sound-discrimination/HANDOFF.md`, `manifest.json`, `fixture-index.json`, `state-matrix.json`, `accessibility.json`, `event-expectations.json`, `file-ownership.json`, `prohibited-writes.json`.

- [ ] **Step 1: Create the handoff only from final artifacts.**

Pin activity/renderer key, family, shell, payload/kernel/renderer schemas, five policy refs, fixture SHA-256 hashes, allowed commands and sequences, six states plus condition axes, accessibility expectations, exact UI-owned allowlist, prohibited core paths/imports/writes, focused commands, and the approved contact-sheet revision/hash. Do not include generated images, raw evidence, secrets or mutable policy copies.

- [ ] **Step 2: Run Kimi-equivalence RED then GREEN.**

Add a contract test that loads the handoff manifest and proves every listed fixture yields the same command sequence/result intent in the baseline renderer and a test renderer. RED first on a missing/wrong hash or a renderer requesting an unavailable command; GREEN only when port, manifest and baseline agree.

- [ ] **Step 3: Request fresh read-only reviews.**

Spec reviewer prompt: “Compare this exact slice with `2026-07-18-learning-v2-replaceable-frontend-design.md`. Report P0/P1/P2 for core/UI separation, unknown-renderer recovery, command equivalence, no-progress preview, evidence-gate compliance and Kimi allowlist. Do not edit.”

Quality reviewer prompt: “Adversarially review the bounded diff for accessibility, hidden-screen timers/subscriptions, offline/recovery, text scale, reduced motion, privacy/direct writes, legacy fallback and test weakness. Report P0/P1/P2 only; do not edit.”

Any P0/P1/P2 returns to the relevant RED task; re-run both fresh reviews after repair.

- [ ] **Step 4: Final deterministic gate.**

```powershell
npx jest --runTestsByPath tests/learning_v2_ui_port.test.ts tests/learning_v2_sound_discrimination_controller.test.ts tests/learning_v2_ui_port_import_boundary.test.ts tests/learning_v2_reference_evidence_contract.test.ts tests/learning_v2_sound_discrimination_preview.test.ts --no-cache --runInBand
npx jest --config jest.rntl.config.cjs --runTestsByPath tests/learning_v2_sound_discrimination_accessibility.test.tsx tests/learning_v2_sound_discrimination_renderer.test.tsx tests/learning_v2_sound_discrimination_route.test.tsx --no-cache --runInBand
npx tsc --noEmit --pretty false --project tsconfig.json
git diff --check -- modules/learning-v2/ui-port components/learning-v2 tests/learning_v2_ui_port.test.ts tests/learning_v2_sound_discrimination_controller.test.ts tests/learning_v2_ui_port_import_boundary.test.ts tests/learning_v2_sound_discrimination_accessibility.test.tsx tests/learning_v2_sound_discrimination_renderer.test.tsx tests/learning_v2_sound_discrimination_route.test.tsx tests/learning_v2_sound_discrimination_preview.test.ts docs/v2/frontend-handoff docs/v2/reference-evidence
rg -n ('TO' + 'DO' + '|' + 'TB' + 'D') docs/v2/frontend-handoff modules/learning-v2/ui-port components/learning-v2
```

Expected: every focused suite PASS; TypeScript exit 0 (or an explicitly documented pre-existing blocker); `git diff --check` has no output; the placeholder-marker scan has no output. Then collect physical iOS and Android, large-text, screen-reader and reduced-motion receipts before any device/release claim. Local tests do not substitute for device proof.

**Acceptance:** Kimi can change only allowlisted frontend files and pass behavioral equivalence. No release/deploy is implied.

**Intended commit boundary:** `docs(learning-v2): add sound discrimination Kimi handoff`.

## Review and stop protocol

- Run the spec review after Task 5 GREEN and again after any P0/P1/P2 repair. Its packet must include the Task 2 ownership receipt, pre/post hashes and exact caller-test command.
- Run the adversarial quality review only after spec PASS; it specifically checks accessibilty, offline/recovery, performance/focus gating, no direct writes, privacy and legacy preservation.
- Stop and escalate if a change requires Firestore Rules/indexes, Functions/back-end semantics, stars/access/evidence contract changes, voice capture/scoring, an unapproved contact sheet, an unknown route/app-port contract, an external reference acquisition, or any production action.
- A failed test must stay RED until the smallest coherent repair is implemented. Never update snapshots, weaken assertions, or mark the gate approved to make it pass.

## Completion packet and next action

The executor’s handover must name exact changed paths, writer/reviewer roles, RED and GREEN commands/counts, contact-sheet and fixture hashes, the Task 2 ownership receipt and pre/post hashes, physical-device evidence status, unresolved risks, no-deploy state and the next executable task. With the current collision receipt and aggregate 15-blocker RED, the exact next action is to authorise and complete the separate critical evidence-gate hardening plan; no task in this plan is executable yet. Do not start UI-port, runtime, evidence mutation, baseline UI, route, preview or Kimi handoff work.
