# Plan Content Extraction And Dual-Read Activation Plan

Date: 2026-06-26
Status: report-only Phase 3R runtime ignore guard plan

This plan defines how `plan_content` can later move from bundled TypeScript
payloads to downloadable/server-hosted packs without breaking midway production
releases. It does not move payload files, upload to Firebase/server, fetch remote
manifests, enable downloads, write cache files or activate runtime packs.

## Current Safe State

Runtime today:

- `app/plan_content_registry.ts` is the single direct import seam for the large
  `app/plan_content_*` modules.
- App screens call `app/plan_content_readiness.ts`, not the registry directly.
- `app/course_pack_loader.ts` has `COURSE_PACK_REMOTE_LOADING_ENABLED=false`.
- `surface='plan_content'` resolves to `offline_fallback` with
  `delivery='bundled_compatibility'`.
- The embedded course-pack index has `activationApproved=false`.

Production invariant:

- bundled compatibility remains the source of truth until a surface has passed
  manifest, cache, dual-read parity, offline and rollback gates;
- server copies before activation are shadow artifacts only;
- a production release can ship midway because it does not require a server pack.

## Future Pack Shape

Recommended manifest:

```text
packId = en.<sourceLocale>.plan_content.<contentVersion>
studyTarget = en
sourceLocale = ru | uk | es | pt-BR | vi | id | tr | pl | future normalized source locale
surface = plan_content
schemaVersion = course-pack-v1
contentVersion = yyyy.mm.dd.N
entryIndex = plan-content/index.json
activationApproved = false until explicit release gate
```

Recommended `plan-content/index.json`:

```json
{
  "schemaVersion": "plan-content-index-v1",
  "studyTarget": "en",
  "sourceLocale": "ru",
  "contentVersion": "2026.06.26.1",
  "entries": [
    {
      "planId": "voyazh",
      "dayIndex": 1,
      "path": "plans/voyazh/day-001.json",
      "contentHash": "<sha256-of-normalized-row>",
      "sourceLocale": "ru",
      "studyTarget": "en",
      "reviewStatus": "approved",
      "localeGateStatus": "passed",
      "schemaVersion": "plan-content-day-v1"
    }
  ]
}
```

Required row metadata in each day payload:

- `planId`;
- `dayIndex`;
- `studyTarget`;
- `sourceLocale`;
- `schemaVersion`;
- `contentVersion`;
- `contentHash`;
- `reviewStatus`;
- `localeGateStatus`;
- `generatedBy`;
- `generatedAt`;
- `sourceGraphHash`;
- `pedagogyContractVersion`;
- `adapterContractVersion`.

## Dual-Read Parity

Before any runtime activation, a shadow pack must be compared against bundled
registry output.

Parity inputs:

- bundled `PlanContentDay` from `getAuthoredPlanContentDay(planId, dayIndex)`;
- shadow pack `PlanContentDay` loaded from the future pack artifact;
- runtime adapter outputs:
  - `contentDayToLessonIntroScreens(day)`;
  - `contentDayToLessonPhrases(day)`;
  - `contentVocabularyToRuntimeCards(day)` when the callsite exists.

Required parity checks:

- entry count matches for every bundled authored `planId/dayIndex`;
- no extra active rows appear unless they are explicitly marked shadow-only;
- `planId`, `dayIndex`, `studyTarget` and `sourceLocale` match in index and row;
- normalized row hash matches the manifest/index hash;
- intro screen count and text match expected compatibility output;
- phrase count, phrase ids after runtime re-keying, English, source meanings,
  explanations, POS words and distractors match adapter output;
- missing bundled days keep the same template-fallback decision;
- corrupt/stale/missing shadow rows do not alter runtime output;
- app behavior remains identical while remote loading is disabled.

Parity report required fields:

