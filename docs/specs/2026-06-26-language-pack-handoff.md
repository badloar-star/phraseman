# Language Pack Retrofit Handoff

Date: 2026-06-26
Status: continuation anchor

Use this file when continuing the language-pack/bootstrap work from another
Codex session, another PC, or another AI.

## Mandatory Continuation Rule

Every continuation pass must do more verified work than the previous pass within
the approved scope. "More" means more audited surfaces, more mapped tails, more
closed blockers, more focused checks/tests, more evidence, or a clearer
activation/unblock plan. It does not mean wider unsafe edits.

At the end of every pass, update the handoff or final report with:

- what was completed;
- what was verified and by which command/check;
- what remains blocked;
- the exact `Next Pass Plan`;
- files or artifacts the next session must read first;
- stop conditions that prevent unsafe generation/apply.

If a pass is blocked, it must add blocker evidence and the smallest-safe unblock
step instead of repeating the same conclusion.

## Current Implementation Status

P0 bootstrap locale is implemented:

- `constants/i18n.ts` has a synchronous device-locale resolver;
- `components/LangContext.tsx` starts from the device bootstrap locale;
- `components/onboarding.tsx` accepts the app shell `initialLang`;
- `app/_layout.tsx` passes the current app language into onboarding;
- `nativeSplashCanHide` is not tied to language hydration, pack readiness,
  manifest readiness, download state, network state or cache hydration.

P1 course-pack runtime contract is implemented as a non-activating skeleton:

- `app/course_pack_manifest.ts` defines `CoursePackManifest`, cache states,
  manifest validation and cache-key construction;
- `app/course_pack_index.ts` defines a tiny embedded availability index for
  existing English/RU/UK bundled compatibility surfaces only;
- `app/course_pack_loader.ts` defines read-only readiness resolution with
  `COURSE_PACK_REMOTE_LOADING_ENABLED=false`;
- no Firebase, network, file-system cache, remote manifest or pack download is
  connected to startup or onboarding.

Phase 3 bundle-extraction preparation has started:

- `docs/specs/2026-06-26-bundle-extraction-prep-inventory.md` records the first
  targeted heavy-content inventory and candidate extraction order;
- `tests/bootstrap_bundle_boundary_contract.test.ts` guards startup/onboarding
  against direct heavy-content imports and course-pack runtime imports;
- startup/onboarding files currently have no direct imports of the known heavy
  families or the course-pack runtime skeleton.

Phase 3A plan-content pilot mapping is complete:

- `docs/specs/2026-06-26-plan-content-pack-pilot-map.md` maps the
  `plan_content_*` import seam, app callsites, adapter callsites, proposed
  `surface='plan_content'` manifest shape and loader states;
- `tests/plan_content_pack_boundary_contract.test.ts` guards that the five large
  `plan_content_*` modules are imported only by `app/plan_content_registry.ts`;
- registry callsites are explicitly allowlisted while pack loading is inactive;
- adapter callsites are explicitly allowlisted;
- `surface='plan_content'` resolves as bundled compatibility, not remote-ready.

Phase 3B plan-content synchronous readiness facade is complete:

- `app/plan_content_readiness.ts` wraps current registry access with explicit
  `ready/offline_fallback/missing` metadata;
- the facade is still synchronous and backed by bundled compatibility;
- existing personal-plan screens were not switched yet, so visible behavior is
  unchanged;
- `tests/plan_content_readiness.test.ts` covers selection-required, authored
  day ready, missing day and narrow ready-day helper behavior.

Phase 3C first callsite facade migration is complete:

- `app/plan_content_readiness.ts` now exposes
  `hasBundledCompatibilityPlanContentDay(planId, dayIndex)` as a transitional
  synchronous bridge;
- `app/personal_plan_task_done.tsx` uses that bridge for the report-button-only
  authored-content check;
- the five large `plan_content_*` payloads remain untouched and bundled;
- no UI loading state, async behavior, server, Firebase, download or cache write
  was added;
- tests prove the bridge stays in parity with current registry existence and
  that facade consumers are explicitly allowlisted.

Phase 3D additional report-button facade migration is complete:

- `app/personal_plan_exercise.tsx` now uses
  `hasBundledCompatibilityPlanContentDay(planId, dayIndex)` for the
  report-button-only authored-content check;
- `app/personal_plan.tsx` now uses the same bridge for its report button, while
  keeping `authoredPlanIntroCount` on the registry because that path affects
  theory navigation;
- `app/personal_plan_phrase_lessons.ts` and `app/personal_plan_theory.tsx` still
  use `getAuthoredPlanContentDay` directly because they load content-bearing
  data and need explicit UI/loading/fallback states before migration;
- no payload movement, async loading, server, Firebase, downloads, cache writes
  or storage/cloud changes were introduced.

Phase 3E plan-content UI state contract is complete:

- `app/plan_content_readiness.ts` now exposes
  `resolvePlanContentUiState(readiness, surface)` for `report_marker`,
  `theory_entry`, `theory_screen` and `phrase_lesson`;
- authored days resolve to surface-specific render/report/theory-entry states;
- missing bundled-compatibility phrase days may use the legacy template fallback;
- `downloading`, `corrupt`, `stale` and selection-required states do not silently
  fall back to templates and can block progress credit for unsafe content-bearing
  states;
- `docs/specs/2026-06-26-plan-content-ui-state-contract.md` records the contract;
- visible personal-plan behavior is unchanged;
- no payload movement, async loading, server, Firebase, downloads, cache writes
  or storage/cloud changes were introduced.

Phase 3F theory-entry facade migration is complete:

- `app/plan_content_readiness.ts` now exposes
  `hasBundledCompatibilityPlanContentTheoryEntry(planId, dayIndex)`;
- the helper preserves the old `authoredPlanIntroCount(...) > 0` behavior by
  requiring authored intro screens, not merely authored day existence;
- `resolvePlanContentUiState(...)` now treats only `ready` and
  `offline_fallback` as renderable authored states, so future `downloading`,
  `corrupt` and `stale` states cannot expose authored UI by accident;
- `app/personal_plan.tsx` no longer imports `plan_content_registry` for the
  theory-entry decision and uses the readiness helper instead;
- `tests/plan_content_pack_boundary_contract.test.ts` now detects multiline
  imports, so boundary checks cannot miss a facade consumer hidden in a wrapped
  import statement;
- `personal_plan_theory.tsx` and `personal_plan_phrase_lessons.ts` still use
  direct registry access and remain the next content-bearing migration targets;
- no payload movement, async loading, server, Firebase, downloads, cache writes
  or storage/cloud changes were introduced.

Phase 3G theory-screen facade migration is complete:

- `app/plan_content_readiness.ts` now exposes
  `getBundledCompatibilityPlanContentTheoryDay(planId, dayIndex)`;
- `app/personal_plan_theory.tsx` uses that helper instead of importing
  `getAuthoredPlanContentDay` directly from `plan_content_registry`;
- the helper returns a day only when authored intro screens exist and the
  readiness/UI state allows authored theory content to render;
- the existing `contentDayToLessonIntroScreens` adapter seam remains unchanged;
- missing theory still produces the existing empty-state behavior;
- `tests/plan_content_pack_boundary_contract.test.ts` now keeps
  `personal_plan_theory.tsx` out of the direct registry allowlist and inside the
  readiness facade allowlist;
- `personal_plan_phrase_lessons.ts` is now the remaining direct content-bearing
  registry consumer for this pilot surface;
- no payload movement, async loading, server, Firebase, downloads, cache writes
  or storage/cloud changes were introduced.

Phase 3H phrase-lesson facade migration is complete:

- `app/plan_content_readiness.ts` now exposes
  `resolvePlanContentPhraseLesson(readiness)` and
  `resolveBundledCompatibilityPlanContentPhraseLesson(planId, dayIndex)`;
- phrase lesson content resolves as `authored_day`, `template_fallback` or
  `blocked`;
- `app/personal_plan_phrase_lessons.ts` uses the readiness helper instead of
  importing `getAuthoredPlanContentDay` directly from `plan_content_registry`;
- current bundled-compatibility behavior is preserved: authored days use
  `contentDayToLessonPhrases`, and missing bundled days may still use the legacy
  template fallback;
- unsafe future states such as `downloading`, `corrupt` and `stale` resolve as
  `blocked` and do not silently use templates;
- `tests/plan_content_pack_boundary_contract.test.ts` now has no app callsites in
  the direct registry allowlist beyond the readiness facade itself;
- no payload movement, async loading, server, Firebase, downloads, cache writes
  or storage/cloud changes were introduced.

Phase 3I plan-content extraction and dual-read activation plan is complete:

- `docs/specs/2026-06-26-plan-content-extraction-dual-read-plan.md` defines the
  future `plan_content` pack shape, entry index, row metadata, dual-read parity
  checks, activation gates, rollback rules and midway release invariant;
- `tests/course_pack_runtime_contract.test.ts` now has a focused guard proving
  `plan_content` remains bundled-compatibility only, with no manifest-backed
  downloadable runtime entry and `activationApproved=false`;
- server copies remain staging/shadow only until explicit activation work exists;
- no payload movement, async loading, server, Firebase, downloads, cache writes
  or storage/cloud changes were introduced.

Phase 3J plan-content shadow index validators are complete:

- `app/plan_content_pack_index.ts` defines TypeScript-only
  `plan-content-index-v1` and `plan-content-day-v1` types/validators;
- validators fail closed for invalid production `studyTarget`, non-normalized
  `sourceLocale`, unsafe row paths, bad hashes, duplicate plan days, mismatched
  entry dimensions, unknown review statuses and unknown locale-gate statuses;
- activation candidates additionally require `reviewStatus='approved'` and
  `localeGateStatus='passed'`;
- `tests/plan_content_pack_index.test.ts` covers valid shadow indexes, invalid
  metadata, activation-ready requirements and no Firebase/startup/runtime-loader
  coupling;
- no payload movement, async loading, server, Firebase, downloads, cache writes
  or storage/cloud changes were introduced.

Phase 3K plan-content parity report validators are complete:

- `app/plan_content_pack_parity.ts` defines TypeScript-only
  `plan-content-parity-report-v1` types/validators;
- validators fail closed for invalid manifest identity/hash, source snapshot,
  generated timestamp, compared counts, row refs, hash mismatches, adapter
  mismatches, fallback-decision mismatches, reviewer summary totals and unknown
  verdicts;
- `activation_candidate` is rejected when any added shadow row, missing row,
  hash mismatch, adapter mismatch, fallback mismatch, non-approved review status
  or non-passed locale gate exists;
- `shadow_parity_passed` is rejected when blocking parity mismatches exist;
- `tests/plan_content_pack_parity.test.ts` covers clean activation reports,
  mismatch blocking, reviewer/locale summary blocking and no
  Firebase/startup/runtime-loader coupling;
- no payload movement, async loading, server, Firebase, downloads, cache writes
  or storage/cloud changes were introduced.

Phase 3L local dry-run parity reporter is complete:

- `app/plan_content_registry.ts` now exposes
  `listAuthoredPlanContentDays()` for local report tooling;
- `app/plan_content_pack_dry_run.ts` builds a
  `plan-content-parity-report-v1` report from bundled compatibility data only;
- the dry-run reporter checks intro, phrase and vocabulary adapter row counts;
- dry-run reports default to `hold`, may only become `shadow_parity_passed`,
  and never emit `activation_candidate`;
- `tests/plan_content_pack_dry_run.test.ts` proves the generated report
  validates, stays non-activating and is disconnected from startup, network,
  storage and loader runtime;
- `tests/plan_content_pack_boundary_contract.test.ts` explicitly allowlists the
  dry-run reporter as a report-only registry/adapter reader;
- no report file was written, and no payload movement, async loading, server,
  Firebase, downloads, cache writes or storage/cloud changes were introduced.

Phase 3M local dry-run parity report command is complete:

- `scripts/plan_content_dry_run_parity_report.ts` writes a validated local
  `plan-content-parity-report-v1` JSON report;
- output is restricted to the ignored `.codex-tmp/plan-content/` tree;
- the command validates before write, re-reads and validates after write, and
  fails closed on added/missing rows, hash mismatches, adapter mismatches,
  fallback-decision mismatches or accidental `activation_candidate`;
