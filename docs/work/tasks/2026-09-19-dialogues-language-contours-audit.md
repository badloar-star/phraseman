# Dialogues language-contours audit — 2026-09-19

## Decision

Do not expose Spanish, French, or German in the production language picker until
the dialogue activation gate for that exact target is green.  Falling back to
English is forbidden: an unavailable target must keep Dialogues unavailable,
with an explicit localised reason, rather than silently start an English scene.

## Audit result

| Boundary | Current evidence | Verdict |
|---|---|---|
| Runtime target model | `app/study_target.ts` permits only `en` and `fr`; production permits only `en`. | BLOCK |
| Spanish | `app/study_target_lang_dev.ts` can expose `es`, but `storageStudyTarget()` collapses it to English and `aiDialogContentGateForTarget()` treats every non-French target as English. | BLOCK: English leak |
| French | Server prompt can target French, but `app/ai_dialog_target_gate.ts` intentionally closes every route because there is no reviewed scenario bank, prompt evidence, lesson mapping, or voice evidence. | BLOCK |
| German | No target type, target storage namespace, prompt contract, reply-language guard, TTS locale, scenario bank, or route gate exists. | BLOCK |
| Scenario content | `app/ai_dialog_scenarios.ts` has one English prompt bank. UI translations are interface copy only; `role`, `setting`, `goalEn`, personas, objectives, suggestions and safety fallbacks remain English-oriented. | BLOCK |
| Prompt/send/stream/review/translate | `functions/src/ai_language_contract.ts` accepts `en|fr`; all dialogue callables resolve unknown values to English. Stream/review/translation cache use the same limited contract. | BLOCK |
| Isolation | Completion, ownership, quota and some storage keys are currently not target-scoped for Dialogues. A new target must not read or award English dialogue state. | BLOCK |
| Automated proof | Existing tests prove English and partial French prompt parametrisation, but do not prove ES/DE rejection, target-specific scenario content, voice locale, or no-English-fallback behaviour. | BLOCK |

## Required release contract

Each dialogue target (`en`, `es`, `fr`, `de`) must have a versioned immutable
`DialogueLanguagePack` containing:

1. Native scenario text for every public scenario: title, goal, role, setting,
   persona, objectives, hints, CEFR and safe-domain wording.
2. Target-specific prompt data for scenario, companion, stream, review,
   translation and how-to-say flows.
3. Target reply verification and target-specific regulated-advice fallback.
4. TTS/ASR locale and a tested voice availability receipt.
5. Target-scoped completion, ownership, hint, quota and translation-cache keys.
6. A reviewed provenance receipt for every learner-facing string.
7. A fail-closed activation record. Missing or stale evidence blocks only that
   target; it cannot change English behaviour.

## Non-goals

This work does not activate a new global course, alter Learning V2 sessions,
change Firestore rules, deploy functions, or touch the existing dirty
Learning-V2 files.  A language becomes selectable only in its separate launch
change after its dialogue pack gate passes.

## Acceptance evidence

- Every enabled target resolves to its own pack and its own storage namespace.
- `es`, `fr`, and `de` never resolve to English at any dialogue entry, callable,
  stream, review, translation, or fallback.
- A missing pack is visibly unavailable and cannot open a route or charge an
  energy/rune operation.
- A source scan and focused tests cover all four targets and all callable paths.
- English regression tests remain green.

## Remediation completed in this audit slice

- Added immutable client/server dialogue target registries for `en`, `es`,
  `fr`, `de`; their resolvers return `null` for an unknown code.
- Replaced the old `storageStudyTarget()` check in the Dialogues gate. Spanish,
  German, and unknown values can no longer collapse to English.
- Added target-specific unavailable copy for Spanish and German and passed the
  selected target to the catalogue, briefing, scenario, and companion screens.
- Moved the scenario energy charge behind the target gate and gated companion
  warmup as well. A blocked target neither charges nor wakes a callable.
- Added focused RED tests for registry and no-English-fallback behaviour. The
  full Jest execution remains pending a semaphore slot; the repository's npm
  wrapper expands a requested test into a broad suite, and Bash (required by
  the repository semaphore) is unavailable in this host session.

## Fresh verification evidence

