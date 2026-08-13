# Plan Content Pack Pilot Map

Date: 2026-06-26
Status: report-only Phase 3A prep

This pass maps `plan_content_*` as the first pilot extraction candidate. It does
not move content, change runtime behavior, add downloads, upload to Firebase, or
generate/apply new language content.

## Current Runtime Shape

Large authored plan content files:

- `app/plan_content_impuls.ts`
- `app/plan_content_gavan.ts`
- `app/plan_content_mitap.ts`
- `app/plan_content_echo.ts`
- `app/plan_content_voyazh.ts`

Single direct import seam:

- `app/plan_content_registry.ts`

The registry imports all five large modules, flattens their `PlanContentDay`
arrays, builds `CONTENT_BY_KEY`, and exposes:

- `getAuthoredPlanContentDay(planId, dayIndex)`
- `hasAuthoredPlanContent(planId, dayIndex)`
- `listAuthoredPlanContentDays()`
- `authoredPlanIntroCount(planId, dayIndex)`

Adapter seam:

- `app/plan_content_runtime_adapter.ts`

The adapter maps rich `PlanContentDay` data into existing runtime shapes:

- `contentDayToLessonPhrases`
- `contentDayToLessonIntroScreens`
- `contentVocabularyToRuntimeCards`

## App Callsites

Current direct registry seam:

| File | Use |
| --- | --- |
| `app/plan_content_readiness.ts` | Wraps the registry behind readiness/UI-state decisions while pack loading is inactive. |
| `app/plan_content_pack_dry_run.ts` | Local report-only reader for bundled compatibility parity reports; not imported by runtime screens/startup. |

App callsites now using the readiness facade:

| File | Use |
| --- | --- |
| `app/personal_plan.tsx` | Shows report button and decides whether day theory should open before task start. |
| `app/personal_plan_exercise.tsx` | Shows report button for authored content exercises. |
| `app/personal_plan_task_done.tsx` | Shows report button on authored day completion. |
| `app/personal_plan_theory.tsx` | Loads bundled-compatible authored day intro screens through readiness. |
| `app/personal_plan_phrase_lessons.ts` | Loads bundled-compatible authored day phrases or allowed template fallback through readiness. |

Current adapter callsites:

| File | Use |
| --- | --- |
| `app/plan_content_pack_dry_run.ts` | Checks local dry-run parity adapter row counts for intro screens, phrases and vocabulary cards. |
| `app/personal_plan_phrase_lessons.ts` | Converts authored day phrases into `LessonPhrase[]`. |
| `app/personal_plan_theory.tsx` | Converts authored day intro screens into lesson intro UI data. |

## Pack Identity Proposal

Initial pilot surface:

```text
surface = plan_content
studyTarget = en
sourceLocale = ru | uk | es | pt-BR | vi | id | tr | pl
entryIndex = plan-content/index.json
```

Recommended manifest granularity:

- one pack per `studyTarget/sourceLocale/surface/contentVersion`;
- index entries keyed by `planId/dayIndex`;
- payload shards can be per plan after the first pilot proves the loader states;
- keep `planId` and `dayIndex` inside payload rows so runtime cannot infer the
  wrong plan from path alone.

Required manifest metadata:

- `packId`
- `studyTarget`
- `sourceLocale`
- `surface=plan_content`
- `schemaVersion`
- `contentVersion`
- `minAppVersion`
- `sha256`
- `byteSize`
- `createdAt`
- `dependencies`
- `entryIndex`

Required row metadata before production extraction:

- `planId`
- `dayIndex`
- `sourceLocale`
- `studyTarget=en`
- `schemaVersion`
- `contentVersion`
- `contentHash`
- `reviewStatus`
- `localeGateStatus`

## Loader State Plan

Current state:

- P1 `resolveCoursePackReadiness` returns `offline_fallback` for
  `surface='plan_content'` because content is still bundled compatibility.
- Remote loading remains disabled by `COURSE_PACK_REMOTE_LOADING_ENABLED=false`.

Future loader states before any movement:

- `missing`: no pack and no bundled authored day.
- `downloading`: only after onboarding/source+target selection and explicit pack
  request.
- `ready`: manifest hash/byte size validated and cache entry loaded.
- `corrupt`: hash, schema or row metadata mismatch.
- `stale`: content version below embedded availability index requirement.
- `offline_fallback`: use existing bundled registry while pack extraction is not
  complete or cache is unavailable.

Required behavior:

- `getAuthoredPlanContentDay` cannot become an unguarded async call overnight.
- UI surfaces need an explicit loading/empty/fallback state before registry is
  replaced.
- Report buttons must not be the only signal of authored content readiness.
- No pack request may happen from splash, onboarding, or `LangProvider`.

## Guards Added

Static test:

- `tests/plan_content_pack_boundary_contract.test.ts`

