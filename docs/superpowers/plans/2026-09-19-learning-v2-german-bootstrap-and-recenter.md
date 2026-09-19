# German Learning V2 Bootstrap and Recenter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `subagent-driven-development` (recommended only after the owner explicitly authorizes delegated implementation) or `executing-plans` to implement this plan task-by-task. Every task is tracked with `- [ ]` checkboxes.

**Goal:** Build the isolated German Learning V2 admission contour: target-aware RU+UK policy, an enforceable fresh-context `judge_recenter` before and after every session, German research authority, and the gates that make it impossible to author or release German learner content before the full grammar-first blueprint receives owner approval.

**Architecture:** Keep English data and readiness behavior byte-stable. Add a target descriptor for `de`, content-addressed instruction packs, PRE_AUTHOR, POST_AUTHOR and RELEASE_PROJECTION recenter receipts, and target-aware readiness/isolation checks. The German contour stops at an owner-approval gate after producing research artifacts and the blueprint implementation plan; learner-facing sessions remain forbidden in this plan.

**Tech Stack:** Node.js ESM, TypeScript, `tsx`, Markdown/JSON artifacts, SHA-256 content addressing, the existing Learning V2 factory under `content/learning-v2-course`, and existing curriculum contracts under `modules/learning-v2/curriculum`.

---

## Non-negotiable boundaries

- Work in the existing shared checkout. Do not create a branch, worktree, forked coding task, or delegated coding task without a new explicit owner instruction.
- Never edit English learner-facing files, files beginning with `episode_01_`, English exemplars, English owner judgments, or `LESSON1_AUTHORING_REGISTRY_V1`.
- German target code is `de`; instructional locales are exactly `ru` and `uk`.
- German baseline is Standarddeutsch as used in Germany. Austrian and Swiss standard variants may appear only as clearly marked receptive notes.
- German progression target is `PRE_A1 → functional B1`, using the existing `32 lessons × 56 sessions` topology with a native German grammar graph.
- Every learner-facing German session is blocked until all 32 lessons, 224 chapters, and 1,792 exact session packets exist, pass deterministic gates, and the owner approves the fingerprinted map.
- `judge_recenter` is mandatory three times for every session: PRE_AUTHOR before draft generation, POST_AUTHOR before ordinary judges, and RELEASE_PROJECTION after a fresh German release+mockup build but before publish or opening the next session. A missing, stale, incomplete, or HOLD receipt blocks the pipeline.
- Recenter is invalidated by compaction, restart, handoff, a changed normative file, changed blueprint/session packet, changed prior released range, or changed authored bytes.
- No OpenAI project/user API key may be used for research, writing, judging, or verification. Audio/TTS is outside this plan and remains forbidden.
- Preserve all unrelated dirty-worktree changes.

## Required reading before Task 1 and after every context reset

- [ ] Read `C:\Users\badlo\OneDrive\Desktop\Codex\00_ПРОЧТИ_ПЕРВЫМ.txt` completely.
- [ ] Read `C:\Users\badlo\OneDrive\Desktop\Codex\00_ГЛАВНОЕ_ТРЕБОВАНИЕ.md` completely.
- [ ] Read `C:\Users\badlo\OneDrive\Desktop\Codex\НАЧНИ_ОТСЮДА.md` completely.
- [ ] Read `AGENTS.md`, `docs/v2/СТАРТ В2.md`, and `docs/v2/СТАРТ de.md` completely.
- [ ] Read `content/learning-v2-course/ГЛАВНОЕ_ТРЕБОВАНИЕ.md`, `КОНСТИТУЦИЯ.md`, and `МЕТОД_РАБОТЫ.md` completely.
- [ ] Read `content/learning-v2-course/exemplars/en/l01_s01.ru.md`, `l01_s02.ru.md`, and `l01_s03.ru.md` completely as quality exemplars, never as German translation templates.
- [ ] Read every file in `content/learning-v2-course/judgements/owner/` completely.
- [ ] Read every prompt in `content/learning-v2-course/pipeline/prompts/`, especially `AFTER_EVERY_SESSION_RECENTER.ru.md` and `judge_progression.md`.
- [ ] Read the approved design at `docs/superpowers/specs/2026-09-19-learning-v2-german-grammar-first-course-design.md` and the Stage 0 packet at `docs/v2/curriculum/de/TASK_PACKET_STAGE_0.md`.
- [ ] Record `ON TRACK` with the exact files and SHA-256 hashes in the active task notes before editing.