- manifest id and hash;
- app git commit or source snapshot id;
- compared plan/day count;
- added shadow-only rows;
- missing rows;
- hash mismatches;
- adapter output mismatches;
- fallback decision mismatches;
- reviewer decision summary;
- final verdict: `hold`, `shadow_parity_passed`, or `activation_candidate`.

## Activation Gates

`activationApproved` may become `true` only after all gates pass:

1. Manifest validates with `CoursePackManifest`.
2. Entry index validates against `plan-content-index-v1`.
3. Every row validates against `PlanContentDay` schema and plan-content gates.
4. Dual-read parity passes against bundled output.
5. Offline cache read/write/integrity gates pass.
6. Rollback can force bundled compatibility without app update.
7. Splash/onboarding/startup still do not fetch packs.
8. Storage/cloud sync is proven unrelated to source-locale pack switching.
9. Wrong-language and fallback gates pass for the target source locale.
10. Product owner explicitly approves activation.

Until then, server packs remain shadow-only.

## Rollback Rules

Rollback must be possible without deleting user progress or requiring an app
update.

Required rollback controls:

- remote kill switch sets `activationApproved=false`;
- loader falls back to bundled compatibility on missing/corrupt/stale pack;
- cached corrupt pack is ignored, not repaired into source files;
- no storage/cloud migration runs as part of pack rollback;
- user progress keys remain scoped as they were before activation;
- telemetry/reporting records fallback reason without exposing wrong content.

## Midway Release Rule

If production is released while this work is incomplete:

- keep bundled `app/plan_content_*` modules in the app;
- keep `COURSE_PACK_REMOTE_LOADING_ENABLED=false`;
- keep server copies shadow-only;
- do not make first launch, onboarding, personal plan, theory or phrase lessons
  depend on Firebase/server availability;
- do not delete or shrink bundled content until a later explicit removal pass
  proves parity, offline cache and rollback.

## Phase 3J Validator Status

Implemented:

- `app/plan_content_pack_index.ts`
- `tests/plan_content_pack_index.test.ts`

The validator accepts shadow indexes only when source/target dimensions, paths,
hashes, schema tokens and statuses are explicit and normalized. Activation-ready
validation requires approved review and passed locale gates.

## Phase 3K Parity Validator Status

Implemented:

- `app/plan_content_pack_parity.ts`
- `tests/plan_content_pack_parity.test.ts`

The validator accepts parity reports only when identity, counts, mismatch lists,
reviewer summaries and verdicts are internally consistent. `activation_candidate`
is impossible with added/missing rows, hash mismatches, adapter mismatches,
fallback mismatches, non-approved review statuses or non-passed locale gates.

## Phase 3L Dry-Run Reporter Status

Implemented:

- `app/plan_content_pack_dry_run.ts`
- `tests/plan_content_pack_dry_run.test.ts`

The reporter builds a validated `plan-content-parity-report-v1` from bundled
compatibility data only. It checks intro, phrase and vocabulary adapter row
counts, defaults to `hold`, may only be promoted to `shadow_parity_passed`, and
never emits `activation_candidate`. It is disconnected from startup, network,
storage, Firebase/server and loader runtime.

## Phase 3M Dry-Run Report Command Status

Implemented:

- `scripts/plan_content_dry_run_parity_report.ts`
- `tests/plan_content_dry_run_report_command.test.ts`

The command writes a validated local parity report only under the ignored
`.codex-tmp/plan-content/` tree. It validates before writing, re-reads and
validates after writing, fails closed on blocking mismatches or accidental
`activation_candidate`, and rejects output paths outside the ignored
plan-content report directory. It does not upload, download, cache, move
payloads or activate runtime.

## Phase 3N Shadow Artifact Exporter Status

Implemented:

- `scripts/plan_content_shadow_pack_export.ts`
- `tests/plan_content_shadow_pack_export_command.test.ts`