It proves:

- the five large `plan_content_*` modules are imported only by
  `app/plan_content_registry.ts`;
- registry callsites are explicit while the pack loader is not active;
- adapter callsites are explicit;
- `surface='plan_content'` resolves as bundled compatibility, not remote-ready.

Readiness facade:

- `app/plan_content_readiness.ts`
- `tests/plan_content_readiness.test.ts`

The facade wraps current registry access with explicit readiness metadata:

- `selection_required`
- `authored_day_ready`
- `authored_day_missing`

It remains synchronous and bundled-compatibility backed. It is not a downloader
and does not change any existing personal-plan screen yet.

First facade consumer:

- `app/personal_plan_task_done.tsx`

This callsite uses `hasBundledCompatibilityPlanContentDay(planId, dayIndex)` for
the report-button-only authored-content check. It does not affect lesson/theory
content, task completion, progress, storage, downloads or cache writes.

Additional facade consumers:

- `app/personal_plan_exercise.tsx`
- `app/personal_plan.tsx` report button and theory-entry decision
- `app/personal_plan_theory.tsx` theory-screen lookup
- `app/personal_plan_phrase_lessons.ts` phrase-lesson lookup

These app callsites now use `app/plan_content_readiness.ts`. The readiness
facade is the only direct app-side registry seam while pack loading is inactive.

UI state contract:

- `app/plan_content_readiness.ts` exposes
  `resolvePlanContentUiState(readiness, surface)` for `report_marker`,
  `theory_entry`, `theory_screen` and `phrase_lesson`;
- authored content resolves to explicit render/report/theory-entry states;
- missing bundled-compatibility phrase lessons may use the legacy template
  fallback;
- `downloading`, `corrupt`, `stale` and selection-required states do not silently
  use templates and can block progress credit for unsafe content-bearing states;
- `docs/specs/2026-06-26-plan-content-ui-state-contract.md` records the current
  decision table.

Theory-entry facade migration:

- `app/plan_content_readiness.ts` exposes
  `hasBundledCompatibilityPlanContentTheoryEntry(planId, dayIndex)`;
- `app/personal_plan.tsx` uses this helper instead of importing
  `authoredPlanIntroCount` from the registry;
- the helper requires real intro screens and a renderable state, preserving the
  old theory-entry behavior while making future unsafe states fail closed;
- boundary tests now parse multiline import statements so facade consumers remain
  visible to the guard.

Theory-screen facade migration:

- `app/plan_content_readiness.ts` exposes
  `getBundledCompatibilityPlanContentTheoryDay(planId, dayIndex)`;
- `app/personal_plan_theory.tsx` uses this helper instead of importing
  `getAuthoredPlanContentDay` from the registry;
- `contentDayToLessonIntroScreens` remains the adapter seam;
- missing theory keeps the existing empty-state behavior;
- `personal_plan_phrase_lessons.ts` is the remaining direct content-bearing
  registry consumer in this pilot.

Phrase-lesson facade migration:

- `app/plan_content_readiness.ts` exposes
  `resolvePlanContentPhraseLesson(readiness)` and
  `resolveBundledCompatibilityPlanContentPhraseLesson(planId, dayIndex)`;
- `app/personal_plan_phrase_lessons.ts` uses the readiness helper instead of
  importing `getAuthoredPlanContentDay` from the registry;
- current authored-content behavior is preserved through
  `contentDayToLessonPhrases`;
- the legacy template fallback is allowed only for missing bundled-compatibility
  days;
- unsafe future states resolve as `blocked` and cannot silently use templates.

Extraction and dual-read activation plan:

- `docs/specs/2026-06-26-plan-content-extraction-dual-read-plan.md` defines the
  future pack index shape, row metadata, dual-read parity checks, activation
  gates and rollback rules;
- plan-content server copies remain staging/shadow artifacts until
  `activationApproved=true` is explicitly approved later;
- runtime still uses bundled compatibility and does not fetch remote manifests.

Shadow index validators:

- `app/plan_content_pack_index.ts` validates `plan-content-index-v1` without
  connecting to runtime loading, startup, Firebase/server or payload files;
- `tests/plan_content_pack_index.test.ts` covers fail-closed source/target,
  safe row paths, hashes, duplicate rows, review statuses, locale-gate statuses
  and activation-ready requirements.

Parity report validators:

- `app/plan_content_pack_parity.ts` validates
  `plan-content-parity-report-v1` without connecting to runtime loading,
  startup, Firebase/server or payload files;
- `tests/plan_content_pack_parity.test.ts` proves activation-candidate reports
  fail closed when mismatches, added/missing rows or non-approved reviewer/locale
  summaries exist.

Local dry-run parity reporter:

- `app/plan_content_pack_dry_run.ts` builds a validated parity report from
  bundled compatibility data only;