## Task 1: Freeze the English baseline and add target policy tests

**Files:**

- Create: `tests/learning_v2_target_policy_gate.ts`
- Create: `modules/learning-v2/curriculum/contracts/course_target_policy_v1.ts`
- Modify: `modules/learning-v2/curriculum/contracts/course_blueprint_v2.ts`
- Test: `tests/learning_v2_target_policy_gate.ts`

- [ ] Capture the current English contract surface without modifying it:

  ```powershell
  git diff -- modules/learning-v2/curriculum/en content/learning-v2-course/exemplars/en content/learning-v2-course/judgements/owner
  ```

  Expected: no changes introduced by this German task. Existing unrelated changes, if any, must be documented and left untouched.

- [ ] Write the failing target-policy test first. It must assert:

  ```ts
  assert.deepEqual(getCourseTargetPolicy("en").interfaceLocales, [
    "ru", "uk", "es", "pt-BR", "vi", "id", "tr", "pl",
  ]);
  assert.deepEqual(getCourseTargetPolicy("de").interfaceLocales, ["ru", "uk"]);
  assert.equal(getCourseTargetPolicy("de").targetLanguage, "de");
  assert.equal(getCourseTargetPolicy("de").baseline, "de-DE-standard");
  assert.throws(() => getCourseTargetPolicy("xx" as never));
  ```

- [ ] Run the RED test:

  ```powershell
  npx tsx tests/learning_v2_target_policy_gate.ts
  ```

  Expected: failure because `course_target_policy_v1.ts` does not exist.

- [ ] Implement a closed target registry. Do not replace the English eight-locale constant with a German-specific global:

  ```ts
  export type LearningV2TargetLanguage = "en" | "de";

  export type CourseTargetPolicy = Readonly<{
    targetLanguage: LearningV2TargetLanguage;
    interfaceLocales: readonly string[];
    baseline: "en-general" | "de-DE-standard";
  }>;

  const POLICIES = {
    en: { targetLanguage: "en", interfaceLocales: ["ru", "uk", "es", "pt-BR", "vi", "id", "tr", "pl"], baseline: "en-general" },
    de: { targetLanguage: "de", interfaceLocales: ["ru", "uk"], baseline: "de-DE-standard" },
  } as const satisfies Record<LearningV2TargetLanguage, CourseTargetPolicy>;
  ```

- [ ] Change shared blueprint types only where necessary so validators receive a target policy explicitly. Preserve the existing English exported values and serialized shapes.

- [ ] Run the GREEN test and the existing English blueprint contract gate:

  ```powershell
  npx tsx tests/learning_v2_target_policy_gate.ts
  npx tsx tests/learning_v2_course_blueprint_contract_gate.ts
  ```

  Expected: both PASS; English still reports eight interface locales.

- [ ] Commit only Task 1 files:

  ```powershell
  git add tests/learning_v2_target_policy_gate.ts modules/learning-v2/curriculum/contracts/course_target_policy_v1.ts modules/learning-v2/curriculum/contracts/course_blueprint_v2.ts
  git commit -m "feat: add Learning V2 target locale policy"
  ```

## Task 2: Define the versioned recenter requirement manifest

**Files:**

- Create: `content/learning-v2-course/curriculum/de/REQUIREMENT_MANIFEST_V1.json`
- Create: `content/learning-v2-course/pipeline/recenter_contract.mjs`
- Create: `content/learning-v2-course/pipeline/recenter_contract.test.mjs`

- [ ] Write a failing test that loads the manifest and requires every entry to have:

  ```js
  {
    id: "DE-AUTHOR-001",
    sourcePath: "docs/v2/СТАРТ de.md",
    sourceSection: "...",
    phase: ["PRE_AUTHOR", "POST_AUTHOR"],
    applicability: "always",
    severity: "HOLD",
    assertion: "human-readable exact requirement"
  }
  ```

