# Language Pack Retrofit Plan

Date: 2026-06-26
Status: required plan before further language generation/app activation

This plan turns the read-only verdicts into an execution order for PhraseMan,
Heisenberg and Gustav.

It does not approve production app writes, Firebase uploads, migrations, reviewer
decision import, or new content generation.

## 1. Objective

PhraseMan must move from app-bundled language expansion to isolated downloadable
language/course packs without increasing splash timing or mixing languages.

The plan has two tracks:

- app runtime hardening: startup, pack manifests, loaders, cache, storage/cloud,
  AI gates and tests;
- pipeline retrofit: Heisenberg and Gustav must stop treating future language
  work as direct app-bundle edits and must produce isolated pack artifacts first.

## 2. Current State From Verdicts

Bootstrap/onboarding:

- safe to implement as P0 if it is synchronous or piggybacks on existing local
  startup work;
- no new await before `setReady(true)`;
- no language hydration dependency in `nativeSplashCanHide`;
- no Firebase/network/course-pack/AI before first reveal.

Bundle:

- major content families are still TypeScript modules under `app/`;
- runtime call sites expect synchronous in-memory content;
- extraction requires manifest, loader states and offline behavior first.

Storage/cloud:

- local French/Gustav paths are partly target-aware;
- cloud sync and restore still use a flat progress model;
- raw legacy learning keys must be treated as English-only.

AI:

- rejected generated output is mostly not returned live;
- unknown language/target fallback, cache dimensions and premium dialog send need
  hardening before new app-domain generation is considered safe.

Heisenberg:

- current batch source-locale audits are valuable;
- future source-locale outputs must become isolated pack artifacts, not new large
  `app/` arrays.

Gustav:

- isolated generation/reviewer work may continue;
- app-ready downloadable target pack release is blocked until V2 evidence,
  reviewer, storage/cloud, admin and apply gates pass.

## 3. Execution Order

### Phase 0 - Freeze Unsafe Work

Effective immediately:

- no production language generation/apply;
- no Firebase/server runtime pack upload or activation;
- no storage migration;
- no course-pack download on splash/startup;
- no new app-bundled language payloads except explicitly approved temporary
  compatibility shims.

Allowed:

- read-only audits;
- documentation and contract updates;
- P0 bootstrap implementation planning and focused implementation;
- focused tests that do not update snapshots or source fixtures.
- explicit staging/shadow server artifact planning, but only with
  `activationApproved=false` and no production runtime dependency.

Midway production releases are allowed only if:

- current bundled compatibility payloads remain in the app;
- remote course-pack loading remains disabled for production;
- server-side pack copies are not required for existing onboarding, plans,
  lessons, quizzes, theory, phrase practice or language content;
- removal of bundled payloads is a later explicit step after dual-read parity,
  offline cache and rollback gates pass.

### Phase 1 - P0 Bootstrap Locale

Goal:

The first onboarding screen can use a best-effort local language without adding
startup time.

Tasks:

1. Extract a pure device-locale resolver.
2. Normalize locale aliases such as `pt_BR` to `pt-BR`.
3. Respect production interface gates.
4. Feed onboarding from the bootstrap snapshot.
5. Let stored `app_lang` hydrate later without blocking first reveal.
6. Add gates proving no new wait before `setReady(true)`.

Exit criteria:

- no new startup await for language;
- native splash hide condition unchanged in meaning;
- offline first onboarding screen is non-blank;
- focused timing/static tests pass.

### Phase 2 - Course Pack Runtime Contract

Goal:

Define how the app will identify, verify and cache packs before moving content.

Tasks:

1. Define `CoursePackManifest`:
   - `packId`;
   - `studyTarget`;
   - `sourceLocale`;
   - `schemaVersion`;
   - `contentVersion`;
   - `minAppVersion`;
   - `sha256`;
   - `byteSize`;
   - `createdAt`;
   - `dependencies`;
   - `surface`;
   - `entryIndex`.
2. Define cache states:
   - `missing`;
   - `downloading`;
   - `ready`;
   - `corrupt`;
   - `stale`;
   - `offline_fallback`.
3. Define pack keys:
   - `studyTarget/sourceLocale/surface/schemaVersion/contentVersion/hash`.
4. Define a tiny embedded index for availability and UI selection.
5. Prove downloads start only after onboarding/source+target selection.