The exporter writes local shadow `plan_content` artifacts only under
`.codex-tmp/plan-content/`: `index.json` plus per-day
`plans/<planId>/day-001.json` rows. Rows are metadata-wrapped
`plan-content-day-v1` artifacts with `studyTarget='en'`,
`reviewStatus='shadow'` and `localeGateStatus='hold'`. Content hashes are
computed from canonical bundled `PlanContentDay` JSON, the generated index is
validated, every row is re-read after write, and output outside the ignored tree
is rejected. It does not move payloads into runtime or activate packs.

## Phase 3O Dual-Read Comparator Status

Implemented:

- `scripts/plan_content_shadow_pack_parity_compare.ts`
- `tests/plan_content_shadow_pack_parity_compare_command.test.ts`

The comparator reads exported local shadow artifacts from
`.codex-tmp/plan-content/`, validates the index, compares every shadow row
against bundled registry data, compares runtime adapter output for intro
screens, phrases and vocabulary cards, and writes a real
`plan-content-parity-report-v1` from the shadow files. Clean artifacts produce
`shadow_parity_passed`; changed rows persist a `hold` report and exit non-zero.
It does not move payloads into runtime or activate packs.

## Phase 3P Manifest Wrapper Status

Implemented:

- `scripts/plan_content_course_pack_manifest_wrap.ts`
- `tests/plan_content_course_pack_manifest_wrap_command.test.ts`

The wrapper creates a valid local `CoursePackManifest` for the exported shadow
pack and a separate `activation-guard.json` with `activationApproved=false`,
`remoteLoadingEnabled=false`, `runtimeConnected=false` and `serverStaged=false`.
It requires a clean `shadow_parity_passed` report before writing. It does not
move payloads into runtime or activate packs.

## Phase 3Q Release-Bundle Verifier Status

Implemented:

- `scripts/plan_content_release_bundle_verify.ts`
- `tests/plan_content_release_bundle_verify_command.test.ts`

The verifier checks `manifest.json`, `activation-guard.json`, `index.json`, all
day rows and the parity report together, then emits
`plan-content-local-release-readiness-v1` under `.codex-tmp/plan-content/`.
Clean local bundles produce `PASS` while still recording
`activationApproved=false`; unsafe guard flags produce a persisted `HOLD` report
and non-zero exit. It does not move payloads into runtime or activate packs.

## Phase 3R Runtime Ignore Guard Status

Implemented:

- `tests/plan_content_local_artifact_runtime_ignore.test.ts`

The guard proves local manifest/readiness artifacts under
`.codex-tmp/plan-content/` do not affect runtime readiness. `plan_content`
continues to resolve to bundled compatibility while remote loading is disabled,
and embedded `plan_content` index entries remain bundled-only,
`activationApproved=false` and manifest-free.

## Phase 3S Server-Staging Descriptor Status

Implemented:

- `scripts/plan_content_server_staging_descriptor.ts`
- `tests/plan_content_server_staging_descriptor_command.test.ts`

The descriptor maps verified local release-bundle artifacts to future
server/staging object paths without making network, Firebase, cache, download or
runtime writes. It requires a valid manifest, activation guard, readiness report
and index, emits only under `.codex-tmp/plan-content/`, and records
`activationApproved=false`, `runtimeManifestRegistered=false`,
`networkCalls=false` and `localOnly=true`. Clean local evidence produces
`READY_FOR_STAGING_REVIEW`; non-PASS readiness evidence produces `HOLD` and a
non-zero exit. It does not move payloads into runtime or activate packs.

## Phase 3T Server-Staging Approval Review Status

Implemented:

- `scripts/plan_content_server_staging_approval_review.ts`
- `tests/plan_content_server_staging_approval_review_command.test.ts`

The approval review reads the local server-staging descriptor and emits a local
review packet only under `.codex-tmp/plan-content/`. Clean descriptor evidence
produces `AWAITING_EXPLICIT_APPROVAL` while recording
`activationApproved=false`, `approvedForServerWrite=false`,
`serverWritePermitted=false`, `stagingWriterAllowed=false`,
`runtimeManifestRegistered=false`, `networkCalls=false` and `localOnly=true`.
HOLD descriptor evidence fails closed with a persisted `HOLD` review and a
non-zero exit. It does not make server writes or activate packs.