- [ ] Test these invariants before implementation:

  - IDs are unique and stable.
  - Each source path is explicit; directory globs are forbidden in the committed manifest.
  - `phase` contains only `PRE_AUTHOR`, `POST_AUTHOR` and/or `RELEASE_PROJECTION`.
  - `applicability` is one of `always`, `teaching`, `checkpoint`, `voice`, `recall`, `release`.
  - Every manifest source exists.
  - At least one requirement covers each mandatory family: Desktop Codex, Constitution, work method, owner judgments, exemplars, exact packet, progression, RU+UK, feedback, diagnostics, release, map freshness, English isolation.
  - The owner override from `AFTER_EVERY_SESSION_RECENTER.ru.md` requiring 1–5 new lexical senses and a new situation applies to all session types.

- [ ] Run RED:

  ```powershell
  node --test content/learning-v2-course/pipeline/recenter_contract.test.mjs
  ```

- [ ] Implement `loadRequirementManifest`, `validateRequirementManifest`, and `applicableRequirements` as pure functions. They must reject unknown fields rather than silently ignoring them.

- [ ] Populate the manifest by walking the required reading list and assigning one stable ID per independently judgeable requirement. Do not summarize several unrelated requirements into one row.

- [ ] Run GREEN:

  ```powershell
  node --test content/learning-v2-course/pipeline/recenter_contract.test.mjs
  ```

- [ ] Commit:

  ```powershell
  git add content/learning-v2-course/curriculum/de/REQUIREMENT_MANIFEST_V1.json content/learning-v2-course/pipeline/recenter_contract.mjs content/learning-v2-course/pipeline/recenter_contract.test.mjs
  git commit -m "feat: define German authoring requirement manifest"
  ```

## Task 3: Build a content-addressed instruction pack

**Files:**

- Create: `content/learning-v2-course/pipeline/recenter_pack.mjs`
- Create: `content/learning-v2-course/pipeline/recenter_pack.test.mjs`
- Create: `content/learning-v2-course/pipeline/prompts/judge_recenter_pre.md`
- Create: `content/learning-v2-course/pipeline/prompts/judge_recenter_post.md`
- Create: `content/learning-v2-course/pipeline/prompts/judge_recenter_release.md`

- [ ] Write RED tests with temporary fixture files. Tests must prove:

  - files are read from disk at invocation time;
  - each file receives normalized absolute path, byte length, and SHA-256;
  - the aggregate `instructionSetDigest` changes when one byte changes;
  - missing or unreadable required sources produce HOLD, not a warning;
  - no receipt is reusable after the exact packet or previous-release-range digest changes;
  - POST_AUTHOR additionally hashes the authored RU and UK bytes.
  - RELEASE_PROJECTION additionally requires exact German release package,
    German owner mockup, their closed manifests, one UUID `releaseAttemptId`,
    and matching RU/UK, blueprint, packet, release and mockup fingerprints.
  - session coordinates outside lessons 1–32 or sessions 1–56 fail closed.

- [ ] Define the pack result:

  ```js
  {
    schemaVersion: "learning-v2-recenter-pack.v1",
    targetLanguage: "de",
    sessionId: "de_l01_s01",
    phase: "PRE_AUTHOR",
    createdAt: "ISO-8601",
    instructionSetDigest: "sha256:...",
    blueprintFingerprint: "sha256:...",
    packetFingerprint: "sha256:...",
    previousReleasedRangeDigest: "sha256:...",
    sources: [{ path, bytes, sha256, content }],
    requirements: [...]
  }
  ```

- [ ] Make the prompt demand one row per applicable requirement:

  ```json
  {
    "requirementId": "DE-AUTHOR-001",
    "verdict": "PASS",
    "evidence": [{ "path": "...", "section": "...", "fact": "..." }],
    "authorDirective": "concrete constraint for this exact session"
  }
  ```

  Allowed verdicts are `PASS`, `HOLD`, and `NOT_APPLICABLE`. `NOT_APPLICABLE` requires a non-empty justification and is rejected for `applicability: always`.

- [ ] Run tests:

  ```powershell
  node --test content/learning-v2-course/pipeline/recenter_pack.test.mjs
  ```