- `tests/plan_content_dry_run_report_command.test.ts` runs the real CLI with
  `npx tsx`, proves the report is valid, proves output outside
  `.codex-tmp/plan-content/` is rejected, and checks startup/network/storage
  disconnection;
- generated report artifacts remain ignored local output only;
- no payload movement, async loading, server, Firebase, downloads, runtime cache
  writes, storage/cloud changes or activation were introduced.

Phase 3N local shadow-pack artifact exporter is complete:

- `scripts/plan_content_shadow_pack_export.ts` exports local shadow
  `plan_content` artifacts only under `.codex-tmp/plan-content/`;
- the exporter writes `index.json` plus per-day row JSON files such as
  `plans/<planId>/day-001.json`;
- rows are metadata-wrapped `plan-content-day-v1` artifacts with
  `studyTarget='en'`, normalized `sourceLocale`, `reviewStatus='shadow'` and
  `localeGateStatus='hold'`;
- content hashes are computed from canonical bundled `PlanContentDay` JSON and
  must match the index entry;
- the exporter validates the generated `plan-content-index-v1`, validates every
  bundled `PlanContentDay`, writes artifacts, re-reads them and validates again;
- `tests/plan_content_shadow_pack_export_command.test.ts` runs the real CLI,
  proves the index and all 546 day rows validate, proves paths outside
  `.codex-tmp/plan-content/` are rejected, and checks startup/network/storage
  disconnection;
- generated artifacts remain ignored local output only;
- no payload movement into runtime, async loading, server, Firebase, downloads,
  runtime cache writes, storage/cloud changes or activation were introduced.

Phase 3O local shadow-pack dual-read parity comparator is complete:

- `scripts/plan_content_shadow_pack_parity_compare.ts` reads exported local
  shadow artifacts from `.codex-tmp/plan-content/`;
- the comparator validates `index.json`, compares every shadow row against the
  bundled `plan_content_registry` data, and compares runtime adapter output for
  intro screens, phrases and vocabulary cards;
- the comparator writes a real `plan-content-parity-report-v1` based on actual
  shadow files, not only dry-run in-memory data;
- clean local artifacts produce `verdict='shadow_parity_passed'`;
- changed shadow rows produce a persisted `hold` report and a non-zero command
  exit, keeping mismatch evidence in ignored local output;
- `tests/plan_content_shadow_pack_parity_compare_command.test.ts` runs the real
  export and compare CLIs, proves clean parity passes, proves changed rows fail
  closed, proves paths outside `.codex-tmp/plan-content/` are rejected, and
  checks startup/network/storage disconnection;
- generated reports remain ignored local output only;
- no payload movement into runtime, async loading, server, Firebase, downloads,
  runtime cache writes, storage/cloud changes or activation were introduced.

Phase 3P local course-pack manifest wrapper is complete:

- `scripts/plan_content_course_pack_manifest_wrap.ts` wraps a clean local
  shadow pack in a valid `CoursePackManifest`;
- the wrapper reads the local shadow pack `index.json`, reads the real parity
  report, requires `verdict='shadow_parity_passed'`, hashes `index.json` plus
  all day rows, and writes `manifest.json`;
- the wrapper also writes `activation-guard.json` with
  `activationApproved=false`, `remoteLoadingEnabled=false`,
  `runtimeConnected=false` and `serverStaged=false`;
- `tests/plan_content_course_pack_manifest_wrap_command.test.ts` runs the real
  export -> compare -> wrap CLI chain, validates the manifest, validates the
  non-activating guard, proves `hold` parity reports are rejected, proves output
  outside `.codex-tmp/plan-content/` is rejected, and checks startup/network
  disconnection;
- generated manifest/guard artifacts remain ignored local output only;
- no payload movement into runtime, async loading, server, Firebase, downloads,
  runtime cache writes, storage/cloud changes or activation were introduced.

Phase 3Q local release-bundle verifier is complete:

- `scripts/plan_content_release_bundle_verify.ts` validates a complete local
  plan-content release-bundle candidate: `manifest.json`,
  `activation-guard.json`, `index.json`, all day rows and the parity report;
- the verifier emits `plan-content-local-release-readiness-v1` under
  `.codex-tmp/plan-content/`;
- clean local bundles produce `status='PASS'` while still recording
  `activationApproved=false`, `runtimeConnected=false` and
  `serverStaged=false`;
- unsafe guard flags produce a persisted `HOLD` report and a non-zero command
  exit;
- `tests/plan_content_release_bundle_verify_command.test.ts` runs the real
  export -> compare -> wrap -> verify CLI chain, proves clean bundles pass,
  proves unsafe guards fail closed with evidence, proves output outside
  `.codex-tmp/plan-content/` is rejected, and checks startup/network
  disconnection;
- generated readiness artifacts remain ignored local output only;
- no payload movement into runtime, async loading, server, Firebase, downloads,
  runtime cache writes, storage/cloud changes or activation were introduced.

Phase 3R runtime ignore guard for local artifacts is complete:

- `tests/plan_content_local_artifact_runtime_ignore.test.ts` creates local dummy
  manifest/readiness artifacts under `.codex-tmp/plan-content/`;
- runtime readiness still resolves `surface='plan_content'` to
  bundled compatibility while `COURSE_PACK_REMOTE_LOADING_ENABLED=false`;
- embedded `plan_content` index entries remain `delivery='bundled_compatibility'`,
  `activationApproved=false` and `manifest===undefined`;
- startup/runtime source is guarded against local plan-content artifact/tool
  identifiers;
- local release-bundle artifacts remain evidence-only and cannot activate
  runtime;
- no payload movement into runtime, async loading, server, Firebase, downloads,
  runtime cache writes, storage/cloud changes or activation were introduced.

Phase 3S server-staging dry-run descriptor is complete:

- `scripts/plan_content_server_staging_descriptor.ts` writes a local descriptor
  that maps verified plan-content bundle artifacts to future server/staging
  object paths;
- the descriptor references only local files under `.codex-tmp/plan-content/`;
- it requires a valid manifest, activation guard, readiness report and index;
- clean bundles produce `status='READY_FOR_STAGING_REVIEW'` while still
  recording `activationApproved=false`, `runtimeManifestRegistered=false`,
  `networkCalls=false` and `localOnly=true`;
- non-PASS readiness evidence produces a persisted `HOLD` descriptor and a
  non-zero command exit;
- `tests/plan_content_server_staging_descriptor_command.test.ts` runs the real
  export -> compare -> wrap -> verify -> descriptor CLI chain, proves clean
  descriptors pass, proves HOLD readiness fails closed, proves output outside
  `.codex-tmp/plan-content/` is rejected, and checks startup/network
  disconnection;
- generated descriptors remain ignored local output only;
- no payload movement into runtime, async loading, server, Firebase, downloads,
  runtime cache writes, storage/cloud changes or activation were introduced.

Phase 3T server-staging approval review gate is complete:

- `scripts/plan_content_server_staging_approval_review.ts` reads the local
  server-staging descriptor and writes an approval-review packet;
- clean descriptor evidence produces `status='AWAITING_EXPLICIT_APPROVAL'`
  while still recording `activationApproved=false`,
  `approvedForServerWrite=false`, `serverWritePermitted=false`,
  `stagingWriterAllowed=false`, `runtimeManifestRegistered=false`,
  `networkCalls=false` and `localOnly=true`;
- HOLD descriptor evidence produces a persisted `HOLD` review and a non-zero
  command exit;
- `tests/plan_content_server_staging_approval_review_command.test.ts` runs the
  real export -> compare -> wrap -> verify -> descriptor -> approval-review CLI
  chain, proves clean reviews wait for explicit approval, proves HOLD descriptor
  evidence fails closed, proves output outside `.codex-tmp/plan-content/` is
  rejected, and checks startup/network disconnection;
- generated approval-review packets remain ignored local output only;
- no server write, payload movement into runtime, async loading, Firebase,
  downloads, runtime cache writes, storage/cloud changes or activation were
  introduced.

Phase 3U-A server-staging writer dry-run gate is complete:

- `scripts/plan_content_server_staging_writer.ts` reads the local
  server-staging descriptor plus approval-review packet and writes a dry-run
  staging writer plan;
- clean evidence produces `status='DRY_RUN_READY'` with
  `mode='dry_run'`, `activationApproved=false`,
  `approvedForServerWrite=false`, `serverWritePermitted=false`,
  `actualServerWrites=false`, `runtimeManifestRegistered=false`,
  `networkCalls=false` and `localOnly=true`;
- `--apply` is explicitly rejected, persists a `HOLD` plan, and keeps
  `actualServerWrites=false`;
- local file hashes and byte sizes are rechecked against descriptor evidence, so
  any mutation after descriptor generation fails closed;
- `tests/plan_content_server_staging_writer_command.test.ts` runs the real
  export -> compare -> wrap -> verify -> descriptor -> approval-review ->
  dry-run writer CLI chain, proves the would-write plan is non-activating,
  proves `--apply` is blocked, proves changed local files fail closed, proves
  output outside `.codex-tmp/plan-content/` is rejected, and checks
  startup/network disconnection;
- generated writer plans remain ignored local output only;
- no server write, payload movement into runtime, async loading, Firebase,
  downloads, runtime cache writes, storage/cloud changes or activation were
  introduced.

Phase 3U-B server-staging apply preflight gate is complete:

- `scripts/plan_content_server_staging_apply_preflight.ts` reads the dry-run
  writer plan plus an explicit real-apply approval file and writes a local
  preflight report;
- missing approval file produces a persisted `HOLD` report and a non-zero
  command exit;
- clean staging/shadow approval produces `status='APPLY_PREFLIGHT_READY'` with
  `mode='preflight_only'`, `realApplyApprovalAccepted=true`,
  `applyImplementationAllowed=true`, `serverWritePermitted=false`,
  `actualServerWrites=false`, `activationApproved=false`,
  `runtimeManifestRegistered=false`, `networkCalls=false` and `localOnly=true`;
- unsafe approval flags such as production environment, runtime manifest
  registration, remote loading, bundled-content removal, storage migration or
  production activation fail closed;
- local file hashes and byte sizes are rechecked again against writer-plan
  evidence, so any mutation after writer-plan generation fails closed;
- `tests/plan_content_server_staging_apply_preflight_command.test.ts` runs the
  real export -> compare -> wrap -> verify -> descriptor -> approval-review ->
  dry-run writer -> apply-preflight CLI chain, proves missing approval is HOLD,
  proves valid staging/shadow approval is preflight-only, proves unsafe approval
  fails closed, proves changed local files fail closed, proves output outside
  `.codex-tmp/plan-content/` is rejected, and checks startup/network
  disconnection;
- generated apply-preflight reports remain ignored local output only;
- no server write, payload movement into runtime, async loading, Firebase,
  downloads, runtime cache writes, storage/cloud changes or activation were
  introduced.

Phase 3U-C apply-capable staging writer is complete as code-only/default-dry-run:

- `scripts/plan_content_server_staging_apply.ts` reads the apply-preflight
  report, dry-run writer plan and real-apply approval file;
- default mode produces `status='DRY_RUN_READY'` with
  `serverWritePermitted=false`, `actualServerWrites=false`,
  `activationApproved=false`, `runtimeManifestRegistered=false`,
  `remoteLoadingEnabled=false`, `bundledContentRemoved=false`,
  `storageMigrationRan=false` and `productionActivationApproved=false`;
- `--apply` is blocked before network unless
  `PHRASEMAN_PLAN_CONTENT_STAGING_APPLY=staging_shadow_only`,
  `PHRASEMAN_PLAN_CONTENT_STAGING_BUCKET` and
  `PHRASEMAN_PLAN_CONTENT_STAGING_ACCESS_TOKEN` are all present;
- apply reports are still written only under `.codex-tmp/plan-content/`;
- local files are re-hashed again before dry-run/apply status is accepted;
- `tests/plan_content_server_staging_apply_command.test.ts` runs the real
  export -> compare -> wrap -> verify -> descriptor -> approval-review ->
  dry-run writer -> apply-preflight -> apply CLI chain, proves default dry-run,
  proves `--apply` without env is blocked before server writes, proves changed
  local files fail closed, proves output outside `.codex-tmp/plan-content/` is
  rejected, and checks startup/runtime disconnection;