## Phase 3U-A Server-Staging Writer Dry-Run Status

Implemented:

- `scripts/plan_content_server_staging_writer.ts`
- `tests/plan_content_server_staging_writer_command.test.ts`

The dry-run writer reads the descriptor plus approval-review packet and emits a
would-write staging plan only under `.codex-tmp/plan-content/`. Clean evidence
produces `DRY_RUN_READY` while recording `mode='dry_run'`,
`activationApproved=false`, `approvedForServerWrite=false`,
`serverWritePermitted=false`, `actualServerWrites=false`,
`runtimeManifestRegistered=false`, `networkCalls=false` and `localOnly=true`.
The `--apply` flag is explicitly rejected with a persisted `HOLD` plan. Local
files are re-hashed against descriptor evidence before the plan is accepted. It
does not make server writes or activate packs.

## Phase 3U-B Server-Staging Apply Preflight Status

Implemented:

- `scripts/plan_content_server_staging_apply_preflight.ts`
- `tests/plan_content_server_staging_apply_preflight_command.test.ts`

The apply preflight reads the dry-run writer plan plus an explicit real-apply
approval file and emits a local report only under `.codex-tmp/plan-content/`.
Missing approval produces `HOLD`. Valid staging/shadow approval produces
`APPLY_PREFLIGHT_READY` while recording `mode='preflight_only'`,
`serverWritePermitted=false`, `actualServerWrites=false`,
`activationApproved=false`, `runtimeManifestRegistered=false`,
`networkCalls=false` and `localOnly=true`. Unsafe approval flags such as
production environment, runtime manifest registration, remote loading,
bundled-content removal, storage migration or production activation fail
closed. It does not make server writes or activate packs.

## Phase 3U-C Apply-Capable Staging Writer Status

Implemented:

- `scripts/plan_content_server_staging_apply.ts`
- `tests/plan_content_server_staging_apply_command.test.ts`

The apply-capable writer reads the apply-preflight report, dry-run writer plan
and real-apply approval file. By default it writes a dry-run apply report only
under `.codex-tmp/plan-content/` with `serverWritePermitted=false`,
`actualServerWrites=false`, `activationApproved=false`,
`runtimeManifestRegistered=false`, `remoteLoadingEnabled=false`,
`bundledContentRemoved=false`, `storageMigrationRan=false` and
`productionActivationApproved=false`. The `--apply` path is blocked before
network unless `PHRASEMAN_PLAN_CONTENT_STAGING_APPLY=staging_shadow_only`,
`PHRASEMAN_PLAN_CONTENT_STAGING_BUCKET` and
`PHRASEMAN_PLAN_CONTENT_STAGING_ACCESS_TOKEN` are present. No real `--apply`
upload was executed while implementing this gate.

## Phase 3U-D First Staging/Shadow Upload Status

Completed:

- pack id: `en.ru.plan_content.staging.shadow.20260627.1`;
- content version: `staging.shadow.20260627.1`;
- staging prefix:
  `course-packs/plan_content/en/ru/staging.shadow.20260627.1/`;
- local evidence directory:
  `.codex-tmp/plan-content/staging-upload-20260627/`;
- apply report:
  `.codex-tmp/plan-content/staging-upload-20260627/server-staging-apply-report.json`;
- apply status: `APPLY_COMPLETE`;
- actual server writes: `true`;
- uploaded operations: `551`;
- remote verification passed after upload: expected `551`, found `551`,
  missing `0`, size mismatches `0`, sha256 checked `551`, sha256 mismatches
  `0`.

The upload remains staging/shadow evidence only. No runtime manifest was
registered, no remote loading was enabled, no bundled content was removed, no
storage/cloud migration ran and no production activation occurred.

