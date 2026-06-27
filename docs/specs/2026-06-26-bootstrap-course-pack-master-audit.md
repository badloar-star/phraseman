# Bootstrap And Course Pack Master Audit

Date: 2026-06-26
Status: master read-only synthesis

This document merges the parallel read-only audit reports for startup bootstrap,
bundle size, storage/cloud sync, AI gates, Heisenberg, Gustav and QA.

It does not approve app code changes, production apply, Firebase uploads, content
generation, storage migrations, reviewer decision import or broad test runs.

## 1. Master Verdict

Overall verdict: `HOLD` for production course-pack/app activation.

P0 bootstrap locale is allowed to move into implementation planning because both
bootstrap reports agree it can be done without extending splash timing, if and
only if it remains synchronous or piggybacks on existing local startup work.

Downloadable course packs are not implementation-ready yet because the app is
still missing:

- a runtime `CoursePackManifest`;
- a pack cache/download/integrity layer;
- async loaders for lesson, quiz, plan and generated asset metadata;
- cloud restore separation for legacy English versus target-scoped progress;
- AI fail-closed language handling across all generated surfaces;
- Heisenberg and Gustav pack-output contracts;
- an initial bundle-size baseline and enforcement gate.

## 2. Report Verdicts

| Workstream | Verdict | Master interpretation |
| --- | --- | --- |
| Bootstrap / Onboarding | `PASS for P0, with strict constraints` | Safe to implement only as sync snapshot or existing-budget/local hydration. No new await before `setReady(true)`. |
| Bundle / Payloads | `HOLD` | Heavy content is imported as TS modules under `app/`; extraction needs loaders and manifests first. |
| Storage / Cloud Sync | `HOLD` | Local French paths are mostly target-aware, but cloud restore remains flat and legacy raw keys must be English-only. |
| AI Gates | `HOLD` | Main rejected-output paths are mostly safe, but unknown language/target fallback, cache dimensions and premium dialog send need hardening. |
| Heisenberg | `HOLD for downloadable packs` | Current pipeline audits batch source locales, but outputs still assume app-bundled surfaces; pack artifact contract is required. |
| Gustav | `HOLD for app-ready downloadable target pack` | Isolated generation/reviewer work is possible, but app activation/apply and unique native/adapted pack release are blocked. |
| QA | `HOLD for production gate` | P0 focused tests can be written; course-pack tests need manifest/loader design and bundle baseline first. |

## 3. Confirmed Safe Path

The only safe first implementation slice is P0:

1. create a pure synchronous `bootstrapLocale` resolver;
2. use it as the first local language snapshot;
3. let stored `app_lang` hydrate later or piggyback on already existing local
   startup reads;
4. feed onboarding from this bootstrap value;
5. keep `nativeSplashCanHide` independent from language hydration, network,
   Firebase, manifests and downloads;
6. add focused gates proving startup timing is unchanged.

P0 must not include course-pack download, Firebase Storage, remote manifest fetch,
AI calls, cloud restore changes, or language-content generation.

## 4. Shared Blockers

### 4.1 Splash Timing

Both bootstrap reports agree:

- no new sequential `await AsyncStorage.getItem('app_lang')` before
  `setReady(true)`;
- no `langHydrated` dependency in `nativeSplashCanHide`;
- no Firebase/network/course-pack/AI work before first reveal;
- keep the current safety timer and local hydration budget unchanged.

### 4.2 Bundle Architecture

The bundle report confirms that large content is currently app-bundled:

- `app/plan_content_{impuls,gavan,mitap,voyazh,echo}.ts`;
- `app/quiz_data.ts`;
- `app/quiz_source_locale_payloads.ts`;
- lesson data and generated source-locale payloads;
- generated audio URL/metadata maps.

These cannot simply be moved remote. Runtime surfaces currently assume synchronous
data. Each surface needs loading, missing-pack, ready and offline-cache states.

### 4.3 Cloud Restore

Storage/cloud reports agree:

- raw legacy learning keys must be treated as `studyTarget=en`;
- French/future target progress must not hydrate from legacy raw keys;
- `SYNC_KEYS` is still one flat inventory mixing global, raw English legacy and
  scoped French keys;
- restore branch selection currently uses global XP/streak, not per-target state;
- personal plan state remains pending classification.

### 4.4 AI Language Contract

AI report confirms:

- explain/choice/quiz/compass/mistake/weekly/stats/translate mostly avoid
  returning judged rejected output live;
- gaps remain for unknown `studyTarget` and unknown language fallback;
- cache keys are not consistently `studyTarget/sourceLocale/bridgeLang` aware;
- `premiumDialogSend` needs bridge-aware post-generation language gate;
- Latin-script wrong-language tests are still required.