- no real `--apply` upload was executed in this pass;
- no payload movement into runtime, Firebase write, downloads, runtime cache
  writes, storage/cloud migrations, bundled-content removal or activation were
  introduced.

Phase 3U-D first real staging/shadow upload is complete:

- a staging-marked plan-content pack was built with
  `contentVersion='staging.shadow.20260627.1'`;
- pack id: `en.ru.plan_content.staging.shadow.20260627.1`;
- local run directory:
  `.codex-tmp/plan-content/staging-upload-20260627/`;
- real `--apply` was run only after local export, parity, manifest, readiness,
  descriptor, approval-review, writer and apply-preflight gates passed;
- env gates used for the apply run:
  `PHRASEMAN_PLAN_CONTENT_STAGING_APPLY=staging_shadow_only`,
  `PHRASEMAN_PLAN_CONTENT_STAGING_BUCKET=phraseman-ea0b3.firebasestorage.app`
  and a short-lived access token minted by `scripts/_mint_fb_token.mjs`;
- apply report:
  `.codex-tmp/plan-content/staging-upload-20260627/server-staging-apply-report.json`;
- apply status: `APPLY_COMPLETE`;
- actual server writes: `true`;
- uploaded operations: `551`;
- staging prefix:
  `course-packs/plan_content/en/ru/staging.shadow.20260627.1/`;
- remote verification after upload passed: expected `551` objects, found `551`,
  missing `0`, size mismatches `0`, sha256 checked `551`, sha256 mismatches
  `0`;
- the PowerShell UTF-8 BOM edge case found during the first apply attempt is now
  handled by the apply-preflight and apply scripts, and covered by tests;
- no runtime manifest registration, remote loading, bundled-content removal,
  storage/cloud migration, download path, app startup dependency or production
  activation was introduced.

Phase 3V reusable remote shadow verification gate is complete:

- `scripts/plan_content_server_staging_remote_verify.ts` verifies a completed
  apply report against Firebase Storage/GCS objects;
- `tests/plan_content_server_staging_remote_verify_command.test.ts` covers PASS,
  missing-token HOLD, output path restrictions and startup/runtime
  disconnection;
- the verifier requires a successful `APPLY_COMPLETE` report with
  `activationApproved=false`, `runtimeManifestRegistered=false`,
  `remoteLoadingEnabled=false`, `bundledContentRemoved=false`,
  `storageMigrationRan=false` and `productionActivationApproved=false`;
- it lists the staging prefix, compares object count and byte sizes, downloads
  every expected object with bounded concurrency and checks every sha256;
- real reusable verification report:
  `.codex-tmp/plan-content/staging-upload-20260627/server-staging-remote-verify.json`;
- real reusable verification result: `PASS`, expected `551`, found `551`,
  hash checked `551`;
- no runtime manifest registration, remote loading, bundled-content removal,
  storage/cloud migration, download path, app startup dependency or production
  activation was introduced.

Phase 3W server-shadow dual-read comparator gate is complete:

- `scripts/plan_content_server_shadow_dual_read_compare.ts` reads the reusable
  remote verification report, downloads the remote `index.json` and every
  comparable remote day row from the staging prefix, and compares server shadow
  content against bundled compatibility;
- `tests/plan_content_server_shadow_dual_read_compare_command.test.ts` covers
  PASS, missing-token HOLD, output path restrictions and startup/runtime
  disconnection;
- the comparator validates the remote verification report first, requires all
  activation/runtime/removal/migration flags to remain false, and writes only
  under `.codex-tmp/plan-content/`;
- real server-shadow dual-read report:
  `.codex-tmp/plan-content/staging-upload-20260627/server-shadow-dual-read-report.json`;
- real result: `PASS`, remote expected `551`, remote found `551`, remote hash
  checked `551`, remote index entries `546`, server shadow rows read `546`,
  compared bundled days `546`, verdict `shadow_parity_passed`;
- hash mismatches `0`, adapter mismatches `0`, artifact mismatches `0`,
  blockers `0`;
- no runtime manifest registration, remote loading, bundled-content removal,
  storage/cloud migration, download path, app startup dependency or production
  activation was introduced.

Phase 3X disabled loader/cache/offline/rollback contract is complete:

- `app/course_pack_runtime_policy.ts` defines the disabled runtime contract for
  future course-pack remote loading, cache usage, offline fallback and rollback;
- `tests/course_pack_runtime_policy_contract.test.ts` proves every
  remote/cache/activation capability remains disabled;
- the only content-providing source while the contract is disabled is the
  existing `offline_fallback` + `bundled_compatibility` path;
- selection-required, missing, future `downloading`, future `ready`, `corrupt`
  and `stale` states all fail closed without manifest fetch, pack download,
  cache read, cache write, cache repair, storage migration, runtime manifest
  registration, bundled-content removal or production activation;
- the contract is not imported by startup, onboarding, LangContext or production
  runtime screens;
- no runtime manifest registration, remote loading, bundled-content removal,
  storage/cloud migration, download path, app startup dependency or production
  activation was introduced.

Phase 3Y disabled manifest registry/cache preflight is complete:

- `app/course_pack_manifest_registry_preflight.ts` evaluates future manifest
  registry/cache metadata while `COURSE_PACK_REMOTE_LOADING_ENABLED=false`;
- `tests/course_pack_manifest_registry_preflight.test.ts` proves safe shadow
  metadata can pass only as evidence, while cache/runtime/download/activation
  permissions remain false;
- `scripts/plan_content_disabled_manifest_registry_preflight.ts` writes a local
  disabled preflight report from the real staging manifest, remote verification
  report and server-shadow dual-read report;
- `tests/plan_content_disabled_manifest_registry_preflight_command.test.ts`
  covers PASS, unsafe evidence HOLD, output path restrictions and
  startup/runtime disconnection;
- real disabled preflight report:
  `.codex-tmp/plan-content/staging-upload-20260627/disabled-manifest-registry-preflight.json`;
- real result: `PASS`, `registryEntryAllowed=false`,
  `cacheMetadataReadableByRuntime=false`,
  `cacheMetadataWritableByRuntime=false`, `manifestFetchApproved=false`,
  `packDownloadApproved=false`, `cacheReadApproved=false`,
  `cacheWriteApproved=false`, blockers `0`;
- no runtime manifest registration, remote loading, cache read/write,
  bundled-content removal, storage/cloud migration, download path, app startup
  dependency or production activation was introduced.

Phase 3Z disabled runtime manifest candidate gate is complete:

- `app/course_pack_runtime_manifest_candidate.ts` evaluates the complete
  evidence bundle for a future runtime manifest candidate while keeping the
  candidate non-registrable;
- `tests/course_pack_runtime_manifest_candidate.test.ts` proves complete
  evidence can pass only when runtime registration, runtime lookup, manifest
  fetch, pack download, cache lookup/read/write/repair, storage migration,
  bundled-content removal and production activation remain false;
- `scripts/plan_content_disabled_runtime_manifest_candidate.ts` writes a local
  disabled candidate report from the real staging manifest, remote verification,
  server-shadow dual-read and disabled manifest preflight reports;
- `tests/plan_content_disabled_runtime_manifest_candidate_command.test.ts`
  covers PASS, unsafe evidence HOLD, output path restrictions and
  startup/runtime disconnection;
- real disabled candidate report:
  `.codex-tmp/plan-content/staging-upload-20260627/disabled-runtime-manifest-candidate.json`;
- real result: `PASS`, `evidenceBundleComplete=true`,
  `runtimeManifestRegistrable=false`, `runtimeManifestRegistered=false`,
  `runtimeLookupAllowed=false`, `cacheLookupAllowed=false`,
  `cacheReadAllowed=false`, `cacheWriteAllowed=false`,
  `startupBlockingAllowed=false`, blockers `0`;
- no runtime manifest registration, remote loading, cache read/write,
  bundled-content removal, storage/cloud migration, download path, app startup
  dependency or production activation was introduced.

Phase 4A activation-readiness blocker report is complete:

- `app/course_pack_activation_readiness.ts` evaluates the completed staging,
  shadow, disabled manifest and disabled runtime evidence as one activation
  readiness matrix;
- `tests/course_pack_activation_readiness.test.ts` proves the current disabled
  state stays non-activating and that activation can pass only when every
  reviewer, locale, offline cache, rollback, storage/cloud and owner approval
  gate is explicitly satisfied;
- `scripts/plan_content_activation_readiness_blocker_report.ts` writes the
  combined blocker report under `.codex-tmp/plan-content/`;
- `tests/plan_content_activation_readiness_blocker_report_command.test.ts`
  covers expected HOLD output, unsafe evidence blockers, output path
  restrictions and startup/runtime disconnection;
- real activation-readiness report:
  `.codex-tmp/plan-content/staging-upload-20260627/activation-readiness-blocker-report.json`;
- real result: `HOLD`, completed gates `8`, blocked gates `6`, evidence
  blockers `0`, startup no-fetch guard `PASS`;
- remaining blockers are reviewer approval `0/546`, locale gates `0/546`,
  offline cache integrity missing, rollback kill-switch missing,
  storage/cloud isolation missing and product-owner activation approval
  missing;
- no runtime manifest registration, remote loading, cache read/write,
  bundled-content removal, storage/cloud migration, download path, app startup
  dependency or production activation was introduced.

Phase 4B disabled offline cache integrity report is complete:

- `app/course_pack_offline_cache_integrity.ts` evaluates staged pack cache
  identity and integrity evidence while keeping all runtime cache permissions
  disabled;
- `tests/course_pack_offline_cache_integrity.test.ts` proves cache evidence can
  pass only with manifest-derived cache key, clean object count/hash evidence
  and disabled cache lookup/read/write/repair;
- `scripts/plan_content_disabled_offline_cache_integrity.ts` writes the real
  disabled offline cache integrity report under `.codex-tmp/plan-content/`;
- `tests/plan_content_disabled_offline_cache_integrity_command.test.ts` covers
  PASS, unsafe evidence HOLD, output path restrictions and startup/runtime
  disconnection;
- `scripts/plan_content_activation_readiness_blocker_report.ts` now accepts an
  optional `--disabled-offline-cache-integrity` report and clears only the
  offline-cache activation blocker when that evidence is clean;
- real disabled offline cache integrity report:
  `.codex-tmp/plan-content/staging-upload-20260627/disabled-offline-cache-integrity.json`;
- real result: `PASS`, expected objects `551`, found objects `551`, hash checked
  `551`, evidence blockers `0`, blockers `0`, `offlineCacheUsableByRuntime=false`;
- the real activation-readiness report was refreshed with this evidence and is
  now `HOLD` with completed gates `9`, blocked gates `5`, evidence blockers
  `0`, startup no-fetch guard `PASS`;
- remaining blockers are reviewer approval `0/546`, locale gates `0/546`,
  rollback kill-switch missing, storage/cloud isolation missing and
  product-owner activation approval missing;
- no runtime manifest registration, remote loading, cache lookup/read/write,
  cache repair, bundled-content removal, storage/cloud migration, download path,
  app startup dependency or production activation was introduced.

Phase 4C disabled rollback kill-switch report is complete:

- `app/course_pack_rollback_kill_switch.ts` evaluates rollback evidence while
  keeping rollback report-only and disabled;
- `tests/course_pack_rollback_kill_switch.test.ts` proves rollback can pass only
  when it forces bundled compatibility, requires no app update, deletes no user
  progress, mutates no storage/cloud state, downloads no pack and reads/writes
  no cache;
- `scripts/plan_content_disabled_rollback_kill_switch.ts` writes the real
  disabled rollback kill-switch report under `.codex-tmp/plan-content/`;
- `tests/plan_content_disabled_rollback_kill_switch_command.test.ts` covers
  PASS, unsafe evidence HOLD, output path restrictions and startup/runtime
  disconnection;
- `scripts/plan_content_activation_readiness_blocker_report.ts` now accepts an
  optional `--disabled-rollback-kill-switch` report and clears only the rollback
  activation blocker when that evidence is clean;
- real disabled rollback kill-switch report:
  `.codex-tmp/plan-content/staging-upload-20260627/disabled-rollback-kill-switch.json`;