- it checks intro, phrase and vocabulary adapter row counts;
- it defaults to `hold`, may only become `shadow_parity_passed`, and never emits
  `activation_candidate`;
- `tests/plan_content_pack_dry_run.test.ts` proves the report validates, cannot
  activate runtime and is disconnected from startup, network, storage and loader
  runtime.

Local dry-run parity report command:

- `scripts/plan_content_dry_run_parity_report.ts` writes the validated report
  only under `.codex-tmp/plan-content/`;
- it validates before writing, re-reads and validates after writing, and fails
  closed on blocking mismatches or accidental `activation_candidate`;
- `tests/plan_content_dry_run_report_command.test.ts` runs the real `npx tsx`
  command, proves the output validates and proves paths outside the ignored
  report tree are rejected.

Local shadow-pack artifact exporter:

- `scripts/plan_content_shadow_pack_export.ts` writes local shadow artifacts
  only under `.codex-tmp/plan-content/`;
- it emits `index.json` plus per-day `plans/<planId>/day-001.json` rows;
- rows keep `studyTarget='en'`, normalized source locale,
  `reviewStatus='shadow'` and `localeGateStatus='hold'`;
- content hashes are computed from canonical bundled `PlanContentDay` JSON and
  must match the index;
- `tests/plan_content_shadow_pack_export_command.test.ts` runs the real CLI,
  validates the index and all generated rows, and proves paths outside the
  ignored tree are rejected.

Local shadow-pack dual-read parity comparator:

- `scripts/plan_content_shadow_pack_parity_compare.ts` reads exported shadow
  artifacts from `.codex-tmp/plan-content/`;
- it compares the shadow files against bundled registry data and runtime adapter
  output for intro screens, phrases and vocabulary cards;
- clean artifacts produce a validated `plan-content-parity-report-v1` with
  `verdict='shadow_parity_passed'`;
- changed shadow rows persist a `hold` report and exit non-zero;
- `tests/plan_content_shadow_pack_parity_compare_command.test.ts` runs the real
  export and compare CLIs and proves the comparator stays local/report-only.

Local course-pack manifest wrapper:

- `scripts/plan_content_course_pack_manifest_wrap.ts` writes a valid local
  `CoursePackManifest` for the exported shadow pack;
- it writes a separate `activation-guard.json` with
  `activationApproved=false`, `remoteLoadingEnabled=false`,
  `runtimeConnected=false` and `serverStaged=false`;
- it requires a clean `shadow_parity_passed` report before writing;
- `tests/plan_content_course_pack_manifest_wrap_command.test.ts` runs the real
  export -> compare -> wrap chain and proves `hold` reports are rejected.

Local release-bundle verifier:

- `scripts/plan_content_release_bundle_verify.ts` validates `manifest.json`,
  `activation-guard.json`, `index.json`, all day rows and the parity report as a
  single local bundle;
- it emits `plan-content-local-release-readiness-v1` under
  `.codex-tmp/plan-content/`;
- clean bundles produce `PASS` while still recording `activationApproved=false`;
- unsafe guard flags produce a persisted `HOLD` report and non-zero exit;
- `tests/plan_content_release_bundle_verify_command.test.ts` runs the real
  export -> compare -> wrap -> verify chain.

Runtime ignore guard:

- `tests/plan_content_local_artifact_runtime_ignore.test.ts` proves local
  `.codex-tmp/plan-content/` artifacts do not affect runtime readiness;
- embedded `plan_content` entries remain bundled-only,
  `activationApproved=false` and manifest-free;
- `plan_content` still resolves to bundled compatibility while remote loading is
  disabled.

Local server-staging dry-run descriptor:

- `scripts/plan_content_server_staging_descriptor.ts` maps verified local
  release-bundle artifacts to future server/staging object paths;
- it requires a valid manifest, activation guard, readiness report and index;
- clean evidence produces `READY_FOR_STAGING_REVIEW` while recording
  `activationApproved=false`, `runtimeManifestRegistered=false`,
  `networkCalls=false` and `localOnly=true`;
- non-PASS readiness evidence produces `HOLD` and non-zero exit;
- `tests/plan_content_server_staging_descriptor_command.test.ts` runs the real
  export -> compare -> wrap -> verify -> descriptor chain;
- the descriptor is local evidence only and is not imported by startup or
  production app flows.

Local server-staging approval review:

- `scripts/plan_content_server_staging_approval_review.ts` reads the descriptor
  and emits a local approval-review packet;
- clean descriptor evidence produces `AWAITING_EXPLICIT_APPROVAL` while keeping
  `activationApproved=false`, `approvedForServerWrite=false`,
  `serverWritePermitted=false`, `stagingWriterAllowed=false`,
  `runtimeManifestRegistered=false`, `networkCalls=false` and `localOnly=true`;
