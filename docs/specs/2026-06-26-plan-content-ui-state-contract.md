# Plan Content UI State Contract

Date: 2026-06-26
Status: Phase 3E implementation contract

This pass adds a small synchronous decision layer for plan-content UI states. It
does not move content, fetch Firebase, download packs, write caches, migrate
storage, generate language content or change visible personal-plan behavior by
itself.

## Runtime Contract

File:

- `app/plan_content_readiness.ts`

New public pieces:

- `PLAN_CONTENT_UI_SURFACES`
- `PlanContentUiSurface`
- `PlanContentUiState`
- `resolvePlanContentUiState(readiness, surface)`

Covered surfaces:

- `report_marker`
- `theory_entry`
- `theory_screen`
- `phrase_lesson`

The resolver consumes `PlanContentReadiness` and returns explicit flags:

- whether authored content may render;
- whether a report marker may show;
- whether the plan day should expose a theory entry;
- whether bundled compatibility content is being used;
- whether the legacy phrase template fallback is allowed;
- whether a loading, empty or blocked state should show;
- whether progress credit must be blocked for unsafe content states;
- a stable copy key for future UI text.

## Current Decisions

Authored day ready:

- `report_marker` shows the report marker only.
- `theory_entry` may expose the theory route.
- `theory_screen` may render authored intro content.
- `phrase_lesson` may render authored phrase content.
- current source is `bundled_compatibility` until extraction is approved.

Missing authored day:

- `report_marker` and `theory_entry` stay hidden.
- `theory_screen` gets an empty-state decision.
- `phrase_lesson` may use the legacy template fallback only while the pack
  delivery is `bundled_compatibility`.

Unsafe/future pack states:

- `downloading` maps to loading and blocks progress credit for content-bearing
  phrase lessons.
- `corrupt` and `stale` map to blocked state and block progress credit.
- these states do not silently fall back to phrase templates.

Selection required:

- non-content markers stay hidden.
- content-bearing screens are blocked until source and target selection are
  explicit.

## Safety Boundary

The legacy template fallback is intentionally narrow. It is allowed only for the
current bundled-compatibility path because those templates are not a safe generic
replacement for future downloaded/source-locale/target packs.

This prevents a future `es`, `pt-BR`, `vi`, `id`, `tr`, `pl`, `fr` or other pack
from rendering Russian/Ukrainian/English legacy fallback text and treating it as
valid localized content.

## Tests

Covered by:

- `tests/plan_content_readiness.test.ts`
- `tests/plan_content_pack_boundary_contract.test.ts`

The focused test pass proves:

- authored days produce surface-specific UI states;
- missing bundled compatibility days keep only the intended legacy fallback;
- corrupt/stale/downloading pack states do not use templates;
- selection-required content remains non-renderable;
- direct large `plan_content_*` imports remain behind the registry seam.

## Phase 3F Update

The personal-plan theory-entry decision has been migrated:

- `hasBundledCompatibilityPlanContentTheoryEntry(planId, dayIndex)` requires
  authored intro screens and a renderable readiness state;
- `app/personal_plan.tsx` uses that helper instead of importing
  `authoredPlanIntroCount` from `plan_content_registry`;
- `resolvePlanContentUiState(...)` treats only `ready` and `offline_fallback` as
  renderable authored states, so `downloading`, `corrupt` and `stale` do not
  expose theory-entry or authored screen content.

## Phase 3G Update

The personal-plan theory screen has been migrated:

- `getBundledCompatibilityPlanContentTheoryDay(planId, dayIndex)` returns a
  theory day only when authored intro screens exist and `theory_screen` UI state
  can render authored content;
- `app/personal_plan_theory.tsx` uses that helper instead of importing
  `getAuthoredPlanContentDay` from `plan_content_registry`;
- `contentDayToLessonIntroScreens` remains the runtime adapter seam;
- missing theory keeps the existing empty-state behavior.

## Midway Release Safety

Server-side plan-content copies are not production source of truth yet. Before
activation they may exist only as staging/shadow artifacts with
`activationApproved=false`; production runtime must keep using bundled
compatibility while remote loading is disabled.