- real result: `PASS`, `rollbackMode='bundled_compatibility'`,
  `rollbackDeletesUserProgress=false`, `rollbackMutatesStorageOrCloud=false`,
  evidence blockers `0`, blockers `0`;
- the real activation-readiness report was refreshed with this evidence and is
  now `HOLD` with completed gates `10`, blocked gates `4`, evidence blockers
  `0`, startup no-fetch guard `PASS`;
- remaining blockers are reviewer approval `0/546`, locale gates `0/546`,
  storage/cloud isolation missing and product-owner activation approval missing;
- no runtime manifest registration, remote loading, cache lookup/read/write,
  cache repair, bundled-content removal, storage/cloud migration, rollback
  production flag, download path, app startup dependency or production
  activation was introduced.

Phase 4D disabled storage/cloud isolation report is complete:

- `app/course_pack_storage_cloud_isolation.ts` evaluates storage/cloud evidence
  while keeping restore, migration and target mutation disabled;
- `tests/course_pack_storage_cloud_isolation.test.ts` proves PASS/HOLD behavior
  and no startup, network, storage or file-system side effects;
- `scripts/plan_content_disabled_storage_cloud_isolation.ts` writes the real
  disabled storage/cloud isolation report under `.codex-tmp/plan-content/`;
- `tests/plan_content_disabled_storage_cloud_isolation_command.test.ts` covers
  PASS, unsafe evidence HOLD, output path restrictions and startup/runtime
  disconnection;
- `app/target_storage_keys.ts` now has `lessonListeningProgressKey(...)` and
  raw guard coverage for `lesson*_listening_progress`;
- `app/cloud_sync.ts` now includes scoped French
  `lessonListeningProgressKey(lessonId, 'fr')` entries in
  `FRENCH_TARGET_SYNC_KEYS`;
- `scripts/plan_content_activation_readiness_blocker_report.ts` now accepts an
  optional `--disabled-storage-cloud-isolation` report and clears only the
  storage/cloud blocker when that evidence is clean;
- real disabled storage/cloud isolation report:
  `.codex-tmp/plan-content/staging-upload-20260627/disabled-storage-cloud-isolation.json`;
- real result: `PASS`, legacy flat cloud target `en`,
  `appLanguageMutatesStudyTarget=false`,
  `personalPracticeSourceScopesSeparate=true`,
  `lessonListeningProgressTargetAware=true`, blockers `0`;
- the real activation-readiness report was refreshed with this evidence and is
  now `HOLD` with completed gates `11`, blocked gates `3`, evidence blockers
  `0`, startup no-fetch guard `PASS`;
- remaining blockers are reviewer approval `0/546`, locale gates `0/546` and
  product-owner activation approval missing;
- no remote loading, runtime manifest registration, cache lookup/read/write,
  storage/cloud migration, cloud restore rewrite, target/source mutation, app
  startup dependency, bundled-content removal or production activation was
  introduced.

Phase 4E disabled reviewer/locale intake report is complete:

- `app/course_pack_reviewer_locale_intake.ts` evaluates reviewer and locale
  approval evidence separately from shadow parity;
- `tests/course_pack_reviewer_locale_intake.test.ts` proves no auto-approval,
  full explicit approval, partial HOLD, unsafe shadow approval detection and no
  startup/network/storage side effects;
- `scripts/plan_content_disabled_reviewer_locale_intake.ts` writes the real
  reviewer/locale intake report under `.codex-tmp/plan-content/`;
- `tests/plan_content_disabled_reviewer_locale_intake_command.test.ts` covers
  HOLD without explicit approvals, PASS with explicit approvals, partial HOLD,
  unsafe shadow approval rejection, output path restrictions and startup/runtime
  disconnection;
- `scripts/plan_content_activation_readiness_blocker_report.ts` now accepts an
  optional `--disabled-reviewer-locale-intake` report and uses its counts only
  when intake safety passes;
- real disabled reviewer/locale intake report:
  `.codex-tmp/plan-content/staging-upload-20260627/disabled-reviewer-locale-intake.json`;
- real result: `HOLD`, `safetyStatus='PASS'`, `approvalStatus='HOLD'`,
  reviewer approved rows `0/546`, locale passed rows `0/546`, missing reviewer
  queue `546`, missing locale queue `546`, evidence blockers `0`;
- the real activation-readiness report was refreshed with this evidence and is
  still `HOLD` with completed gates `11`, blocked gates `3`, evidence blockers
  `0`;
- remaining blockers are reviewer approval `0/546`, locale gates `0/546` and
  product-owner activation approval missing;
- no automatic reviewer approval, automatic locale pass, remote loading,
  runtime manifest registration, cache lookup/read/write, storage/cloud
  migration, cloud restore rewrite, content generation, bundled-content removal
  or production activation was introduced.

Phase 4F explicit reviewer/locale approval packet is complete:

- `app/course_pack_reviewer_locale_approval_packet.ts` builds a report-only
  approval packet from the disabled reviewer/locale intake queue and validates
  separately supplied filled approval artifacts;
- generated packet rows stay `unreviewed` and contain row identity, path,
  content hash, source locale, study target and required reviewer/locale
  decision placeholders;
- filled approval artifacts must be explicit `plan-content-reviewer-locale-approval-v1`
  artifacts with `status='PASS'`, matching pack/source/target identity,
  all runtime/server/storage guard flags false, one matching decision per packet
  row, non-empty reviewer evidence ids and non-empty locale evidence ids;
- `scripts/plan_content_reviewer_locale_approval_packet.ts` writes the packet
  only under `.codex-tmp/plan-content/` and can validate a filled artifact when
  one is supplied, but it never creates approvals automatically;
- `tests/course_pack_reviewer_locale_approval_packet.test.ts` covers packet
  shape, no auto-approval, missing filled artifact HOLD, valid filled artifact
  PASS, mismatched filled artifact HOLD and startup/network/storage/source-write
  disconnection;
- `tests/plan_content_reviewer_locale_approval_packet_command.test.ts` covers
  real JSON input/output, output path restrictions, invalid filled artifact
  persisted `HOLD` and startup/runtime disconnection;
- real approval packet report:
  `.codex-tmp/plan-content/staging-upload-20260627/reviewer-locale-approval-packet.json`;
- real result: `PASS`, packet status `READY_FOR_REVIEW`, queued rows `546`,
  packet reviewer approved rows `0/546`, packet locale passed rows `0/546`,
  filled artifact validation `missing`, activation approval complete `false`,
  blockers `0`;
- no automatic reviewer approval, automatic locale pass, remote loading,
  runtime manifest registration, cache lookup/read/write, storage/cloud
  migration, cloud restore rewrite, content generation, bundled-content removal
  or production activation was introduced.

Phase 4G explicit approval artifact intake dry-run is complete:

- `scripts/plan_content_reviewer_locale_approval_intake_dry_run.ts` consumes the
  Phase 4F approval packet and an optional externally supplied filled
  `plan-content-reviewer-locale-approval-v1` artifact;
- missing filled artifacts produce a persisted `HOLD` report without throwing,
  so the blocker is visible and resumable;
- supplied filled artifacts must pass the Phase 4F packet validator before the
  script feeds them into `plan_content_disabled_reviewer_locale_intake.ts`;
- valid filled artifacts are re-run through the disabled reviewer/locale intake
  gate in a separate dry-run output, without changing runtime or activation
  flags;
- invalid supplied artifacts persist `HOLD` and throw, with concrete blockers
  for partial rows, mismatched source/target/hash or missing evidence ids;
- `tests/plan_content_reviewer_locale_approval_intake_dry_run_command.test.ts`
  covers missing artifact, valid artifact, partial artifact, mismatched
  source/target/hash, output path restrictions and startup/runtime
  disconnection;
- real approval intake dry-run report:
  `.codex-tmp/plan-content/staging-upload-20260627/reviewer-locale-approval-intake-dry-run.json`;
- real result: `HOLD`, dry-run status `MISSING_FILLED_ARTIFACT`, filled artifact
  validation `missing`, intake status `missing`, reviewer approved rows
  `0/546`, locale passed rows `0/546`, blockers `1`;
- activation-readiness remained `HOLD` with completed gates `11`, blocked gates
  `3`, evidence blockers `0`, reviewer approval `0/546` and locale gates
  `0/546`;
- no filled approval artifact was generated, no fake evidence ids were created,
  and no runtime activation, remote loading, cache lookup/read/write,
  storage/cloud migration, cloud restore rewrite, bundled-content removal or
  production activation was introduced.

Phase 4H reviewer/locale decision work-order batches are complete:

- `scripts/plan_content_reviewer_locale_work_order_batches.ts` reads the Phase
  4F approval packet and Phase 4G intake dry-run report;
- the writer splits queued packet rows into deterministic review batches with
  stable row ids, paths, content hashes, source locale, study target and empty
  reviewer/locale evidence slots;
- every generated row remains `reviewerStatus='unreviewed'`,
  `localeGateStatus='unreviewed'`, `reviewerEvidenceId=''` and
  `localeEvidenceId=''`;
- `tests/plan_content_reviewer_locale_work_order_batches_command.test.ts`
  covers batch coverage, no auto-approval, already-ready dry-run rejection,
  duplicate row detection, output path restrictions and startup/runtime
  disconnection;
- real work-order report:
  `.codex-tmp/plan-content/staging-upload-20260627/reviewer-locale-decision-work-order-batches.json`;
- real result: `PASS`, work-order status `READY_FOR_REVIEW`, rows `546`,
  batches `22`, batch size `25`, reviewer approved rows `0/546`, locale passed
  rows `0/546`, generated filled approval artifact `false`, blockers `0`;
- activation-readiness remained `HOLD` with completed gates `11`, blocked gates
  `3`, reviewer approval `0/546` and locale gates `0/546`;
- no filled approval artifact was generated, no fake evidence ids were created,
  and no runtime activation, remote loading, cache lookup/read/write,
  storage/cloud migration, cloud restore rewrite, bundled-content removal or
  production activation was introduced.

Focused checks passed:

