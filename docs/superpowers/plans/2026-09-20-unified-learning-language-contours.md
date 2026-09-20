# Единый языковой контур обучения — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use `subagent-driven-development` or `executing-plans` task-by-task. Every task uses a single writer, begins with a focused failing test, and ends with the listed focused verification.

**Goal:** A learner selects one study language (`en`, `es`, `fr`, or `de`), and every learning surface uses only that language’s verified content; account currency, XP, level, Plus and profile remain shared.

**Architecture:** Add one canonical language-contour contract and a release-readiness aggregator. Each surface owns only its target-specific pack/receipt adapter and reports readiness to that aggregator. Every content read resolves an exact target or fails closed; lossy English fallback remains permitted only in a one-time English legacy-data migration adapter.

**Tech Stack:** Expo/React Native, TypeScript, AsyncStorage, Firebase Functions/Firestore where a surface already uses them, Jest/ts-jest, `tsx` static gates.

**Authoritative product specification:** `docs/superpowers/specs/2026-09-20-unified-learning-language-contours-design.md`.

**Hard boundaries:**

- Do not write learner-facing ES/FR/DE content, translate English material, publish content, deploy, or enable a production target in this work.
- Do not change the economy model: shard operations, XP, level, Plus and account profile remain global. Target-scoping a learning record must never create a second balance or XP ledger.
- Do not weaken a red gate. Repair its stale expectation or the contract it proves.
- Learning V2 content authoring stays governed by `docs/v2/СТАРТ В2.md`, its factory rules and its independent guardian; this plan only makes runtime routing target-correct.
- Do not touch frozen admin surfaces. Any admin work remains in `admin/v2/legacy.html` and directly loaded scripts only.

---

## Phase 0 — Freeze the audit and repair broken guard expectations

### Task 0.1: Create the machine-readable surface matrix

**Files:**

- Create: `app/learning_language_surface_matrix.ts`
- Create: `tests/learning_language_surface_matrix.test.ts`
- Create: `tests/learning_language_contour_audit_gate.ts`

- [ ] **Step 1: Write the failing matrix test.** It must enumerate exactly the mandatory surfaces and four targets.

```ts
import {
  LEARNING_LANGUAGE_SURFACES,
  LEARNING_LANGUAGE_TARGETS,
  requiredLearningLanguageSurfaces,
} from '../app/learning_language_surface_matrix';

expect(LEARNING_LANGUAGE_TARGETS).toEqual(['en', 'es', 'fr', 'de']);
expect(LEARNING_LANGUAGE_SURFACES).toEqual([
  'lessons', 'learning_v2', 'daily_phrase', 'dialogues',
  'arena', 'videos', 'flashcards', 'diagnostic_and_exam',
]);
expect(requiredLearningLanguageSurfaces()).toHaveLength(8);
```

- [ ] **Step 2: Run the focused test and confirm it fails because the contract is absent.**

Run: `npm test -- tests/learning_language_surface_matrix.test.ts --runInBand --watchman=false`

Expected: missing-module failure.

- [ ] **Step 3: Implement the immutable matrix.** Export literal target and surface tuples, exact types, and no readiness logic. This is a vocabulary contract, not a second registry.

- [ ] **Step 4: Add the audit gate.** The gate reads the canonical registry, each surface adapter and known legacy lists. It fails if a new local language tuple is introduced outside the canonical contract.

- [ ] **Step 5: Run both focused checks.**

Run: `npm test -- tests/learning_language_surface_matrix.test.ts --runInBand --watchman=false` then `npx tsx tests/learning_language_contour_audit_gate.ts`

Expected: both pass.

### Task 0.2: Record existing Spanish Learning V2 gate drift without editing lessons

**Files:**

- Read: `tests/learning_v2_authoring_registry_multilang_gate.ts`
- Read: `modules/learning-v2/content/source/lesson1_authoring_registry_v1.ts`
- Modify: `docs/work/tasks/2026-09-20-language-contours-audit.md`

- [ ] **Step 1: Record the pre-existing mismatch.** The current Spanish
  registry has a locked row whose saved fingerprint does not match its current
  learner source. Do not update the fingerprint, status, test expectation or
  source content in this plan.