- HOLD descriptor evidence fails closed with a persisted `HOLD` review and
  non-zero exit;
- `tests/plan_content_server_staging_approval_review_command.test.ts` runs the
  real export -> compare -> wrap -> verify -> descriptor -> approval-review
  chain;
- the approval review is local evidence only and cannot approve server writes.

Local server-staging writer dry-run:

- `scripts/plan_content_server_staging_writer.ts` reads the descriptor plus
  approval-review packet and emits a local would-write plan;
- clean evidence produces `DRY_RUN_READY` while keeping
  `activationApproved=false`, `approvedForServerWrite=false`,
  `serverWritePermitted=false`, `actualServerWrites=false`,
  `runtimeManifestRegistered=false`, `networkCalls=false` and `localOnly=true`;
- `--apply` is explicitly rejected with a persisted `HOLD` plan;
- local file hashes and byte sizes are rechecked against descriptor evidence;
- `tests/plan_content_server_staging_writer_command.test.ts` runs the real
  export -> compare -> wrap -> verify -> descriptor -> approval-review ->
  dry-run writer chain;
- the writer is local evidence only and cannot write server objects or approve
  runtime activation.

Local server-staging apply preflight:

- `scripts/plan_content_server_staging_apply_preflight.ts` reads the dry-run
  writer plan plus an explicit real-apply approval file and emits a local
  preflight report;
- missing approval produces `HOLD`;
- valid staging/shadow approval produces `APPLY_PREFLIGHT_READY` while keeping
  `serverWritePermitted=false`, `actualServerWrites=false`,
  `activationApproved=false`, `runtimeManifestRegistered=false`,
  `networkCalls=false` and `localOnly=true`;
- unsafe approval flags for production, runtime manifest registration, remote
  loading, bundled-content removal, storage migration or production activation
  fail closed;
- local file hashes and byte sizes are rechecked against writer-plan evidence;
- `tests/plan_content_server_staging_apply_preflight_command.test.ts` runs the
  real export -> compare -> wrap -> verify -> descriptor -> approval-review ->
  dry-run writer -> apply-preflight chain;
- the preflight report is local evidence only and cannot write server objects or
  approve runtime activation.

Apply-capable staging writer:

- `scripts/plan_content_server_staging_apply.ts` reads the apply-preflight
  report, dry-run writer plan and real-apply approval file;
- default mode writes a dry-run apply report with `serverWritePermitted=false`,
  `actualServerWrites=false`, `activationApproved=false`,
  `runtimeManifestRegistered=false`, `remoteLoadingEnabled=false`,
  `bundledContentRemoved=false`, `storageMigrationRan=false` and
  `productionActivationApproved=false`;
- `--apply` is blocked before network unless
  `PHRASEMAN_PLAN_CONTENT_STAGING_APPLY=staging_shadow_only`,
  `PHRASEMAN_PLAN_CONTENT_STAGING_BUCKET` and
  `PHRASEMAN_PLAN_CONTENT_STAGING_ACCESS_TOKEN` are present;
- `tests/plan_content_server_staging_apply_command.test.ts` runs the real
  export -> compare -> wrap -> verify -> descriptor -> approval-review ->
  dry-run writer -> apply-preflight -> apply chain;
- no real `--apply` upload was executed while implementing this gate.

First staging/shadow upload:

- pack id `en.ru.plan_content.staging.shadow.20260627.1` was uploaded to
  Firebase Storage under
  `course-packs/plan_content/en/ru/staging.shadow.20260627.1/`;
- upload report:
  `.codex-tmp/plan-content/staging-upload-20260627/server-staging-apply-report.json`;
- apply status was `APPLY_COMPLETE`;
- uploaded operations: `551`;
- remote verification passed after upload with expected `551`, found `551`,
  missing `0`, size mismatches `0`, sha256 checked `551`, sha256 mismatches
  `0`;
- upload remains staging/shadow only: `activationApproved=false`, no runtime
  manifest registration, no remote loading, no bundled-content removal, no
  storage/cloud migration and no production activation.

Reusable remote shadow verification:

- `scripts/plan_content_server_staging_remote_verify.ts` now verifies the
  uploaded staging prefix from the apply report;
- `tests/plan_content_server_staging_remote_verify_command.test.ts` covers the
  verifier contract;
- real report:
  `.codex-tmp/plan-content/staging-upload-20260627/server-staging-remote-verify.json`;
- report status: `PASS`, expected `551`, found `551`, hash checked `551`;
- the verifier is report tooling only and is not imported by startup,
  onboarding, personal-plan UI or production runtime.

Server-shadow dual-read comparator:

- `scripts/plan_content_server_shadow_dual_read_compare.ts` now reads the
  reusable remote verification report, downloads remote `index.json` plus every
  comparable remote day row, and compares server shadow content against bundled
  compatibility and adapter output;