## Phase 3H Update

The personal-plan phrase lesson lookup has been migrated:

- `resolvePlanContentPhraseLesson(readiness)` classifies phrase lesson content as
  `authored_day`, `template_fallback` or `blocked`;
- `resolveBundledCompatibilityPlanContentPhraseLesson(planId, dayIndex)` wraps
  the current bundled compatibility context;
- `app/personal_plan_phrase_lessons.ts` uses that helper instead of importing
  `getAuthoredPlanContentDay` from `plan_content_registry`;
- missing bundled-compatibility days may still use the legacy template fallback;
- unsafe future states such as `downloading`, `corrupt` and `stale` resolve as
  `blocked` and cannot silently use templates.

## Phase 3I Update

The report-only extraction and dual-read activation plan exists:

- `docs/specs/2026-06-26-plan-content-extraction-dual-read-plan.md` defines the
  future pack index shape, row metadata, dual-read parity checks, activation
  gates, rollback rules and midway release invariant;
- `tests/course_pack_runtime_contract.test.ts` guards that `plan_content`
  remains bundled-compatibility only, with `activationApproved=false`, no
  manifest-backed downloadable entry and remote loading disabled.

## Not Done

Still not implemented:

- async pack loading;
- remote manifest fetch;
- Firebase Storage integration;
- file-system course-pack cache;
- content extraction from `app/plan_content_*`;
- production Heisenberg/Gustav generation/apply.

## Phase 3J Update

Shadow index validators exist:

- `app/plan_content_pack_index.ts` validates `plan-content-index-v1` and
  `plan-content-day-v1` metadata;
- activation-ready validation requires approved review and passed locale gates;
- validators stay disconnected from Firebase/server, loader runtime, startup and
  payload files.

## Phase 3K Update

Parity report validators exist:

- `app/plan_content_pack_parity.ts` validates
  `plan-content-parity-report-v1`;
- `activation_candidate` fails closed on added/missing rows, hash mismatches,
  adapter mismatches, fallback mismatches, non-approved review status or
  non-passed locale gate;
- `shadow_parity_passed` fails closed on blocking parity mismatches.

## Phase 3L Update

The local dry-run parity reporter exists:

- `app/plan_content_pack_dry_run.ts` builds a validated parity report from
  bundled compatibility data only;
- it checks intro, phrase and vocabulary adapter row counts;
- dry-run reports default to `hold`, may only become `shadow_parity_passed`, and
  never emit `activation_candidate`;
- the reporter is not imported by startup or production app flows.

## Phase 3M Update

The local dry-run parity report command exists:

- `scripts/plan_content_dry_run_parity_report.ts` writes the validated report
  only under `.codex-tmp/plan-content/`;
- it validates before writing, re-reads and validates after writing, and fails
  closed on blocking mismatches or accidental `activation_candidate`;
- output outside the ignored plan-content report tree is rejected;
- the command is not imported by startup or production app flows.

## Phase 3N Update

The local shadow-pack artifact exporter exists:

- `scripts/plan_content_shadow_pack_export.ts` writes local shadow artifacts
  only under `.codex-tmp/plan-content/`;
- it emits `index.json` plus per-day row JSON files;
- rows keep `studyTarget='en'`, `reviewStatus='shadow'` and
  `localeGateStatus='hold'`;
- content hashes must match the generated index;
- the exporter is not imported by startup or production app flows.

## Phase 3O Update

The local shadow-pack dual-read parity comparator exists:

- `scripts/plan_content_shadow_pack_parity_compare.ts` reads exported shadow
  artifacts from `.codex-tmp/plan-content/`;
- it compares shadow files against bundled registry and adapter output;
- clean artifacts produce `shadow_parity_passed`;
- changed rows persist a `hold` report and exit non-zero;
- the comparator is not imported by startup or production app flows.

## Phase 3P Update

The local course-pack manifest wrapper exists:

- `scripts/plan_content_course_pack_manifest_wrap.ts` writes a valid local
  `CoursePackManifest`;