- [ ] **Step 2: Keep Spanish Learning V2 selectable but unavailable.** The
  platform adapter reports `learning_v2: missing` for Spanish until a separate
  owner-approved content/release task resolves the drift.

- [ ] **Step 3: Record exact command, exit status and failure in**
  `docs/work/tasks/2026-09-20-language-contours-audit.md`. This is evidence,
  not permission to weaken the gate.

## Phase 1 — Establish the canonical target contract and safe selection

### Task 1.1: Create one language-contour registry

**Files:**

- Create: `app/learning_language_contour.ts`
- Modify: `app/study_target.ts`
- Modify: `app/study_target_lang_dev.ts`
- Modify: `app/study_languages.ts`
- Create: `tests/learning_language_contour.test.ts`

- [ ] **Step 1: Write failing registry tests.**

```ts
import {
  LEARNING_LANGUAGE_CONTOURS,
  resolveLearningLanguageContour,
} from '../app/learning_language_contour';

expect(Object.keys(LEARNING_LANGUAGE_CONTOURS)).toEqual(['en', 'es', 'fr', 'de']);
expect(resolveLearningLanguageContour('DE')?.speechLocale).toBe('de-DE');
expect(resolveLearningLanguageContour('it')).toBeNull();
```

- [ ] **Step 2: Implement `LearningLanguageContour`.** Each record contains canonical code, native name, flag asset key and speech locale. It must not declare content ready or invent source text.

- [ ] **Step 3: Make `StudyTarget` derive from the canonical type.** Remove the separate `StudyTargetLang` union and duplicate language arrays. Keep legacy exported names as aliases during this migration only, so call sites move incrementally.

- [ ] **Step 4: Make raw selection validation fail closed.** `setStoredStudyTarget` accepts only a canonical code; invalid or unavailable requests return the current valid selection rather than coercing to English. Legacy English storage is read only as `en`.

- [ ] **Step 5: Run focused tests.**

Run: `npm test -- tests/learning_language_contour.test.ts tests/study_target_lang_dev.test.ts --runInBand --watchman=false`

Expected: exact four-code contract and legacy English compatibility pass.

### Task 1.2: Add aggregate readiness before exposing a target

**Files:**

- Create: `app/learning_language_readiness.ts`
- Modify: `components/StudyTargetContext.tsx`
- Modify: `components/settings/StudyLanguagePicker.tsx`
- Modify: `app/language_welcome.tsx`
- Create: `tests/learning_language_readiness.test.ts`
- Create: `tests/study_language_picker_readiness_contract.test.ts`

- [ ] **Step 1: Write a failing readiness matrix test.**

```ts
const ready = completeReadinessFor('es');
expect(canSelectLearningLanguage('es', ready)).toBe(true);
expect(canSelectLearningLanguage('es', { ...ready, videos: 'missing' })).toBe(false);
expect(canSelectLearningLanguage('es', { ...ready, arena: 'review_required' })).toBe(false);
```

- [ ] **Step 2: Implement pure aggregate readiness.** Every surface reports `ready`, `missing`, `review_required`, or `blocked`. The selector needs all eight `ready`; it cannot infer readiness from a dev flag.

- [ ] **Step 3: Refactor the provider and picker.** Persist any canonical
  target selection. Show all four languages; a target's incomplete surface
  renders its own unavailable state and never routes to English/paywall as
  though content existed.

- [ ] **Step 4: Add deep-link safety.** On app boot, a stale target that is not ready causes a local unavailable screen/state, never an English course substitution.

- [ ] **Step 5: Run focused tests.**

Run: `npm test -- tests/learning_language_readiness.test.ts tests/study_language_picker_readiness_contract.test.ts --runInBand --watchman=false`

Expected: all four targets are selectable, an incomplete surface is
unavailable without English fallback, and English legacy selection remains usable.

## Phase 2 — Separate content identity from shared account economy

### Task 2.1: Replace lossy content-key normalization

**Files:**