| Check | Result | Notes |
|---|---|---|
| Focused ESLint for new registry, target gate, and new contracts | PASS | Exit 0. |
| Client/server registry invariants via `tsx` | PASS | ES/DE resolve; unsupported target resolves to `null`; speech locales match contract. |
| Static side-effect audit via `tsx` | PASS | Energy guard precedes the charge; companion warmup has target guard. |
| Full affected-screen ESLint | BLOCKED by pre-existing findings | Seven existing `text-integrity` errors in `ai_dialog_session.tsx`/`DialogsTabContent.tsx`; no new error was reported in the new registry/gate files. |
| Focused Jest matrix | PENDING slot | Do not call the npm wrapper again: it expands to a broad project run. |

## Remaining release blockers

All three requested target packs remain intentionally unavailable. The missing
work is not cosmetic: reviewed native scenario banks, prompt/reply guards,
voice evidence, target-scoped state, and the release matrix gate in the linked
implementation plan are still required before any of ES/FR/DE can be enabled.

## Independent quality-agent receipts — 2026-09-19

The Dialogue language quality skill and six independent roles now live in
`.agents/skills/dialogue-language-quality/`. Two fresh read-only agents applied
the first and sixth roles to the live code. Both returned `BLOCK`.

| Role | Verdict | Evidence |
|---|---|---|
| `DialogueTargetContractGuardian` | BLOCK | Server resolver accepts only EN/FR and normalises ES/DE/unknown to EN; send/stream/review/translate use it. |
| `DialogueSurfaceMatrixGate` | BLOCK | Blocked targets still displayed the English catalogue; invalid scenarios fall back to `coffee`; TTS/ASR and local openers are English; target state and purchases are not yet isolated. |
| `DialogueScenarioPackReviewer` | BLOCK | No target-native packs or hash-bound native-language review receipts exist. The earlier plan also omitted local scenario and companion greetings. |

The immediate catalogue leak and the unknown-language French message were
corrected after this audit. The remaining BLOCK findings are release blockers,
not waived debt.

## Implementation checkpoint — 2026-09-20 10:31 UTC

The tables above are the historical baseline, not the current implementation.

- ES/FR/DE now each have 51 native scenes and 253 objective actions. All three
  received independent model-based native-content-only PASS; exact hashes and
  reviewers are recorded in `docs/dialogues/native-content-review-2026-09-20.json`.
- Catalogue, briefing, objectives, greetings and session presentation use native
  packs. Fixed a review finding where the setting hid the actual goal/hint.
- Direct session routes now resolve before mounting the energy-owning component;
  unknown IDs no longer become coffee. Native targets cannot mount English-only
  lesson scenes. `tests/dialogue_route_scenario.test.ts` covers these boundaries.
- Catalogue and briefing now remount target-local UI state on target changes.
  Pending purchases retain their captured target but cannot navigate from an
  unmounted briefing. A rendered React target-switch regression is included.
- Client dialogue regression checkpoint: 43 suites / 262 tests PASS, exit 0:
  `.codex-tmp/codex-safe-run/20260920_103030_dialogue-root-checkpoint-green`.
- Tutor server intermediate checkpoint: 4 suites / 89 tests PASS; strict targets,
  native topic catalog, prompts, output-span guard and scoped memory implemented.
  Client/privacy/review/local-trace integration is still in progress.

Remaining work, in execution order:
1. Complete tutor client, local trace, privacy controls, review-memory target and
   Jarvis contract, then independently review its native topic catalog.
2. Fix server prompt examples, per-field output guards, native regulated-advice
   safety, exact server pack binding and versioned translation cache.
3. Fix strict speech availability: installed Expo Android falls back to default
   language when a requested locale is absent. Require an exact verified TTS
   voice, visible unavailable state, exact ASR locale capability and guarded
   no-callback stop settlement. Do not launch an emulator or spend API keys.
4. Correct the quota mirror: the revenue contract is ONE account-global server
   daily allowance and generic paid +10, not four multiplied language grants.
   Keep content/progress/ownership isolated; migrate local quota mirrors by latest
   server-fact timestamp and recover already-paid pending grants coherently.
5. Strict unknown input for intro state/registry, hash-bound formal receipts,
   meaningful final matrix/release gate, and release verification.