- `tests/plan_content_server_shadow_dual_read_compare_command.test.ts` covers
  the comparator contract;
- real report:
  `.codex-tmp/plan-content/staging-upload-20260627/server-shadow-dual-read-report.json`;
- report status: `PASS`, remote expected `551`, remote found `551`, remote hash
  checked `551`, remote index entries `546`, server shadow rows read `546`,
  compared bundled days `546`, verdict `shadow_parity_passed`;
- hash mismatches `0`, adapter mismatches `0`, artifact mismatches `0`,
  blockers `0`;
- the comparator is report tooling only and is not imported by startup,
  onboarding, personal-plan UI or production runtime.

Disabled loader/cache/offline/rollback contract:

- `app/course_pack_runtime_policy.ts` defines the disabled runtime policy for
  future remote manifests, cached packs, offline fallback and rollback;
- `tests/course_pack_runtime_policy_contract.test.ts` proves all
  remote/cache/activation capabilities remain false;
- while the contract is disabled, only current bundled compatibility fallback
  can provide content;
- future `downloading`, `ready`, `corrupt` and `stale` states are ignored
  without cache read/write/repair or downloads;
- the policy is not imported by startup, onboarding, personal-plan UI or
  production runtime.

Disabled manifest registry/cache preflight:

- `app/course_pack_manifest_registry_preflight.ts` evaluates future manifest
  registry/cache metadata while all runtime/cache permissions remain false;
- `scripts/plan_content_disabled_manifest_registry_preflight.ts` writes a local
  report from the real staging manifest, remote verification report and
  server-shadow dual-read report;
- real report:
  `.codex-tmp/plan-content/staging-upload-20260627/disabled-manifest-registry-preflight.json`;
- report status: `PASS`, `registryEntryAllowed=false`,
  `cacheMetadataReadableByRuntime=false`,
  `cacheMetadataWritableByRuntime=false`, `manifestFetchApproved=false`,
  `packDownloadApproved=false`, `cacheReadApproved=false`,
  `cacheWriteApproved=false`;
- the preflight is evidence-only and is not imported by startup, onboarding,
  personal-plan UI or production runtime.

Disabled runtime manifest candidate:

- `app/course_pack_runtime_manifest_candidate.ts` evaluates the complete
  evidence bundle for a future runtime manifest candidate while keeping it
  non-registrable;
- `scripts/plan_content_disabled_runtime_manifest_candidate.ts` writes a local
  report from the real staging manifest, remote verification, server-shadow
  dual-read and disabled manifest preflight evidence;
- real report:
  `.codex-tmp/plan-content/staging-upload-20260627/disabled-runtime-manifest-candidate.json`;
- report status: `PASS`, `evidenceBundleComplete=true`,
  `runtimeManifestRegistrable=false`, `runtimeManifestRegistered=false`,
  `runtimeLookupAllowed=false`, `cacheLookupAllowed=false`,
  `cacheReadAllowed=false`, `cacheWriteAllowed=false`,
  `startupBlockingAllowed=false`;
- the candidate is evidence-only and is not imported by startup, onboarding,
  personal-plan UI or production runtime.

Activation-readiness blocker report:

- `app/course_pack_activation_readiness.ts` evaluates all completed evidence and
  remaining activation gates as one disabled matrix;
- `scripts/plan_content_activation_readiness_blocker_report.ts` writes the real
  report under `.codex-tmp/plan-content/`;
- real report:
  `.codex-tmp/plan-content/staging-upload-20260627/activation-readiness-blocker-report.json`;
- report status: `HOLD`, completed gates `8`, blocked gates `6`, evidence
  blockers `0`, startup no-fetch guard `PASS`;
- remaining blockers: reviewer approval `0/546`, locale gates `0/546`,
  offline cache integrity, rollback kill-switch, storage/cloud isolation and
  product-owner activation approval;
- the report is evidence-only and is not imported by startup, onboarding,
  personal-plan UI or production runtime.

Disabled offline cache integrity report:

- `app/course_pack_offline_cache_integrity.ts` validates staged pack cache
  identity and integrity evidence while runtime cache use remains disabled;
- `scripts/plan_content_disabled_offline_cache_integrity.ts` writes the real
  report under `.codex-tmp/plan-content/`;
- real report:
  `.codex-tmp/plan-content/staging-upload-20260627/disabled-offline-cache-integrity.json`;
- report status: `PASS`, expected objects `551`, found objects `551`, hash
  checked `551`, evidence blockers `0`, blockers `0`,
  `offlineCacheUsableByRuntime=false`;
- the activation-readiness report was refreshed to `HOLD`, completed gates `9`,
  blocked gates `5`, evidence blockers `0`;