- Modify: `app/target_storage_keys.ts`
- Create: `app/learning_language_storage.ts`
- Create: `tests/learning_language_storage_isolation.test.ts`
- Modify: `tests/target_daily_phrase_target_isolation.test.ts`

- [ ] **Step 1: Write a failing cross-target storage test.**

```ts
expect(resolveContentTarget('es')).toBe('es');
expect(resolveContentTarget('de')).toBe('de');
expect(resolveContentTarget('unknown')).toBeNull();
expect(lessonProgressKey(1, 'es')).not.toEqual(lessonProgressKey(1, 'en'));
expect(dailyPhraseKey('de')).toMatch(/^daily_phrase_v2::de::/);
```

- [ ] **Step 2: Introduce exact `resolveContentTarget`.** Keep `storageStudyTarget` only as a deprecated English/French compatibility wrapper until all callers are migrated. Availability and content calls must use the exact resolver and handle `null`.

- [ ] **Step 3: Move target-scoped learning records.** Update only lesson/session progress, SRS, mistakes, target flashcard state, phrase caches and content-local history. Do not move wallet, XP, level, Plus or account identity keys.

- [ ] **Step 4: Implement migration-safe reads.** English first checks historical unscoped keys. ES/FR/DE never read them. Writes use the new scoped key only.

- [ ] **Step 5: Run focused isolation checks.**

Run: `npm test -- tests/learning_language_storage_isolation.test.ts tests/target_daily_phrase_target_isolation.test.ts --runInBand --watchman=false`

Expected: no ES/DE key aliases English; English historical data remains readable.

### Task 2.2: Prove shared economy/XP remains global

**Files:**

- Create: `tests/learning_language_shared_account_contract.test.ts`
- Test: existing economy and XP reducers relevant to lesson completion

- [ ] **Step 1: Write a failing contract test that switches targets around an award.**

```ts
await selectTarget('es');
await applyLearningAward({ operationId: 'award-1', xp: 10 });
await selectTarget('de');
expect(await loadGlobalXp()).toBe(10);
expect(await loadGlobalShardBalance()).toBe(beforeShards);
```

- [ ] **Step 2: Identify every award call used by Lessons, Learning V2, Daily Phrase, Dialogues, Arena and cards.** Confirm it uses the shared append-only economy/XP path and does not add a target field to balance ownership.

- [ ] **Step 3: Add adapters only where an award path incorrectly derives an account key from target.** Preserve operation ids and idempotency receipts.

- [ ] **Step 4: Run focused tests plus the existing economy contract guard.** Acquire the repository heavy-process semaphore before Jest.

Expected: switching targets does not create, lower or duplicate a balance/XP record.

## Phase 3 — Make every content runtime exact-target and fail closed

### Task 3.1: Lessons and Learning V2

**Files:**

- Modify: `app/(tabs)/lessons.tsx`
- Modify: `app/learning-v2/lesson/[id].tsx`
- Modify: `app/learning-v2/session/[id].tsx`
- Modify: `app/learning_v2_active_course_catalog_client_v1.ts`
- Modify: `app/learning_v2_course_released_session_client_v3.ts`
- Modify: `app/learning_v2_direct_session_player_v1.tsx`
- Create: `tests/learning_v2_active_target_runtime.test.ts`

- [ ] **Step 1: Write the failing target propagation matrix.** For each target, catalogue locator, prefetch locator, session locator, audio locator and progress scope must contain the same exact code and source locale.

- [ ] **Step 2: Remove direct-versus-legacy selection by target.** Choose the currently supported player from a verified release descriptor/capability, not `studyTarget === 'en'`. A target with no compatible descriptor is unavailable before mounting a player.

- [ ] **Step 3: Remove hardcoded `en`/`ru` recovery and session-start scopes.** Build them from the active locator; assert the recovered payload matches it before use.

- [ ] **Step 4: Keep factory-native English authority unchanged.** English remains its current factory-native source. Non-English targets require their own verified release descriptor; no network/LKG English fallback may serve them.

- [ ] **Step 5: Run focused gates.**

Run: `npm test -- tests/learning_v2_active_target_runtime.test.ts tests/learning_v2_active_course_catalog_client_v1.test.ts --runInBand --watchman=false` plus the applicable current Learning V2 focused gates under the semaphore.