No production deployment has occurred. Native content PASS and the owner release
switch are not substitutes for remaining prompt, speech and release evidence.

## Implementation checkpoint — 2026-09-20 11:08 UTC

- Tutor native content received independent content-only PASS at exact source
  hashes recorded in `docs/dialogues/native-tutor-content-review-2026-09-20.json`:
  16 goals per target, four each at A1/A2/B1/B2. No human review is claimed.
- Server prompt/output packet now uses native examples, accepts seven objectives,
  checks target-language fields individually and filters native medical advice in
  reply/suggestion/correction/reaction fields. Short English leaks are covered.
- Text-tutor memory is target-scoped with the legacy English document preserved.
  Privacy clear-all tombstones all four owned targets; old requests cannot write
  through a clear, and later preference edits retain the tombstone. Fresh
  independent privacy re-review is in progress, not yet a release approval.
- Target-switched settings discard old notes, edits and confirmations. Stale
  energy promises acknowledge committed spends but cannot navigate the new screen.
- Unknown/non-string dialogue targets now fail closed in intro-state storage and
  the client registry. Native presentation rejects inherited object keys.
- Companion help no longer instructs ES/FR/DE learners to answer in English in
  any interface locale. Native surface tests now include all nine UI locales.
- Unclamped the visible current goal; removed only six obsolete catalogue text
  truncation exceptions (the corresponding source sites no longer exist).
- Root independently verified 8 suites / 47 tests PASS, exit 0:
  `.codex-tmp/codex-safe-run/20260920_110637_dialogue-intro-companion-green`.
  Focused ESLint exited 0 with no errors:
  `.codex-tmp/codex-safe-run/20260920_110640_dialogue-root-lint-green`.
- New settings and energy-remount TSX tests are registered in the ordinary Jest
  configuration; they are not only runnable under a one-off test override.

Next implementation packets:
1. Expose separate text-tutor privacy callables in the DEFAULT codebase. Existing
   MAX memory exports are deliberately sealed; do not unseal MAX or deploy its
   mint/finalize/watchdogs. The text-tutor client needs its own live endpoints.
2. Strict installed-locale voice selection and ASR capability/timeout recovery.
3. Account-global reply-quota mirror and durable already-paid grant recovery.
4. Canonical server native-pack binding, exact client pins/versioned caches,
   meaningful final surface/evidence gate and release preparation.

Release audit identified a separate external constraint: the production OTA gate
requires a clean tree, whereas this checkout contains unrelated work. A custom
task release card is supported by `PHRASEMAN_RELEASE_CARD`; the existing root
card belongs to another release and must not be overwritten. Do not bypass the
clean-tree gate, commit unrelated work or create an unrequested checkout. No
production action has been taken. Device speech evidence is still absent.

## Implementation checkpoint — 2026-09-20 11:30 UTC

- Separate DEFAULT-codebase text-tutor memory endpoints are implemented and
  exported. The client uses them without unsealing MAX. Independent endpoint
  review passed 5 suites / 19 tests; the new endpoint and its dependency closure
  passed a fresh semantic TypeScript check with zero diagnostics.
- Privacy settings now expose a localized teacher-memory row using the existing
  accessible settings component. Its rendered regression is registered in the
  ordinary Jest configuration. Final independent UI review is in progress.
- The prior native prompt wording findings are closed by independent content-only
  review. Reviewed `premium_dialog.ts` SHA-256:
  `ee4380da6d1c2a1a9f4866ef8e7de353c005f9f39ccbb0d23f3d245576763baf`.
  Root independently ran 4 server suites / 100 tests, all passing:
  `.codex-tmp/codex-safe-run/20260920_112456_dialogue-server-output-rereview`.
  This is not release approval; subsequent source edits invalidate that file hash.
- A bounded quota audit confirmed three defects now assigned for correction:
  a fresh-day purchase advances the reset without clearing yesterday's count;
  the client uses local dates while the server uses UTC; and an unacknowledged
  paid grant can be hidden by a server limit response that raced synchronization.
  Preserve ONE account-global allowance, durable operation identity and instant
  local grant. Never multiply allowances by target or erase a committed purchase.