- the report is evidence-only and is not imported by startup, onboarding,
  personal-plan UI or production runtime.

Disabled rollback kill-switch report:

- `app/course_pack_rollback_kill_switch.ts` validates rollback evidence while
  runtime rollback remains disabled and report-only;
- `scripts/plan_content_disabled_rollback_kill_switch.ts` writes the real
  report under `.codex-tmp/plan-content/`;
- real report:
  `.codex-tmp/plan-content/staging-upload-20260627/disabled-rollback-kill-switch.json`;
- report status: `PASS`, `rollbackMode='bundled_compatibility'`,
  `rollbackDeletesUserProgress=false`, `rollbackMutatesStorageOrCloud=false`,
  evidence blockers `0`, blockers `0`;
- the activation-readiness report was refreshed to `HOLD`, completed gates `10`,
  blocked gates `4`, evidence blockers `0`;
- the report is evidence-only and is not imported by startup, onboarding,
  personal-plan UI or production runtime.

Disabled storage/cloud isolation report:

- `app/course_pack_storage_cloud_isolation.ts` validates storage/cloud isolation
  evidence while runtime activation, storage migration, cloud restore rewrite,
  target/source mutation, remote loading and cache read/write remain disabled;
- `scripts/plan_content_disabled_storage_cloud_isolation.ts` writes the real
  report under `.codex-tmp/plan-content/`;
- real report:
  `.codex-tmp/plan-content/staging-upload-20260627/disabled-storage-cloud-isolation.json`;
- report status: `PASS`, legacy flat cloud target `en`,
  `appLanguageMutatesStudyTarget=false`,
  `personalPracticeSourceScopesSeparate=true`,
  `lessonListeningProgressTargetAware=true`, evidence blockers `0`, blockers
  `0`;
- the activation-readiness report was refreshed to `HOLD`, completed gates `11`,
  blocked gates `3`, evidence blockers `0`;
- the report is evidence-only and is not imported by startup, onboarding,
  personal-plan UI or production runtime.

Disabled reviewer/locale intake report:

- `app/course_pack_reviewer_locale_intake.ts` validates reviewer/locale evidence
  while refusing to infer approvals from parity, upload or server-shadow
  metadata;
- `scripts/plan_content_disabled_reviewer_locale_intake.ts` writes the real
  report under `.codex-tmp/plan-content/`;
- real report:
  `.codex-tmp/plan-content/staging-upload-20260627/disabled-reviewer-locale-intake.json`;
- report status: `HOLD`, `safetyStatus='PASS'`, `approvalStatus='HOLD'`,
  reviewer approved rows `0/546`, locale passed rows `0/546`, missing reviewer
  queue `546`, missing locale queue `546`, evidence blockers `0`;
- the activation-readiness report stayed `HOLD`, completed gates `11`, blocked
  gates `3`, evidence blockers `0`;
- the report is evidence-only and is not imported by startup, onboarding,
  personal-plan UI or production runtime.

Explicit reviewer/locale approval packet:

- `app/course_pack_reviewer_locale_approval_packet.ts` builds the report-only
  packet and validates separately supplied filled approval artifacts;
- `scripts/plan_content_reviewer_locale_approval_packet.ts` writes the real
  packet under `.codex-tmp/plan-content/`;
- real report:
  `.codex-tmp/plan-content/staging-upload-20260627/reviewer-locale-approval-packet.json`;
- report status `PASS`, packet status `READY_FOR_REVIEW`, queued rows `546`,
  reviewer approved rows `0/546`, locale passed rows `0/546`, filled artifact
  validation `missing`, blockers `0`;
- the packet is evidence-only and is not imported by startup, onboarding,
  personal-plan UI or production runtime.

Explicit approval artifact intake dry-run:

- `scripts/plan_content_reviewer_locale_approval_intake_dry_run.ts` validates an
  optional external filled approval artifact against the approval packet and
  re-runs disabled reviewer/locale intake only after validation passes;
- real report:
  `.codex-tmp/plan-content/staging-upload-20260627/reviewer-locale-approval-intake-dry-run.json`;
- report status `HOLD`, dry-run status `MISSING_FILLED_ARTIFACT`, reviewer
  approved rows `0/546`, locale passed rows `0/546`, blockers `1`;
- the dry-run is evidence-only and is not imported by startup, onboarding,
  personal-plan UI or production runtime.

Reviewer/locale decision work-order batches:

- `scripts/plan_content_reviewer_locale_work_order_batches.ts` splits queued
  rows into deterministic unfilled review batches;
- real report:
  `.codex-tmp/plan-content/staging-upload-20260627/reviewer-locale-decision-work-order-batches.json`;
- report status `PASS`, work-order status `READY_FOR_REVIEW`, rows `546`,
  batches `22`, reviewer approved rows `0/546`, locale passed rows `0/546`,
  generated filled approval artifact `false`, blockers `0`;