- it writes `activation-guard.json` with `activationApproved=false`,
  `remoteLoadingEnabled=false`, `runtimeConnected=false` and
  `serverStaged=false`;
- it requires `shadow_parity_passed` before writing;
- the wrapper is not imported by startup or production app flows.

## Phase 3Q Update

The local release-bundle verifier exists:

- `scripts/plan_content_release_bundle_verify.ts` validates manifest, guard,
  index, day rows and parity report together;
- it emits a local readiness report under `.codex-tmp/plan-content/`;
- clean bundles produce `PASS` while `activationApproved=false`;
- unsafe guard flags produce `HOLD` and non-zero exit;
- the verifier is not imported by startup or production app flows.

## Phase 3R Update

Runtime ignore guards exist:

- `tests/plan_content_local_artifact_runtime_ignore.test.ts` proves local
  `.codex-tmp/plan-content/` artifacts do not affect runtime readiness;
- embedded `plan_content` entries remain bundled-only,
  `activationApproved=false` and manifest-free;
- `plan_content` still resolves to bundled compatibility while remote loading is
  disabled.

## Phase 3S Update

The local server-staging dry-run descriptor exists:

- `scripts/plan_content_server_staging_descriptor.ts` maps verified local
  release-bundle artifacts to future server/staging object paths;
- descriptor generation requires manifest, activation guard, readiness report
  and index evidence;
- clean evidence produces `READY_FOR_STAGING_REVIEW` while keeping
  `activationApproved=false`, `runtimeManifestRegistered=false`,
  `networkCalls=false` and `localOnly=true`;
- HOLD readiness evidence fails closed with a persisted descriptor and non-zero
  exit;
- the descriptor is local evidence only and is not imported by startup,
  onboarding, personal-plan UI or production runtime.

## Phase 3T Update

The local server-staging approval review exists:

- `scripts/plan_content_server_staging_approval_review.ts` reads the local
  descriptor and emits a local approval-review packet;
- clean descriptor evidence produces `AWAITING_EXPLICIT_APPROVAL` while keeping
  `approvedForServerWrite=false`, `serverWritePermitted=false`,
  `stagingWriterAllowed=false`, `runtimeManifestRegistered=false`,
  `networkCalls=false` and `localOnly=true`;
- HOLD descriptor evidence fails closed with a persisted `HOLD` review and
  non-zero exit;
- the approval review is local evidence only and is not imported by startup,
  onboarding, personal-plan UI or production runtime.

## Phase 3U-A Update

The local server-staging writer dry-run exists:

- `scripts/plan_content_server_staging_writer.ts` reads the local descriptor
  plus approval-review packet and emits a local would-write plan;
- clean evidence produces `DRY_RUN_READY` while keeping
  `actualServerWrites=false`, `serverWritePermitted=false`,
  `runtimeManifestRegistered=false`, `networkCalls=false` and `localOnly=true`;
- `--apply` is rejected with a persisted `HOLD` plan;
- local file hashes and byte sizes are rechecked before the plan is accepted;
- the dry-run writer is local evidence only and is not imported by startup,
  onboarding, personal-plan UI or production runtime.

## Phase 3U-B Update

The local server-staging apply preflight exists:

- `scripts/plan_content_server_staging_apply_preflight.ts` reads the dry-run
  writer plan plus an explicit real-apply approval file and emits a local
  preflight report;
- missing approval produces `HOLD`;
- valid staging/shadow approval produces `APPLY_PREFLIGHT_READY` while keeping
  `serverWritePermitted=false`, `actualServerWrites=false`,
  `activationApproved=false`, `runtimeManifestRegistered=false`,
  `networkCalls=false` and `localOnly=true`;
- unsafe approval flags fail closed;
- the apply preflight is local evidence only and is not imported by startup,
  onboarding, personal-plan UI or production runtime.

## Phase 3U-C Update

The apply-capable staging writer exists as code-only/default-dry-run tooling:

- `scripts/plan_content_server_staging_apply.ts` reads the apply-preflight
  report, dry-run writer plan and real-apply approval file;