- [ ] Commit:

  ```powershell
  git add content/learning-v2-course/pipeline/recenter_pack.mjs content/learning-v2-course/pipeline/recenter_pack.test.mjs content/learning-v2-course/pipeline/prompts/judge_recenter_pre.md content/learning-v2-course/pipeline/prompts/judge_recenter_post.md content/learning-v2-course/pipeline/prompts/judge_recenter_release.md
  git commit -m "feat: build content-addressed recenter packs"
  ```

## Task 4: Validate PRE_AUTHOR, POST_AUTHOR and RELEASE_PROJECTION receipts

**Files:**

- Create: `content/learning-v2-course/pipeline/recenter_receipt.mjs`
- Create: `content/learning-v2-course/pipeline/recenter_receipt.test.mjs`

- [ ] Write table-driven RED tests for all rejection cases:

  - absent receipt;
  - wrong target or session;
  - wrong phase;
  - stale instruction, blueprint, packet, prior-range, RU, or UK digest;
  - duplicate/missing/unknown requirement IDs;
  - illegal `NOT_APPLICABLE`;
  - any HOLD;
  - zero evidence entries;
  - PRE receipt created before the current process epoch after restart/handoff;
  - POST receipt not bound to the PRE receipt digest.
  - RELEASE_PROJECTION receipt not bound to the exact POST receipt;
  - evidence path outside the pack or evidence SHA-256 not equal to the packed
    bytes;
  - stale/missing/wrong-session/English release or mockup;
  - re-release reusing an earlier `releaseAttemptId` or stale mockup manifest.

- [ ] Implement the receipt schema:

  ```js
  {
    schemaVersion: "learning-v2-recenter-receipt.v1",
    phase: "PRE_AUTHOR",
    status: "ON_TRACK",
    targetLanguage: "de",
    sessionId: "de_l01_s01",
    processEpoch: "uuid",
    packDigest: "sha256:...",
    instructionSetDigest: "sha256:...",
    blueprintFingerprint: "sha256:...",
    packetFingerprint: "sha256:...",
    previousReleasedRangeDigest: "sha256:...",
    preReceiptDigest: null,
    authoredRuDigest: null,
    authoredUkDigest: null,
    requirementResults: [...]
  }
  ```

- [ ] Store no secrets and make clear in code/comments that this is content-addressed evidence, not a cryptographic identity signature.

- [ ] Run GREEN:

  ```powershell
  node --test content/learning-v2-course/pipeline/recenter_receipt.test.mjs
  ```

- [ ] Commit:

  ```powershell
  git add content/learning-v2-course/pipeline/recenter_receipt.mjs content/learning-v2-course/pipeline/recenter_receipt.test.mjs
  git commit -m "feat: enforce recenter receipt freshness"
  ```

## Task 5: Insert recenter admission into the factory

**Files:**

- Modify: `content/learning-v2-course/pipeline/run.mjs`
- Modify: `content/learning-v2-course/pipeline/session_readiness.mjs`
- Create: `content/learning-v2-course/pipeline/recenter_pipeline.test.mjs`
- Modify: `content/learning-v2-course/README.md`

- [ ] Write RED integration tests using a fake model backend. They must prove:

  1. `draft` for `de` refuses to call the author model without a fresh PRE_AUTHOR ON_TRACK.
  2. A PRE_AUTHOR HOLD prevents any draft file from being created.
  3. `judge`, `edit`, `localize`, `render`, and `release` refuse to proceed when the relevant receipt is stale.
  4. POST_AUTHOR runs in a fresh context after RU+UK bytes exist and before ordinary judges.
  5. Ordinary judges are never called after POST_AUTHOR HOLD.
  6. English behavior remains unchanged unless the English contour explicitly opts into the new gate later.
  7. Release and the next session are blocked until a fresh German release and
     owner mockup pass RELEASE_PROJECTION for this exact attempt.

- [ ] Add explicit commands rather than silently running a judge inside an unrelated stage:

  ```text
  node pipeline/run.mjs recenter-pre  --lang de --lesson 1 --session 1
  node pipeline/run.mjs draft         --lang de --lesson 1 --session 1
  node pipeline/run.mjs localize      --lang de --lesson 1 --session 1 --locales ru,uk
  node pipeline/run.mjs recenter-post --lang de --lesson 1 --session 1
  node pipeline/run.mjs judge         --lang de --lesson 1 --session 1
  node pipeline/run.mjs recenter-release --lang de --lesson 1 --session 1 --release-attempt <uuid>
  ```