- the work-order is evidence-only and is not imported by startup, onboarding,
  personal-plan UI or production runtime.

Midway production release invariant:

- server copies may be prepared only as staging/shadow artifacts with
  `activationApproved=false`;
- production runtime must continue to use bundled compatibility while
  `COURSE_PACK_REMOTE_LOADING_ENABLED=false`;
- no production release may depend on Firebase/server pack availability until
  loader/cache/offline/parity/rollback gates are complete and activation is
  explicitly approved.

## Risks

- `personal_plan_phrase_lessons.ts` still expects synchronous phrase data from
  the readiness facade; async swap requires a loader/cache layer first.
- UI report buttons depend on readiness helpers; future pack readiness must not
  make report buttons appear for missing/corrupt content.
- Plan content contains many source-locale fields; extraction must not allow
  source-locale fallback to masquerade as translated content.

## Next Pass Plan

Objective:

Build a validator/assembler for externally filled reviewer/locale work-order
batches. Do not generate filled approvals, do not activate runtime, do not
read/write app cache, do not run storage/cloud migrations and do not remove
bundled content.

Read first:

- `app/plan_content_registry.ts`
- `app/plan_content_readiness.ts`
- `app/personal_plan.tsx`
- `app/personal_plan_phrase_lessons.ts`
- `app/personal_plan_theory.tsx`
- `app/course_pack_loader.ts`
- `tests/plan_content_pack_boundary_contract.test.ts`
- `tests/plan_content_readiness.test.ts`
- `docs/specs/2026-06-26-plan-content-ui-state-contract.md`
- `docs/specs/2026-06-26-plan-content-extraction-dual-read-plan.md`
- `app/plan_content_pack_index.ts`
- `tests/plan_content_pack_index.test.ts`
- `app/plan_content_pack_parity.ts`
- `tests/plan_content_pack_parity.test.ts`
- `app/plan_content_pack_dry_run.ts`
- `tests/plan_content_pack_dry_run.test.ts`
- `scripts/plan_content_dry_run_parity_report.ts`
- `tests/plan_content_dry_run_report_command.test.ts`
- `scripts/plan_content_shadow_pack_export.ts`
- `tests/plan_content_shadow_pack_export_command.test.ts`
- `scripts/plan_content_shadow_pack_parity_compare.ts`
- `tests/plan_content_shadow_pack_parity_compare_command.test.ts`
- `scripts/plan_content_course_pack_manifest_wrap.ts`
- `tests/plan_content_course_pack_manifest_wrap_command.test.ts`
- `scripts/plan_content_release_bundle_verify.ts`
- `tests/plan_content_release_bundle_verify_command.test.ts`
- `tests/plan_content_local_artifact_runtime_ignore.test.ts`
- `scripts/plan_content_server_staging_descriptor.ts`
- `tests/plan_content_server_staging_descriptor_command.test.ts`
- `scripts/plan_content_server_staging_approval_review.ts`
- `tests/plan_content_server_staging_approval_review_command.test.ts`
- `scripts/plan_content_server_staging_writer.ts`
- `tests/plan_content_server_staging_writer_command.test.ts`
- `scripts/plan_content_server_staging_apply_preflight.ts`
- `tests/plan_content_server_staging_apply_preflight_command.test.ts`
- `scripts/plan_content_server_staging_apply.ts`
- `tests/plan_content_server_staging_apply_command.test.ts`
- `scripts/plan_content_server_staging_remote_verify.ts`
- `tests/plan_content_server_staging_remote_verify_command.test.ts`
- `scripts/plan_content_server_shadow_dual_read_compare.ts`
- `tests/plan_content_server_shadow_dual_read_compare_command.test.ts`
- `.codex-tmp/plan-content/staging-upload-20260627/server-staging-apply-report.json`
- `.codex-tmp/plan-content/staging-upload-20260627/server-staging-remote-verify.json`
- `.codex-tmp/plan-content/staging-upload-20260627/server-shadow-dual-read-report.json`
- `app/course_pack_runtime_policy.ts`
- `tests/course_pack_runtime_policy_contract.test.ts`
- `app/course_pack_manifest_registry_preflight.ts`
- `tests/course_pack_manifest_registry_preflight.test.ts`
- `scripts/plan_content_disabled_manifest_registry_preflight.ts`
- `tests/plan_content_disabled_manifest_registry_preflight_command.test.ts`
- `.codex-tmp/plan-content/staging-upload-20260627/disabled-manifest-registry-preflight.json`
- `app/course_pack_runtime_manifest_candidate.ts`
- `tests/course_pack_runtime_manifest_candidate.test.ts`
- `scripts/plan_content_disabled_runtime_manifest_candidate.ts`
- `tests/plan_content_disabled_runtime_manifest_candidate_command.test.ts`
- `.codex-tmp/plan-content/staging-upload-20260627/disabled-runtime-manifest-candidate.json`
- `app/course_pack_activation_readiness.ts`
- `tests/course_pack_activation_readiness.test.ts`
- `scripts/plan_content_activation_readiness_blocker_report.ts`
- `tests/plan_content_activation_readiness_blocker_report_command.test.ts`
- `.codex-tmp/plan-content/staging-upload-20260627/activation-readiness-blocker-report.json`
- `app/course_pack_offline_cache_integrity.ts`
- `tests/course_pack_offline_cache_integrity.test.ts`
- `scripts/plan_content_disabled_offline_cache_integrity.ts`
- `tests/plan_content_disabled_offline_cache_integrity_command.test.ts`
- `.codex-tmp/plan-content/staging-upload-20260627/disabled-offline-cache-integrity.json`
- `app/course_pack_rollback_kill_switch.ts`
- `tests/course_pack_rollback_kill_switch.test.ts`
- `scripts/plan_content_disabled_rollback_kill_switch.ts`
- `tests/plan_content_disabled_rollback_kill_switch_command.test.ts`
- `.codex-tmp/plan-content/staging-upload-20260627/disabled-rollback-kill-switch.json`
- `app/course_pack_storage_cloud_isolation.ts`
- `tests/course_pack_storage_cloud_isolation.test.ts`
- `scripts/plan_content_disabled_storage_cloud_isolation.ts`
- `tests/plan_content_disabled_storage_cloud_isolation_command.test.ts`
- `.codex-tmp/plan-content/staging-upload-20260627/disabled-storage-cloud-isolation.json`
- `app/course_pack_reviewer_locale_intake.ts`
- `tests/course_pack_reviewer_locale_intake.test.ts`
- `scripts/plan_content_disabled_reviewer_locale_intake.ts`
- `tests/plan_content_disabled_reviewer_locale_intake_command.test.ts`
- `.codex-tmp/plan-content/staging-upload-20260627/disabled-reviewer-locale-intake.json`
- `app/course_pack_reviewer_locale_approval_packet.ts`
- `tests/course_pack_reviewer_locale_approval_packet.test.ts`
- `scripts/plan_content_reviewer_locale_approval_packet.ts`
- `tests/plan_content_reviewer_locale_approval_packet_command.test.ts`
- `.codex-tmp/plan-content/staging-upload-20260627/reviewer-locale-approval-packet.json`
- `scripts/plan_content_reviewer_locale_approval_intake_dry_run.ts`
- `tests/plan_content_reviewer_locale_approval_intake_dry_run_command.test.ts`
- `.codex-tmp/plan-content/staging-upload-20260627/reviewer-locale-approval-intake-dry-run.json`
- `scripts/plan_content_reviewer_locale_work_order_batches.ts`
- `tests/plan_content_reviewer_locale_work_order_batches_command.test.ts`
- `.codex-tmp/plan-content/staging-upload-20260627/reviewer-locale-decision-work-order-batches.json`
- `app/target_storage_keys.ts`
- `app/cloud_sync.ts`
- `app/study_target.ts`
- `app/study_target_lang_dev.ts`
- `app/trainer_store.ts`
- `app/personal_plan_state.ts`
- `tests/gustav_personal_practice_target_isolation.test.ts`
- `tests/gustav_mistake_log_target_isolation.test.ts`
- `tests/gustav_stats_trainer_target_isolation.test.ts`