- default mode writes a dry-run apply report with `serverWritePermitted=false`,
  `actualServerWrites=false`, `activationApproved=false`,
  `runtimeManifestRegistered=false`, `remoteLoadingEnabled=false`,
  `bundledContentRemoved=false`, `storageMigrationRan=false` and
  `productionActivationApproved=false`;
- `--apply` is blocked before network unless staging/shadow env gates and an
  access token are present;
- the apply writer is CLI tooling only and is not imported by startup,
  onboarding, personal-plan UI or production runtime.

## Phase 3U-D Update

The first staging/shadow upload exists:

- pack id `en.ru.plan_content.staging.shadow.20260627.1` was uploaded under
  `course-packs/plan_content/en/ru/staging.shadow.20260627.1/`;
- apply status was `APPLY_COMPLETE` with `551` uploaded operations;
- remote verification passed with expected `551`, found `551`, missing `0`,
  size mismatches `0`, sha256 checked `551` and sha256 mismatches `0`;
- this upload is not imported by startup, onboarding, personal-plan UI or
  production runtime;
- no runtime manifest was registered and remote loading remains disabled.

## Phase 3V Update

The reusable remote shadow verifier exists:

- `scripts/plan_content_server_staging_remote_verify.ts` reads a completed
  apply report and verifies Firebase Storage/GCS objects under the staging
  prefix;
- `tests/plan_content_server_staging_remote_verify_command.test.ts` covers PASS,
  missing-token HOLD, output path restrictions and startup/runtime
  disconnection;
- real report:
  `.codex-tmp/plan-content/staging-upload-20260627/server-staging-remote-verify.json`;
- real result: `PASS`, expected `551`, found `551`, hash checked `551`;
- the verifier is not imported by startup, onboarding, personal-plan UI or
  production runtime.

## Phase 3W Update

The server-shadow dual-read comparator exists:

- `scripts/plan_content_server_shadow_dual_read_compare.ts` reads the reusable
  remote verification report and downloads remote `index.json` plus comparable
  day rows from the staging prefix;
- it compares remote server-shadow content against bundled compatibility and the
  existing plan-content runtime adapters;
- `tests/plan_content_server_shadow_dual_read_compare_command.test.ts` covers
  PASS, missing-token HOLD, output path restrictions and startup/runtime
  disconnection;
- real report:
  `.codex-tmp/plan-content/staging-upload-20260627/server-shadow-dual-read-report.json`;
- real result: `PASS`, remote expected `551`, remote found `551`, remote hash
  checked `551`, server shadow rows read `546`, compared bundled days `546`,
  verdict `shadow_parity_passed`;
- the comparator is not imported by startup, onboarding, personal-plan UI or
  production runtime.

## Phase 3X Update

The disabled loader/cache/offline/rollback contract exists:

- `app/course_pack_runtime_policy.ts` defines remote/cache/offline/rollback
  decisions while `COURSE_PACK_REMOTE_LOADING_ENABLED=false`;
- `tests/course_pack_runtime_policy_contract.test.ts` proves manifest fetch,
  pack download, cache read/write/repair, storage migration, runtime manifest
  registration, bundled-content removal and production activation all remain
  disabled;
- only current bundled compatibility fallback can provide content;
- future `downloading`, `ready`, `corrupt` and `stale` states fail closed and
  are not trusted as runtime content sources.

## Phase 3Y Update

The disabled manifest registry/cache preflight exists:

- `app/course_pack_manifest_registry_preflight.ts` evaluates future manifest
  registry/cache metadata as evidence only;
- `scripts/plan_content_disabled_manifest_registry_preflight.ts` writes the
  real staging preflight report from manifest, remote verify and server-shadow
  dual-read evidence;
- real report:
  `.codex-tmp/plan-content/staging-upload-20260627/disabled-manifest-registry-preflight.json`;
- real result: `PASS` while registry entry, runtime manifest registration,
  manifest fetch, pack download and cache read/write remain disabled.

## Phase 3Z Update

The disabled runtime manifest candidate gate exists:

- `app/course_pack_runtime_manifest_candidate.ts` evaluates the complete
  evidence bundle for a future runtime manifest candidate;