```bash
npx jest --runTestsByPath tests/course_pack_runtime_contract.test.ts tests/bootstrap_locale_contract.test.ts --runInBand --no-cache
git diff --check -- app/course_pack_manifest.ts app/course_pack_index.ts app/course_pack_loader.ts tests/course_pack_runtime_contract.test.ts
npx jest --runTestsByPath tests/course_pack_runtime_contract.test.ts tests/bootstrap_bundle_boundary_contract.test.ts tests/bootstrap_locale_contract.test.ts --runInBand --no-cache
npx jest --runTestsByPath tests/plan_content_pack_boundary_contract.test.ts tests/course_pack_runtime_contract.test.ts tests/bootstrap_bundle_boundary_contract.test.ts tests/bootstrap_locale_contract.test.ts --runInBand --no-cache
npx jest --runTestsByPath tests/plan_content_readiness.test.ts tests/plan_content_pack_boundary_contract.test.ts tests/course_pack_runtime_contract.test.ts tests/bootstrap_bundle_boundary_contract.test.ts tests/bootstrap_locale_contract.test.ts --runInBand --no-cache
npx jest --runTestsByPath tests/plan_content_readiness.test.ts tests/plan_content_pack_boundary_contract.test.ts --runInBand --no-cache
npx jest --runTestsByPath tests/plan_content_pack_index.test.ts --runInBand --no-cache
npx jest --runTestsByPath tests/plan_content_pack_parity.test.ts --runInBand --no-cache
npx jest --runTestsByPath tests/plan_content_pack_dry_run.test.ts tests/plan_content_pack_boundary_contract.test.ts --runInBand --no-cache
npx jest --runTestsByPath tests/plan_content_pack_dry_run.test.ts tests/plan_content_pack_parity.test.ts tests/plan_content_pack_index.test.ts tests/plan_content_readiness.test.ts tests/plan_content_pack_boundary_contract.test.ts tests/course_pack_runtime_contract.test.ts tests/bootstrap_bundle_boundary_contract.test.ts tests/bootstrap_locale_contract.test.ts --runInBand --no-cache
npx jest --runTestsByPath tests/plan_content_dry_run_report_command.test.ts tests/plan_content_pack_dry_run.test.ts --runInBand --no-cache
npx jest --runTestsByPath tests/plan_content_dry_run_report_command.test.ts tests/plan_content_pack_dry_run.test.ts tests/plan_content_pack_parity.test.ts tests/plan_content_pack_index.test.ts tests/plan_content_readiness.test.ts tests/plan_content_pack_boundary_contract.test.ts tests/course_pack_runtime_contract.test.ts tests/bootstrap_bundle_boundary_contract.test.ts tests/bootstrap_locale_contract.test.ts --runInBand --no-cache
npx jest --runTestsByPath tests/plan_content_shadow_pack_export_command.test.ts tests/plan_content_dry_run_report_command.test.ts tests/plan_content_pack_index.test.ts --runInBand --no-cache
npx jest --runTestsByPath tests/plan_content_shadow_pack_export_command.test.ts tests/plan_content_dry_run_report_command.test.ts tests/plan_content_pack_dry_run.test.ts tests/plan_content_pack_parity.test.ts tests/plan_content_pack_index.test.ts tests/plan_content_readiness.test.ts tests/plan_content_pack_boundary_contract.test.ts tests/course_pack_runtime_contract.test.ts tests/bootstrap_bundle_boundary_contract.test.ts tests/bootstrap_locale_contract.test.ts --runInBand --no-cache
npx jest --runTestsByPath tests/plan_content_shadow_pack_parity_compare_command.test.ts tests/plan_content_shadow_pack_export_command.test.ts tests/plan_content_pack_parity.test.ts --runInBand --no-cache
npx jest --runTestsByPath tests/plan_content_shadow_pack_parity_compare_command.test.ts tests/plan_content_shadow_pack_export_command.test.ts tests/plan_content_dry_run_report_command.test.ts tests/plan_content_pack_dry_run.test.ts tests/plan_content_pack_parity.test.ts tests/plan_content_pack_index.test.ts tests/plan_content_readiness.test.ts tests/plan_content_pack_boundary_contract.test.ts tests/course_pack_runtime_contract.test.ts tests/bootstrap_bundle_boundary_contract.test.ts tests/bootstrap_locale_contract.test.ts --runInBand --no-cache
npx jest --runTestsByPath tests/plan_content_course_pack_manifest_wrap_command.test.ts tests/plan_content_shadow_pack_parity_compare_command.test.ts tests/course_pack_runtime_contract.test.ts --runInBand --no-cache
npx jest --runTestsByPath tests/plan_content_course_pack_manifest_wrap_command.test.ts tests/plan_content_shadow_pack_parity_compare_command.test.ts tests/plan_content_shadow_pack_export_command.test.ts tests/plan_content_dry_run_report_command.test.ts tests/plan_content_pack_dry_run.test.ts tests/plan_content_pack_parity.test.ts tests/plan_content_pack_index.test.ts tests/plan_content_readiness.test.ts tests/plan_content_pack_boundary_contract.test.ts tests/course_pack_runtime_contract.test.ts tests/bootstrap_bundle_boundary_contract.test.ts tests/bootstrap_locale_contract.test.ts --runInBand --no-cache
npx jest --runTestsByPath tests/plan_content_release_bundle_verify_command.test.ts tests/plan_content_course_pack_manifest_wrap_command.test.ts tests/course_pack_runtime_contract.test.ts --runInBand --no-cache
npx jest --runTestsByPath tests/plan_content_release_bundle_verify_command.test.ts tests/plan_content_course_pack_manifest_wrap_command.test.ts tests/plan_content_shadow_pack_parity_compare_command.test.ts tests/plan_content_shadow_pack_export_command.test.ts tests/plan_content_dry_run_report_command.test.ts tests/plan_content_pack_dry_run.test.ts tests/plan_content_pack_parity.test.ts tests/plan_content_pack_index.test.ts tests/plan_content_readiness.test.ts tests/plan_content_pack_boundary_contract.test.ts tests/course_pack_runtime_contract.test.ts tests/bootstrap_bundle_boundary_contract.test.ts tests/bootstrap_locale_contract.test.ts --runInBand --no-cache
npx jest --runTestsByPath tests/plan_content_local_artifact_runtime_ignore.test.ts tests/course_pack_runtime_contract.test.ts tests/bootstrap_bundle_boundary_contract.test.ts --runInBand --no-cache
npx jest --runTestsByPath tests/plan_content_server_staging_descriptor_command.test.ts tests/plan_content_release_bundle_verify_command.test.ts tests/plan_content_local_artifact_runtime_ignore.test.ts --runInBand --no-cache
npx jest --runTestsByPath tests/plan_content_server_staging_descriptor_command.test.ts tests/plan_content_release_bundle_verify_command.test.ts tests/plan_content_course_pack_manifest_wrap_command.test.ts tests/plan_content_shadow_pack_parity_compare_command.test.ts tests/plan_content_shadow_pack_export_command.test.ts tests/plan_content_dry_run_report_command.test.ts tests/plan_content_pack_dry_run.test.ts tests/plan_content_pack_parity.test.ts tests/plan_content_pack_index.test.ts tests/plan_content_readiness.test.ts tests/plan_content_local_artifact_runtime_ignore.test.ts tests/plan_content_pack_boundary_contract.test.ts tests/course_pack_runtime_contract.test.ts tests/bootstrap_bundle_boundary_contract.test.ts tests/bootstrap_locale_contract.test.ts --runInBand --no-cache --forceExit
npx jest --runTestsByPath tests/plan_content_server_staging_approval_review_command.test.ts tests/plan_content_server_staging_descriptor_command.test.ts --runInBand --no-cache --forceExit
npx jest --runTestsByPath tests/plan_content_server_staging_writer_command.test.ts tests/plan_content_server_staging_approval_review_command.test.ts --runInBand --no-cache --forceExit
npx jest --runTestsByPath tests/plan_content_server_staging_writer_command.test.ts tests/plan_content_server_staging_approval_review_command.test.ts tests/plan_content_server_staging_descriptor_command.test.ts tests/plan_content_release_bundle_verify_command.test.ts tests/plan_content_course_pack_manifest_wrap_command.test.ts tests/plan_content_shadow_pack_parity_compare_command.test.ts tests/plan_content_shadow_pack_export_command.test.ts tests/plan_content_dry_run_report_command.test.ts tests/plan_content_pack_dry_run.test.ts tests/plan_content_pack_parity.test.ts tests/plan_content_pack_index.test.ts tests/plan_content_readiness.test.ts tests/plan_content_local_artifact_runtime_ignore.test.ts tests/plan_content_pack_boundary_contract.test.ts tests/course_pack_runtime_contract.test.ts tests/bootstrap_bundle_boundary_contract.test.ts tests/bootstrap_locale_contract.test.ts --runInBand --no-cache --forceExit
npx jest --runTestsByPath tests/plan_content_server_staging_apply_preflight_command.test.ts tests/plan_content_server_staging_writer_command.test.ts --runInBand --no-cache --forceExit
npx jest --runTestsByPath tests/plan_content_server_staging_apply_preflight_command.test.ts tests/plan_content_server_staging_writer_command.test.ts tests/plan_content_server_staging_approval_review_command.test.ts tests/plan_content_server_staging_descriptor_command.test.ts tests/plan_content_release_bundle_verify_command.test.ts tests/plan_content_course_pack_manifest_wrap_command.test.ts tests/plan_content_shadow_pack_parity_compare_command.test.ts tests/plan_content_shadow_pack_export_command.test.ts tests/plan_content_dry_run_report_command.test.ts tests/plan_content_pack_dry_run.test.ts tests/plan_content_pack_parity.test.ts tests/plan_content_pack_index.test.ts tests/plan_content_readiness.test.ts tests/plan_content_local_artifact_runtime_ignore.test.ts tests/plan_content_pack_boundary_contract.test.ts tests/course_pack_runtime_contract.test.ts tests/bootstrap_bundle_boundary_contract.test.ts tests/bootstrap_locale_contract.test.ts --runInBand --no-cache --forceExit
npx jest --runTestsByPath tests/plan_content_server_staging_apply_command.test.ts tests/plan_content_server_staging_apply_preflight_command.test.ts --runInBand --no-cache --forceExit
npx jest --runTestsByPath tests/plan_content_server_staging_apply_command.test.ts tests/plan_content_server_staging_apply_preflight_command.test.ts tests/plan_content_server_staging_writer_command.test.ts tests/plan_content_server_staging_approval_review_command.test.ts tests/plan_content_server_staging_descriptor_command.test.ts tests/plan_content_release_bundle_verify_command.test.ts tests/plan_content_course_pack_manifest_wrap_command.test.ts tests/plan_content_shadow_pack_parity_compare_command.test.ts tests/plan_content_shadow_pack_export_command.test.ts tests/plan_content_dry_run_report_command.test.ts tests/plan_content_pack_dry_run.test.ts tests/plan_content_pack_parity.test.ts tests/plan_content_pack_index.test.ts tests/plan_content_readiness.test.ts tests/plan_content_local_artifact_runtime_ignore.test.ts tests/plan_content_pack_boundary_contract.test.ts tests/course_pack_runtime_contract.test.ts tests/bootstrap_bundle_boundary_contract.test.ts tests/bootstrap_locale_contract.test.ts --runInBand --no-cache --forceExit
npx jest --runTestsByPath tests/plan_content_server_staging_remote_verify_command.test.ts tests/plan_content_server_staging_apply_command.test.ts --runInBand --no-cache --forceExit
npx tsx scripts/plan_content_server_staging_remote_verify.ts --apply-report .codex-tmp/plan-content/staging-upload-20260627/server-staging-apply-report.json --out .codex-tmp/plan-content/staging-upload-20260627/server-staging-remote-verify.json --generated-at 2026-06-27T00:00:00.000Z
npx jest --runTestsByPath tests/plan_content_server_shadow_dual_read_compare_command.test.ts --runInBand --no-cache --forceExit
npx tsx scripts/plan_content_server_shadow_dual_read_compare.ts --remote-verify-report .codex-tmp/plan-content/staging-upload-20260627/server-staging-remote-verify.json --out .codex-tmp/plan-content/staging-upload-20260627/server-shadow-dual-read-report.json --generated-at 2026-06-27T00:00:00.000Z --source-snapshot-id server-shadow:staging-upload-20260627
npx jest --runTestsByPath tests/course_pack_runtime_policy_contract.test.ts tests/course_pack_runtime_contract.test.ts --runInBand --no-cache --forceExit
npx jest --runTestsByPath tests/plan_content_disabled_manifest_registry_preflight_command.test.ts tests/course_pack_manifest_registry_preflight.test.ts tests/course_pack_runtime_policy_contract.test.ts tests/course_pack_runtime_contract.test.ts --runInBand --no-cache --forceExit
npx tsx scripts/plan_content_disabled_manifest_registry_preflight.ts --manifest .codex-tmp/plan-content/staging-upload-20260627/pack/manifest.json --remote-verify-report .codex-tmp/plan-content/staging-upload-20260627/server-staging-remote-verify.json --server-shadow-dual-read-report .codex-tmp/plan-content/staging-upload-20260627/server-shadow-dual-read-report.json --out .codex-tmp/plan-content/staging-upload-20260627/disabled-manifest-registry-preflight.json --generated-at 2026-06-27T00:00:00.000Z
npx jest --runTestsByPath tests/plan_content_disabled_runtime_manifest_candidate_command.test.ts tests/course_pack_runtime_manifest_candidate.test.ts tests/plan_content_disabled_manifest_registry_preflight_command.test.ts tests/course_pack_manifest_registry_preflight.test.ts tests/course_pack_runtime_policy_contract.test.ts tests/course_pack_runtime_contract.test.ts --runInBand --no-cache --forceExit
npx tsx scripts/plan_content_disabled_runtime_manifest_candidate.ts --manifest .codex-tmp/plan-content/staging-upload-20260627/pack/manifest.json --remote-verify-report .codex-tmp/plan-content/staging-upload-20260627/server-staging-remote-verify.json --server-shadow-dual-read-report .codex-tmp/plan-content/staging-upload-20260627/server-shadow-dual-read-report.json --disabled-manifest-preflight .codex-tmp/plan-content/staging-upload-20260627/disabled-manifest-registry-preflight.json --out .codex-tmp/plan-content/staging-upload-20260627/disabled-runtime-manifest-candidate.json --generated-at 2026-06-27T00:00:00.000Z
npx jest --runTestsByPath tests/plan_content_activation_readiness_blocker_report_command.test.ts tests/course_pack_activation_readiness.test.ts tests/course_pack_runtime_manifest_candidate.test.ts tests/course_pack_manifest_registry_preflight.test.ts tests/course_pack_runtime_policy_contract.test.ts tests/course_pack_runtime_contract.test.ts --runInBand --no-cache --forceExit
npx tsx scripts/plan_content_activation_readiness_blocker_report.ts --manifest .codex-tmp/plan-content/staging-upload-20260627/pack/manifest.json --remote-verify-report .codex-tmp/plan-content/staging-upload-20260627/server-staging-remote-verify.json --server-shadow-dual-read-report .codex-tmp/plan-content/staging-upload-20260627/server-shadow-dual-read-report.json --disabled-manifest-preflight .codex-tmp/plan-content/staging-upload-20260627/disabled-manifest-registry-preflight.json --disabled-runtime-candidate .codex-tmp/plan-content/staging-upload-20260627/disabled-runtime-manifest-candidate.json --out .codex-tmp/plan-content/staging-upload-20260627/activation-readiness-blocker-report.json --generated-at 2026-06-27T00:00:00.000Z
npx jest --runTestsByPath tests/plan_content_disabled_offline_cache_integrity_command.test.ts tests/course_pack_offline_cache_integrity.test.ts tests/course_pack_runtime_manifest_candidate.test.ts tests/course_pack_manifest_registry_preflight.test.ts tests/course_pack_runtime_policy_contract.test.ts tests/course_pack_runtime_contract.test.ts --runInBand --no-cache --forceExit
npx tsx scripts/plan_content_disabled_offline_cache_integrity.ts --manifest .codex-tmp/plan-content/staging-upload-20260627/pack/manifest.json --remote-verify-report .codex-tmp/plan-content/staging-upload-20260627/server-staging-remote-verify.json --server-shadow-dual-read-report .codex-tmp/plan-content/staging-upload-20260627/server-shadow-dual-read-report.json --disabled-manifest-preflight .codex-tmp/plan-content/staging-upload-20260627/disabled-manifest-registry-preflight.json --disabled-runtime-candidate .codex-tmp/plan-content/staging-upload-20260627/disabled-runtime-manifest-candidate.json --activation-readiness .codex-tmp/plan-content/staging-upload-20260627/activation-readiness-blocker-report.json --out .codex-tmp/plan-content/staging-upload-20260627/disabled-offline-cache-integrity.json --generated-at 2026-06-27T00:00:00.000Z
npx jest --runTestsByPath tests/plan_content_activation_readiness_blocker_report_command.test.ts tests/plan_content_disabled_offline_cache_integrity_command.test.ts tests/course_pack_activation_readiness.test.ts tests/course_pack_offline_cache_integrity.test.ts tests/course_pack_runtime_manifest_candidate.test.ts tests/course_pack_manifest_registry_preflight.test.ts tests/course_pack_runtime_policy_contract.test.ts tests/course_pack_runtime_contract.test.ts --runInBand --no-cache --forceExit
npx tsx scripts/plan_content_activation_readiness_blocker_report.ts --manifest .codex-tmp/plan-content/staging-upload-20260627/pack/manifest.json --remote-verify-report .codex-tmp/plan-content/staging-upload-20260627/server-staging-remote-verify.json --server-shadow-dual-read-report .codex-tmp/plan-content/staging-upload-20260627/server-shadow-dual-read-report.json --disabled-manifest-preflight .codex-tmp/plan-content/staging-upload-20260627/disabled-manifest-registry-preflight.json --disabled-runtime-candidate .codex-tmp/plan-content/staging-upload-20260627/disabled-runtime-manifest-candidate.json --disabled-offline-cache-integrity .codex-tmp/plan-content/staging-upload-20260627/disabled-offline-cache-integrity.json --out .codex-tmp/plan-content/staging-upload-20260627/activation-readiness-blocker-report.json --generated-at 2026-06-27T00:00:00.000Z
npx jest --runTestsByPath tests/plan_content_disabled_rollback_kill_switch_command.test.ts tests/course_pack_rollback_kill_switch.test.ts tests/plan_content_disabled_offline_cache_integrity_command.test.ts tests/course_pack_offline_cache_integrity.test.ts tests/course_pack_runtime_manifest_candidate.test.ts tests/course_pack_manifest_registry_preflight.test.ts tests/course_pack_runtime_policy_contract.test.ts tests/course_pack_runtime_contract.test.ts --runInBand --no-cache --forceExit
npx tsx scripts/plan_content_disabled_rollback_kill_switch.ts --manifest .codex-tmp/plan-content/staging-upload-20260627/pack/manifest.json --remote-verify-report .codex-tmp/plan-content/staging-upload-20260627/server-staging-remote-verify.json --server-shadow-dual-read-report .codex-tmp/plan-content/staging-upload-20260627/server-shadow-dual-read-report.json --disabled-manifest-preflight .codex-tmp/plan-content/staging-upload-20260627/disabled-manifest-registry-preflight.json --disabled-runtime-candidate .codex-tmp/plan-content/staging-upload-20260627/disabled-runtime-manifest-candidate.json --disabled-offline-cache-integrity .codex-tmp/plan-content/staging-upload-20260627/disabled-offline-cache-integrity.json --activation-readiness .codex-tmp/plan-content/staging-upload-20260627/activation-readiness-blocker-report.json --out .codex-tmp/plan-content/staging-upload-20260627/disabled-rollback-kill-switch.json --generated-at 2026-06-27T00:00:00.000Z
npx jest --runTestsByPath tests/plan_content_activation_readiness_blocker_report_command.test.ts tests/plan_content_disabled_rollback_kill_switch_command.test.ts tests/course_pack_rollback_kill_switch.test.ts tests/plan_content_disabled_offline_cache_integrity_command.test.ts tests/course_pack_offline_cache_integrity.test.ts tests/course_pack_activation_readiness.test.ts tests/course_pack_runtime_manifest_candidate.test.ts tests/course_pack_manifest_registry_preflight.test.ts tests/course_pack_runtime_policy_contract.test.ts tests/course_pack_runtime_contract.test.ts --runInBand --no-cache --forceExit
npx tsx scripts/plan_content_activation_readiness_blocker_report.ts --manifest .codex-tmp/plan-content/staging-upload-20260627/pack/manifest.json --remote-verify-report .codex-tmp/plan-content/staging-upload-20260627/server-staging-remote-verify.json --server-shadow-dual-read-report .codex-tmp/plan-content/staging-upload-20260627/server-shadow-dual-read-report.json --disabled-manifest-preflight .codex-tmp/plan-content/staging-upload-20260627/disabled-manifest-registry-preflight.json --disabled-runtime-candidate .codex-tmp/plan-content/staging-upload-20260627/disabled-runtime-manifest-candidate.json --disabled-offline-cache-integrity .codex-tmp/plan-content/staging-upload-20260627/disabled-offline-cache-integrity.json --disabled-rollback-kill-switch .codex-tmp/plan-content/staging-upload-20260627/disabled-rollback-kill-switch.json --out .codex-tmp/plan-content/staging-upload-20260627/activation-readiness-blocker-report.json --generated-at 2026-06-27T00:00:00.000Z
npx jest --runTestsByPath tests/course_pack_storage_cloud_isolation.test.ts tests/plan_content_disabled_storage_cloud_isolation_command.test.ts tests/plan_content_activation_readiness_blocker_report_command.test.ts tests/gustav_target_storage_keys.test.ts tests/cloud_sync_sync_keys_validity.test.ts --runInBand --no-cache --forceExit
npx tsx scripts/plan_content_disabled_storage_cloud_isolation.ts --manifest .codex-tmp/plan-content/staging-upload-20260627/pack/manifest.json --remote-verify-report .codex-tmp/plan-content/staging-upload-20260627/server-staging-remote-verify.json --server-shadow-dual-read-report .codex-tmp/plan-content/staging-upload-20260627/server-shadow-dual-read-report.json --disabled-manifest-preflight .codex-tmp/plan-content/staging-upload-20260627/disabled-manifest-registry-preflight.json --disabled-runtime-candidate .codex-tmp/plan-content/staging-upload-20260627/disabled-runtime-manifest-candidate.json --disabled-offline-cache-integrity .codex-tmp/plan-content/staging-upload-20260627/disabled-offline-cache-integrity.json --disabled-rollback-kill-switch .codex-tmp/plan-content/staging-upload-20260627/disabled-rollback-kill-switch.json --activation-readiness .codex-tmp/plan-content/staging-upload-20260627/activation-readiness-blocker-report.json --out .codex-tmp/plan-content/staging-upload-20260627/disabled-storage-cloud-isolation.json --generated-at 2026-06-27T00:00:00.000Z
npx tsx scripts/plan_content_activation_readiness_blocker_report.ts --manifest .codex-tmp/plan-content/staging-upload-20260627/pack/manifest.json --remote-verify-report .codex-tmp/plan-content/staging-upload-20260627/server-staging-remote-verify.json --server-shadow-dual-read-report .codex-tmp/plan-content/staging-upload-20260627/server-shadow-dual-read-report.json --disabled-manifest-preflight .codex-tmp/plan-content/staging-upload-20260627/disabled-manifest-registry-preflight.json --disabled-runtime-candidate .codex-tmp/plan-content/staging-upload-20260627/disabled-runtime-manifest-candidate.json --disabled-offline-cache-integrity .codex-tmp/plan-content/staging-upload-20260627/disabled-offline-cache-integrity.json --disabled-rollback-kill-switch .codex-tmp/plan-content/staging-upload-20260627/disabled-rollback-kill-switch.json --disabled-storage-cloud-isolation .codex-tmp/plan-content/staging-upload-20260627/disabled-storage-cloud-isolation.json --out .codex-tmp/plan-content/staging-upload-20260627/activation-readiness-blocker-report.json --generated-at 2026-06-27T00:00:00.000Z
npx jest --runTestsByPath tests/course_pack_reviewer_locale_intake.test.ts tests/plan_content_disabled_reviewer_locale_intake_command.test.ts tests/plan_content_activation_readiness_blocker_report_command.test.ts --runInBand --no-cache --forceExit
npx tsx scripts/plan_content_disabled_reviewer_locale_intake.ts --manifest .codex-tmp/plan-content/staging-upload-20260627/pack/manifest.json --index .codex-tmp/plan-content/staging-upload-20260627/pack/index.json --server-shadow-dual-read-report .codex-tmp/plan-content/staging-upload-20260627/server-shadow-dual-read-report.json --disabled-storage-cloud-isolation .codex-tmp/plan-content/staging-upload-20260627/disabled-storage-cloud-isolation.json --out .codex-tmp/plan-content/staging-upload-20260627/disabled-reviewer-locale-intake.json --generated-at 2026-06-27T00:00:00.000Z
npx tsx scripts/plan_content_activation_readiness_blocker_report.ts --manifest .codex-tmp/plan-content/staging-upload-20260627/pack/manifest.json --remote-verify-report .codex-tmp/plan-content/staging-upload-20260627/server-staging-remote-verify.json --server-shadow-dual-read-report .codex-tmp/plan-content/staging-upload-20260627/server-shadow-dual-read-report.json --disabled-manifest-preflight .codex-tmp/plan-content/staging-upload-20260627/disabled-manifest-registry-preflight.json --disabled-runtime-candidate .codex-tmp/plan-content/staging-upload-20260627/disabled-runtime-manifest-candidate.json --disabled-offline-cache-integrity .codex-tmp/plan-content/staging-upload-20260627/disabled-offline-cache-integrity.json --disabled-rollback-kill-switch .codex-tmp/plan-content/staging-upload-20260627/disabled-rollback-kill-switch.json --disabled-storage-cloud-isolation .codex-tmp/plan-content/staging-upload-20260627/disabled-storage-cloud-isolation.json --disabled-reviewer-locale-intake .codex-tmp/plan-content/staging-upload-20260627/disabled-reviewer-locale-intake.json --out .codex-tmp/plan-content/staging-upload-20260627/activation-readiness-blocker-report.json --generated-at 2026-06-27T00:00:00.000Z
```