Expected work:

1. Add a report-only validator for externally filled work-order batches.
2. Reject missing, partial, duplicate, mismatched source/target/hash or
   empty-evidence future artifacts as `HOLD`.
3. Assemble a candidate filled approval artifact only when every row has
   explicit reviewer and locale evidence.
4. Keep every generated validator output non-activating by default.
5. Keep any implementation behind `COURSE_PACK_REMOTE_LOADING_ENABLED=false`;
   do not make runtime async, downloadable or cache-backed.
6. Keep local readiness reports evidence-only.
7. Keep registry and large payload files untouched.
8. Update this handoff with checks and the next pass plan.

Stop conditions:

- do not split or rewrite the five large `plan_content_*` modules;
- do not change visible personal-plan behavior;
- do not make plan content async yet;
- do not add Firebase/server runtime upload, download or cache writes;
- do not add app cache read/write/repair;
- do not add storage/cloud mutation;
- do not add cloud restore rewrite;
- do not auto-approve reviewer status;
- do not auto-pass locale gates;
- do not generate a filled approval artifact or fake evidence ids;
- do not mutate studyTarget/sourceLocale;
- do not allow unknown future target fallback to English;
- any staging/shadow server write requires explicit approval and
  `activationApproved=false`;
- do not generate or apply language content.