Expected: target mismatch blocks before content/player mount; English factory path remains green.

### Task 3.2: Daily Phrase

**Files:**

- Modify: `app/daily_phrase_system.ts`
- Modify: `app/daily_phrase_target_gate.ts`
- Modify: `app/daily_phrase_quest.ts`
- Modify: `components/DailyPhraseCard.tsx`
- Create: `tests/daily_phrase_active_target_contract.test.ts`

- [ ] **Step 1: Write a failing target-pool test.** A Spanish phrase and all quest choices must originate from the Spanish verified pack; a missing pack returns unavailable without calling the English idiom source.

- [ ] **Step 2: Replace per-language branching with a contour adapter.** English uses only its English pack; ES/FR/DE use only a matching manifest, source locale and target pool.

- [ ] **Step 3: Report its readiness to the aggregate registry.** No Daily
  Phrase pack means this Daily Phrase surface is unavailable for that target.

- [ ] **Step 4: Run the target Daily Phrase tests and its validator gate.**

### Task 3.3: Dialogues and Arena

**Files:**

- Modify: `app/dialogue_language_registry.ts`
- Modify: `app/dialogue_language_activation.ts`
- Modify: `app/ai_dialog_target_gate.ts`
- Modify: `modules/arena/target_registry.ts`
- Modify: `app/arena_target_gate.ts`
- Modify: dialogue/Arena entry points named by their existing contour plans
- Create: `tests/learning_language_dialogue_arena_readiness.test.ts`

- [ ] **Step 1: Reuse the canonical code/type in both surface registries.** They retain only surface metadata and receipts; duplicate language tuples are removed.

- [ ] **Step 2: Make each entry point obtain target from `StudyTargetContext`.** Unknown/missing/unactivated target blocks before quota, queueing, prompt, audio or match creation.

- [ ] **Step 3: Feed verified surface readiness into the aggregate contract.** Existing empty non-English dialogue activation receipts and missing Arena pools correctly keep those targets non-selectable.

- [ ] **Step 4: Run their existing language-contour gates plus the new aggregate matrix test.**

### Task 3.4: Diagnostics, exams and legacy lesson surfaces

**Files:**

- Modify: `app/diagnostic_target_gate.ts`
- Modify: `app/exam_target_gate.ts`
- Modify: `app/vocabulary_target_gate.ts`
- Modify: `app/flashcards_target_gate.ts`
- Create: `tests/learning_language_legacy_surface_gate.test.ts`

- [ ] **Step 1: Write parameterised tests for `en/es/fr/de`.** Each gate accepts only its target’s ready content and returns unavailable for missing target material.

- [ ] **Step 2: Replace any `storageStudyTarget` availability check with exact content resolution.** Do not change storage migration behavior in this task.

- [ ] **Step 3: Register each surface in readiness aggregation and run the focused tests.**

## Phase 4 — Make cards and videos follow the active contour

### Task 4.1: Card collections, packs and training

**Files:**

- Modify: `app/flashcards/pack_languages.ts`
- Modify: `app/flashcards_collection.tsx`
- Modify: `app/flashcards/CollectionHeader.tsx`
- Modify: `app/flashcards/PackLanguagePicker.tsx`
- Modify: `app/flashcards/deck_sources.ts`
- Modify: `app/flashcards/marketplace.ts`
- Create: `tests/flashcards_follow_active_target.test.ts`

- [ ] **Step 1: Write a failing UI/data contract.**

```ts
await selectTarget('de');
expect(defaultPackLanguageForStudyTarget(activeTarget())).toBe('de');
expect(visiblePackLanguages('learner')).toEqual(['de']);
expect(await loadDeckCards({ kind: 'saved' }, 'ru', 'de'))
  .not.toContainEqual(expect.objectContaining({ packLanguage: 'en' }));
```

- [ ] **Step 2: Make canonical contour the source of `PackLanguage`.** Keep a narrow legacy normalizer only for historical English records. New cards/packs require explicit canonical `packLanguage`.