The latest full focused Phase 3W gate passed `21` suites / `104` tests with
`--forceExit`; the Phase 3W narrow gate passed `1` suite / `4` tests and the
combined Phase 3W/3V/apply gate passed `3` suites / `13` tests. The reusable
real remote verification and real server-shadow dual-read comparison passed
with a hidden short-lived token and wrote the reports above. An earlier full
command with a shorter shell timeout was interrupted before Jest finished; the
repeated run completed cleanly. Earlier, a full command without `--forceExit`
hit the existing Jest open-handle timeout after the command limit, so focused
gates use `--forceExit` for reliable completion. The Phase 3X narrow gate
passed `2` suites / `13` tests. The latest full focused Phase 3X gate passed
`22` suites / `109` tests with `--forceExit`.
The Phase 3Y narrow gate passed `4` suites / `21` tests, and the real disabled
manifest registry/cache preflight passed with the report above.
The latest full focused Phase 3Y gate passed `24` suites / `117` tests with
`--forceExit`.
The Phase 3Z narrow gate passed `6` suites / `29` tests, and the real disabled
runtime manifest candidate report passed with the report above.
The latest full focused Phase 3Z gate passed `26` suites / `125` tests with
`--forceExit`.
The Phase 4A narrow gate passed `6` suites / `29` tests, and the real
activation-readiness blocker report wrote the expected `HOLD` with `8` completed
gates, `6` blocked gates and `0` evidence blockers.
The latest full focused Phase 4A gate passed `28` suites / `133` tests with
`--forceExit`; an earlier full run with a shorter shell timeout was interrupted
before Jest finished, and the repeated run completed cleanly.
The Phase 4B narrow gate passed `6` suites / `29` tests. The Phase 4B
integration gate passed `8` suites / `38` tests, and the real activation
readiness report refreshed to `9` completed gates / `5` blocked gates after the
offline cache integrity evidence passed.
The latest full focused Phase 4B gate passed `30` suites / `142` tests with
`--forceExit`.
The Phase 4C narrow gate passed `8` suites / `37` tests. The Phase 4C
integration gate passed `10` suites / `47` tests, and the real activation
readiness report refreshed to `10` completed gates / `4` blocked gates after the
rollback kill-switch evidence passed.
The latest full focused Phase 4C gate passed `32` suites / `151` tests with
`--forceExit`.
The Phase 4D narrow gate passed `5` suites / `24` tests, and the real disabled
storage/cloud isolation report passed. The real activation readiness report
refreshed to `11` completed gates / `3` blocked gates after the storage/cloud
evidence passed.
The latest full focused Phase 4D gate passed `36` suites / `168` tests with
`--forceExit`.
The Phase 4E narrow gate passed `3` suites / `22` tests. The real disabled
reviewer/locale intake report wrote the expected `HOLD` with safety `PASS`,
approval `HOLD`, reviewer approved rows `0/546`, locale passed rows `0/546` and
evidence blockers `0`. The real activation readiness report remained `HOLD`
with `11` completed gates / `3` blocked gates.
The latest full focused Phase 4E gate passed `38` suites / `182` tests with
`--forceExit`.
The Phase 4F narrow gate passed `2` suites / `10` tests. The real reviewer/
locale approval packet report wrote the expected `PASS` with packet status
`READY_FOR_REVIEW`, queued rows `546`, reviewer approved rows `0/546`, locale
passed rows `0/546`, filled artifact validation `missing` and blockers `0`.
The latest full focused Phase 4F gate passed `40` suites / `231` tests with
`--forceExit`; an earlier full run with a shorter shell timeout was interrupted
before Jest finished, and the repeated run completed cleanly.
The Phase 4G narrow gate passed `3` suites / `16` tests. The real reviewer/
locale approval intake dry-run report wrote the expected `HOLD` with dry-run
status `MISSING_FILLED_ARTIFACT`, filled artifact validation `missing`, reviewer
approved rows `0/546`, locale passed rows `0/546` and blockers `1`. The
relevant focused chunks passed `36` suites / `197` tests total; two very large
all-in-one Jest commands were not used as completion evidence because they
ended with process-level timeout/exit noise after partial PASS output, while the
same suites passed in smaller chunks.
The Phase 4H narrow gate passed `4` suites / `21` tests. The focused Phase 4H
reviewer/locale gate passed `7` suites / `43` tests. The real work-order report
wrote the expected `PASS` with work-order status `READY_FOR_REVIEW`, rows
`546`, batches `22`, reviewer approved rows `0/546`, locale passed rows
`0/546`, generated filled approval artifact `false` and blockers `0`.