## Phase 3V Reusable Remote Shadow Verification Status

Implemented:

- `scripts/plan_content_server_staging_remote_verify.ts`;
- `tests/plan_content_server_staging_remote_verify_command.test.ts`.

The verifier reads a completed apply report, requires all activation/runtime
flags to remain false, lists the staging prefix, compares object count and byte
sizes, downloads every expected server object with bounded concurrency and
checks every sha256 against the apply report. The real reusable report is:

```text
.codex-tmp/plan-content/staging-upload-20260627/server-staging-remote-verify.json
```

That report passed with expected `551`, found `551` and hash checked `551`.
The verifier is CLI/report tooling only; it does not register a runtime
manifest, enable remote loading, remove bundled content, migrate storage or
activate production.

## Phase 3W Server-Shadow Dual-Read Comparator Status

Implemented:

- `scripts/plan_content_server_shadow_dual_read_compare.ts`;
- `tests/plan_content_server_shadow_dual_read_compare_command.test.ts`.

The comparator reads the reusable remote verification report, downloads the
remote `index.json` and every comparable remote day row from the staging prefix,
compares remote server-shadow content against bundled compatibility and adapter
output, and writes a report only under `.codex-tmp/plan-content/`.

The real server-shadow dual-read report is:

```text
.codex-tmp/plan-content/staging-upload-20260627/server-shadow-dual-read-report.json
```

That report passed with remote expected `551`, remote found `551`, remote hash
checked `551`, remote index entries `546`, server shadow rows read `546`,
compared bundled days `546`, verdict `shadow_parity_passed`, and zero hash,
adapter, artifact or blocker mismatches. The comparator is CLI/report tooling
only; it does not register a runtime manifest, enable remote loading, remove
bundled content, migrate storage or activate production.

## Phase 3X Disabled Loader/Cache/Offline/Rollback Contract Status

Implemented:

- `app/course_pack_runtime_policy.ts`;
- `tests/course_pack_runtime_policy_contract.test.ts`.

The disabled runtime policy defines the future loader/cache/offline/rollback
contract while keeping every remote/cache/activation capability false. The only
content-providing path remains existing bundled compatibility fallback.
Selection-required, missing, future `downloading`, future `ready`, `corrupt`
and `stale` states fail closed without manifest fetch, pack download, cache
read/write/repair, storage migration, runtime manifest registration,
bundled-content removal or production activation.

## Phase 3Y Disabled Manifest Registry/Cache Preflight Status

Implemented:

- `app/course_pack_manifest_registry_preflight.ts`;
- `tests/course_pack_manifest_registry_preflight.test.ts`;
- `scripts/plan_content_disabled_manifest_registry_preflight.ts`;
- `tests/plan_content_disabled_manifest_registry_preflight_command.test.ts`.

The preflight evaluates the real staging manifest against remote verification
and server-shadow dual-read evidence, but keeps manifest registry, runtime
registration, manifest fetch, pack download, cache read/write/repair, storage
migration, bundled-content removal and production activation disabled. The real
report is:

```text
.codex-tmp/plan-content/staging-upload-20260627/disabled-manifest-registry-preflight.json
```

That report passed while keeping `registryEntryAllowed=false`,
`cacheMetadataReadableByRuntime=false`,
`cacheMetadataWritableByRuntime=false`, `manifestFetchApproved=false`,
`packDownloadApproved=false`, `cacheReadApproved=false` and
`cacheWriteApproved=false`.

## Phase 3Z Disabled Runtime Manifest Candidate Status

Implemented:

- `app/course_pack_runtime_manifest_candidate.ts`;
- `tests/course_pack_runtime_manifest_candidate.test.ts`;
- `scripts/plan_content_disabled_runtime_manifest_candidate.ts`;
- `tests/plan_content_disabled_runtime_manifest_candidate_command.test.ts`.