### 4.5 Heisenberg Contract

Heisenberg report confirms:

- current Heisenberg already services batch source locales for English learning;
- it is not a study-target generator;
- future outputs must be isolated downloadable source-locale artifacts, not new
  large app-bundled arrays;
- audit commands can write report artifacts, while apply/repair-apply/content
  generation commands are forbidden during audit.

### 4.6 Gustav Contract

Gustav report confirms:

- Gustav can continue isolated generation/reviewer-pipeline work;
- app-ready downloadable target pack release is not ready;
- direct translation is not acceptable as default;
- each row needs research evidence, pedagogy blueprint, transformation type,
  grammar cluster, anti-calque decision and reviewer status before activation;
- app apply remains blocked without reviewer decisions, storage/cloud readiness,
  admin sync map, rollback/migration/test plan and explicit approval.

## 5. Master Backlog

### P0 - Bootstrap Locale Without Splash Delay

Goal: first onboarding screen can use a local bootstrap language without startup
delay.

Required work:

- extract pure locale resolver;
- normalize locale codes such as `pt_BR` to `pt-BR`;
- add disabled-locale fallback;
- pass initial bootstrap language to onboarding or shared context;
- avoid waiting for storage/network;
- add static and focused startup tests.

Exit gates:

- no new await before `setReady(true)`;
- `nativeSplashCanHide` does not depend on language hydration;
- onboarding first screen is non-blank offline;
- launch timing budget unchanged.

### P1 - Course Pack Manifest And Loader Design

Goal: define pack identity before moving content.

Required work:

- define `CoursePackManifest`;
- define cache key: `studyTarget/sourceLocale/schema/version/hash`;
- define states: missing, downloading, ready, corrupt, stale, offline fallback;
- define minimal embedded index for availability checks;
- ensure downloads happen after onboarding/source+target selection only.

Exit gates:

- manifest schema test;
- cache isolation test;
- no pre-onboarding download test.

### P2 - Cloud/Storage Mapping Before Activation

Goal: make cloud restore safe before any French/future target activation.

Required work:

- map every `SYNC_KEYS` entry as global, sourceLocale, target.en legacy,
  target-scoped, source+target, drop or blocked_unknown;
- decide personal plan state scope;
- define additive migration only, with no destructive delete;
- prove legacy flat cloud hydrates English only.

Exit gates:

- cloud restore separation tests;
- legacy English does not appear in French target state;
- `app_lang/lang` never mutates `studyTarget`.

### P3 - AI Language Hardening

Goal: generated visible AI text cannot leak wrong language or target.

Required work:

- make unknown `studyTarget` fail closed;
- remove silent `ru/en` fallback in weekly/stats paths;
- add `sourceLocale/studyTarget/aiOutputLang/bridgeLang` prompt dimensions;
- extend cache keys or metadata gates;
- add bridge-aware gate to `premiumDialogSend`;
- add Latin-script wrong-language tests.

Exit gates:

- invalid language/target rejects for every callable surface;
- wrong-language generated output never reaches live user;
- cache key contract tests pass.

### P4 - Heisenberg/Gustav Pack Contracts

Goal: future generators produce isolated pack artifacts before app apply.

Required work:

- update Heisenberg contract for source-locale packs;
- update Gustav contract for target-language packs;
- require manifest, evidence, gates, checksums and reviewer status;
- forbid direct app-bundled output as the default future path;
- keep sourceLocale and studyTarget separate in every artifact.

Exit gates:

- source-locale pack isolation gate;
- target pack evidence/reviewer gate;
- bundle boundary gate;
- no fallback/no copied-locale gate.

### P5 - First Pilot Extraction

Goal: move one low-risk content family behind the pack architecture.

Prerequisites:

- P1 manifest/loader exists;
- P2 cloud mapping is accepted or the pilot is stateless;
- P3 AI gates are not involved or already safe;
- P4 generator contract is updated for the pilot surface.

Candidate order:

1. authored plan content index/content;
2. quiz source-locale payloads;
3. lesson source-locale generated phrase packs;
4. generated audio URL/metadata maps.

## 6. What Must Not Happen Next

- Do not start Gustav/Heisenberg content generation for production app apply.
- Do not upload or activate course packs on Firebase/server as runtime source of
  truth yet.
- If server copies are prepared before activation, they must be staging/shadow
  artifacts with `activationApproved=false` and production must not depend on
  them.