- [ ] Save receipts under the German session work directory as `recenter.pre.json`, `recenter.post.json` and `recenter.release.json`. Never write them into English directories.

- [ ] Make `sessionReadiness` require all three receipts for German release/advance and verify them against current bytes each time it runs. Draft admission requires PRE; ordinary judges require POST; publish and next-session admission require RELEASE_PROJECTION.

- [ ] Document the exact HOLD recovery path: reread from disk, rebuild pack, rerun fresh judge, never hand-edit a receipt.

- [ ] Run focused tests:

  ```powershell
  node --test content/learning-v2-course/pipeline/recenter_pipeline.test.mjs
  node --test content/learning-v2-course/pipeline/session_readiness.test.mjs
  ```

- [ ] Commit:

  ```powershell
  git add content/learning-v2-course/pipeline/run.mjs content/learning-v2-course/pipeline/session_readiness.mjs content/learning-v2-course/pipeline/recenter_pipeline.test.mjs content/learning-v2-course/README.md
  git commit -m "feat: gate German authoring with fresh recenter review"
  ```

## Task 6: Remove English-only blind spots from shared judges

**Files:**

- Modify: `content/learning-v2-course/pipeline/session_readiness.mjs`
- Modify: `content/learning-v2-course/pipeline/check_lang_isolation.mjs`
- Modify: `content/learning-v2-course/pipeline/run.mjs`
- Create: `content/learning-v2-course/pipeline/target_aware_judges.test.mjs`

- [ ] Write RED regressions for the discovered hardcodings:

  - `judge_progression` is mandatory for `de/...`, not only paths matching `^en/`;
  - German headings and path markers are recognized by language isolation;
  - German never falls back to the English target-language name;
  - required ordinary judges are exactly learner, pedagogy, nonsense, reader, taste/humor, and progression, plus the three recenter receipts;
  - RU and UK locale review is mandatory; the other six English locales are not required for German;
  - all current English readiness fixtures retain their previous expected results.

- [ ] Replace path regex decisions with the explicit target descriptor from Task 1. Do not broaden `^en/` to a permissive regex that accepts unknown targets.

- [ ] Add `de` to the closed language-name map as `Deutsch` / `немецкий` only where display text is needed.

- [ ] Run:

  ```powershell
  node --test content/learning-v2-course/pipeline/target_aware_judges.test.mjs
  node --test content/learning-v2-course/pipeline/session_readiness.test.mjs
  ```

- [ ] Commit:

  ```powershell
  git add content/learning-v2-course/pipeline/session_readiness.mjs content/learning-v2-course/pipeline/check_lang_isolation.mjs content/learning-v2-course/pipeline/run.mjs content/learning-v2-course/pipeline/target_aware_judges.test.mjs
  git commit -m "fix: make Learning V2 judges target-aware"
  ```

## Task 7: Add German-only command surfaces and English isolation guard

**Files:**

- Create: `scripts/learning_v2_de_authoring_preflight.ts`
- Create: `tests/learning_v2_de_contour_isolation_gate.ts`
- Modify: `package.json`

- [ ] Write RED isolation tests that snapshot protected English files, invoke German preflight in a fixture, and fail if any English path or registry changes.

- [ ] Add scripts:

  ```json
  {
    "learning-v2:de-authoring-preflight": "npx tsx scripts/learning_v2_de_authoring_preflight.ts",
    "learning-v2:de-contour-isolation-gate": "npx tsx tests/learning_v2_de_contour_isolation_gate.ts"
  }
  ```

- [ ] The preflight must return HOLD until all of these exist and pass:

  - approved German blueprint fingerprint receipt;
  - exact packet for the requested session;
  - fresh PRE_AUTHOR receipt;
  - RU+UK target policy;
  - zero protected English changes attributable to the German command.

- [ ] Run:

  ```powershell
  npm run learning-v2:de-contour-isolation-gate
  npm run learning-v2:de-authoring-preflight -- --lesson 1 --session 1
  ```

  Expected now: isolation PASS; authoring preflight HOLD because the full German blueprint is intentionally not yet approved.