The candidate gate evaluates the complete evidence bundle for a future runtime
manifest while keeping it non-registrable. The real report is:

```text
.codex-tmp/plan-content/staging-upload-20260627/disabled-runtime-manifest-candidate.json
```

That report passed with `evidenceBundleComplete=true` while keeping
`runtimeManifestRegistrable=false`, `runtimeManifestRegistered=false`,
`runtimeLookupAllowed=false`, `cacheLookupAllowed=false`,
`cacheReadAllowed=false`, `cacheWriteAllowed=false` and
`startupBlockingAllowed=false`.

## Phase 4A Activation-Readiness Blocker Report Status

Implemented:

- `app/course_pack_activation_readiness.ts`;
- `tests/course_pack_activation_readiness.test.ts`;
- `scripts/plan_content_activation_readiness_blocker_report.ts`;
- `tests/plan_content_activation_readiness_blocker_report_command.test.ts`.

The blocker report reads the real staging manifest, remote verification,
server-shadow dual-read, disabled manifest preflight and disabled runtime
candidate evidence, then emits one activation-readiness matrix under
`.codex-tmp/plan-content/`.

The real report is:

```text
.codex-tmp/plan-content/staging-upload-20260627/activation-readiness-blocker-report.json
```

That report is intentionally `HOLD`: completed gates `8`, blocked gates `6`,
evidence blockers `0`, startup no-fetch guard `PASS`. Remaining blockers are
reviewer approval `0/546`, locale gates `0/546`, offline cache integrity,
rollback kill-switch, storage/cloud isolation and product-owner activation
approval.

The report is CLI/evidence tooling only. It does not register a runtime
manifest, enable remote loading, read or write a runtime cache, remove bundled
content, migrate storage/cloud state or activate production.

## Phase 4B Disabled Offline Cache Integrity Report Status

Implemented:

- `app/course_pack_offline_cache_integrity.ts`;
- `tests/course_pack_offline_cache_integrity.test.ts`;
- `scripts/plan_content_disabled_offline_cache_integrity.ts`;
- `tests/plan_content_disabled_offline_cache_integrity_command.test.ts`.

The report validates staged pack cache identity and integrity evidence while
keeping runtime cache lookup/read/write/repair disabled. It requires clean
remote verification counts, manifest-derived cache key, disabled manifest
preflight evidence and disabled runtime manifest candidate evidence.

The real report is:

```text
.codex-tmp/plan-content/staging-upload-20260627/disabled-offline-cache-integrity.json
```

That report passed with expected objects `551`, found objects `551`, hash
checked `551`, evidence blockers `0`, blockers `0` and
`offlineCacheUsableByRuntime=false`. The activation-readiness report was
refreshed with this evidence and is now `HOLD` with completed gates `9`, blocked
gates `5` and evidence blockers `0`.

The report is CLI/evidence tooling only. It does not register a runtime
manifest, enable remote loading, download a pack, read/write/repair a runtime
cache, remove bundled content, migrate storage/cloud state or activate
production.

## Phase 4C Disabled Rollback Kill-Switch Report Status

Implemented:

- `app/course_pack_rollback_kill_switch.ts`;
- `tests/course_pack_rollback_kill_switch.test.ts`;
- `scripts/plan_content_disabled_rollback_kill_switch.ts`;
- `tests/plan_content_disabled_rollback_kill_switch_command.test.ts`.

The report validates that rollback remains report-only and disabled while a
future activation can return to bundled compatibility without an app update,
without deleting user progress, without mutating storage/cloud state, without
downloading a pack and without reading/writing/repairing runtime cache.

The real report is:

```text
.codex-tmp/plan-content/staging-upload-20260627/disabled-rollback-kill-switch.json
```