Phase 4I filled work-order batch validator and approval artifact candidate is
complete:

- `scripts/plan_content_reviewer_locale_filled_work_order_validator.ts` reads the
  Phase 4H work-order batches report plus externally supplied filled batch
  decisions, either as a directory of filled batch JSON files
  (`--filled-batches-dir`) or as a single JSON list artifact
  (`--filled-batches-list`), only from `.codex-tmp/plan-content/`;
- the validator fails closed on a non-clean upstream work-order, missing rows,
  duplicate row ids, unknown rows not in the work-order, wrong study target,
  wrong source locale, wrong content hash, wrong path, wrong plan id, wrong day
  index, non-approved reviewer decisions, non-passed locale decisions, empty
  reviewer evidence ids and empty locale evidence ids;
- it assembles a candidate `plan-content-reviewer-locale-approval-v1` artifact
  only when every one of the `546` rows is explicitly reviewer-approved and
  locale-passed with non-empty externally supplied evidence ids;
- it carries through only externally supplied evidence ids and never synthesizes
  decisions or evidence ids; `generatedDecisionsOrEvidence` stays `false`;
- missing external filled batches produce a persisted `HOLD` report without
  throwing, so the blocker is visible and resumable;
- present-but-invalid filled batches persist `HOLD` and throw with concrete
  blockers;
- `tests/plan_content_reviewer_locale_filled_work_order_validator_command.test.ts`
  covers missing filled batches (`HOLD`, no throw), valid filled batches
  (`PASS`, candidate assembled and re-validated by the Phase 4F packet
  validator), single JSON list intake, partial batches, duplicate rows, wrong
  source/target/hash/path, non-approved/non-passed decisions, empty evidence
  ids, unknown rows, non-clean upstream work-order, output path restrictions and
  startup/runtime disconnection;
- real validator report:
  `.codex-tmp/plan-content/staging-upload-20260627/reviewer-locale-filled-work-order-validation.json`;
- real result: `HOLD`, validation status `MISSING_FILLED_BATCHES`, work-order
  rows `546`, filled decision rows `0`, reviewer approved rows `0/546`, locale
  passed rows `0/546`, candidate generated `false`, generated decisions or
  evidence `false`, evidence blockers `0`, blockers `1`
  (`external filled reviewer/locale work-order batches are missing`);
- no candidate approval artifact file was written, no filled approval artifact
  was generated, no fake reviewer/locale evidence ids were created, and no
  runtime activation, remote loading, cache lookup/read/write, storage/cloud
  migration, cloud restore rewrite, bundled-content removal or production
  activation was introduced.

The Phase 4I narrow gate passed `1` suite / `12` tests. The focused Phase 4I
reviewer/locale gate passed `5` suites / `33` tests, the runtime/startup guard
gate passed `6` suites / `33` tests, and the consolidated reviewer/locale gate
passed `8` suites / `52` tests. The full project `tsc --noEmit` reported no
errors attributable to the two new Phase 4I files, and
`git diff --check` was clean for the touched files. A throwaway probe over the
real `546`-row work-order with externally placeholdered evidence ids proved the
happy path assembles a valid `546`-decision candidate with
`activationApproved=false`, after which the probe directory was deleted so no
synthesized approval artifact or fake evidence remained; the only real Phase 4I
artifact is the `HOLD` report above. Activation-readiness is unchanged: `HOLD`
with `11` completed gates / `3` blocked gates, reviewer approval `0/546` and
locale gates `0/546`.

## Current Objective

Continue after the first real staging/shadow upload, reusable remote shadow
verification, server-shadow dual-read comparison, disabled
loader/cache/offline/rollback contract, disabled manifest registry/cache
preflight, disabled runtime manifest candidate gate, activation-readiness
blocker report, disabled offline cache integrity report and disabled rollback
kill-switch report, disabled storage/cloud isolation report and disabled
reviewer/locale intake report and explicit reviewer/locale approval packet.
The explicit approval artifact intake dry-run is also in place and currently
blocked only because no external filled approval artifact exists. The reviewer/
locale decision work-order batches are also in place, and the Phase 4I filled
work-order batch validator and approval artifact candidate assembler is also in
place, currently `HOLD` only because no external filled batches exist yet. Do
not move content into runtime yet. The next step is to create and coordinate the
real external reviewer/locale batch fill artifacts, still without automatic
approvals, fake evidence, runtime activation or content generation:

```text
Phase 4J - coordinate real external reviewer/locale batch fill artifacts (no fake approvals)
```

This next step means:

- define and document how external reviewers/localizers fill the Phase 4H
  work-order batches into `.codex-tmp/plan-content/` filled batch files;
- keep every filled decision externally sourced, with real reviewer and locale
  evidence ids; never synthesize decisions or evidence ids in tooling;
- run the Phase 4I validator over real filled batches; only on validator `PASS`
  does it assemble the candidate `plan-content-reviewer-locale-approval-v1`
  artifact;
- feed the validated candidate back into Phase 4G dry-run only after validator
  `PASS`;
- keep `COURSE_PACK_REMOTE_LOADING_ENABLED=false` and
  `activationApproved=false`;
- keep the implementation disconnected from startup, onboarding and
  personal-plan runtime;
- keep the implementation disabled behind `COURSE_PACK_REMOTE_LOADING_ENABLED=false`;
- keep `activationApproved=false` and runtime manifest registration disabled;
- keep server copies as staging/shadow only;
- keep all existing `plan_content_*` payloads bundled and untouched;
- do not download in the app, migrate storage, rewrite cloud restore,
  generate/apply new language content, activate runtime or remove bundled
  content.

## Required Reading

The next session must read these first:

1. `docs/specs/2026-06-26-bootstrap-course-pack-master-audit.md`
2. `docs/specs/2026-06-26-language-pack-retrofit-plan.md`
3. `docs/specs/2026-06-26-bootstrap-course-pack-audit-matrix.md`
4. `docs/HEISENBERG_LOCALIZATION_PIPELINE.md`
5. `docs/gustav/GUSTAV_TARGET_LANGUAGE_ARCHITECTURE.md`
6. `docs/gustav/GUSTAV_BRAIN.md`

Then inspect the active Phase 3 plan-content files:

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
- `scripts/plan_content_reviewer_locale_filled_work_order_validator.ts`
- `tests/plan_content_reviewer_locale_filled_work_order_validator_command.test.ts`
- `.codex-tmp/plan-content/staging-upload-20260627/reviewer-locale-filled-work-order-validation.json`
- `.codex-tmp/plan-content/staging-upload-20260627/activation-readiness-blocker-report.json`
- `app/plan_content_readiness.ts`
- `tests/plan_content_readiness.test.ts`
- `app/personal_plan.tsx`
- `app/personal_plan_theory.tsx`
- `app/personal_plan_phrase_lessons.ts`
- `tests/plan_content_pack_boundary_contract.test.ts`

## Current Verdict

Overall course-pack/app activation remains `HOLD`.

Allowed now:

- Phase 3 bundle-extraction preparation;
- read-only bundle/callsite audits;
- small static guards/tests that prevent startup/import regressions;
- docs and handoff updates.
- explicit server/staging artifact planning only if artifacts stay inactive with
  `activationApproved=false` and are not used by production runtime.
- local approval-review packets that keep `approvedForServerWrite=false` and
  `serverWritePermitted=false`.
- local server-staging writer dry-run plans that keep
  `actualServerWrites=false`.
- local server-staging apply-preflight reports that keep
  `serverWritePermitted=false` and `actualServerWrites=false`.
- apply-capable staging writer dry-runs and blocked apply reports that keep
  `actualServerWrites=false` unless explicit staging env gates are provided.
- completed staging/shadow uploads only when all gates pass and
  `activationApproved=false`.