- [ ] **Step 3: Remove the learner-facing independent pack picker.** Replace it with active-language display. Preserve an explicit creator/QA-only filter if needed for moderation, isolated from learner navigation.

- [ ] **Step 4: Ensure card state uses exact target keys.** Verify saved cards, official/community ownership, cache, SRS and audio all refuse another target rather than falling back to English.

- [ ] **Step 5: Run focused card tests.**

Run: `npm test -- tests/flashcards_follow_active_target.test.ts tests/flashcard_pack_language_adapter.test.ts --runInBand --watchman=false`

### Task 4.2: Video channels and saved phrases

**Files:**

- Modify: `components/home/HomeYoutubeFeatureCard.tsx`
- Modify: `app/lingman_videos.tsx`
- Modify: `components/youtube/YoutubeVideoPhrases.tsx`
- Modify: the preferred-channel resolver module used by these files
- Create: `tests/videos_follow_active_target.test.ts`

- [ ] **Step 1: Write failing channel matrix tests.** For every target, the resolver either returns a channel tagged exactly with that target or `null`; it never returns the English fallback channel.

- [ ] **Step 2: Pass canonical target through channel resolution, video phrase retrieval and card save.** The saved phrase must carry the active target and be visible only in that card contour.

- [ ] **Step 3: Add an unavailable video state to aggregate readiness.** A missing native channel/phrase source makes the target incomplete rather than presenting English video.

- [ ] **Step 4: Run focused tests.**

Run: `npm test -- tests/videos_follow_active_target.test.ts tests/video_phrase_language_contour.test.ts --runInBand --watchman=false`

## Phase 5 — Release checklist, migration and end-to-end proof

### Task 5.1: Build the four-target release matrix gate

**Files:**

- Create: `tests/learning_language_release_matrix_gate.ts`
- Modify: `package.json`
- Modify: `docs/work/tasks/2026-09-20-language-contours-audit.md`

- [ ] **Step 1: Write the failing release gate.** It reads the canonical
  registry and every required surface adapter. It must reject: a missing
  surface that renders English content, an English fallback in non-English
  code, a target-less content manifest, a mismatched speech locale, or a
  card/video mismatch.

- [ ] **Step 2: Add `npm run learning-language:release-matrix`.** The script must run only this static gate and its listed focused checks; it must not deploy, upload or invoke a model/API.

- [ ] **Step 3: Add release evidence output.** Write target-by-surface readiness and reasons to the audit file, not a large terminal log.

- [ ] **Step 4: Run it.** Expected result today: each missing ES/FR/DE surface
  reports unavailable; all four targets remain selectable and none can receive
  English content as a fallback.

### Task 5.2: Test safe migration and production exposure

**Files:**

- Create: `tests/learning_language_selection_migration.test.ts`
- Modify: `app/app_snapshot_bootstrap.ts` if its selected-target peek needs the new schema
- Modify: `app/cloud_sync.ts` only if selected-target sync requires explicit migration
- Modify: launch/checklist documentation used for production release

- [ ] **Step 1: Write migration tests.** Cover historical no-target/English values, stale dev `es/fr` values, invalid values, account switching and offline boot.

- [ ] **Step 2: Implement a one-way selection migration.** Historical values
  retain English. A stale non-English choice remains selected and its missing
  surfaces are unavailable; it must not mutate the shared account state.

- [ ] **Step 3: Verify no target leaks into account economy operations.** Run the focused shared-account contract from Phase 2 again.

- [ ] **Step 4: Run the final focused suite under the heavy-process semaphore.** Include the release matrix, selector/migration, cards, videos, dialogues, Arena, Daily Phrase and applicable Learning V2 tests. Save bulky logs outside the chat and record only commands, exits and decisive counts.

## Plan self-review

- Spec coverage: global selection/readiness is Phases 1 and 5; exact storage and shared account separation is Phase 2; all named content surfaces are Phases 3 and 4; no-English-fallback and activation gates are present in every phase.
- No production language activation or learner-facing content generation is included.
- The plan deliberately serializes the shared contract before individual surface migrations to prevent a second round of divergent lists.
- Cross-contract/economy changes in Phase 2 require the project’s critical-domain review path before any write.