That report passed with `rollbackMode='bundled_compatibility'`,
`rollbackDeletesUserProgress=false`, `rollbackMutatesStorageOrCloud=false`,
evidence blockers `0` and blockers `0`. The activation-readiness report was
refreshed with this evidence and is now `HOLD` with completed gates `10`,
blocked gates `4` and evidence blockers `0`.

The report is CLI/evidence tooling only. It does not register a runtime
manifest, enable remote loading, download a pack, read/write/repair a runtime
cache, remove bundled content, mutate storage/cloud state, add rollback runtime
flags or activate production.

## Phase 4D Disabled Storage/Cloud Isolation Report Status

Implemented:

- `app/course_pack_storage_cloud_isolation.ts`;
- `tests/course_pack_storage_cloud_isolation.test.ts`;
- `scripts/plan_content_disabled_storage_cloud_isolation.ts`;
- `tests/plan_content_disabled_storage_cloud_isolation_command.test.ts`.

The report validates storage/cloud isolation evidence for the staged pack while
keeping storage migration, cloud restore rewrite, study-target mutation,
source-locale mutation, runtime manifest registration, remote loading and cache
read/write disabled. It treats legacy flat cloud progress as English-only,
requires scoped French target keys to stay independent, proves app language does
not mutate `studyTarget`, and records personal-plan scope as a deliberate
decision instead of silently migrating it.

The real report is:

```text
.codex-tmp/plan-content/staging-upload-20260627/disabled-storage-cloud-isolation.json
```

That report passed with legacy flat cloud target `en`,
`appLanguageMutatesStudyTarget=false`,
`personalPracticeSourceScopesSeparate=true`,
`lessonListeningProgressTargetAware=true`, evidence blockers `0` and blockers
`0`. The activation-readiness report was refreshed with this evidence and is
now `HOLD` with completed gates `11`, blocked gates `3` and evidence blockers
`0`.

The report is CLI/evidence tooling only. It does not register a runtime
manifest, enable remote loading, download a pack, read/write/repair a runtime
cache, remove bundled content, migrate storage/cloud state, rewrite cloud
restore, mutate target/source language or activate production.

## Phase 4E Disabled Reviewer/Locale Intake Status

Implemented:

- `app/course_pack_reviewer_locale_intake.ts`;
- `tests/course_pack_reviewer_locale_intake.test.ts`;
- `scripts/plan_content_disabled_reviewer_locale_intake.ts`;
- `tests/plan_content_disabled_reviewer_locale_intake_command.test.ts`.

The intake separates shadow parity from explicit reviewer and locale approval.
It writes a report-only queue from the staged pack index and refuses to treat
upload success, parity success or server-shadow metadata as approval.

The real report is:

```text
.codex-tmp/plan-content/staging-upload-20260627/disabled-reviewer-locale-intake.json
```

That report is intentionally `HOLD` with `safetyStatus='PASS'`,
`approvalStatus='HOLD'`, reviewer approved rows `0/546`, locale passed rows
`0/546`, missing reviewer rows `546`, missing locale rows `546` and evidence
blockers `0`. The activation-readiness report was refreshed with this evidence
and remains `HOLD` with completed gates `11`, blocked gates `3` and evidence
blockers `0`.

The report is CLI/evidence tooling only. It does not approve reviewer status,
pass locale gates, register a runtime manifest, enable remote loading, download
a pack, read/write/repair a runtime cache, remove bundled content, migrate
storage/cloud state, rewrite cloud restore or activate production.

## Phase 4F Explicit Reviewer/Locale Approval Packet Status

Implemented:

- `app/course_pack_reviewer_locale_approval_packet.ts`;
- `tests/course_pack_reviewer_locale_approval_packet.test.ts`;
- `scripts/plan_content_reviewer_locale_approval_packet.ts`;
- `tests/plan_content_reviewer_locale_approval_packet_command.test.ts`.

The packet builder reads the disabled reviewer/locale intake queue and emits a
review packet without approving any row. Filled approval artifacts are validated
separately and must match pack identity, source locale, study target, content
hashes and runtime/storage guard flags before they can be trusted.