- Correction to the earlier migration proposal: v1 mirrors lack authoritative
  reset/version information and must not become v2 quota authority merely by
  choosing the latest timestamp. Preserve old records, resolve ordinary quota
  from the server and recover paid grants from their durable operation records.
- Next: quota repair with executable regressions, strict locale speech handling,
  canonical native-pack binding, final surface/evidence gate and release checks.
  No deployment or physical-device speech verification has occurred.

## Account-global quota and paid-grant checkpoint — 2026-09-20 13:15 UTC

- Replaced target-multiplied client quota mirrors with one account-global v2
  server-fact mirror. A valid dialogue target is still required to access it,
  but EN/ES/FR/DE now resolve the same versioned allowance. Legacy v1 rows are
  preserved and never promoted to authority because they lack reset/version data.
- Server observations now carry strict numeric `remainingQuota`, `resetAtMs` and
  `quotaVersion` through callable, SSE and text-tutor transports. String/array
  coercion is rejected. Exhausted observations are committed as real versions;
  provider rollback is bound to the consumed UTC reset period and cannot reduce
  a later day's usage.
- The 300-rune/+10-reply purchase is one immutable, fingerprinted client
  operation. The client commits the exact debit/grant locally before network,
  retains a bounded owner-scoped pending index and immutable receipts, and the
  server only validates, persists and materializes that exact grant. It performs
  no second affordability check, debit or wallet snapshot merge.
- Recovery covers crash-before-materialization, partial/restart replay, two
  purchases, older-receipt replay after projection merge, and account switch
  A→B→A. The original owner's operation/fingerprint survives generation changes;
  another owner cannot read or synchronize it.
- Scenario, companion and text-tutor provider calls wait for pending paid-grant
  synchronization. The composer still opens immediately after the local commit.
  Successful and exhausted responses update the same account-global mirror.
- Focused client matrix: 9 suites / 62 tests PASS, exit 0. Log:
  `.codex-tmp/codex-safe-run/20260920_132041_node`.
- Focused server matrix: 9 suites / 150 tests PASS, exit 0. Log:
  `functions/.codex-tmp/codex-safe-run/20260920_131156_node`.
- Focused client semantic TypeScript check: zero diagnostics, exit 0. Log:
  `.codex-tmp/codex-safe-run/20260920_132006_node`.
- Focused server semantic TypeScript check: zero diagnostics, exit 0. Log:
  `functions/.codex-tmp/codex-safe-run/20260920_131949_node`.
- Focused ESLint: exit 0 with zero errors (16 pre-existing warnings in broad
  touched screens/server modules). Log:
  `.codex-tmp/codex-safe-run/20260920_131930_node`.
- Jarvis has no reader for `premium_dialog_quotas` or the dialogue purchase
  receipt. The existing `users/{uid}/reward_claims` rules remain server-only, so
  this packet requires no Jarvis contract or Firestore Rules edit.

No deployment, emulator, external API call, branch, worktree or commit occurred.
This checkpoint is implementation evidence, not self-approval or release approval.

## Quota/economy independent-review remediation — 2026-09-20 15:10 UTC

The first independent review blocked the preceding checkpoint. The blocking
findings were reproduced and corrected with focused RED/GREEN tests:

- Startup recovery now returns the already-prepared purchase to a new UI tap,
  even when that tap supplies a different request id. It does not begin a
  second debit/grant. Both crash-before-materialization and partial-write
  restart paths assert exactly one 300-rune debit and one +10 grant.
- The owner-scoped pending outbox fails closed when its JSON is corrupt or its
  storage read fails. It reports pending work and does not call the provider.
  Capacity is explicitly covered at 4096/4097 items, including owner isolation.
- The ordinary callable send path now parses its quota through
  `parseAiDialogQuotaObservation`; string, null and array mutations of every
  quota number are rejected at runtime, matching stream and tutor transports.
- Client and server fingerprint tests mutate every signed operation field one
  at a time (plus the fingerprint and an unexpected field). Every mutation is
  rejected.
- The server transaction is exercised through an exported production core:
  first create, byte-exact replay, idempotency conflict, auth-owner mismatch,
  exact receipt/quota materialization, and absence of wallet/affordability or
  server debit reads/writes.

Fresh deterministic evidence after remediation:

| Check | Result | Log |
|---|---|---|
| Client quota/economy matrix | 10 suites / 79 tests PASS, exit 0 | `.codex-tmp/codex-safe-run/20260920_151018_node` |
| Server quota/dialogue matrix | 10 suites / 155 tests PASS, exit 0 | `functions/.codex-tmp/codex-safe-run/20260920_151023_node` |
| Focused client semantic TypeScript | 0 diagnostics, exit 0 | `.codex-tmp/codex-safe-run/20260920_150711_node` |
| Focused server semantic TypeScript | 0 diagnostics, exit 0 | `functions/.codex-tmp/codex-safe-run/20260920_150735_node` |
| Focused ESLint | 0 errors / 16 pre-existing warnings, exit 0 | `.codex-tmp/codex-safe-run/20260920_150934_node` |

No deployment, emulator, external API call, branch, worktree or commit occurred.
These are implementation gates only; a fresh independent review remains
required before release approval.

## Paid-grant provider guard closure — 2026-09-20 17:04 UTC

- Added one fail-closed provider-readiness boundary around paid-grant sync.
  Corrupt or unreadable owner pending state returns pending work and the boundary
  throws before any AI provider can run.
- All six live provider call sites use that boundary in order: scenario send and
  retry each protect stream plus callable fallback; companion protects callable
  send; text tutor protects its turn callable.
- The executable corrupt/read-failure regressions assert zero sync callable and
  zero downstream provider calls. A bounded source contract counts every live
  provider site and fails if its guard is removed or moved after the provider.
- Focused RED: `.codex-tmp/codex-safe-run/20260920_170154_node`.
- Focused GREEN: 3 suites / 24 tests, exit 0:
  `.codex-tmp/codex-safe-run/20260920_170254_node`.
- Final client quota/provider matrix: 11 suites / 83 tests, exit 0:
  `.codex-tmp/codex-safe-run/20260920_170321_node`.
- Focused semantic TypeScript: 0 diagnostics, exit 0:
  `.codex-tmp/codex-safe-run/20260920_170339_node`.
- Focused ESLint: 0 errors / 12 pre-existing warnings, exit 0:
  `.codex-tmp/codex-safe-run/20260920_170359_node`.

No unrelated level-gift source, deployment, emulator, external API, branch,
worktree or commit was touched.

## Strict voice precheck checkpoint — 2026-09-20 19:xx UTC

- Added a fail-closed pure dialogue voice capability contract. ES/FR/DE require
  an exact installed `es-ES`/`fr-FR`/`de-DE` voice; regional substitutes,
  empty/error/timeout inventories and iOS targets without a physical
  target-specific receipt are unavailable. The strict `useAudio` option cannot
  retry without its verified voice.
- Added typed recognizer locale/service inventory support. Empty or unverified
  inventory remains unavailable; Android API 32 and lower is unavailable for
  strict ASR, and the service that starts recognition must equal the inventoried
  service. The existing 1500ms stop-settlement guard remains the required
  fallback for native no-callback stops.
- Scenario, companion and tutor playback now preserve legacy English playback,
  while non-English routes use strict verified playback. Scenario/tutor action
  controls expose a localized unavailable state rather than silently invoking a
  default voice.
- Pure capability contract passed through `tsx`; focused ESLint exited 0 with
  existing warnings only. A focused Jest run was attempted but its worker was
  terminated by the host heap limit before executing tests. Physical-device
  receipts for every target/OS remain a release blocker; no emulator, deployment
  or external API action occurred.

## Strict voice lifecycle follow-up — 2026-09-20 20:xx UTC

- Scenario ASR now preflights the same typed locale/service inventory before
  permission or native `start`; unavailable/malformed/timeout inventory and
  Android API 32-and-lower fail closed. The selected service id is bound into
  the Android start options. Non-English iOS does not force on-device mode.
- Eligibility and quota commit are split: capability and permission failures do
  not consume a speech attempt; only a confirmed native `start` event commits.
  On release, stop uses the shared 1500ms settlement guard; it removes
  listeners, invalidates late callbacks, restores typing, and preserves only an
  editable transcript draft. There is no auto-send, scoring or reward path.
- Companion and tutor remain playback-only; scenario/tutor action controls and
  inline keyphrases visibly dim while strict non-English playback is unavailable.