Exit criteria:

- manifest schema gate exists;
- cache isolation gate exists;
- no pre-onboarding download gate exists.

### Phase 3 - Bundle Extraction Preparation

Goal:

Prepare app surfaces for async pack data without breaking current runtime.

Tasks:

1. Establish an initial bundle-size baseline.
2. Add static gates preventing future bootstrap imports of:
   - `plan_content_*`;
   - `quiz_data`;
   - `quiz_source_locale_payloads`;
   - generated lesson source-locale payloads;
   - generated audio metadata maps.
3. Convert each sync surface plan to loader states:
   - lesson;
   - quiz;
   - plan content;
   - audio metadata;
   - thematic packs.
4. Keep existing bundled content only as a temporary compatibility fallback until
   a surface has a pack-ready loader.
5. For content-bearing plan-content screens, require an explicit UI state
   contract before callsite migration:
   - report marker;
   - theory entry;
   - theory screen;
   - phrase lesson.
6. Do not use legacy templates as a generic fallback for future downloaded,
   stale, corrupt or wrong-locale packs.

Exit criteria:

- top bundle offenders are tracked;
- adding a language cannot silently add large modules to initial bundle;
- loader states are specified before extraction.
- plan-content content-bearing callsites have explicit loading, empty, blocked
  and fallback decisions before async pack data is introduced.

### Phase 4 - Storage And Cloud Safety

Goal:

Make user state safe before any target pack activation.

Tasks:

1. Map every `SYNC_KEYS` entry:
   - `global`;
   - `sourceLocale`;
   - `target.en legacy`;
   - `target.<id>`;
   - `source+target`;
   - `drop`;
   - `blocked_unknown`.
2. Treat raw legacy learning keys as English-only.
3. Decide personal plan state scope.
4. Define additive migration into target namespaces only after approval.
5. Make unknown future production targets fail closed instead of falling back to
   English storage.

Exit criteria:

- cloud restore tests prove English legacy does not hydrate French/future target;
- `app_lang/lang` cannot mutate `studyTarget`;
- source-locale switch does not alter target progress.

### Phase 5 - AI Language Hardening

Goal:

No generated visible AI text can leak the wrong language or target.

Tasks:

1. Make unknown `studyTarget` fail closed.
2. Replace weekly/stats unknown language fallback with shared strict resolver.
3. Add prompt dimensions:
   - `sourceLocale`;
   - `studyTarget`;
   - `aiOutputLang`;
   - `bridgeLang`.
4. Add cache key or cache metadata dimensions where target/source affects output.
5. Add bridge-aware output gate for premium dialog send.
6. Add Latin-script wrong-language tests.

Exit criteria:

- invalid language/target rejects across callable surfaces;
- wrong-language generated output never reaches live user;
- cache keys include required language dimensions.

### Phase 6 - Heisenberg Retrofit

Goal:

Heisenberg becomes a source-locale pack pipeline, not a direct app-bundle growth
pipeline.

Final target state:

Each Heisenberg source language is production-ready only when all source-locale
UI, explanations, quizzes, personal plan content, practice surfaces, admin
surfaces, AI prompt outputs, server/downloadable pack manifests, reviewer
decisions, semantic gates and tests are complete for `studyTarget=en`, with no
fallback/copy/wrong-language leakage and explicit activation approval.

Tasks:

1. Freeze new direct app-bundled source-locale expansion.
2. Add pack artifact contract to every future run:
   - `sourceLocale`;
   - `studyTarget=en`;
   - `surface`;
   - `schemaVersion`;
   - `packVersion`;
   - `contentHash`;
   - `itemCounts`;
   - `provenance`;
   - `reviewStatus`;
   - `semanticGateStatus`.
3. Re-audit existing Heisenberg batch outputs.
4. Convert existing valid batch content into isolated pack candidates where
   possible.
5. Route invalid/fallback/copied/wrong-language content into repair packets, not
   production app files.
6. Add bundle-boundary gate: future large source-locale content cannot land in
   `app/` as a default path.

Exit criteria:

- source-locale pack contract exists;
- no-fallback/no-copy/wrong-language gates exist;
- existing generated content is classified as reusable, repair-needed or blocked;
- no future run can treat `sourceLocale` as `studyTarget`.

### Phase 7 - Gustav Retrofit