- [ ] Commit:

  ```powershell
  git add scripts/learning_v2_de_authoring_preflight.ts tests/learning_v2_de_contour_isolation_gate.ts package.json
  git commit -m "feat: add isolated German authoring preflight"
  ```

## Task 8: Produce the German linguistic research authority

**Files:**

- Create: `docs/v2/curriculum/de/RESEARCH_DOSSIER.ru.md`
- Create: `docs/v2/curriculum/de/SOURCE_EVIDENCE_LEDGER.md`
- Create: `docs/v2/curriculum/de/OWNER_DECISIONS.md`
- Create: `modules/learning-v2/curriculum/de/research_authority_de_v1.ts`
- Create: `tests/learning_v2_de_research_authority_gate.ts`

- [ ] Research only from primary or authoritative sources, recording access date, URL, supported claim, and how the claim changes the course graph. Minimum authority set:

  - Council of Europe CEFR Companion Volume/descriptors;
  - Goethe-Institut CEFR/course-level materials;
  - IDS Mannheim `grammis` for German system grammar, cases, and word order;
  - Rat für deutsche Rechtschreibung for current orthographic authority;
  - one documented corpus/frequency authority for lexical prioritization.

- [ ] The dossier must decide, with evidence:

  - clause topology: V2 main clauses, verb-first questions/imperatives, verb-final subordinate clauses;
  - verbal bracket and separable prefixes;
  - nominative/accusative/dative/genitive sequencing by communicative payoff;
  - article/adjective morphology and case marking;
  - modal, perfect, preterite of high-frequency verbs, and future/reference-to-future sequencing;
  - negation with `nicht` and `kein`;
  - prepositions and governed case;
  - pronouns, reflexives, relative clauses, passive/receptive structures;
  - gender/plural learning strategy;
  - pronunciation risks for RU- and UK-speaking learners;
  - register, `du/Sie`, Germany baseline, and receptive AT/CH variants;
  - functional B1 exit evidence.

- [ ] Create a typed authority ledger:

  ```ts
  export type GermanResearchClaim = Readonly<{
    id: string;
    sourceUrl: string;
    authority: string;
    accessedOn: "2026-09-19";
    claim: string;
    curriculumImplication: string;
  }>;
  ```

- [ ] Write and run a gate that rejects duplicate IDs, missing URLs, unsupported course decisions, or claims absent from the Markdown ledger:

  ```powershell
  npx tsx tests/learning_v2_de_research_authority_gate.ts
  ```

- [ ] Obtain an independent German-linguistic review in a fresh read-only judge context. The judge must return PASS/HOLD per research claim and may not edit the dossier.

- [ ] Record only explicit unresolved owner decisions in `OWNER_DECISIONS.md`. Do not invent owner approval.

- [ ] Commit:

  ```powershell
  git add docs/v2/curriculum/de/RESEARCH_DOSSIER.ru.md docs/v2/curriculum/de/SOURCE_EVIDENCE_LEDGER.md docs/v2/curriculum/de/OWNER_DECISIONS.md modules/learning-v2/curriculum/de/research_authority_de_v1.ts tests/learning_v2_de_research_authority_gate.ts
  git commit -m "docs: establish German Learning V2 research authority"
  ```

## Task 9: Write the blueprint materialization plan from the evidence

**Files:**

- Create: `docs/superpowers/plans/2026-09-19-learning-v2-german-blueprint.md`
- Modify: `docs/v2/curriculum/de/TASK_PACKET_STAGE_0.md`

- [ ] Use `writing-plans` again after Task 8 passes. The new plan must be grounded in the actual research dossier; it must not pre-decide the German grammar sequence from intuition.

- [ ] The blueprint plan must explicitly materialize and gate:

  - 32 lesson summaries and B1 endpoint evidence;
  - 224 chapter beats;
  - 1,792 exact session packets;
  - grammar-operation registry;
  - lexical-sense registry;
  - prerequisite DAG and topological validation;
  - grammar, lexical, communicative, pronunciation, review, checkpoint, and variance matrices;
  - RU and UK localization policy;
  - deterministic map builder and browser-readable owner map;
  - owner fingerprint receipt;
  - frozen blueprint enforcement after approval.

- [ ] Require one content-addressed drift/recenter check after every session-equivalent packet during blueprint materialization, with state stored in a German-only ledger. A batch generator may create structure, but may not auto-approve packet content.