- local reviewer/locale approval packets and filled-artifact validation dry-runs
  that keep `activationApproved=false` and do not synthesize decisions.
- local filled work-order batch validation and candidate assembly that consumes
  only externally supplied filled batches, keeps `activationApproved=false`, and
  never synthesizes decisions or reviewer/locale evidence ids.

Blocked now:

- production course-pack activation;
- Firebase/server runtime pack upload or activation;
- real server-side staging writes;
- automatic reviewer approval or automatic locale-gate pass;
- Heisenberg/Gustav content generation for production apply;
- storage/cloud migrations;
- moving heavy content remote without manifest/loader/cache;
- adding downloads to splash/startup.

## Midway Prod Release Rule

A production release during this retrofit must remain safe even if the server
copy is incomplete.

Required invariant:

- current bundled compatibility content remains in the app until a specific
  surface has passed loader/cache/offline/parity/rollback gates;
- `COURSE_PACK_REMOTE_LOADING_ENABLED` stays `false` for production;
- any server-side pack copy before activation is staging/shadow only and must be
  marked `activationApproved=false`;
- production runtime must not require Firebase/server pack availability to open
  onboarding, personal plan, theory, phrase practice, lessons, quizzes or
  existing language content;
- removing bundled payloads is a later explicit step, only after dual-read
  parity, offline cache and rollback are proven and separately approved.

## Next Pass Plan

Objective:

Build Phase 4J: coordinate the real external reviewer/locale batch fill
artifacts that feed the Phase 4I validator, without fake approvals or fake
evidence. The Phase 4I validator and candidate assembler already exists and is
`HOLD` only because no external filled batches exist. Do not generate filled
approvals, do not synthesize reviewer/locale evidence ids, do not activate
runtime, do not register a runtime manifest, do not read/write app cache, do not
run storage/cloud migrations, and do not remove bundled content. Reviewer and
locale decisions must be external and explicitly evidence-backed; upload, parity
and dual-read are not approval.

Read first:

1. `docs/specs/2026-06-26-language-pack-handoff.md`
2. `docs/specs/2026-06-26-language-pack-retrofit-plan.md`
3. `docs/specs/2026-06-26-bootstrap-course-pack-master-audit.md`
4. `docs/specs/2026-06-26-bundle-extraction-prep-inventory.md`
5. `docs/specs/2026-06-26-plan-content-pack-pilot-map.md`
6. `docs/specs/2026-06-26-plan-content-extraction-dual-read-plan.md`
7. `app/course_pack_activation_readiness.ts`
8. `tests/course_pack_activation_readiness.test.ts`
9. `scripts/plan_content_activation_readiness_blocker_report.ts`
10. `tests/plan_content_activation_readiness_blocker_report_command.test.ts`
11. `app/course_pack_storage_cloud_isolation.ts`
12. `tests/course_pack_storage_cloud_isolation.test.ts`
13. `scripts/plan_content_disabled_storage_cloud_isolation.ts`
14. `tests/plan_content_disabled_storage_cloud_isolation_command.test.ts`
15. `scripts/plan_content_server_shadow_dual_read_compare.ts`
16. `tests/plan_content_server_shadow_dual_read_compare_command.test.ts`
17. `app/plan_content_pack_index.ts`
18. `app/plan_content_pack_parity.ts`
19. `.codex-tmp/plan-content/staging-upload-20260627/server-shadow-dual-read-report.json`
20. `.codex-tmp/plan-content/staging-upload-20260627/disabled-storage-cloud-isolation.json`
21. `app/course_pack_reviewer_locale_intake.ts`
22. `tests/course_pack_reviewer_locale_intake.test.ts`
23. `scripts/plan_content_disabled_reviewer_locale_intake.ts`
24. `tests/plan_content_disabled_reviewer_locale_intake_command.test.ts`
25. `.codex-tmp/plan-content/staging-upload-20260627/disabled-reviewer-locale-intake.json`
26. `app/course_pack_reviewer_locale_approval_packet.ts`
27. `tests/course_pack_reviewer_locale_approval_packet.test.ts`
28. `scripts/plan_content_reviewer_locale_approval_packet.ts`
29. `tests/plan_content_reviewer_locale_approval_packet_command.test.ts`
30. `.codex-tmp/plan-content/staging-upload-20260627/reviewer-locale-approval-packet.json`
31. `scripts/plan_content_reviewer_locale_approval_intake_dry_run.ts`
32. `tests/plan_content_reviewer_locale_approval_intake_dry_run_command.test.ts`
33. `.codex-tmp/plan-content/staging-upload-20260627/reviewer-locale-approval-intake-dry-run.json`
34. `scripts/plan_content_reviewer_locale_work_order_batches.ts`
35. `tests/plan_content_reviewer_locale_work_order_batches_command.test.ts`
36. `.codex-tmp/plan-content/staging-upload-20260627/reviewer-locale-decision-work-order-batches.json`
37. `scripts/plan_content_reviewer_locale_filled_work_order_validator.ts`
38. `tests/plan_content_reviewer_locale_filled_work_order_validator_command.test.ts`
39. `.codex-tmp/plan-content/staging-upload-20260627/reviewer-locale-filled-work-order-validation.json`
40. `.codex-tmp/plan-content/staging-upload-20260627/activation-readiness-blocker-report.json`

Inspect next:

- `.codex-tmp/plan-content/staging-upload-20260627/pack/manifest.json`;
- `.codex-tmp/plan-content/staging-upload-20260627/server-shadow-dual-read-report.json`;
- `.codex-tmp/plan-content/staging-upload-20260627/disabled-storage-cloud-isolation.json`;
- `.codex-tmp/plan-content/staging-upload-20260627/disabled-reviewer-locale-intake.json`;
- `.codex-tmp/plan-content/staging-upload-20260627/reviewer-locale-approval-packet.json`;
- `.codex-tmp/plan-content/staging-upload-20260627/reviewer-locale-approval-intake-dry-run.json`;
- `.codex-tmp/plan-content/staging-upload-20260627/reviewer-locale-decision-work-order-batches.json`;
- `.codex-tmp/plan-content/staging-upload-20260627/reviewer-locale-filled-work-order-validation.json`;
- `.codex-tmp/plan-content/staging-upload-20260627/activation-readiness-blocker-report.json`.

Expected work:

1. Document the external reviewer/locale batch fill format that the Phase 4I
   validator consumes: a directory of filled batch JSON files
   (`reviewer-locale-batch-NNN.filled.json`, each `{ batchId, rows: [...] }`) or
   a single JSON list artifact, under `.codex-tmp/plan-content/`. Each filled
   row must carry the work-order `rowId` (or the full identity tuple), a
   reviewer decision and a locale decision with real external evidence ids.
2. Coordinate the real external fill: reviewers set
   `reviewerStatus='approved'` with a non-empty external `reviewerEvidenceId`,
   localizers set `localeGateStatus='passed'` with a non-empty external
   `localeEvidenceId`. Tooling must never synthesize these decisions or ids.
3. Run the Phase 4I validator over the real filled batches. It already rejects
   missing rows, duplicate rows, unknown rows, wrong source/target/hash/path,
   non-approved/non-passed decisions and empty evidence ids, and only assembles
   the candidate `plan-content-reviewer-locale-approval-v1` artifact when all
   `546` rows are explicitly reviewed and locale-passed.
4. Feed the validated candidate back into the Phase 4G intake dry-run only after
   the Phase 4I validator returns `PASS`.
5. Keep the Phase 4I validator report `HOLD` until the real external filled
   batches exist; do not synthesize decisions or evidence to force `PASS`.
6. Refresh the activation-readiness blocker report only with real reviewer/
   locale evidence; reviewer approval and locale gates stay `0/546` until the
   external fill is genuinely complete and product-owner activation approval is
   still separately required.
7. Refresh docs and handoff with the exact fill format, validator path and next
   pass plan.

Stop conditions:

- no content movement;
- no Firebase/server runtime upload or remote manifest fetch;
- staging/shadow server copies only with explicit approval and
  `activationApproved=false`;
- no course-pack download;
- no app cache read/write/repair;
- no runtime rollback flag read/write in production code;
- no storage/cloud migration;
- no cloud restore rewrite;
- no automatic reviewer approval;
- no automatic locale gate pass;
- no generated filled approval artifact;
- no fake reviewer/locale evidence ids;
- no studyTarget/sourceLocale mutation;
- no unknown future target fallback to English;
- no Heisenberg/Gustav production generation or apply;
- no broad tests unless explicitly approved.

## Heisenberg Final Goal

Heisenberg has the same end-to-end standard as Gustav, but for source/interface
languages used to learn English.

For every Heisenberg language such as `es`, `pt-BR`, `vi`, `id`, `tr`, `pl` or
future source locales, the final goal is:

- complete source-locale UI/explanation/lesson/quiz/practice/personal-plan/admin
  coverage for `studyTarget=en`;
- isolated source-locale pack artifacts with valid manifests, hashes, schema
  versions, evidence, semantic gates and reviewer status;
- server/downloadable delivery only after loader/cache/offline/no-splash rules
  pass;
- no fallback, copied text, wrong-language leakage, cache mixing, prompt mixing,
  cloud/storage mixing or accidental `studyTarget` mutation;
- explicit production activation approval only after all gates pass.

Heisenberg must not say `ready` merely because translation blocks exist.

## P0 Hard Rules

1. Do not add a new blocking `await` before `setReady(true)`.
2. Do not make `nativeSplashCanHide` depend on language hydration.
3. Do not wait for Firebase, network, manifest, pack download, AI or cloud restore
   before first reveal.
4. Device-locale detection may be synchronous.
5. Stored `app_lang` may hydrate later or piggyback on existing startup work.
6. Existing onboarding flow must remain intact.
7. `bootstrapLocale`, `interfaceLang`, `sourceLocale` and `studyTarget` must stay
   separate.

## Recommended P0 Steps

1. Create a small pure resolver for startup language:
   - input: device locale string;
   - output: enabled bootstrap language;
   - fallback: `ru`;
   - normalize aliases such as `pt_BR` to `pt-BR`.
2. Use the resolver as the initial language snapshot for onboarding/LangContext.
3. Remove or bypass duplicate private onboarding locale detection only where safe.
4. Keep stored `app_lang` hydration non-blocking.
5. Add focused tests:
   - resolver normalization;
   - disabled locale fallback;
   - static/startup guard that no remote/pack language wait blocks reveal.

## Copy-Paste Prompt For A New Session

```text
Ты работаешь в C:\appsprojects\phraseman.

Продолжи работу "Language Pack Retrofit / P0 Bootstrap Locale Without Splash Delay".

Сначала прочитай:
- docs/specs/2026-06-26-language-pack-handoff.md
- docs/specs/2026-06-26-bootstrap-course-pack-master-audit.md
- docs/specs/2026-06-26-language-pack-retrofit-plan.md
- docs/HEISENBERG_LOCALIZATION_PIPELINE.md
- docs/gustav/GUSTAV_TARGET_LANGUAGE_ARCHITECTURE.md
- docs/gustav/GUSTAV_BRAIN.md

Текущая задача: начать P0, то есть сделать bootstrapLocale для первого onboarding screen без увеличения splash.

Жёсткие правила:
- не добавлять новый blocking await перед setReady(true);
- не привязывать nativeSplashCanHide к langHydrated/packReady/manifestReady/downloadReady/networkReady;
- не ждать Firebase/network/course-pack/AI/cloud restore до первого reveal;
- не трогать course packs, Firebase uploads, Gustav/Heisenberg generation, storage migrations;
- не удалять функциональность onboarding.

Работай только в рамках P0:
- app/_layout.tsx
- components/onboarding.tsx
- components/LangContext.tsx
- constants/i18n.ts
- app/config.ts
- app/source_locales.ts
- focused tests if needed

Сначала коротко подтверди, что прочитал handoff и перечисли P0 plan.
Потом реализуй P0 аккуратно и проверь focused gates.
```

## Completion Criteria For P0

P0 is done only when:

- first onboarding language can be resolved before first onboarding render;
- splash timing contract is unchanged;
- stored language hydration is non-blocking;
- disabled/planned languages do not become full UI languages accidentally;
- focused tests or static checks prove the above;
- no course-pack/download/cloud/generation behavior was introduced.