Goal:

Gustav becomes a target-language pack pipeline for unique native/adapted courses,
not a direct translation/app-apply pipeline.

Tasks:

1. Freeze app activation/app apply.
2. Reconcile existing French/Gustav rows into V2 metadata:
   - `researchEvidenceIds`;
   - `pedagogyBlueprintId`;
   - `grammarClusterId`;
   - `transformationType`;
   - `antiCalqueDecision`;
   - `reviewerStatus`;
   - `activationApproved=false`.
3. Mark rows missing V2 metadata as HOLD, not app-ready.
4. Require pack manifest per target:
   - `studyTarget`;
   - `sourceLocales`;
   - `sourceGraphHash`;
   - `researchPackHash`;
   - `pedagogyBlueprintVersion`;
   - `domainRegistryVersion`;
   - `gateReports`;
   - `checksums`.
5. Require language-native/adapted generation by default:
   - direct translation is allowed only as `direct_equivalent` with evidence and
     anti-calque pass.
6. Keep reviewer decisions and product file apply separate.

Exit criteria:

- existing generated rows are classified as V2-ready, repair-needed or blocked;
- app-ready downloadable pack has reviewer/source/gate artifacts;
- storage/cloud and AI gates are accepted before activation.

### Phase 8 - Pilot Pack

Goal:

Move one low-risk content family through the full architecture.

Candidate order:

1. authored plan content index/content;
2. quiz source-locale payloads;
3. lesson source-locale generated phrase packs;
4. generated audio URL/metadata maps.

Exit criteria:

- manifest validates;
- cache integrity validates;
- offline fallback works;
- initial bundle does not grow;
- no language mixing in runtime.

### Phase 9 - Resume Language Creation

Only after Phases 1-8 are accepted for the relevant surface:

- Heisenberg may continue source-locale creation into isolated source-locale
  packs;
- Gustav may continue target-language creation into isolated target packs;
- production app activation still requires explicit apply approval, fresh dirty
  worktree audit and rollback plan.

## 4. What Existing Work Must Do

Existing Heisenberg content:

- do not delete;
- do not assume app-ready;
- re-audit and classify;
- migrate valid content into pack candidates;
- repair invalid language/fallback/copy issues in isolated packets only.

Existing Gustav/French content:

- do not delete;
- do not assume app-ready;
- reconcile into V2 metadata;
- require reviewer/evidence/anti-calque decisions;
- keep `activationApproved=false` until all gates pass.

Existing app-bundled content:

- remains compatibility baseline until each surface has loader states and pack
  parity checks.

## 5. Definition Of Ready For A New Language

A language may continue past audit only when:

- startup impact is zero;
- no large pack content is added to initial bundle;
- `sourceLocale` and `studyTarget` are explicit in every artifact;
- generated AI output language is fail-closed and cache-scoped;
- cloud/storage cannot hydrate another target;
- pack manifest and hashes validate;
- reviewer/evidence gates pass;
- app apply is explicitly approved.

## 6. Iteration Discipline

Every implementation, audit or generation pass must improve the retrofit state
with more verified progress than the previous pass, while staying inside the
approved phase.

Required end-of-pass output:

- completed work;
- focused checks/tests and their results;
- newly discovered risks or tails;
- blockers that remain;
- exact `Next Pass Plan`;
- files/artifacts the next session must read first;
- stop conditions for generation, Firebase upload, migration or app apply.

Increasing volume is valid only when it increases verified coverage. It must not
mean broader unsafe edits, app-bundle growth, unapproved content activation, or
weaker language isolation.

## 6. Documents This Plan Depends On

- `docs/specs/2026-06-26-bootstrap-course-pack-audit-matrix.md`
- `docs/specs/2026-06-26-bootstrap-course-pack-master-audit.md`
- `docs/HEISENBERG_LOCALIZATION_PIPELINE.md`
- `docs/gustav/GUSTAV_BRAIN.md`
- `docs/gustav/GUSTAV_TARGET_LANGUAGE_ARCHITECTURE.md`
- `docs/gustav/GUSTAV_AI_PROMPT_PORTING_CONTRACT.md`
- `docs/gustav/GUSTAV_TARGET_STORAGE_PLAN.md`
- `docs/gustav/GUSTAV_CLOUD_SYNC_IMPACT_PLAN.md`