- Do not add downloads to splash/startup.
- Do not migrate or delete storage keys.
- Do not make `app_lang` or `sourceLocale` switch `studyTarget`.
- Do not move heavy data remote without loader states.
- Do not expose planned interface languages just because source-locale content
  exists.

## 7. Next Decision

Recommended next action:

P0, the non-activating P1 runtime contract, the first report-only
bundle-extraction inventory, plan-content pilot mapping, a synchronous
plan-content readiness facade, all currently safe report-button-only facade
consumers, the plan-content UI state contract and the theory-entry facade
migration plus theory-screen facade migration have implementation slices in
place, and phrase-lesson facade migration has removed the last direct app
callsite from the registry. The report-only extraction and dual-read activation
plan, non-activating shadow index validators, parity report validators, local
dry-run parity reporter/report command, shadow-pack artifact exporter,
dual-read parity comparator, manifest wrapper, release-bundle verifier, runtime
ignore guard, server-staging dry-run descriptor, server-staging approval-review
gate, dry-run server-staging writer, apply-preflight gate, apply-capable staging
writer, the first real staging/shadow upload and the reusable remote shadow
verification gate plus server-shadow dual-read comparator and disabled
loader/cache/offline/rollback contract plus disabled manifest registry/cache
preflight plus disabled runtime manifest candidate gate and the
activation-readiness blocker report plus disabled offline cache integrity report
plus disabled rollback kill-switch report plus disabled storage/cloud isolation
report plus disabled reviewer/locale intake report plus explicit
reviewer/locale approval packet plus explicit approval artifact intake dry-run
plus reviewer/locale work-order batches are now in place.

The current activation-readiness report is:

```text
.codex-tmp/plan-content/staging-upload-20260627/activation-readiness-blocker-report.json
```

It is intentionally `HOLD`: completed gates `11`, blocked gates `3`, evidence
blockers `0`, startup no-fetch guard `PASS`. The disabled offline cache
integrity report passed while keeping `offlineCacheUsableByRuntime=false`. The
disabled rollback kill-switch report passed while keeping rollback
report-only, bundled-compatibility based and non-mutating. The disabled
storage/cloud isolation report passed while keeping legacy flat cloud progress
English-only, French scoped keys independent, app language separate from
`studyTarget`, and storage/cloud migration disabled. The disabled
reviewer/locale intake report passed safety but stayed approval `HOLD`, with
reviewer approved rows `0/546`, locale passed rows `0/546`, missing reviewer
queue `546` and missing locale queue `546`. The explicit reviewer/locale
approval packet report is:

```text
.codex-tmp/plan-content/staging-upload-20260627/reviewer-locale-approval-packet.json
```

It is `PASS` with packet status `READY_FOR_REVIEW`, queued rows `546`,
reviewer approved rows `0/546`, locale passed rows `0/546`, filled artifact
validation `missing` and blockers `0`.

The explicit approval artifact intake dry-run report is:

```text
.codex-tmp/plan-content/staging-upload-20260627/reviewer-locale-approval-intake-dry-run.json
```

It is `HOLD` with dry-run status `MISSING_FILLED_ARTIFACT`, reviewer approved
rows `0/546`, locale passed rows `0/546` and blockers `1`. The remaining
blockers are reviewer approval `0/546`, locale gates `0/546` and product-owner
activation approval.

The reviewer/locale decision work-order report is:

```text
.codex-tmp/plan-content/staging-upload-20260627/reviewer-locale-decision-work-order-batches.json
```

It is `PASS` with work-order status `READY_FOR_REVIEW`, rows `546`, batches
`22`, reviewer approved rows `0/546`, locale passed rows `0/546`, generated
filled approval artifact `false` and blockers `0`.

Next decision:

- build a validator/assembler for externally filled reviewer/locale work-order
  batches;
- do not fill approvals or evidence ids automatically;
- only a complete, explicit, evidence-backed filled batch set may become a
  candidate approval artifact for the Phase 4G dry-run;
- never auto-approve rows from parity, upload or dual-read success;
- keep manifest/cache/offline/rollback/storage-cloud work disabled until
  activation gates exist;
- keep cache lookup, cache read, cache write and cache repair disabled until
  later explicit runtime activation work;
- keep storage/cloud migrations and cloud restore rewrites disabled until a
  separate activation approval exists;
- keep all server copies staging/shadow only with `activationApproved=false`;
- keep `plan_content_*` payloads bundled and untouched;
- keep personal-plan UI behavior unchanged;
- keep existing bundled content as compatibility fallback until loader states
  rollback, storage/cloud isolation, reviewer approval and locale gates are
  accepted.

Everything else remains design/audit until the relevant blockers above are
cleared.