- [ ] Define the exact owner gate: no `de_l01_s01` learner copy can be drafted until the owner explicitly approves the displayed blueprint fingerprint.

- [ ] Commit the blueprint plan and updated Stage 0 status only. Do not create learner content:

  ```powershell
  git add docs/superpowers/plans/2026-09-19-learning-v2-german-blueprint.md docs/v2/curriculum/de/TASK_PACKET_STAGE_0.md
  git commit -m "docs: plan German Learning V2 blueprint materialization"
  ```

## Task 10: Run the focused completion audit for this plan

**Files:**

- Verify only; modify source only through a new reviewed fix task if a gate fails.

- [ ] Acquire the shared heavy-process slot before any command that invokes broad TypeScript or Jest work. Prefer the focused commands below, which should not require a heavy slot.

- [ ] Run all plan gates:

  ```powershell
  npx tsx tests/learning_v2_target_policy_gate.ts
  node --test content/learning-v2-course/pipeline/recenter_contract.test.mjs
  node --test content/learning-v2-course/pipeline/recenter_pack.test.mjs
  node --test content/learning-v2-course/pipeline/recenter_receipt.test.mjs
  node --test content/learning-v2-course/pipeline/recenter_pipeline.test.mjs
  node --test content/learning-v2-course/pipeline/target_aware_judges.test.mjs
  npm run learning-v2:de-contour-isolation-gate
  npx tsx tests/learning_v2_de_research_authority_gate.ts
  ```

- [ ] Run the German preflight and confirm the expected safe stop:

  ```powershell
  npm run learning-v2:de-authoring-preflight -- --lesson 1 --session 1
  ```

  Expected: `HOLD: German blueprint fingerprint has not been owner-approved.` This HOLD is success for the bootstrap plan.

- [ ] Re-run the English baseline gates that the shared changes could affect:

  ```powershell
  npx tsx tests/learning_v2_course_blueprint_contract_gate.ts
  node --test content/learning-v2-course/pipeline/session_readiness.test.mjs
  npm run learning-v2:lesson1-authoring-preflight
  ```

  If the final command is considered heavy in the current checkout, acquire and release `.claude/semaphore/slot.sh` exactly as required by `AGENTS.md`.

- [ ] Inspect the final diff and prove no English content/registry changed:

  ```powershell
  git diff -- content/learning-v2-course/exemplars/en content/learning-v2-course/judgements/owner modules/learning-v2/curriculum/en
  git status --short
  ```

- [ ] Apply `verification-before-completion`. Report command, status, decisive evidence, and any HOLD. Do not call this phase complete if a required gate is red.

## Definition of done for this plan

- [ ] German has an isolated RU+UK target descriptor and command surface.
- [ ] PRE_AUTHOR, POST_AUTHOR and RELEASE_PROJECTION `judge_recenter` are enforced by code, not memory or prose.
- [ ] Every applicable requirement receives explicit PASS/HOLD/justified NOT_APPLICABLE evidence.
- [ ] Stale receipts cannot authorize writing, judging, or release.
- [ ] A fresh German owner mockup exists for every session and learner-facing
  edit/re-release; it is bound to exact RU+UK and release bytes, cannot use an
  English path, and blocks the next session when missing or stale.
- [ ] Evidence can reference only exact path+SHA-256 pairs present in the pack;
  invented or external evidence paths cannot authorize any phase.
- [ ] Research dossier, evidence ledger, owner decisions and typed research
  authority are part of the content-addressed instruction set.
- [ ] Progression and language-isolation checks recognize German without weakening English.
- [ ] The German research dossier and evidence ledger pass an independent linguistic review.
- [ ] The next executable plan for the full 32×56 German blueprint exists and is research-grounded.
- [ ] German learner-facing session writing still returns HOLD pending full blueprint materialization and explicit owner fingerprint approval.
- [ ] English learner-facing content and English registry are unchanged.

## Work that is intentionally not authorized by this plan

- Writing `de_l01_s01` or any other learner-facing German session.
- Generating German audio/TTS.
- Releasing or deploying app/runtime changes.
- Editing English sessions, English owner judgments, or English authoring registry.
- Treating a neighboring task's informal advice as a normative override.