- `scripts/plan_content_disabled_runtime_manifest_candidate.ts` writes the real
  staging candidate report;
- real report:
  `.codex-tmp/plan-content/staging-upload-20260627/disabled-runtime-manifest-candidate.json`;
- real result: `PASS`, `evidenceBundleComplete=true`,
  `runtimeManifestRegistrable=false`, `runtimeLookupAllowed=false`,
  `cacheLookupAllowed=false`, `cacheReadAllowed=false`,
  `cacheWriteAllowed=false`.

## Phase 4A Update

The activation-readiness blocker report exists:

- `app/course_pack_activation_readiness.ts` evaluates completed shadow evidence
  and missing activation gates as a single disabled matrix;
- `scripts/plan_content_activation_readiness_blocker_report.ts` writes the real
  report under `.codex-tmp/plan-content/`;
- real report:
  `.codex-tmp/plan-content/staging-upload-20260627/activation-readiness-blocker-report.json`;
- real result: `HOLD`, completed gates `8`, blocked gates `6`, evidence
  blockers `0`, startup no-fetch guard `PASS`;
- the report is evidence-only and is not imported by startup, onboarding,
  personal-plan UI or production runtime.

## Phase 4B Update

The disabled offline cache integrity report exists:

- `app/course_pack_offline_cache_integrity.ts` evaluates staged pack cache
  identity while keeping runtime cache use disabled;
- `scripts/plan_content_disabled_offline_cache_integrity.ts` writes the real
  report under `.codex-tmp/plan-content/`;
- real report:
  `.codex-tmp/plan-content/staging-upload-20260627/disabled-offline-cache-integrity.json`;
- real result: `PASS`, expected objects `551`, found objects `551`, hash
  checked `551`, evidence blockers `0`, blockers `0`,
  `offlineCacheUsableByRuntime=false`;
- the activation-readiness report was refreshed and is now `HOLD` with completed
  gates `9`, blocked gates `5`, evidence blockers `0`;
- the report is evidence-only and is not imported by startup, onboarding,
  personal-plan UI or production runtime.

## Phase 4C Update

The disabled rollback kill-switch report exists:

- `app/course_pack_rollback_kill_switch.ts` evaluates rollback evidence while
  keeping runtime rollback disabled and report-only;
- `scripts/plan_content_disabled_rollback_kill_switch.ts` writes the real
  report under `.codex-tmp/plan-content/`;
- real report:
  `.codex-tmp/plan-content/staging-upload-20260627/disabled-rollback-kill-switch.json`;
- real result: `PASS`, `rollbackMode='bundled_compatibility'`,
  `rollbackDeletesUserProgress=false`, `rollbackMutatesStorageOrCloud=false`,
  evidence blockers `0`, blockers `0`;
- the activation-readiness report was refreshed and is now `HOLD` with completed
  gates `10`, blocked gates `4`, evidence blockers `0`;
- the report is evidence-only and is not imported by startup, onboarding,
  personal-plan UI or production runtime.

## Phase 4D Update

The disabled storage/cloud isolation report exists:

- `app/course_pack_storage_cloud_isolation.ts` evaluates staged pack evidence
  while storage migration, cloud restore rewrite, target/source mutation,
  runtime manifest registration, remote loading and cache read/write remain
  disabled;
- `scripts/plan_content_disabled_storage_cloud_isolation.ts` writes the real
  report under `.codex-tmp/plan-content/`;
- real report:
  `.codex-tmp/plan-content/staging-upload-20260627/disabled-storage-cloud-isolation.json`;
- real result: `PASS`, legacy flat cloud target `en`,
  `appLanguageMutatesStudyTarget=false`,
  `personalPracticeSourceScopesSeparate=true`,
  `lessonListeningProgressTargetAware=true`, evidence blockers `0`, blockers
  `0`;
- the activation-readiness report was refreshed and is now `HOLD` with completed
  gates `11`, blocked gates `3`, evidence blockers `0`;
- the report is evidence-only and is not imported by startup, onboarding,
  personal-plan UI or production runtime.

## Phase 4E Update

The disabled reviewer/locale intake report exists:

- `app/course_pack_reviewer_locale_intake.ts` separates explicit reviewer/locale
  evidence from shadow parity metadata;
- `scripts/plan_content_disabled_reviewer_locale_intake.ts` writes the real
  report under `.codex-tmp/plan-content/`;
- real report:
  `.codex-tmp/plan-content/staging-upload-20260627/disabled-reviewer-locale-intake.json`;
- real result: `HOLD`, `safetyStatus='PASS'`, `approvalStatus='HOLD'`,
  reviewer approved rows `0/546`, locale passed rows `0/546`, missing reviewer
  queue `546`, missing locale queue `546`, evidence blockers `0`;
- the activation-readiness report remained `HOLD` with completed gates `11`,
  blocked gates `3`, evidence blockers `0`;
- the report is evidence-only and is not imported by startup, onboarding,
  personal-plan UI or production runtime.

## Phase 4F Update

The explicit reviewer/locale approval packet exists:

- `app/course_pack_reviewer_locale_approval_packet.ts` builds the packet and
  validates separately supplied filled approval artifacts;
- `scripts/plan_content_reviewer_locale_approval_packet.ts` writes the real
  packet under `.codex-tmp/plan-content/`;
- real report:
  `.codex-tmp/plan-content/staging-upload-20260627/reviewer-locale-approval-packet.json`;
- real result: `PASS`, packet status `READY_FOR_REVIEW`, queued rows `546`,
  reviewer approved rows `0/546`, locale passed rows `0/546`, filled artifact
  validation `missing`, activation approval complete `false`, blockers `0`;
- the packet is evidence-only and is not imported by startup, onboarding,
  personal-plan UI or production runtime.

## Phase 4G Update

The explicit approval artifact intake dry-run exists:

- `scripts/plan_content_reviewer_locale_approval_intake_dry_run.ts` validates an
  optional external filled approval artifact against the Phase 4F packet before
  re-running disabled reviewer/locale intake;
- real report:
  `.codex-tmp/plan-content/staging-upload-20260627/reviewer-locale-approval-intake-dry-run.json`;
- real result: `HOLD`, dry-run status `MISSING_FILLED_ARTIFACT`, reviewer
  approved rows `0/546`, locale passed rows `0/546`, blockers `1`;
- the dry-run is evidence-only and is not imported by startup, onboarding,
  personal-plan UI or production runtime.

## Phase 4H Update

The reviewer/locale decision work-order batches exist:

- `scripts/plan_content_reviewer_locale_work_order_batches.ts` splits the
  queued packet rows into deterministic unfilled review batches;
- real report:
  `.codex-tmp/plan-content/staging-upload-20260627/reviewer-locale-decision-work-order-batches.json`;
- real result: `PASS`, work-order status `READY_FOR_REVIEW`, rows `546`,
  batches `22`, reviewer approved rows `0/546`, locale passed rows `0/546`,
  generated filled approval artifact `false`, blockers `0`;
- the work-order is evidence-only and is not imported by startup, onboarding,
  personal-plan UI or production runtime.

## Next Pass

Next safe implementation slice:

```text
Phase 4I - plan-content filled work-order batch validator and approval artifact candidate
```

Scope:

- validate externally filled work-order batches against the Phase 4H work-order;
- assemble a candidate filled approval artifact only when all rows are unique,
  explicit and evidence-backed;
- keep missing external filled batches as `HOLD`;
- keep the runtime candidate non-registrable until all activation gates exist;
- keep server copies staging/shadow only with `activationApproved=false`;
- keep local readiness reports evidence-only;
- keep all `plan_content_*` payload files bundled and untouched.

Stop conditions:

- no Firebase/server runtime dependency;
- staging/shadow server copies only with explicit approval and
  `activationApproved=false`;
- no pack download;
- no app cache read/write/repair;
- no storage/cloud mutation;
- no cloud restore rewrite;
- no automatic reviewer approval;
- no automatic locale gate pass;
- no studyTarget/sourceLocale mutation;
- no unknown future target fallback to English;
- no startup/splash dependency;
- no storage/cloud migration;
- no generated content apply.