The real report is:

```text
.codex-tmp/plan-content/staging-upload-20260627/reviewer-locale-approval-packet.json
```

That report is `PASS` with packet status `READY_FOR_REVIEW`, queued rows `546`,
packet reviewer approved rows `0/546`, packet locale passed rows `0/546`,
filled artifact validation `missing`, activation approval complete `false` and
blockers `0`.

The report is CLI/evidence tooling only. It does not create filled approvals,
approve reviewer status, pass locale gates, register a runtime manifest, enable
remote loading, download a pack, read/write/repair a runtime cache, remove
bundled content, migrate storage/cloud state, rewrite cloud restore or activate
production.

## Phase 4G Explicit Approval Artifact Intake Dry-Run Status

Implemented:

- `scripts/plan_content_reviewer_locale_approval_intake_dry_run.ts`;
- `tests/plan_content_reviewer_locale_approval_intake_dry_run_command.test.ts`.

The dry-run consumes the Phase 4F packet and an optional external filled
approval artifact. Missing filled artifacts persist a visible `HOLD`; supplied
artifacts must pass packet validation before being fed back into the disabled
reviewer/locale intake gate.

The real report is:

```text
.codex-tmp/plan-content/staging-upload-20260627/reviewer-locale-approval-intake-dry-run.json
```

That report is `HOLD` with dry-run status `MISSING_FILLED_ARTIFACT`, filled
artifact validation `missing`, intake status `missing`, reviewer approved rows
`0/546`, locale passed rows `0/546` and blockers `1`.

The report is CLI/evidence tooling only. It does not generate filled approvals,
fake evidence ids, register a runtime manifest, enable remote loading, download
a pack, read/write/repair a runtime cache, remove bundled content, migrate
storage/cloud state, rewrite cloud restore or activate production.

## Phase 4H Reviewer/Locale Decision Work-Order Batch Status

Implemented:

- `scripts/plan_content_reviewer_locale_work_order_batches.ts`;
- `tests/plan_content_reviewer_locale_work_order_batches_command.test.ts`.

The work-order writer reads the Phase 4F packet and Phase 4G dry-run report,
then splits the 546 queued rows into deterministic batches without filling any
decision or evidence field.

The real report is:

```text
.codex-tmp/plan-content/staging-upload-20260627/reviewer-locale-decision-work-order-batches.json
```

That report is `PASS` with work-order status `READY_FOR_REVIEW`, rows `546`,
batches `22`, reviewer approved rows `0/546`, locale passed rows `0/546`,
generated filled approval artifact `false` and blockers `0`.

The report is CLI/evidence tooling only. It does not generate filled approvals,
fake evidence ids, register a runtime manifest, enable remote loading, download
a pack, read/write/repair a runtime cache, remove bundled content, migrate
storage/cloud state, rewrite cloud restore or activate production.

## Next Implementation Slice

Recommended next safe slice:

```text
Phase 4I - plan_content filled work-order batch validator and approval artifact candidate
```

Scope:

- validate externally filled work-order batches against the Phase 4H work-order;
- assemble a candidate filled approval artifact only when every row is explicit,
  unique, source/target/hash matched and evidence-backed;
- keep missing external filled batches as `HOLD`;
- keep remote loading and activation disabled;
- keep any implementation behind `COURSE_PACK_REMOTE_LOADING_ENABLED=false`;
- keep `activationApproved=false` and runtime manifest registration disabled;
- keep cache lookup, cache read, cache write and cache repair disabled;
- keep storage/cloud migration and cloud restore rewrites disabled;
- keep server copies staging/shadow only;
- keep all `plan_content_*` payload files bundled and untouched until dual-read,
  cache, offline, rollback, storage/cloud, reviewer and locale gates are
  accepted.

Stop conditions:

- no Firebase/server write without explicit approval;
- no runtime manifest registration;
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
