# Learning V2 shared improvement log

This is the append-only, cross-language record for improving lesson quality,
production speed, and cost. English, Spanish, German, French, and every other
existing or newly supported Learning V2 language use this same log. Language-
specific linguistic findings stay labeled by language and must never be copied
as linguistic facts to another language.

## Mandatory loop

1. Before work on a bounded lesson or batch, read this file. Search for the same
   defect signature or proposed process change. Reuse a verified fix; do not
   repeat a known failed approach. Respect the language scope and evidence
   boundary on every entry.
2. At the end of that bounded work, append an entry—even when no change is
   justified. Capture exact artifact/version hashes where available, findings,
   failed attempts, repairs, gate results, and any repeat of a known defect.
3. Separate direct observations from root-cause hypotheses. Record wall-clock
   and model/token/cache usage only when supplied by reliable telemetry; use
   `not measured` otherwise. File timestamps, token estimates, and account
   quota percentages are not execution-cost measurements.
4. A proposed improvement is not adopted until it passes known-good examples,
   known-defect examples, blind learner solving, and all affected deterministic
   checks. No speed or cost gain may come from dropping a required quality
   dimension, source verification, a required review, or release/audio parity.
5. Once validated, promote a process improvement to shared instructions only
   when its evidence applies across the affected languages. Otherwise record
   it in the relevant language section/profile. Version policy changes between
   bounded runs and revalidate every dependent receipt; never rewrite old
   entries, hashes, or evidence to make a result appear current.
6. If an entry reveals a defect class, add a regression check when it is
   objectively testable and update the relevant language/profile or shared
   instructions. Link the test and scope. Do not claim the model has permanently
   retrained itself: this log improves future runs only when they read and obey
   the recorded, validated guidance.
7. The owner requires continuing audits to preserve each new, relevant finding
   and reusable process proposal here for later sessions. Do not replace prior
   records with summaries: append dated evidence, mark language/version scope,
   distinguish verified results from hypotheses, and state the next test. This
   applies to all language workers through the shared read-before-work rule.

## Entry format

Append entries using this compact template:

```text
### YYYY-MM-DD — <language or shared> — <session/batch> — <short title>
- Status: observation | hypothesis | validated | rejected
- Scope/version: exact IDs and candidate/hash (or `not recorded`)
- Evidence: artifact paths, field IDs, source/gate outputs, counts
- Defect/waste: what happened; whether this repeats an earlier signature
- Cause: verified cause, or explicitly `hypothesis`
- Change: repair/process/policy version, or `none`
- Quality guard: positive/negative examples, blind solve and gate results
- Time/cost: measured elapsed time and input/output/cache telemetry, or
  `not measured` for each unavailable value
- Reuse: shared | language-specific | not yet reusable; rationale
- Next check: exact test or condition that could falsify this conclusion
```

## 2026-10-13 — initial audit

### English — L01 S01/S02 — candidate churn and evidence reuse
- Status: observation; process causes are hypotheses unless stated below.
- Scope/version: `en/l01/s01` and `en/l01/s02`; candidate folders under
  `outputs/` dated 2026-10-12/13.
- Evidence: `judgements/2026-10-13_l01_s01_current_repair_packet.md`,
  `judgements/2026-10-13_l01_s02_current_repair_packet.md`; 15 S01 candidate
  directories span filesystem timestamps 2026-10-12 18:42 through 2026-10-13
  16:16; four S02 candidate directories span 17:32 through 18:12 on 2026-10-13.
  S01's packet records seven final PASS reports on its final candidate. S02's
  seven reports cited there belong to a superseded candidate; the current
  successor awaits affected-role checks. These timestamp spans are not active
  work durations.
- Defect/waste: content changes create successor candidates and invalidate
  reviews bound to prior bytes. The S02 packet documents this directly. It also
  documents a historical receipt overwrite incident; a regression now tests
  against a temporary repository and protects historical bytes/timestamps.
- Cause: candidate churn is observed; whether it came from sequential review,
  late source discoveries, or orchestration delay is not established by the
  current artifacts.
- Change: no course/policy change in this audit. The operational improvement
  to apply is already specified in the current repair packets: freeze one
  candidate, collect the required reviews before editing, adjudicate findings,
  make one combined repair batch, then rerun only checks affected by changed
  fields/behavior. Do not rebuild or mutate a reviewed candidate.
- Quality guard: preserve all required independent reviews and evidence binding;
  do not compress them into one call or claim independence without actual
  independent runs.
- Time/cost: active duration and Luna input/output/cache tokens are not measured
  in these candidate folders. Do not infer savings from timestamps or file size.
- Reuse: process-level guidance is a candidate for all languages, but promote
  only after tracking whether it reduces successor count without increasing
  missed defects or repair rounds in another bounded run.
- Next check: record the next session's candidate count, actual elapsed time,
  available provider telemetry, defects found before/after freeze, repair
  rounds, and final quality gates; compare on cost/time per accepted session.

### Shared — workflow gates — scope-aware execution
- Status: observation plus testable hypothesis.
- Scope/version: root `package.json`, script `learning-v2:lesson1-authoring-gate`.
- Evidence: the command currently chains 30 `npx tsx`/`npm run` invocations,
  including session-specific checks and a mockup build. This is a command-count
  observation only; the gate has not been timed in this audit.
- Defect/waste: running all 30 commands for every narrow text repair may repeat
  checks whose inputs did not change. Whether this is happening in practice is
  not measured.
- Cause: not established.
- Change: none. Candidate optimization: classify gates by dependency scope;
  run preflight + changed-session/affected-contract gates during a bounded
  repair, and reserve the full course gate for milestone or release readiness.
  Do not skip any required gate at its actual acceptance boundary.
- Quality guard: before adopting, demonstrate that changed-session checks fail
  on known defects and pass on known-good sessions, while the full suite still
  passes at the milestone boundary.
- Time/cost: gate duration and model cost not measured.
- Reuse: likely shared tooling pattern; keep as hypothesis until measured.
- Next check: time the exact commands on one bounded candidate; document each
  gate's read-set and prove unchanged inputs allow safe reuse.

### 2026-10-13 — Shared — all languages — persistent improvement loop
- Status: instruction package validated; future cross-language adherence is
  not yet measured.
- Scope/version: `IMPROVEMENT_LOG.md`; repository `AGENTS.md` and
  `МЕТОД_РАБОТЫ.md`; shared `language-lesson-authoring` and
  English-specific `learning-v2-factory` skills.
- Evidence: those four workflow entrypoints now require reading the shared log
  before bounded work and appending a record after it. Both skill packages pass
  `quick_validate.py`; generic skill tests pass 71/71 and English factory tests
  pass 60/60. No lesson bytes, release, or course gates were changed.
- Defect/waste: before this change, the shared skill required an improvement
  record but did not name one repository-wide location or require every language
  worker to read the same record before starting. This could leave cross-session
  lessons undiscovered; that consequence is a hypothesis, not a measured rate.
- Cause: the record location was unspecified in the shared workflow; confirmed
  by the previous generic wording (“existing audit/checkpoint location”).
- Change: create this append-only shared log and make it mandatory from the
  repository's common instructions and both authoring skills. Each entry must
  distinguish fact from hypothesis, include regression evidence, and mark
  unavailable time/token data `not measured`. Process changes require
  positive/negative controls and blind learner checks; no quality gate is
  removed to claim speed or cost gains.
- Quality guard: 71/71 shared authoring tests; 60/60 English factory tests;
  both skill validators report valid. These verify the instruction packages,
  not future compliance or lesson quality.
- Time/cost: change duration and token telemetry `not measured`.
- Reuse: shared process requirement for every language; linguistic evidence
  remains language-specific.
- Next check: at the next bounded lesson task, verify that the worker reads
  this file, references any matching defect, appends a correctly scoped record,
  and reports actual or unavailable cost/time telemetry without skipping any
  quality check.

### 2026-10-13 — English — L01 S01/S02 — second efficiency audit
- Status: observations plus hypotheses; no workflow or lesson policy changed.
- Scope/version: English L01 S01 and S02 repair packets, S02 superseded-candidate
  raw role reports, current factory method/constitution, and the current root
  `learning-v2:lesson1-authoring-gate` command.
- Evidence: S02's superseded candidate bundle
  `4fe3e22277235529e89c6171a1a51c6b92faddbe94acc8a0973ebc69f56e9497` had
  five independent roles (learner, reader, pedagogy, nonsense, taste) flag the
  same five malformed-intro-acceptability-boundary records, while pedagogy and
  learner also documented distinct, role-specific findings. Its repair packet
  says all seven reports are stale for the immutable successor
  `1e26259bf3b9e062e910a4450b2da38e06496d7cffbcf13450b187cefb6cdda1`;
  none transfers PASS. S01's final packet shows seven separate PASS reports
  bound to final hashes. `МЕТОД_РАБОТЫ.md` §3.9 requires seven roles and targeted
  reruns, while its older §2.1–2.3 and `КОНСТИТУЦИЯ.md` lines 653–683 describe
  two-pass adjudication/four release-critical PASS and taste as non-blocking.
  The root authoring gate contains 30 chained commands, including gates for
  sessions beyond S01/S02 and a full catalogue build.
- Defect/waste: one recurring literal contradiction class was independently
  detected by several roles, but no current exact-source deterministic check is
  documented for it. Reviews against superseded bytes are valid findings but
  require fresh evidence on successor bytes. Current normative/legacy review
  thresholds are contradictory, risking both excess runs and accidental
  acceptance if an executor chooses the cheaper historical paragraph.
- Cause: repeated detection and stale evidence are observed. Whether a cheap
  rule can catch this defect class without false positives, and which review
  threshold is authoritative across all languages, are not established here.
- Change: none. Candidate A: add a narrowly scoped source-bound regression for
  the proven contradiction pattern and test it against known-good/known-bad
  controls plus blind solving; retain all independent roles until calibrated.
  Candidate B: create a reviewed dependency map for each deterministic gate,
  then reuse only passes whose complete read-set hashes are unchanged, keeping
  full-course checks at the defined acceptance boundary. Before either is
  adopted, the owner must resolve the written four-vs-seven review contract;
  meanwhile the stricter current repair-packet requirement remains in force.
- Quality guard: do not remove a reviewer, course gate, source check, or final
  audio/release verification. The S02 negative example is the malformed intro
  option licensed as acceptable; the S01/S02 positive controls and blind learner
  checks still need to be explicitly selected and run before adopting a rule.
- Time/cost: actual elapsed work, Luna token/cache telemetry, per-gate duration,
  and avoided reruns are `not measured`.
- Reuse: process hypotheses may be shared across languages; linguistic patterns
  and controls must remain scoped to the relevant language.
- Next check: resolve the authoritative review threshold; on one frozen future
  candidate, measure each gate's read-set and runtime, then test the proposed
  contradiction rule on positive/negative controls and a blind learner before
  comparing missed defects, false positives, reruns, elapsed time, and telemetry.

### 2026-10-13 — Shared — all languages — reuse of second audit findings
- Status: shared process hypotheses recorded for reuse; not adopted as universal
  workflow changes.
- Scope/version: all existing and future Learning V2 language workers; evidence
  is from the English L01 S01/S02 audit above and must not be treated as
  linguistic evidence about another language.
- Evidence: the English audit found (a) a repeated, literal explanation
  contradiction reported by five roles on one superseded candidate, (b) stale
  reviews after candidate bytes changed, (c) a 30-command English course gate
  with no measured execution time/read-set map, and (d) conflicting historical
  four-role versus current seven-role review language. Shared authoring and
  English-factory skills both point every Phraseman language worker to this
  append-only log before and after bounded work.
- Defect/waste: these observations suggest candidate process improvements, but
  the English sample cannot establish their value or applicability in Spanish,
  German, or another language.
- Cause: cross-language applicability and savings are unverified; treat as
  `hypothesis`, not established cause or measured gain.
- Change: none to policy. Reusable experiment proposals: (1) check whether a
  narrow source-bound rule can detect a locally evidenced contradiction before
  review; (2) map deterministic gate inputs and reuse a result only when its
  entire read-set is unchanged; (3) freeze one content candidate, collect the
  currently required independent reviews, repair once, and rerun only affected
  roles/gates. For each language, select its own positive/negative examples,
  source checks, and blind learner test. Keep the currently applicable stricter
  review/release threshold until its owner-approved contract is reconciled;
  do not treat the old four-PASS paragraph as permission to bypass newer gates.
- Quality guard: no language worker may remove reviewers, source checks,
  deterministic gates, blind learner checks, or audio/release parity based on
  this entry. Promote a proposal to shared policy only after it passes controls
  in every claimed language scope and demonstrates no increase in missed
  defects or false acceptance.
- Time/cost: cross-language test results, elapsed time, and model/token/cache
  telemetry are `not measured`.
- Reuse: visible to all language sessions through `AGENTS.md`,
  `МЕТОД_РАБОТЫ.md`, and the shared authoring/factory skills, which require
  reading this log; linguistic evidence remains English-only unless separately
  validated.
- Next check: next worker in each language should cite this entry, decide which
  experiment is relevant, record language-specific control results, and append
  measured time/token data or `not measured` without changing the gate policy
  prematurely.

### 2026-10-13 — Shared process audit — historical model and sampling evidence
- Status: observations; implications for current Luna 6 and other languages are
  hypotheses only.
- Scope/version: historical English factory records dated 2026-09-08 and
  2026-09-12; `judgements/2026-09-08_observed_agent_token_usage.md`,
  `2026-09-12_audit100_catchup.md`, `2026-09-12_audit100_recheck.json`, and
  `2026-09-12_audit100_reader_learner_delta.json`.
- Evidence: the old A/B/C tracker has 74 scored decisions per model, explicitly
  including repeated decisions rather than 74 independent tasks. In those
  rounds gpt-5.6-Luna scored 70/74; Terra, Sol, Astra, and gpt-5.5 scored 74/74.
  Cache conditions differed, and the records explicitly say this does not prove
  lowest price or quality of authoring/explanations. A seeded sample of five
  English L02 sessions from ordinal range 51–100 initially found two BLOCK and
  two REVISE; after repairs the repeated sample passed five of five. Separate
  reader/learner delta checks passed four repaired items. The sample is not a
  census of 50 sessions, and the audit explicitly excludes audio/device checks.
- Defect/waste: historical model results cannot substantiate Luna 6 performance;
  sample PASS cannot substantiate an unaudited batch. However, the audit packet
  records reusable classes of factual/scene ambiguity and shows bounded delta
  rechecks can verify specific changed claims without rereading unrelated
  content, when their scope and hashes are explicit.
- Cause: insufficient comparable telemetry for the current model and no
  population-wide audit from a five-item sample are facts about these records;
  any predicted savings from using these methods is a hypothesis.
- Change: none. Next efficient experiment: build a language-specific defect
  taxonomy from confirmed findings, run deterministic corpus-wide searches for
  only objectively recognizable signatures, and route every hit to source
  review; use samples only to validate detectors, never as a release substitute.
  Separately capture current model/version, task type, exact input/output/cache
  tokens, elapsed time, number of review rounds, accepted/rejected outcome, and
  defect misses for Luna 6 under the owner's constraint. Compare identical
  tasks and keep the task type fixed; do not extrapolate from gpt-5.6-Luna.
- Quality guard: every target session still needs its required full coverage;
  a corpus search cannot prove absence of semantic defects, and historical
  gpt-5.6 metrics cannot waive or proxy current Luna 6 checks. Keep truth,
  reader/learner, locale, audio, and runtime/device scopes distinct.
- Time/cost: historical per-model token counts exist in the cited log but not
  task-equivalent financial cost; current Luna 6 and per-gate elapsed/runtime
  telemetry are `not measured`.
- Reuse: measurement design and audit-sampling boundary can be shared; defect
  taxonomies, language models' quality claims, and linguistic controls remain
  language-specific/version-specific.
- Next check: select a future bounded set with confirmed positive and negative
  examples, test detector precision/recall against full human review, conduct
  blind learner checks, and log current-version telemetry before adopting any
  scope reduction.

### 2026-10-13 — Shared — factory cleanup — remove stale guidance, preserve evidence
- Status: one stale instruction page replaced; only confirmed empty temporary
  directories removed; other cleanup candidates retained pending safer handling.
- Scope/version: `content/learning-v2-course/README.md`, two empty L04 release-
  preflight directory trees, empty `_archive/`, `.tmp/`, and
  `pipeline/audit_all.mjs`.
- Evidence: old README instructed `draft ×3`, three judges, seven locales, and
  `claude`/Anthropic API; those directions conflict with the current root
  workflow, current seven-role repair packets, and the owner's prohibition on
  Claude/API authoring. It was replaced with a short index to active sources and
  the owner's current `gpt-6-luna` authoring constraint. Both L04 preflight
  trees contained only empty directories; `_archive/` was empty. Exact paths
  were resolved under the factory root; a process check found no matching
  active preflight job; each directory was removed non-recursively only after
  confirming it was empty. The nonempty `.tmp/` contains saved candidate data
  for L02/S09 and L03/S56, so it was preserved. `audit_all.mjs` deletes stored
  judge receipts before invoking an older audit and has no current package.json
  command reference; a historical German snapshot embeds it, so the script was
  not deleted or modified in this cleanup.
- Defect/waste: stale README could route future workers to forbidden/obsolete
  methods. Empty directories added clutter only. The old audit script is a
  separate integrity risk, but its historical dependency makes direct deletion
  unsafe without a migration plan.
- Cause: README was not updated with the current workflow; temporary trees are
  leftovers (origin not established); the destructive audit behavior is present
  in the script source.
- Change: README replaced by concise navigation and a warning against obsolete
  commands; only empty directories removed. No sessions, releases, reviews,
  source content, or nonempty temp evidence changed.
- Quality guard: searched the repository for active README and script
  references; only historical plans/snapshot reference these paths. No content
  or release gate was run because learner data and code behavior were unchanged.
- Time/cost: execution duration and token/cache data `not measured`.
- Reuse: shared workflow-navigation cleanup; language-specific lesson sources
  and historical snapshots preserved.
- Next check: decide how to neutralize `audit_all.mjs` without corrupting its
  historical snapshot, and separately inventory the stale reports/docs using
  manifests rather than deleting by filename or age.

### 2026-10-14 — English — L01/S01 successor — blind learner and reader checkpoint
- Status: candidate remains HOLD; no source, release, native projection, or
  canonical mockup changed in this checkpoint. Candidate content bundle:
  `6c0caee233d017f68b69f9e62cef9a6c4798cd2bbd69d8da0761131bf7203e8e`.
- Evidence: independent Luna 6 blind learner output is preserved verbatim in
  `judgements/2026-10-14_s01_blind_learner_review_raw.md`; independent Luna 6
  reader output is preserved verbatim in
  `judgements/2026-10-14_s01_reader_review_raw.md`. The blind learner solved
  the supplied non-audio prompts and flagged that repeated-speech targets are
  visible by design; the reader found no confirmed implausible scene and
  correctly treated audio-dependent tasks as unverified.
- Confirmed limitation: the blind packet had no playable audio, so tasks 4, 6,
  8, 10, 14, 16, 20, and 23 remain unreviewed for listening. This establishes
  an evidence gap in this packet, not by itself absence of audio in the runtime.
  Do not mark these tasks or the session ready until source-to-runtime audio
  binding and actual playback are independently verified.
- Reader findings: one low-severity clarity question about the scope of “these
  four phrases” in intro 3; one specificity question in task 16; repeated
  practice prompts are low-severity variety concerns, not proven defects.
  The “Новое слово” title is also supplied by the learner UI as a word-card
  label, so it is not treated as a confirmed missing instruction without a
  rendered-screen failure.
- Action/regression: stored raw reports; no content repair attempted before
  tracing the audio projection. Existing S01 focused tests remain 70/70 PASS.
  The full factory checkpoint verifies as valid, phase `audit`, next session
  `en/l01/s01`, and `authoringAuthorized: false`.
- Cause: missing media in the answer-free review packet is confirmed; whether
  the runtime has a valid external audio object is still unresolved. Do not
  conflate packet omission with a product defect.
- Time/tokens/cache: not measured.

#### 2026-10-14 — S01 pedagogical verdict adjudication
- Evidence: the independent Luna 6 pedagogy output is preserved verbatim in
  `judgements/2026-10-14_s01_pedagogy_review_raw.md`; independent nonsense
  output is in `judgements/2026-10-14_s01_nonsense_review_raw.md`.
- Finding: the pedagogy report calls i01/i03/i05/i07 graded one-option audio
  tasks and says their detailed correct feedback is displayed. Direct adapter
  evidence contradicts that claim: each interaction has `modePayload.isWordCard
  === true`; `renderTask` routes those before grading to `renderCard`, which
  renders the word, audio control, and localized definition, then exits without
  rendering response options or answer feedback (`pipeline/build_mockup.mjs`,
  `renderTask`/`renderCard`). Therefore this particular critique is not a
  confirmed learner-facing defect. The adapter's word-card audio path is browser
  speech synthesis, not proof of production voiceover.
- Quality rule: reviewer findings must be checked against the exact learner
  adapter before repair; neither an agent verdict nor a raw field name proves
  what the learner sees. Keep the raw disagreement; do not rewrite the report.
- Status remains HOLD: the verified local voice manifest has no exact
  `I am fine.` recording (0 entries); the exact other tested transcripts have
  four voice variants and all referenced local files exist. This does not
  establish remote runtime availability. The required TTS spend flag and
  `OPENAI_TTS_API_KEY` are both absent, so no generation was attempted.
- Next: finish independent roles, then verify runtime audio binding/playback
  or retain the audio hold. Do not change the content based only on this
  contradicted pedagogy finding.

#### 2026-10-14 — S01 audio hold — authority and manifest correction
- Evidence: a fresh read-only T3 advisor report is preserved in
  `judgements/2026-10-14_s01_tts_authority_advice_raw.md`. The deterministic
  manifest query found zero exact `I am fine.` entries and four voice entries
  with valid local bytes for each of the other tested exact transcripts.
- Correction to prior entry: `OPENAI_TTS_API_KEY` is absent from the current
  process environment, but a nonempty key is present in `.env.local`. The key
  value was not read into the report, tested, or exposed. Regardless, the
  spend guard `PHRASEMAN_ALLOW_OPENAI_DEV_SPEND` is false, and the guarded TTS
  path refuses generation before key/network use.
- Action: no API call, asset write, voice substitution, or release update.
  Record the missing target as four unresolved voice coordinates and keep S01
  HOLD. The earlier statement that the TTS key was absent without qualification
  was too broad; this append-only note corrects it.
- Time/cost: not measured; no spend incurred.
- Next: continue sequential S01 reviews and deterministic source/runtime
  checks; wait for the owner-controlled spend flag before considering TTS.

#### 2026-10-14 — English — L01/S01 bounded review and focused gate rerun
- Scope: supplied answer-free S01 learner projection for the independent
  RU/UK locale review; focused session/feedback/locale/parity tests.
- Evidence: raw locale result is preserved verbatim in
  `judgements/2026-10-14_s01_locale_review_raw.md`; it found no confirmed
  localization defect. Six focused test files produced 57 passes and one
  infrastructure failure: a temporary test fixture could not import
  `pipeline/candidate_preview_status.mjs` (the failure trace is from
  `build_release_feedback.test.mjs`, line 405).
- Root cause: not established yet; a separate read-only reviewer is diagnosing
  the fixture failure. This run does not certify S01 or authorize content
  changes. The earlier two RU/UK feedback findings and exact `I am fine.`
  audio gap remain unresolved; no successor candidate was written.
- Action: completed the locale reviewer role without editing lesson content;
  requested evidence-based diagnosis of the test fixture. Kept all candidate
  receipts and source files unchanged.
- Regression result: 57/58 passed; gate remains HOLD until the missing fixture
  dependency is addressed and tests rerun. Time/tokens/cache: not measured.

#### 2026-10-14 — English — L01/S01 two feedback repairs and gate recovery
- Scope: only `i02:r3` (Fine vs. arriving at the office) and `i10:tile:d2`
  (Here vs. answering how one feels), in RU/UK. Replacement copy was proposed
  by Luna 6; the answer-free locale review found no confirmed RU/UK issues.
- Evidence: exact source fields in final RU/UK Markdown, `locales_batch.md`,
  `practice.atomic.json`, and `practice.explanations.v1.json`; regression
  `L01/S01 wrong-answer feedback uses complete, natural RU/UK wording for here
  and fine` failed before the copy change and passes after it. The old source
  binding mismatch was verified by comparing exact Markdown bytes; both
  sidecar bindings now match their respective new SHA-256 values.
- Method failure: a focused run initially failed 1/58 because an isolated
  fixture did not copy `candidate_preview_status.mjs` and asserted obsolete
  correct-answer gating. A read-only advisor confirmed both causes. The
  fixture now copies the imported helper and asserts the live contract: correct
  answers need no explanation; incorrect answers need selected feedback.
- Action: updated only the two feedback strings and their RU/UK projections,
  exact sidecar source digests, the regression assertion, and that fixture's
  dependency/contract assertions. The append-only S01 candidate tooling now
  supports one new registered successor and rejects writes to the prior
  candidate; independent review is pending. No candidate build or release
  publication has happened.
- Regression result: S01 focused six-file suite 59/59 PASS; explanation and
  source/release parity tests 37/37 PASS; fixture plus candidate-preview
  helper/CLI tests 22/22 PASS; successor receipt tests 47/47 PASS. These gates
  do not establish seven final reviews or release readiness. Exact
  `I am fine.` audio is still absent and the spend guard remains false; no TTS
  was generated. Time/tokens/cache: not measured.

#### 2026-10-14 — English — S01 successor integrity review caught two gate gaps
- Scope: review of the new append-only candidate/receipt tooling before its
  first use; no candidate was built or published.
- Evidence: verbatim independent T3 review at
  `judgements/2026-10-14_s01_successor_tooling_review_t3_raw.md` and fresh T4
  report at `judgements/2026-10-14_s01_successor_integrity_redteam_t4_raw.md`.
  T4 reproduced a P1 fail-open: deleting one protected no-drift subtree can
  make baseline capture and replay omit it while still claiming full S01/S02
  scope. It also confirmed staging inventory was read before the publication
  lock and not rechecked before rename.
- Root cause: the new scoped-safety code had happy-path receipt tests but no
  negative tests for missing required boundary roots or for mutation between
  staging validation and lock acquisition. This was a real contract gap, not
  an error in the lesson text.
- Action: stopped candidate publication. The T3 writer has a follow-up limited
  to fail-closed required roots/sentinels and lock-first staging validation,
  with regressions. Existing candidate, receipts, release and mockup remain
  untouched.
- Regression result: the pre-fix 47/47 suite was insufficient; it is not a
  PASS for safe publication. Candidate build remains prohibited until the new
  gates and independent review pass. Time/tokens/cache: not measured.

#### 2026-10-14 — English — S01 no-drift and publication race regressions added
- Scope: same four append-only receipt-tooling files; the S01 lesson source,
  existing candidate and canonical release/mockup were not touched in this
  step.
- Evidence: implementation report preserved at
  `judgements/2026-10-14_s01_successor_tooling_fix_report_t3_raw.md`; tests
  cover all seven required no-drift roots (missing, non-directory, empty,
  sentinel missing, and deletion after baseline) and staging mutation under
  lock, junction replacement and concurrent target creation.
- Action: publication validation now occurs after the shared lock and
  rechecks staging and destination before rename. The existing historical
  receipt hash remains pinned to
  `fab4d25424ba630d1250dd6b1724bee397cc94d9c099aaccc54cbeccf8549a86`.
- Regression result: focused receipt suites 52/52 PASS and `git diff --check`
  passes. Independent T4 re-review is pending; no candidate has been built.
  Time/tokens/cache: not measured.

#### 2026-10-14 — English — S01 predecessor inventory and byte-equality gate
- Scope: safe successor receipt tooling only; no candidate, release, or
  canonical mockup output was created or published.
- Evidence: the prior immutable baseline/receipt pin the complete 152-path
  protected inventory. Independent comparison found current inventory exactly
  matches: 152 present, 0 hash mismatches, 0 extras. The deletion regression
  now removes each of the 152 protected files only inside isolated temporary
  repositories and confirms capture fails before writing a baseline.
- Regression result: focused receipt suites 54/54 PASS; S01 content/feedback
  regression suite 59/59 PASS; `git diff --check` passes. T4 approved closure
  of the deletion/completeness gap, then identified a distinct same-boundary
  risk: current bytes or newly added paths could be blessed into a new
  baseline unless the current `(path, bytes, SHA-256)` set is compared to the
  pinned predecessor. Current real workspace remains byte-for-byte clean.
- Action: candidate creation remains withheld; a T3 follow-up is implementing
  exact path-and-byte equality before baseline capture, with mutation and
  addition regressions. Independent T4 review is required again before use.
  Time/tokens/cache: not measured.

#### 2026-10-14 — English — S01 no-drift capture now rejects all predecessor drift
- Scope: append-only S01 successor receipt tooling and temporary-repository
  regression fixtures; canonical content, release, and mockup are untouched.
- Evidence: authenticated pinned predecessor entries now preserve and validate
  every `(path, bytes, sha256)` record and the stable boundary digest. Capture
  compares the entire current protected path set and hashes before creating a
  baseline; changed bytes, missing paths, and extra paths fail closed.
- Verification: T4 independently reviewed the code and tests and returned
  PASS. Receipt suites 57/57 PASS; S01 content/feedback suite 59/59 PASS;
  `git diff --check` passes. Baseline/receipt authority hashes are unchanged.
  Successor candidate and staging directories remain absent.
- Residual boundary: hostile non-cooperative concurrent filesystem mutation
  is explicitly excluded by the receipt tooling's trust model. No release
  approval follows from these tooling tests.
  Time/tokens/cache: not measured.

#### 2026-10-14 — English — S01 review adjudication and audio HOLD
- Scope: reviewed the separate S01 candidate's seven raw Luna 6 role outputs;
  did not edit canonical session source, candidate, checkpoint, audio, release,
  or full-course mockup.
- Evidence: candidate inventory
  `362658ddc6a17ae37cde5d4bf3529a5f5f0cf400480c9c2efb6aa581d85eee17`;
  review bundle
  `0548773ad10f1aa6be9416311070227ca1a536891c37c6a264185b2f1c8fecd9`;
  dispositions are recorded in
  `judgements/2026-10-14_s01_review_adjudication.md`. Several HOLD findings
  came from reviewing prompt fields without rendered controls (word-card
  rendering and pair-grid rendering) or from internal correct-answer records
  that runtime suppresses. The exact learner-visible audio target for i17:s03,
  `I am fine.`, has no exact entry in the production manifest; related longer
  utterances are not substitutes.
- Root cause versus hypothesis: prompt-only review of mode-native activities
  is a demonstrated false-positive source; whether this generalizes to all
  session families remains unmeasured. Future role packets should bind findings
  to the rendered mode and exact media evidence. Policy was not changed mid-run.
- Action/result: preserve raw verdicts; adjudicate with renderer and manifest
  evidence; keep S01 HOLD. The seven reports do not have a runner-authenticated
  ledger, and the existing 2026-10-13 checkpoint fails current source/package
  digest verification. No checkpoint digests were refreshed. Token/time/cache
  telemetry: not measured.

#### 2026-10-14 — English — generated-release audio readiness dry run
- Scope: read-only dry run over the current English generated-release tree;
  no TTS API calls, candidate edits, asset writes, or release changes.
- Evidence: 186 learner-session files; 1,020 unique transcripts; 4,080 expected
  transcript/voice files; 2,508 reusable; 1,572 missing; 28,524 transcript
  characters; script estimate 39.78 audio minutes and $1.19. Full output and
  calculation caveat are preserved in
  `judgements/2026-10-14_en_audio_inventory_dry_run.md`.
- Root cause versus hypothesis: exact-phrase coverage is incomplete in the
  current audio manifest/file set; the dry run establishes required asset
  counts, not whether every written session is otherwise release-ready.
- Action/result: do not run bulk TTS before written-session content is audited
  and frozen; the required spend guard is unset. TTS cost/time are estimates,
  not measured telemetry. S01's exact `I am fine.` task audio is among the
  unresolved items.

#### 2026-10-14 — English — S01 word-card finding adjudication and focused regression
- Scope: bounded check of the raw reader finding for the four S01 vocabulary
  cards and five focused S01 test files; no lesson, candidate, audio, release,
  or mockup bytes were changed.
- Evidence: candidate inventory remains
  `362658ddc6a17ae37cde5d4bf3529a5f5f0cf400480c9c2efb6aa581d85eee17`.
  Raw reader proposed changing “Новое слово” to “listen and choose its
  meaning.” Direct candidate-renderer inspection (`renderTask` and
  `renderCard`) and a fresh read-only adjudication confirm that these records
  have no answer options; the screen shows the word, audio, definition, and
  “Понятно/Зрозуміло”. The proposed choice instruction would contradict the
  actual screen, so these four prompt findings are rejected as false positives.
- Verification: the focused five-file Node test run passed 113/113. This
  validates those deterministic source and receipt invariants only; it is not
  a seven-role packet-gate pass or release approval.
- Remaining S01 state: exact `I am fine.` audio is still missing from the
  production manifest, final review provenance is not runner-authenticated,
  and the checkpoint remains in audit with `authoringAuthorized: false`.
  Intro-3 and i16 wording proposals are not yet candidate repairs and must not
  be counted as completed.
- Root cause versus hypothesis: prompt-only review is confirmed to miss the
  word-card renderer and can propose an instruction the learner cannot perform.
  Broader frequency remains unmeasured.
- Action: retain the current card copy; require future findings to be checked
  against the rendered activity before changing text. Continue S01 audit only;
  do not advance to S02 or unwritten lessons before S01's required checks close.
- Time/tokens/cache: not measured.

#### 2026-10-14 — English — S01 candidate versus generated-release parity check
- Scope: read-only comparison of the reviewed S01 successor with the generated
  release copy; no synchronization or release files were changed.
- Evidence: candidate
  `outputs/s01-feedback-naturalness-fixed-20261014/en/l01/s01/learner.json`
  binds interaction `en:lesson-01:session-01:i16` to the listening/build target
  `I am happy.`. The current generated release at
  `modules/learning-v2/content/factory_native/generated_release/en/l01/s01/learner.json`
  binds the same interaction ID to a phrase-builder target `I am fine.`. The
  generated-release directory has no per-session audio-child file.
- Result: source/candidate/release are not at parity for S01. This is a
  concrete release blocker; the private candidate must not be called released
  or synchronized. The absent local child file alone does not prove that no
  external runtime join exists, so runtime availability remains unverified.
- Action: preserve both versions and all receipts. Do not overwrite the
  generated-release copy until the active packet, required reviews, runtime
  audio binding, and release parity gates pass.
- Time/tokens/cache: not measured.
- Next check: trace each relevant `audioTargetId` through source manifest,
  generated release binding, runtime resolver, and a real playback check; then
  re-review only affected items and finish S01 before advancing to S02.

#### 2026-10-14 — English — S01 stale native generated projection confirmed
- Scope: independent read-only trace of source, private candidate, course
  release, reviewed-source projection, native generated-release projection,
  and the adapter's loader. No source, release, mockup, or audio files changed.
- Evidence: source/candidate bind S01 i16 to `listen_build_dictation` and
  `I am happy.`. The current course release and reviewed-source projection
  still bind it to `listen_build_dictation` and `I am fine.`; native generated
  runtime JSON binds it to `phrase_builder` and `I am fine.`. The preservation
  ledger records the intended migration from the old phrase-builder/fine
  activity to the happy listening/build activity. Thus candidate-versus-release
  divergence is expected before admission, but native generated-release is
  additionally stale relative to course release. The adapter directly loads
  generated JSON and preserves its family/target; evidence points to stale
  generated projection, not adapter mutation.
- Verification: scoped `build_release --check-source-release` is BLOCKED with
  232 mismatches, including i16 (`I am happy.` source vs `I am fine.` release).
  Native manifest `--check` exits 1 on two RU intro choice mismatches before
  freshness comparison. Audio manifest has 4 exact `I am happy.` entries and
  0 exact `I am fine.` entries. These checks do not authorize a release.
- Root cause: native runtime projection is stale relative to its intended
  course-release input; the broader mismatch set and intro mismatch require
  session-level adjudication, not an unreviewed regeneration.
- Action: keep S01 active; do not sync or promote. After the packet gate and
  audio/runtime evidence close, build in private staging, rerun parity and
  manifest checks, and promote only if all deterministic gates pass.
- Time/tokens/cache: not measured.

#### 2026-10-14 — English — S01 bounded gate and exact-audio recheck
- Status: HOLD; no lesson, candidate, generated-release, mockup, or audio bytes
  changed.
- Scope/version: resumed active English factory checkpoint, S01 source/release
  parity gate, native manifest gate, and both local production audio manifests.
- Evidence: checkpoint verifies structurally but remains phase `audit`, next
  `en/l01/s01`, `authoringAuthorized: false`. A fresh scoped source/release
  check exits 1 with 232 mismatches; the native manifest `--check` exits 1 on
  RU intro-page-2 choices. Exact transcript `I am fine.` has zero entries in
  both local production manifests (`factory-production-v1` and
  `session1-production-v1`); no substitute recording was accepted.
- Defect/waste: prior mismatch note understated provenance. The preservation
  ledger records `I am fine.` → `I am happy.` as an intended migration; this
  explains the candidate delta but does not prove pedagogical approval. Native
  runtime JSON is separately stale versus course release. Do not “fix” that by
  regenerating from a release already failing source parity.
- Cause: verified stale projection chain plus unresolved content admission and
  exact-audio evidence; not an adapter transformation defect.
- Change: none. Kept sequential order at S01 and retained existing artifacts.
- Quality guard: both failing deterministic gates reproduced; checkpoint was
  reverified; exact audio checked against two manifests. No new content PASS or
  release authority is inferred.
- Time/cost: wall time and model/token/cache telemetry not measured; no spend.
- Reuse: English-specific migration/projection finding; general rule is not to
  rebuild downstream projections from an upstream artifact that still fails
  source parity.
- Next check: close S01 source-bound review and exact audio/runtime proof; then
  build only to private staging and rerun parity before moving to S02.

#### 2026-10-14 — English — S01 stale status hash disambiguation
- Status: candidate receipt verified; mutable session status remains stale;
  no source, candidate, release, mockup, or audio bytes changed.
- Scope/version: direct SHA-256 comparison of the four S01 learner source files,
  `sessions/en/l01/s01/status.json`, and the immutable successor's content
  receipt; read-only call to `verifyS01ContentReceipt`.
- Evidence: current source file hashes match the candidate receipt entries
  exactly (`final.ru.md` `22f8e2…`, `final.uk.md` `4fd5e3…`,
  `practice.atomic.json` `07619d…`, explanation sidecar `88cc06…`). The
  session status still records earlier hashes (`fc5259…` and `cc2015…`). The
  receipt verifier recomputes and validates the complete stored receipt; it
  returns `releaseAuthority: false`.
- Defect/cause: the contradiction was between a stale mutable status marker and
  the current source-bound candidate receipt, not changed bytes hidden by the
  receipt. The old status is not fresh evidence and must not be used to grant
  admission. Re-hashing it would not resolve source/release/audio blockers.
- Change: none; preserved historical/status bytes and did not refresh digests.
- Quality guard: receipt validation succeeded against current bytes; separate
  source/release parity and native-manifest gates remain failing.
- Time/cost: not measured; no spend.
- Reuse: English S01 metadata finding; shared rule remains “verify receipts
  against direct bytes and never refresh a stale marker to make a gate pass.”
- Next check: continue S01 audit without advancing or promoting until its
  source, review provenance, runtime and exact-audio conditions are closed.

#### 2026-10-14 — English — S01 historical-ledger test scope clarified
- Status: historical ledger test remains passing; no release authority or new
  session approval inferred.
- Scope/version: read-only T3 review of S01 review-ledger test, content receipt
  verifier, owner-review validation, and session-readiness gate.
- Evidence: the ledger test passes 7/7 while binding internally consistent
  historical candidate `s01-i13-scene-fixed-20261013`; it does not hash live
  source bytes. The production owner-review and receipt validators do re-read
  and compare live bytes, and S01 readiness remains false with 45 findings.
- Defect/cause: test name implied a current-source check although it only proves
  historical chain consistency. This was a test-description gap, not a
  release false-green; production gates fail closed.
- Change: renamed the test and documented its scope; no validators, status,
  receipt, lesson, release, generated projection, or audio changed.
- Quality guard: rerun the focused test and independently retain the failing
  current-source receipt/readiness evidence; do not refresh old status hashes.
- Time/cost: telemetry not measured; no external API or audio spend.
- Reuse: shared lesson for all language-course audits—label historical-chain
  integrity separately from live-source freshness.
- Next check: finish S01's source/review/runtime/audio blockers before S02.

#### 2026-10-14 — English — sequential readiness inventory, all written sessions
- Status: inventory only; no learner text, receipt, status, release, mockup, or
  audio bytes changed. S01 remains the next session and remains HOLD.
- Scope/method: read-only `sessionReadiness(dir, ["uk"])` over every existing
  English session directory in L01–L04.
- Evidence: 186 session directories found; 0 pass this structural/evidence
  readiness function and 186 return HOLD. Highest issue families are missing,
  stale, or malformed locale/reviewer evidence and stale `status.json` records.
  S01 returns 45 issues; S02 and S03 each return 23. L04/S19 is the first
  absent session directory.
- Limitation: this gate measures evidence freshness and structural readiness;
  it does not establish that all 186 lesson texts have semantic defects or
  that fixing receipts alone would make them correct. No session is treated as
  approved based on this inventory.
- Defect/cause: review evidence is broadly stale or incomplete; the inventory
  does not by itself identify lesson-level root causes. S01 also has the
  separately documented unresolved repetition-contract conflict.
- Action: preserve sequential order at S01; do not refresh evidence hashes,
  fabricate reviewer results, advance to later sessions, or change statuses.
- Verification: corrected a directory-filter bug in the first inventory
  command; its erroneous zero count was discarded. Re-run counted 186, matching
  the direct lesson/session directory counts (56 + 56 + 56 + 18).
- Time/cost: elapsed duration was under two seconds for readiness checks; model
  token/cache telemetry not measured; no external API or audio spend.
- Next check: resolve the S01 owner-contract conflict, fix and re-review S01,
  then repeat this inventory after each sequentially completed session.

#### 2026-10-14 — English — S01 checkpoint integrity and Luna 6 calibration gate
- Status: read-only adjudication; canonical lesson, receipts, checkpoint,
  release, status, mockup and audio were not edited.
- Scope/evidence: reran the factory `verify-checkpoint` command on the exact
  S01 checkpoint. It fails on four changed S01 input files and two changed
  factory package files; checkpoint is phase `review`, next `en/l01/s01`, and
  `authoringAuthorized` is false. Read-only T3 advice confirmed v1 always
  returns false, refuses checkpoint overwrite, and treats input/package drift
  as a stop condition.
- Calibration distinction: seven retained Luna 6 candidate-role reports are
  reviews of one candidate, not a held-out model calibration. The protocol
  requires frozen positive/known-defect controls, held-out evaluation and
  measurable accepted-quality/cost data; current-version telemetry remains not
  measured. Historical gpt-5.6-Luna results do not transfer to gpt-6-luna.
- Contract: independent adjudication confirmed that intro-answer retrieval and
  global one-use primary-target requirements conflict when exact intro answers
  must recur as scored practice. No policy interpretation was chosen.
- Action: preserve the old checkpoint and evidence; do not refresh hashes,
  author a new canonical candidate, alter status/release, or advance past S01.
  Luna 6 supplied a proposed RU/UK Intro 1 repair, but it was not applied while
  the authoring gate and contract remain unresolved.
- Verification: checkpoint mismatch reproduced; factory code and calibration
  protocol inspected; no tests were run because no code/content was changed.
- Time/cost: model/token/cache and run telemetry not measured; no project API,
  TTS, or release spend.
- Next check: obtain the owner's narrow repetition-rule decision; then create
  a versioned contract/gate and new checkpoint without overwriting this one,
  establish Luna 6 calibration and authorization, and resume S01.

#### 2026-10-14 — English — S01 sequencing adjudication and intro feedback runtime
- Status: runtime feedback contract fixed and independently reviewed; S01
  content remains HOLD. No lesson source, status, review receipt, release, or
  audio file was changed.
- Scope/evidence: read-only T3 adjudication of the intro-to-practice and
  cross-session repetition rules; S01 `factory_intro_practice_gate` returned
  0 findings (3 intro targets, 18 practice targets). `sessionReadiness` still
  returns 45 issues. The S01 checkpoint remains invalid on four lesson inputs
  and two factory-package files; no digest was refreshed.
- Correction to 2026-10-14 checkpoint entry above: its claim that intro-answer
  retrieval conflicts with cross-session novelty was incorrect. The owner rule
  requires each intro answer to be taught before its question and then used as
  a practice target; the novelty limit applies across sessions. The release
  gates permit same-session reuse when practice has a distinct purpose and a
  fresh answerable context. The old interpretation must not block S01 or later
  sessions; this append-only entry preserves the historical record.
- Defect/cause: the direct intro UI resolved and rendered authored linguistic
  analysis for the selected correct answer (and full diagnostics after wrong
  answers), unlike the learner-feedback rule. Network projection filtered
  correct-answer analysis, but the direct factory-native path bypassed that
  projection. The learner component had no regression asserting the rule.
- Action: removed learner-facing analysis/diagnostic rendering from the shared
  intro component while retaining the internal resolver/API and authored
  evidence; kept the concise wrong-answer correction. Updated the legacy
  component expectations and registered a focused regression in the RNTL
  allowlist.
- Verification: independent T3 review PASS; RNTL 2/2 suites and 4/4 tests PASS;
  ESLint and scoped `git diff --check` exit 0. The open local mockup endpoint
  remained HTTP 200. These checks prove this runtime behavior only, not S01 or
  course release readiness.
- Remaining S01 evidence: exact audio transcript `I am fine.` is required by
  interaction `en:lesson-01:session-01:i17:s03` but appears 0 times in the
  3,192-entry factory-production manifest; audio parity is not established.
  The 45 readiness issues are principally stale/malformed judge, locale, and
  status evidence, not 45 proven lesson-text defects. Trusted host epoch was
  absent at this run; the content preauthoring guard must not be bypassed.
- Time/cost: token/cache and model-run telemetry not measured; no project API,
  TTS, or release spend.
- Next check: continue S01 from its exact current bytes and close only verified
  defects/evidence in order; then continue through the remaining written
  sessions before authoring the first absent session, L04/S19.

#### 2026-10-14 — English — all-written-session readiness inventory
- Status: read-only course audit; lesson content, statuses, receipts,
  checkpoints, release data, and audio were not changed.
- Scope/evidence: enumerated `sessions/en/l01` through `l04`; found 186
  written session directories. Deterministic `sessionReadiness` over RU/UK
  currently reports 0 ready and 186 HOLD, with 13,017 issue occurrences
  across 1,318 distinct issue strings. First HOLD is `en/l01/s01`; first
  absent session in the 32-by-56 plan is `en/l04/s19`.
- Interpretation boundary: issue occurrences are not unique content defects.
  Frequent findings concern stale locale/reviewer evidence, missing or
  mismatched source hashes, and absent status/review records. The count does
  not establish 13,017 lesson errors and does not prove semantic quality.
- S01 check: focused feedback/explanation suite passed 54/54. This is
  necessary regression evidence only, not a session readiness pass. Exact
  transcript `I am fine.` has 0 entries in both inspected Learning V2 audio
  manifests (`factory-production-v1` and `session1-production-v1`). The
  mockup endpoint returned HTTP 200.
- Action: keep the required order at S01; preserve the historical checkpoint
  and current evidence; do not relabel, refresh hashes, advance, or write new
  session content. The trusted preauthoring epoch and independent current-byte
  guardian receipt remain prerequisites; the current thread is not the named
  coordinator thread and must not self-issue the epoch.
- Time/cost: model/token/cache telemetry not measured; no project API, TTS,
  or release spend.
- Next check: obtain the coordinator-authorized S01 preflight/guardian path,
  then close S01's remaining evidence and verified defects before proceeding
  sequentially through the other written sessions and, finally, `en/l04/s19`.

#### 2026-10-14 — English — S01 gate revalidation
- Status: read-only. Re-ran the factory checkpoint verifier and inspected
  the guarded runner and lifecycle binding; no session or gate state changed.
- Evidence: checkpoint still fails the same six digest bindings and reports
  `authoringAuthorized: false`. The runner requires an externally supplied
  trusted lifecycle epoch before preflight. The current thread ID differs
  from the named coordinator thread, so this worker must not self-issue it.
  The configured production runner has only Claude and Anthropic API backends;
  neither complies with the Luna 6/no-provider-API rule.
- Root cause: the gate is fail-closed as intended, but the shared writing
  runner cannot execute through the permitted model path and this thread lacks
  coordinator authority. This is a tooling/authority gap, not evidence that
  session text is correct or defective.
- Action: preserve checkpoint and source bytes; do not refresh digests or
  bypass the guard. Resume only after the coordinator supplies the current
  lifecycle binding and a compliant independent review path is available.
- Time/cost: model/token/cache telemetry not measured; no project API or TTS.

#### 2026-10-14 — English — pair feedback preview regression
- Status: preview/runtime fix only; no lesson content, release data, review
  receipt, checkpoint, or session readiness status was changed.
- Evidence: generic pair-error feedback did not identify the intended match.
  Added RU/UK-specific feedback that reveals only the selected item's expected
  match after an incorrect pair; correct pairs still show no explanation.
  Added locale-specific fixtures and a regression asserting unrelated pairs
  are not revealed. `build_mockup_pairs.test.mjs`: 24/24 PASS; `node --check`
  passes for the generator/runtime modules; source-template/runtime behavior
  matches apart from indentation.
- Build finding: the generator's embedded script is inside an outer HTML
  template literal, so nested backticks broke module parsing. Replaced the
  embedded message with ordinary string concatenation. Built in an isolated
  staging directory, then published through `writeMockupFile`; HTTP preview
  returned 200 and contained RU/UK correction strings. Native manifest was
  not run or changed.
- Scope boundary: the preview build still reports HOLD for 186 written
  sessions and 242 intro/practice findings; 183 cards have source findings
  and all 186 opening projections differ from the current release. These are
  gate outputs, not 242/183 unique proven prose errors. S01/S02 use evidence-
  bound candidate runtimes, which were not modified by this preview change.
- Action: keep S01 first; obtain a fresh authorized review path for the
  candidate overlay and resolve its missing `I am fine.` transcript before
  claiming S01 readiness. Continue sequentially through written sessions;
  start `en/l04/s19` only after the written set is cleared.
- Time/cost: no model/API/TTS spend; exact token savings not measured.

#### 2026-10-14 — English — S01 wrong-pair preview recheck
- Status: preview behavior verified; lesson source, review receipts, checkpoint,
  readiness, and release status unchanged.
- Evidence: added a Playwright regression that opens the real S01 owner preview,
  exercises the first pair task with one wrong match, asserts the exact expected
  mapping is shown without unrelated options, then makes the correct match and
  asserts no explanation is shown. `node --test
  scripts/serve_learning_v2_static_owner_review.test.mjs`: 2/2 PASS.
- Current-byte review: exported S01 from the present RU/UK/atomic sources to
  `C:\Temp\learning-v2-en-l01-s01-review-20261014-01.json`; canonical export
  reports four roles (`judge_learner`, `judge_pedagogy`, `judge_nonsense`,
  `judge_reader`). Awaiting an independent Luna 6 read-only audit. No review
  results were imported and no content was edited.
- Scope boundary: S01 remains HOLD pending its unresolved review contract,
  provenance, audio, and rendered-parity requirements. Do not start later
  sessions or unwritten sessions until the written set is cleared.
- Time/cost: no project API or TTS spend; token telemetry unavailable.

#### 2026-10-14 — English Learning V2 — S01 gate and course readiness audit
- Scope: read-only readiness inventory of all 186 written English sessions, plus
  a narrow S01 curriculum-gate correction; no learner content or review receipts
  were edited.
- Evidence: deterministic `sessionReadiness` inventory returned 0/186 ready and
  13,017 raw findings (counts include repeated stale/missing provenance checks;
  they are not 13,017 distinct prose defects). In S01, the current RU/UK/atomic/
  explanation files no longer match the candidate receipt hashes, so earlier
  review evidence cannot establish quality of the current bytes. The aggregate
  curriculum gate initially found one mismatch: the plan and lexical assignment
  include `happy`, but the gate expected only `fine`, `here`, and `ready`.
- Action: corrected only that deterministic expected-sense list. The focused
  course-start gate now passes; the aggregate blueprint gate correctly remains
  HOLD because the current blueprint fingerprint is not owner-approved. Do not
  change approval hashes or infer current-source review from the old receipt.
- Reusable rule: when a readiness gate reports many findings, classify
  provenance drift separately from learner-facing defects; always compare
  current source hashes with the exact review bundle before reusing a verdict.
- Time/cost: elapsed and token telemetry not measured; no project API or TTS
  spend.

#### 2026-10-14 — English — sequential corpus-gate verification
- Status: read-only deterministic verification; no course source, mockup, review
  receipt, checkpoint, readiness, or release status changed.
- Evidence: `node --test pipeline/factory_intro_practice_gate.test.mjs` passes
  34/34. The all-source audit inventories all 186 written sessions and returns
  HOLD with 242 `intro_target_not_practiced` findings; sessions S01–S05 have
  zero findings for this specific gate, while S06 is the first with 10.
- Interpretation boundary: this gate checks whether each intro target has
  pre-final practice and validates its source binding; zero findings do not
  establish linguistic, learner, audio, or release readiness. The S01 blind
  listening-answer leak was found independently despite S01's zero gate
  findings. The corpus audit exits at the 242-finding hold, so it is not a
  full all-dimensions course audit.
- Sequence: keep S01 as the current first session; do not skip ahead to S06 or
  unwritten sessions. Source mutation remains prohibited by the current
  authorization guard; continue read-only evidence work until the allowed
  write path and unresolved contract are supplied.
- Time/cost: no model/API/TTS spend; token telemetry unavailable.

#### 2026-10-14 — English — S01 current-byte Luna 6 audit
- Status: read-only audit; no lesson, receipt, checkpoint, readiness, or release
  status changed.
- Evidence: Luna 6 reviewed the fresh review-export packet. Confirmed two
  learner-facing defects: `i17:s03` reveals the intended answer before audio
  (`fine` is uniquely implied by “how are you?”), and `i02:r3` repeats the
  prompt in an overlong wrong-answer correction. The contract calls for a
  brief, specific correction; no numeric character limit is established.
- False positives rejected: `i08` contains separate single-word choices, not
  one bundled option; `answers.correctText` is the canonical RU master while
  UK options are correctly localized and bound through `correctResponseId`.
- Unresolved contract question: `i17:s01` groups four full phrases in one
  `speed_match` interaction. The one-phrase rule points toward splitting, but
  an existing owner judgment and pipeline test explicitly accommodate a
  pair-grid. Keep HOLD; request a versioned coordinator decision before any
  split or contract change.
- Current-byte role export is bound to RU/UK/atomic hashes, but it does not
  satisfy authoring authorization. Source edits remain prohibited by the
  current checkpoint/guard and must wait for a coordinator-issued epoch and
  the required fresh guard/review evidence. Next sequence remains S01, then
  ascending session order; do not begin unwritten sessions until every written
  session passes.
- Time/cost: no project API or TTS spend; token telemetry unavailable.

#### 2026-10-14 — English Learning V2 — wrong-only selectable-feedback gate repair
- Status: bounded pipeline repair only; no lesson source, stored sidecar,
  release/mockup output, status, receipt, checkpoint, authorization, runtime,
  audio, deployment, or release state changed.
- Contract/evidence: `MODE_NATIVE_AUTHORING_CONTRACT.ru.md` requires feedback
  keys to equal the visible wrong-response IDs exactly. The old audit treated
  correct responses as missing feedback. RED reproduced 8 expected failures in
  the two focused suites; the real corpus reported 2,769 release findings
  instead of the expected 666 missing-wrong findings.
- Action: the auditor now derives correctness from explicit source/evaluator
  authority, checks only wrong IDs for required RU/UK response-specific text,
  rejects correct/stale targets as `feedback_target_invalid`, and fails closed
  on missing or ambiguous correctness. The release builder accepts absent
  correct-answer feedback, strips historical correct-answer rows from the
  learner projection without deleting source data, and keeps strict comparison
  of every wrong row. Atomic/Markdown parity ignores a legacy correct row only
  when one Markdown option is correct and the evaluator answer matches its
  stable response ID; it never trusts the row's own `correct` marker.
- Verification: focused and connected tests pass 33/33. The corpus audit still
  exposes exactly 666 release `feedback_missing` findings for wrong answers;
  it separately reports existing correct-target rows as invalid (source 732,
  release 616, mockup 723). `node --check` and scoped `git diff --check` pass.
- Limitation: the legacy mockup builder's separate single-phrase validator is
  outside this bounded repair and still warns that wrong-only projections lack
  correct-answer feedback. The new corpus auditor enforces the intended mockup
  map contract; no readiness or release PASS is inferred.
- Time/cost: elapsed time and token telemetry not measured; no external API,
  image, audio, deployment, or release spend.

#### 2026-10-14 — English Learning V2 — raw-authority and correct-row multiplicity correction
- Correction: the preceding shared-validator repair did not yet validate raw
  answer multiplicity in the direct answer audit and single-phrase projector;
  their early `Map` construction could collapse duplicate choice authority.
  The builder's wrong-only projection could also silently remove two or more
  feedback rows targeting the confirmed correct response.
- Action: every visible multi-option `single_choice` now requires exactly one
  raw answer row with a nonempty visible `correctResponseId` before any answer
  map or projection. Zero, stale, identical-duplicate, and conflicting-duplicate
  choice authority HOLD; legacy non-choice duplicate/null rows remain accepted.
  Wrong-only projection accepts zero or one historic correct-target feedback
  row, removes at most that one row, and HOLDs duplicate correct-target rows
  before filtering. Wrong and stale duplicate rows remain visible to the shared
  duplicate/unknown-target validator.
- Verification: RED reproduced the projector fallback and missing helper guard;
  the connected focused suites now pass 179/179. Syntax and scoped diff checks
  pass. The selectable-feedback corpus remains HOLD at 2,737 findings: source
  732 invalid correct targets; release 666 missing wrong explanations plus 616
  invalid correct targets; mockup 723 invalid correct targets. No readiness or
  release PASS is inferred.
- Time/cost: elapsed time and token telemetry not measured; no external API,
  image, audio, deployment, or release spend.

#### 2026-10-14 — English Learning V2 — wrong-only gate correction after shared-validator review
- Correction: the preceding entry's limitation is no longer current. Fresh
  review showed that `auditSinglePhraseRelease` and the mockup path still used
  the shared validator's obsolete every-option rule, while the release builder
  had a separate choice-only validator that skipped builder/dictation slot
  feedback. The gate was therefore not yet unified or fail-closed for duplicate
  single-choice answer authority at that point.
- Action: the shared validator now requires exact localized feedback only for
  evaluator-confirmed wrong choice IDs, rejects correct targets, and HOLDs both
  identical and conflicting duplicate answer rows for a visible multi-option
  `single_choice`. Non-choice null/absent correctness remains compatible. The
  release builder now calls that shared validator, restoring slot-feedback
  completeness, tile-ID uniqueness/validity, wrong-contract, every-locale text,
  and cross-locale parity checks without altering stored legacy content.
- Verification: the connected focused suites pass 175/175, including strict
  Markdown/atomic wrong-row parity and builder/dictation slot-feedback cases.
  Syntax checks and scoped diff checks pass. The corpus audit remains HOLD at
  2,737 findings: source 732 invalid correct targets; release 666 missing wrong
  explanations plus 616 invalid correct targets; mockup 723 invalid correct
  targets. This repair does not infer readiness or release PASS.
- Time/cost: elapsed time and token telemetry not measured; no external API,
  image, audio, deployment, or release spend.

#### 2026-10-14 — English Learning V2 — improvement-log ordering clarification
- The raw-authority and correct-row multiplicity correction recorded immediately
  before the shared-validator entry above was appended against a repeated tail
  marker and therefore appears out of execution order. Its evidence and 179/179
  verification apply after the shared-validator repair. No earlier entry was
  deleted or rewritten; this note preserves the log's append-only history.
- Time/cost: elapsed time and token telemetry not measured; no external API,
  image, audio, deployment, or release spend.

#### 2026-10-14 — English Learning V2 — parity raw-row and two-sided locale-map correction
- Fresh review found two remaining normalization gaps. Markdown/atomic parity
  filtered every confirmed-correct feedback row before comparison, so duplicate
  legacy correct rows could disappear. Source/release parity also compared each
  locale without separately running the shared feedback contract over complete
  source and release locale maps.
- Action: Markdown/atomic parity now counts raw confirmed-correct rows first and
  accepts only zero or one before filtering. Source parity safely projects and
  removes at most one legacy correct row; release data is never normalized.
  Complete projected-source and raw-release locale maps are independently sent
  through the shared validator before exact comparison, preserving duplicate,
  stale-target, required-locale, cross-locale, and slot-feedback findings.
- Verification: RED reproduced all three targeted failures; the connected
  focused suites pass 181/181. Syntax and scoped diff checks pass. The corpus
  remains HOLD at 2,737 selectable-feedback findings, including all 666 genuine
  missing-wrong release findings. No readiness or release PASS is inferred.
- Time/cost: elapsed time and token telemetry not measured; no external API,
  image, audio, deployment, or release spend.

#### 2026-10-14 — English Learning V2 — release-side validation independence addendum
- A final focused RED showed that a source-projection failure could prevent the
  raw release locale from entering its independent feedback audit. Collection
  is now side-independent: release duplicate/stale/slot findings remain visible
  even when the matching source projection already HOLDs. The same connected
  focused suites remain GREEN at 181/181; no readiness or release PASS follows.
- Time/cost: elapsed time and token telemetry not measured; no external API,
  image, audio, deployment, or release spend.

#### 2026-10-14 — English Learning V2 — pre-projection raw-feedback validation correction
- Fresh review found that the split-choice projector built a response-keyed
  feedback map before source/release parity validated the raw source rows. Two
  identical or conflicting wrong-answer rows could therefore collapse into one
  apparently valid projected row.
- Action: parity now clones the complete raw source locale map, removes only
  zero or one evaluator-confirmed historic correct-target row, and applies the
  shared feedback validator before any projection. Duplicate correct rows HOLD;
  wrong, stale, and slot-feedback rows are never deduplicated or reordered.
  Only a raw-valid source is projected and validated again, while the untouched
  raw release map is still validated independently before exact comparison.
- Verification: the focused RED reproduced the hidden duplicate on a
  two-sentence `listen_choose`. The connected scoped suites now pass 178/178,
  including raw identical/conflicting duplicates, duplicate correct rows,
  legacy single-correct normalization, raw slot duplicates, release-only
  duplicates, and projected missing-wrong coverage. Syntax and scoped diff
  checks pass. No readiness or release PASS is inferred.
- Time/cost: elapsed time and token telemetry not measured; no external API,
  image, audio, deployment, or release spend.

#### 2026-10-14 — English Learning V2 — sequential S01 gate recheck and authorization hold
- Status: read-only audit; no lesson, receipt, status, release, mockup, or audio
  bytes changed.
- Scope/evidence: checked current S01 readiness (`sessionReadiness` with UK
  locale), whole-course source/release parity (`sourceReleaseScopeIssues`,
  all sessions, RU/UK), whole-course selectable-feedback audit, focused
  feedback/parity regression suites, current macro tab, and guarded S01
  preflight.
- Findings: S01 readiness is HOLD with 45 structural/evidence issues. Direct
  source/release parity reports 7,232 issue occurrences across all 186 written
  sessions; S01 has 246. These are gate findings, not counts of unique semantic
  lesson defects. Selectable-feedback audit remains HOLD at 2,737 findings
  (source 732, release 1,282, mockup 723). Focused tests pass 178/178. The
  open macro serves all 186 sessions but still reports release stopped and 242
  intro/practice mismatches.
- Authorization: current guarded preflight returns HOLD because
  `PHRASEMAN_PREAUTHORING_HOST_EPOCH` is absent. Fresh read-only T3 review
  determined that generating a UUID in this worker would self-issue the trust
  root; filesystem write access does not grant coordinator authority. No
  preflight packet or authoring permission was fabricated.
- Change: none to lessons or release state. Asked the coordinator, under the
  user's explicit authorization, to inject a fresh lifecycle epoch or run the
  preflight and return its exact JSON packet. After receipt, pass that packet
  unchanged to a fresh independent guardian; resume S01 only after its verdict.
- Time/cost: elapsed time for individual checks was under three seconds each;
  model/token/cache telemetry not measured. No project API, TTS, or release
  spend.
- Next check: verify coordinator response and trusted preflight packet; then
  continue only with S01, preserving all existing evidence and history.

#### 2026-10-14 — English Learning V2 — owner preflight attempt not yet evidenced
- Status: verification only; no course artifact changed.
- Evidence: owner supplied a PowerShell transcript showing `Set-Location`,
  assignment of `PHRASEMAN_PREAUTHORING_HOST_EPOCH`, and invocation of the S01
  preflight command, but the transcript contains neither command output nor
  `$LASTEXITCODE`. Read-only inspection of the same repository then found no
  `sessions/en/l01/s01/.preauthoring-preflight.json` and no `preauthoring.json`.
- Interpretation: the command is not demonstrated to have completed. An absent
  file does not identify whether it failed to write, ran in a different clone,
  or had its output omitted; cause remains unverified. Do not infer a guardian
  packet or authoring authorization from the echoed command lines.
- Change: none. Requested the complete preflight stdout/stderr and exit code;
  do not mint a guardian receipt or begin source edits until the persisted
  hash-bound preflight packet is present and independently reviewed.
- Time/cost: no model/API/TTS spend; telemetry not measured.
- Next check: verify the exact packet file and compare its JSON with the
  captured stdout from the owner-run command, then send that unchanged packet
  to a fresh independent guardian.

#### 2026-10-14 — English Learning V2 — owner packet recovered; blueprint approval remains unresolved
- Correction to the preceding timestamped check: the owner later supplied the
  complete preflight output, and the packet was found persisted in the active
  repository. Its session/run/epoch binding matched, all 35 document hashes and
  roles matched, and the unchanged packet SHA-256 is
  `00e01b884bdc7cf3ab05d23944b49f91ce2d75816aca62033ee99f5d088eea9e`.
- Fresh guardian result: BLOCK, not authoring permission. The deterministic
  curriculum blueprint gate returns HOLD (`approval_pass=false`). The owner
  subsequently stated “Я ВЛАДЕЛЕЦ И Я ОДОБРЯЮ ВСЕ”, but the authority sources
  contain conflicting and superseded fingerprints, so that broad statement is
  not bound to the current canonical bytes. A fresh read-only review identified
  current body hash `d956442e0946194e3de8105601ae993fe6f7932e7904cc3e4e972fc8444875da`;
  it also found the machine gate needs append-only successor authority and
  reconciliation of current/registry/test claims before it can pass.
- Change: no lesson or authority/release bytes changed. Do not save the BLOCK
  as a PASS receipt. Ask the owner to explicitly approve or reject the exact
  full current-body hash; then reconcile authority append-only and rerun the
  deterministic gate before a fresh preflight/guardian cycle.
- Time/cost: model/API/TTS/token telemetry not measured; no project API, TTS,
  deployment, or release spend.

#### 2026-10-14 — English Learning V2 — exact blueprint approval authority correction
- Status: the owner explicitly approved exact current body SHA-256
  `d956442e0946194e3de8105601ae993fe6f7932e7904cc3e4e972fc8444875da`
  with «Да, одобряю именно d956…75da». A new append-only owner receipt records
  that decision; historical receipts were not rewritten.
- Defect: the approval constant/registry still bound superseded
  `f776cf32…18b0`, current START pointers were stale, and an in-progress
  lifecycle refactor had removed the mandatory authority-conflict invocation
  from the actual preauthoring receipt gate. The parser also treated a lower
  historical “current” block in `СТАРТ В2` as live authority.
- Change: exact-hash constant, registry, both current START pointers and
  deterministic tests now bind `d956…75da`; the fail-closed receipt invocation
  is restored without altering lifecycle code. The parser compares only the
  first/top current claim in each current document and ignores documents marked
  `historical_context`; regression coverage preserves detection of genuinely
  conflicting current claims.
- Scope: no lesson/session, preauthoring receipt, release, mockup source, audio,
  status, deploy or production mutation. The next required step is a fresh
  owner-run preflight plus a fresh independent guardian; approval is not
  authoring or release readiness.
- Regression result: 13/13 blueprint matrix gates PASS; aggregate curriculum
  gate PASS on `d956…75da`; preauthoring guard 29/29 PASS; rebuilt owner-map
  gate PASS at 32/224/1,792; scoped diff check PASS. Initial RED evidence was
  retained in the execution record: artifact approval was `PENDING`, and stale
  historical claims conflicted until the parser was narrowed.
- Time/cost: not measured; no project API, TTS, deployment or release spend.

#### 2026-10-14 — English Learning V2 — automatic authoring admission replaces repeated manual receipts
- Problem: `draft`, `edit` and `full` required a new owner-run lifecycle epoch
  and self-declared guardian `preauthoring.json` before every session, while
  prior-session audio/canonical publication state also blocked later authoring.
  Those controls repeated the already-recorded exact blueprint approval and did
  not cryptographically authenticate reviewer identity.
- RED: focused tests initially returned 0/3 because the automatic admission
  module did not exist and `run.mjs` still depended on manual preauthoring
  state. A separate lock-cleanup regression returned 2/3 until the admission
  failure stopped calling `process.exit(2)` inside the held-lock `try`.
- Change: English `preflight|draft|edit|full` now uses an automatic fail-closed
  packet bound to blueprint `d956…75da`, pinned plan SHA-256, the exact current
  curriculum row and admitted grammar/vocabulary/scene/mode, required content
  digests, prior learner-source digests and one filesystem writer lock. A
  failed admission throws through `finally`, which releases the lock. No owner
  prompt, lifecycle epoch or guardian receipt is part of this authoring entry.
- Safeguards retained: blueprint/plan/row/source drift remains HOLD; post-draft
  semantic judges and machine acceptance remain mandatory; evidence states
  `NOT_CRYPTOGRAPHICALLY_AUTHENTICATED`; canonical sync, audio and parity remain
  release-only fail-closed gates. S02 read-only preflight passed without using
  S01 publication readiness. The Cambridge `be` table is recorded only for the
  bounded S01 claim `I → am`, without teaching other persons or operations.
- Verification: focused admission/entry/release suite 12/12 PASS; concurrent
  writer exclusion 1/1 PASS; curriculum blueprint gate PASS on exact
  `d956…75da`; real S02 preflight exit 0; syntax and scoped diff checks PASS.
  The legacy `run_full_acceptance.test.mjs` remains 0/10 because its VM harness
  slices `async` from `async function main()` and therefore cannot parse the
  pre-existing `await import(...)`. The legacy guardian suite is 28/29: its one
  failure still asserts removed prior-range release readiness. Neither legacy
  failure is treated as a PASS or repaired in this bounded change.
- Scope: no learner-facing session text, audio, release/status/mockup, API,
  deployment, staging or commit. Time/cost telemetry was not measured.

#### 2026-10-14 — English Learning V2 — admission manifest, prior quality, and snapshot hardening
- Fresh review found three fail-open risks in the automatic admission slice:
  the caller selected `contentPaths`, prior quality status was not separated
  from publication-only blockers, and plan/context bytes could be read before
  the session lock or reread after hashing.
- RED: the new focused suite first failed at import because no code-owned
  mandatory manifest existed. After the initial implementation it reached 4/5;
  the remaining assertion still assumed the packet could not mention release
  state at all, while the intended contract records and defers release-only
  blockers without admitting release artifacts.
- Change: the code-owned English manifest now requires the Desktop start packet,
  active repository/start/mode/recenter/blueprint sources, factory core,
  Cambridge and word-card sources, improvement log, three exemplars, plan and
  language notes, judge constitution, every currently required owner ruling,
  and all discovered owner/prompt Markdown. Files are captured after acquiring
  the per-session lock, revalidated for mid-admission changes, and the exact
  captured bytes back subsequent plan/context/prompt reads.
- Prior status is now classified separately. Missing/invalid status, semantic
  judge blockers, broken tasks, machine facts, build-quality problems, missing
  independent roles, or an unexplained unresolved state give
  `prior_quality_hold`. Only `audio`, `audio_evidence`, `canonical_sync`,
  `parity`, `release_parity`, and `source_release_parity` are deferred to the
  publication gate. Their status SHA-256 and classification remain in evidence.
- Legacy lifecycle tests were retired without removing unrelated receipt/lock
  coverage. The old guardian validator no longer treats prior release readiness
  as an authoring requirement; full-acceptance VM coverage now executes the
  async main body and verifies automatic admission plus all semantic stop gates.
- Verification: connected authoring/guardian/full-acceptance/canonical-release
  suite 57/57 PASS. No learner-facing session, audio, status, release, mockup,
  API, deployment, staging or commit. Time/cost telemetry was not measured.

#### 2026-10-14 — English Learning V2 — lock cleanup and frozen-source closure
- Fresh verification found three remaining fail-open paths: CLI exits after
  taking the session lock, protected source discovery outside the captured
  manifest, and release-only blockers masking an explicit semantic judge
  `BLOCK` in prior status.
- RED: focused regressions passed 6/10. They reproduced acceptance of a newly
  added owner source, acceptance of mixed release plus judge-quality blockers,
  missing frozen-inventory enforcement, and a real invalid S99 preflight that
  exited while leaving its filesystem lock behind.
- Change: all post-lock CLI failures now unwind through `finally`; a narrowly
  validated dead-owner lock is recoverable while live or unsafe locks still
  fail closed. Protected authoring reads and directory listings use the exact
  under-lock source snapshot/inventory, and admission rejects any added,
  removed, or changed mandatory source. Explicit prior `status.judges` verdicts
  are quality gates even when `blockedBy` contains only publication blockers.
- GREEN: focused admission/entry regressions 10/10 PASS; connected automatic
  admission, entry, retained guardian/lock, full semantic acceptance, and
  canonical release suite 59/59 PASS. Live concurrent-writer exclusion,
  dead-lock retry, quality HOLD, release-only deferral, and release fail-closed
  behavior are all covered.
- Scope: no learner-facing session text, audio, status, release, mockup, API,
  deployment, staging or commit. This record does not assert that a session is
  authored, accepted, or publication-ready. Time/cost telemetry was not
  measured.

#### 2026-10-14 — English L01/S01 — concise wrong-only feedback verification
- Evidence: two independent Luna reviews checked the current RU/UK source,
  atomic practice and explanation sidecar. The pedagogy/localization review
  returned PASS. The blind learner review first treated internal analysis as
  visible correct-answer feedback, then rechecked the real renderer and revised
  to PASS: correct attempts suppress analysis; wrong attempts show only the
  selected response correction.
- Change: correct responses remain the minimal `Верно.` / `Правильно.`. The
  `fine` distractor in the arrival task was shortened without losing the exact
  correction `I am here`; the `fine` distractor in the happy task now names the
  exact correction `I am happy`. RU, UK, atomic payload and explanation-sidecar
  diagnostics were updated together; the source bindings were refreshed.
- Regression: the first focused run exposed one stale exact-copy assertion
  (87/88 PASS). After updating that contract to the new concise copy, the same
  five-file focused suite passed 88/88. This includes wrong-only feedback,
  hidden correct-answer analysis, source-binding, learner clarity, localization
  and mockup behavior checks.
- Scope: no audio, canonical release, status, deployment, API, staging or
  commit. The text passed the bounded content checks but is not declared
  publication-ready until candidate evidence and remaining publication gates
  are refreshed. Time/cost telemetry was not measured.

#### 2026-10-14 — English L01/S01 — create-only concise-feedback owner preview
- Root cause: the full-course owner-review manifest still selected the older
  `s01-i13` projection, so the current concise `i02`/`i07` feedback could not be
  inspected. The two latest PASS reviews existed only as chat results and had
  no persisted hash-bound raw artifacts; treating them as signed review
  evidence would have fabricated provenance.
- RED/GREEN: focused tests first rejected the new successor name and showed
  that the owner-review overlay hard-coded every candidate as text-verified.
  The final focused receipt/publication set passed 6/6, private-manifest and
  overlay status passed 2/2, the two browser journeys passed 2/2, and the
  connected current source/feedback/explanation suite passed 116/116.
- Change: generated a new create-only private candidate at
  `outputs/s01-concise-feedback-fixed-20261014`, bound the five current source
  files plus nine generated preview files in content receipt inventory
  `e3506be2c2cd1edf4496d8ff951139a92ee96b4c96f030332d330fdfa1e32bdb`,
  and selected it through `owner-review-preview-manifest.json`. The full-course
  overlay now distinguishes `textVerified:false`, keeps the card yellow, shows
  `Текст ещё проверяется`, and retains exact before/after inspection.
- Trust boundary: the private preview has `reviewStatus:HOLD`,
  `textReviewEvidencePersisted:false`, and `releaseAuthority:false`. No review
  receipt was invented. The historical no-drift review-receipt gate remains
  fail-closed because the current canonical mockup bytes differ from its pinned
  predecessor; this private content receipt deliberately makes no no-drift,
  review, green, audio, or release claim.
- Runtime verification: the owner-review process was restarted on port 59692
  after the old process continued serving its startup-time manifest route.
  `/health`, `/current-candidate`, and `/` returned HTTP 200; the full-course
  response contained the pending-review label and no unavailable-build page.
- Browser regression follow-up: the private HOLD card initially inherited the
  canonical `Выпуск надо синхронизировать` finding even though the overlay
  itself was current. Server-side removal made the early Playwright snapshot
  clean, but an independent in-app-browser check proved that a late canonical
  render could restore the chip. A second RED browser assertion inserted that
  late mutation after attach and reproduced the settled-DOM failure (`1 !==
  0`). A private-HOLD finalizer now removes exactly that stale chip only for
  validated `textVerified:false` candidate keys and watches subsequent child
  mutations. The focused browser/status suite is 5/5 PASS. After the exact
  server restart, a live network-idle check plus two animation frames retained
  only `Текст ещё проверяется` and `Выпуск не подтверждён`; the test also
  injected a late stale chip and observed its removal. The unavailable banner,
  page errors and console errors were absent, and no service worker controlled
  the page. A separate final in-app-browser reload of the cache-busted route
  confirmed the same settled card without either stale label or the unavailable
  banner; that tab remained open for owner review.
- Scope: canonical release, session status, audio, historical candidates, API,
  deployment, staging and commits were untouched. Time/cost telemetry was not
  measured.

#### 2026-10-14 — English — L01/S02 — correct-answer feedback and pair prompts
- Status: observation and bounded repair; remaining independent review is
  pending.
- Scope/version: `en/l01/s02`; current RU/UK Markdown, atomic projection,
  explanation sidecar and S02 regression test.
- Evidence: current source had explanatory text on all three correct intro
  answers and correct choice responses; the correct atomic rows and six
  completion rows also carried explanations. Pair tasks 7 and 17 used either
  `Соедините пары` or `слова, которые уже ваши`, which did not identify the
  matching relationship. The added RED checks failed on these exact fields.
- Cause: learner-facing correct-response copy reused evaluator explanation;
  pair-task prompts omitted the two matching categories.
- Change: RU/UK correct confirmations are now only `Верно.` / `Правильно.`;
  authored completion confirmations use the same minimal wording. Both pair
  prompts now explicitly ask to match English words with meanings. Updated
  atomic text, UK locale batch, sidecar bindings and S02-only regression.
- Quality guard: S02 regression 14/14 PASS; generic receipt regression 4/4
  PASS. The old repair helper was attempted and failed before writing with
  `s02_correct_response_missing:i02`; code inspection shows its correct-row
  lookup expects a correct row in the wrong-only feedback list. This helper
  issue is outside the current file ownership. No candidate materialization,
  independent current-candidate review, audio or release gate was run.
- Time/cost: total elapsed time and model/token/cache telemetry not measured.
- Reuse: English S02 only; source copy and matching prompt findings are not
  generalized to other languages.
- Next check: repair the S02 helper under a separately authorized scope, then
  run its deterministic projection gate and obtain fresh reviews on the exact
  post-repair hashes before any materialization candidate step.

#### 2026-10-14 — English — L01/S02 — cross-locale correct-feedback parity
- Status: confirmed defect repaired.
- Scope/version: `practice.atomic.json` correct choice rows for
  `i02`, `i04`, `i08`, `i09`, `i14:s02`, and `i17:s03`, RU and UK copies.
- Evidence: strengthened S02 test failed on `ru:i02:r1:uk`, where the RU
  interaction copy retained the long Ukrainian explanation. The same defect
  affected the opposite locale on all six IDs.
- Cause: the prior correction normalized only the interaction's owning locale;
  the atomic representation duplicates both locale values in each projection.
- Change: all 12 correct choice rows now carry both minimal strings in both
  locale projections (`Верно.` / `Правильно.`). No Markdown/sidecar binding
  changed; sidecar bindings remain to their exact RU/UK Markdown bytes.
- Quality guard: RED 13/14; focused S02 plus receipt suite 18/18 PASS;
  `git diff --check` clean.
- Time/cost: total elapsed time and model/token/cache telemetry not measured.
- Reuse: English S02 only; deterministic assertion covers both locale values
  on every correct atomic choice row.
- Next check: run fresh independent reviews for the exact candidate before
  materialization; do not infer review or release readiness from these gates.

#### 2026-10-14 — English — L01/S03 — correct-only feedback and sound distractor audit
- Status: bounded observation and repair; release remains HOLD.
- Scope/version: `sessions/en/l01/s03`; RU/UK final Markdown, UK locale batch,
  atomic practice projection, and `pipeline/l01s03_feedback_repair.test.mjs`.
- Evidence: pre-repair focused test RED was 2/5 (three failures: long intro
  correct feedback in RU, long correct-choice feedback in atomic projections,
  and RU intro 2's coffee situation paired with `I am not cold`). A later
  accent regression RED was 5/6 because `shore` remained in S04. Post-repair
  focused test is 7/7 PASS. Cambridge records UK `sure` and `shore` with the
  same /ʃɔːr/ pronunciation; production audio manifest has 4 existing `sure`
  and 4 existing `shirt` assets, zero `shore` assets. The targeted selectable
  feedback scanner returns HOLD with 42 `feedback_target_invalid` findings:
  14 source, 14 release and 14 mockup, all on correct-response rows. Release
  and mockup projections were outside this packet and were not modified.
- Defect/cause: learner-visible correct answers repeated explanations; RU
  intro 2's coffee clue did not support the cold response; intro 3 asserted an
  unsupported daily frequency and incorrectly connected `I am not alone` to
  refusing; UK fields contained some Russian feedback copy; and `shore` both
  allowed an accent-dependent distinction and failed bundled-audio lookup.
- Change: all intro and atomic correct-feedback fields now use only
  `Верно.` / `Правильно.`; scenes and localized wrong-choice/tile feedback are
  repaired; S04/S05 use `shirt`, preserving response IDs and the `sure`
  answer while changing S04 `audioB.transcript` to its resolvable `shirt`.
  No audio assets, release, mockup, status, API or review evidence changed.
- Quality guard: regression covers all 21 interactions in both projections,
  every selectable response and extra tile, exact RU/UK corrections, stable
  response/audio IDs and correct answer, plus bundled audio manifest paths.
  `git diff --check` PASS. Feedback scanner HOLD is retained verbatim above;
  no PASS or release readiness is inferred from the focused test.
- Source hashes (SHA-256): `final.ru.md`
  `beca6e97f66e0a5d0715bd9af7fcd3889a2bdf8a6286861f6513d2f9f2d0a954`;
  `final.uk.md` `ca9be5c8a82acf9422a83b5c7022baef939cbdfeeff42c9ff2861f6374133ea3`;
  `locales_batch.md`
  `fa8abe7ec1e1a66d5f5f555dc29ad5c4b6ff3c9894a55f62de75a07937638428`;
  `practice.atomic.json`
  `f36bdd3d1411497df50e6b28596841392d72c70dfbc37612ca342b3cc185a066`;
  test `b933df140bbc8aac673676b8717fef46ac1e128e30f5ab3be545d16665c3429`.
- Time/cost: elapsed time and model/token/cache telemetry not measured.
- Reuse: English S03 only; correct-feedback and contrast findings are
  session-specific. Next check: refresh only the separately authorized
  source/release/mockup projections and gates before any publication claim.

#### 2026-10-14 — English — L01/S03 — UK batch parity and wrong-only feedback
- Scope/version: follow-up to `sessions/en/l01/s03`; RU/UK final Markdown,
  UK `locales_batch.md`, `practice.atomic.json`, and
  `pipeline/l01s03_feedback_repair.test.mjs`. No release/mockup/candidate,
  server, audio, status, API or review evidence was changed.
- Evidence: strengthened focused test was RED (6/9 pass, 3 fail): authored
  correct-answer feedback existed in intros/atomic choices, UK batch differed
  from authored/atomic feedback, and Intro 2 claimed a short `No` inherently
  rude. Regression now checks all 21 UK batch task blocks against final UK,
  the exact UK atomic wrong choice/tile feedback, zero authored correct-choice
  feedback, complete wrong-choice IDs, and neutral Intro 2 language. GREEN:
  9/9. Targeted selectable-feedback audit is HOLD with 28 findings: source=0,
  release=14, mockup=14; the remaining release/mockup projections are stale and
  outside this packet. Scoped `git diff --check` passes (Git reports only
  expected LF-to-CRLF working-copy notices).
- Defect/cause: batch was a stale partial copy of final UK and omitted or
  diverged on several distractor/tile explanations (including i03 actor,
  i10/i11/i13/i16/i19/i21); atomic/source did not agree on selected UK
  wrong-answer wording. Correct verdict text was duplicated in authored
  payloads despite being runtime-owned. Intro 2 generalized that a short `No`
  is rude, although tone/context determine politeness.
- Change: synchronized UK batch practice and Intro 2 to current UK source and
  atomic wording across all 21 tasks; aligned the four UK source feedback
  strings confirmed by parity checks; removed authored correct feedback rows
  from both atomic locale projections and correct-option explanations from
  RU/UK intros and practice lists while retaining the correct choices. Recast
  Intro 2 in RU/UK as short-answer versus full-sentence practice without a
  politeness judgment. Wrong-answer feedback and response IDs remain intact.
- Quality guard: source audit now has zero issues; 28 findings are confined to
  unchanged release/mockup copies. The focused regression covers every UK task
  and each atomic wrong-answer/tile feedback value. Runtime/release remains
  HOLD until separately authorized projections are refreshed and checked.
- Source hashes (SHA-256): `final.ru.md`
  `2f0ffcb9a519297b8885b337975dea1d38f8050eafa5d3f74b6410b5dea70c84`;
  `final.uk.md` `7196234a25a1a78e43b386073d4ef39b065fd624206197f8be3d2d3deb8027c4`;
  `locales_batch.md`
  `d42a5ed7a6c25fc448b74d24bc48eed2d62fdd842ae9b40fd2665086b99b4291`;
  `practice.atomic.json`
  `de9de1ba344e472c310b5f92352060a64aa902398b213eca75dc6df659857992`;
  test
  `9de7253cc7e54c3b4dca5d0a2548c20da6c318abd6daa7015cd7e5d76febfd29`.
- Time/cost: elapsed time and model/token/cache telemetry not measured.
- Reuse: S03 parity evidence is session-specific. Shared lesson-authoring
  contract: authored answer feedback is wrong-only; the runtime supplies the
  localized correct verdict. Do not update release/mockup until separately
  authorized.

- Follow-up correction to the immediately preceding S03 record: the exact
  stale blocks were interaction IDs i03, i10, i11, i12, i13, i15:s02,
  i17:s02 and i17:s04 (task ordinals 3, 10–13, 16, 19 and 21). The final
  focused-test SHA-256 after completing the full parity assertions is
  `4eafd5d4ab03f567d91fe13e84d4d48d98bea624c7df8456d3add7a5ac33ba1c`.
- Correction: the stale task list above omitted i02, i04 and i05. Complete
  affected interaction IDs: i02, i03, i04, i05, i10, i11, i12, i13,
  i15:s02, i17:s02 and i17:s04 (task ordinals 2, 3, 4, 5, 10, 11, 12, 13,
  16, 19 and 21).

### 2026-10-14 — English — L01/S01 — remove authored correct-answer feedback
- Status: source repair validated; downstream parser compatibility remains
  unresolved and is recorded for the coordinator.
- Scope/version: `sessions/en/l01/s01` RU/UK Markdown, UK locale batch, atomic
  practice, explanation source bindings, and
  `pipeline/l01s01_feedback_repair.test.mjs`.
- Evidence: the new regression first failed on intro correct verdict suffixes,
  practice correct feedback rows, and Markdown correct-option suffixes. After
  repair, focused regression passed 34/34. `audit_selectable_feedback.mjs
  --scope en/l01/s01 --json` reports source=0, release=14, mockup=14; remaining
  28 findings are stale release/mockup copies outside this packet. Atomic
  counts remain RU=20, UK=20, answers=20; authored correct choice feedback=0;
  wrong selectable feedback=20 across both projections; extra tiles=18 and
  tile feedback=18. UK batch correct-option lines match final UK exactly.
  Explanation source bindings match the new Markdown SHA-256 values; the atomic
  preservation snapshot remains
  `656c688a59344bd0c9d11f89fe4f8bec05ccd83eadff4b7a6c9d342769369d14`.
- Defect/waste: correct verdict copy was still authored in intro Markdown and
  atomic `choiceFeedback`, although runtime owns the localized correct verdict.
  A broader existing explanation-validator run has 3 failing tests: its
  Markdown extractor requires a feedback suffix even on correct intro choices,
  and its task-11 test dereferences the removed correct atomic row. The
  coordinator assigned those generic parser/test changes separately; they are
  untouched here.
- Cause: confirmed source/contract mismatch for the feedback rows; the broader
  failures are an observed downstream parser/test assumption, not evidence
  that the repaired source rows should be restored.
- Change: removed authored correct feedback rows and suffixes while retaining
  wrong feedback, IDs, answer keys, 20-step inventory, scenes, audio transcripts,
  and evaluator analyses. Updated UK batch parity and explanation Markdown
  bindings. Added regression coverage for exact wrong selectable IDs, blank
  correct intro feedback, absent correct atomic rows, and complete authored
  extra-tile coverage.
- Quality guard: RED/GREEN established; focused regression 34/34 PASS; scoped
  source audit 0 findings; `git diff --check` PASS. The combined regression
  plus sidecar validator suite is not green (3 failures described above).
- Time/cost: elapsed time and model/token/cache telemetry not measured.
- Reuse: shared runtime-ownership principle already recorded in the preceding
  S03 entry; this source repair and exact IDs are English S01-specific.
- Next check: after the separately owned validator/parser updates, rerun the
  explanation validator and verify that it accepts blank correct intro
  feedback while preserving internal analysis and source bindings.

### 2026-10-14 — English — L01/S02 — remove authored correct-answer feedback
- Status: source repair validated; release and mockup projections remain outside this packet.
- Scope/version: `sessions/en/l01/s02` RU/UK Markdown, UK locale batch, atomic
  practice, explanation source bindings, and `pipeline/l01s02_feedback_repair.test.mjs`.
- Evidence: RED was 11/14: three failures found correct-option feedback in
  introductory Markdown, practice Markdown, and atomic `choiceFeedback`.
  GREEN: focused S02 regression 14/14; generic explanation validator 22/22;
  scoped selectable-feedback audit reports source=0, release=12, mockup=12.
  The 24 remaining findings are stale release/mockup rows and were not changed.
- Cause: confirmed contract mismatch: the authored source duplicated the
  correct verdict although the runtime supplies it. Wrong-response corrections
  and evaluator analysis are separate records.
- Change: removed the nine RU/UK correct-option Markdown suffixes and all 12
  atomic correct-choice feedback rows; preserved all response IDs, answer keys,
  21 interaction ordinals, wrong response/tile feedback, and internal analysis.
  Refreshed both source bindings. Per locale: correct choice-feedback rows=0,
  wrong rows=12, and choice coverage mismatches=0.
- Quality guard: `git diff --check` passed. Current SHA-256: RU
  `dd93535c75f538b7e0be33f887e3122a03b7227add5a0d4e0807f9ea31160d9d`;
  UK `759b4da9942bb2fded4fe955ece7a42b20a64c1ec8b17196483b0c386d6b1855`;
  batch `16fa0519bc30eba6ef360ba599f6cf3a11595466cf948c010360ce20a753662d`;
  atomic `32673f91c1ca372a14657a0e722bf28703b5f358874ca9c132a67b560b597420`.
- Time/cost: not measured.
- Reuse: shared runtime-ownership rule; exact S02 text and IDs are English-session-specific.
- Next check: independently review these exact bytes, then rebuild a new
  create-only candidate before refreshing any release/mockup projection.

### 2026-10-14 — English — L01/S03 i04 — make the two-audio contrast solvable
- Status: validated source repair; release and mockup projections remain outside this packet.
- Scope/version: `en/l01/s03:i04`; RU/UK Markdown, UK locale batch, atomic
  RU/UK projections, and `pipeline/l01s03_feedback_repair.test.mjs`.
- Evidence: the authored interaction has two retained audio targets in order:
  `audioA` transcript `sure`, then `audioB` transcript `shirt`, but its prompt
  previously asked which word “sounds in the recording”. Both words did.
  The new regression was RED with that prompt and its old response feedback;
  it is GREEN 9/9 after the repair. The generic explanation suite is GREEN
  22/22. Scoped selectable-feedback audit reports source=0, release=14,
  mockup=14; the 28 remaining rows are stale projections and were not changed.
- Defect/waste: a two-audio contrast was described as though it contained one
  audible word, allowing two reasonable answers.
- Cause: confirmed mismatch between the sequence in `audioA`/`audioB` and the
  learner-facing question/feedback.
- Change: ask which word is heard first in both locales; make the accessible
  label and tested contrast identical to the prompt; preserve IDs, options,
  answer `r1`, and both audio transcripts. The `shirt` and `sugar` corrections
  now state why neither is the first word.
- Quality guard: focused S03 9/9 PASS; generic explanation validator 22/22
  PASS; S03 source audit 0; `git diff --check` PASS. No audio listening claim
  is made from transcript evidence.
- Time/cost: not measured.
- Reuse: shared learner-solvability rule: if an interaction exposes multiple
  audio targets, its prompt and every wrong-answer correction must identify a
  deterministic position or another unique criterion before asking for one
  response.
- Next check: materialize a new immutable S03 candidate, then verify the
  rendered interaction asks for the first word while retaining both audio
  targets.

### 2026-10-14 — English — L01/S03 — scope the negative-word placement rule
- Status: scoped source correction validated; private owner preview remains HOLD.
- Scope/version: `sessions/en/l01/s03`; RU/UK intro 1, exact UK locale batch
  projection, and `pipeline/l01s03_feedback_repair.test.mjs`.
- Evidence: new S03 regression was RED (13/14) on the Russian claim that `not`
  has only one possible place; the Ukrainian sentence said its place never
  changes. After correction, the scoped regression is GREEN 14/14. Exact UK
  batch/source parity passes. Full factory audit examined 186/186 sessions,
  returns HOLD with 242 findings elsewhere, and reports 0 findings for S03.
- Defect/cause: a rule intended for `I am` + adjective/state was phrased as a
  universal claim about English `not`. The UK batch had mixed line endings and
  did not exactly project `final.uk.md`, which the focused parity gate exposed.
- Change: both explanations now say that in the `I am` + state pattern,
  `not` comes after `am`; replaced the UK batch with an exact projection of
  the updated UK source. Added regression assertions for both the scoped rule
  and exact batch bytes, including line endings.
- Candidate: create-only private root
  `outputs/s03-not-scope-private-20261014-v1`, linked to S02 v2 course receipt
  and S03 revision receipt `fd87c516b8a739784f8aef240f7d47d4e8d9b3822d412f184ebb21675546ee2f`.
  Revision-head CAS passed. Preview has 4 generated files; review is HOLD,
  `textVerified:false`, and `releaseAuthority:false`.
- Quality guard: S03 regression 14/14; candidate receipt CAS suite 12/12;
  scoped locale batch parity PASS; S03 factory finding count 0. Full factory
  remains HOLD at 242 findings. Live owner-review health/current-candidate/home
  routes return 200; served course data has 186 session cards and includes the
  scoped S03 text. Time/cost telemetry not measured.
- Reuse: English S03 only. Keep language rules bounded to the construction
  actually taught, and test exact source-projection bytes when a locale batch
  is required to mirror its authored source.

### 2026-10-14 — English — L01/S04 i08 — disambiguate a two-recording prompt
- Status: source correction validated; candidate remains private and unapproved.
- Scope/version: `sessions/en/l01/s04:i08`; RU/UK Markdown, UK locale batch,
  atomic prompt/accessibility/tested-dimension/wrong-feedback fields, the
  payload sync helper, and `pipeline/l01s04_feedback_repair.test.mjs`.
- Evidence: regression was RED on the former rhyme prompt, which admitted both
  `right` and `wrong`; both audio transcripts and choices were present. GREEN
  after asking which word is heard in the second recording, preserving audioA
  `right` and audioB `wrong`, aligning accessibility and testedDimension, and
  stating in wrong-choice feedback that `right` was first and `wrong` second.
  Focused suite 11/11; cross-session suite 61/61; actor clarity and exact locale
  batch parity PASS; factory S04 PASS with 0 findings; source selectable
  feedback count 0. Legacy release/mockup feedback audit rows remain unchanged.
- Cause: confirmed mismatch between a rhyme-based question (two valid words)
  and a two-recording contrast.
- Change: use temporal ordering as the unique criterion; no correct-answer
  feedback or target word was added to the prompt.
- Quality guard: test checks exact localized prompts, accessibility parity,
  testedDimension, ordered audio transcripts, options, and wrong-only feedback.
  Blind audio listening was not performed; only authored transcript/order is
  verified.
- Time/cost: elapsed time and model/token/cache telemetry not measured.
- Reuse: English S04 wording is session-specific; the general rule that a
  multi-recording prompt must identify a unique position is consistent with
  the prior English S03 finding, but no broader multilingual validation is
  claimed.
- Next check: verify the immutable private candidate receipt binds the current
  accepted S03 predecessor and preserves `releaseAuthority:false`.

### 2026-10-14 — English — L01/S04 — scoped negation and neutral glosses
- Status: bounded source repair validated; v7 remains private and unapproved.
- Scope/version: `sessions/en/l01/s04`; RU/UK intro 3 and i13, i07/i10 glosses,
  UK locale batch, atomic word-card/matching/choice-feedback fields, payload
  sync helper, and `pipeline/l01s04_feedback_repair.test.mjs`.
- Evidence: the strengthened regression was RED against v6 on the universal
  opposite-meaning claim, masculine-only standalone glosses, and i13 feedback
  that addressed a different error. After repair, the suite is 62/62; scoped
  factory reports PASS with 0 findings; actor clarity, locale parity, source
  feedback count 0, and `git diff --check` pass. The feedback scanner still
  exits 1 only for 16 legacy release and 16 legacy mockup issues.
- Defect/cause: confirmed overgeneralization of `not`, generic incorrect-choice
  feedback unrelated to `I not wrong`, and Russian/Ukrainian standalone forms
  that assumed one grammatical gender.
- Change: state that `not` makes a statement negative and bound the `I am not
  free` meaning to the unavailable-task scene; tie i13 feedback to the missing
  `am`; use paired forms or gender-neutral contextual phrases for intro3/i07/i10.
- Quality guard: tests assert scene-scoped meaning, response-specific feedback,
  paired forms in both locales, atomic parity, and exact UK batch bytes. No
  blind learner review or audio listening was performed in this packet.
- Time/cost: elapsed time and model/token/cache telemetry not measured.
- Reuse: exact wording is English S04-specific; no broader language claim.
- Next check: verify v7 receipt lineage against the accepted S03 receipt and
  confirm release authority remains false.

### 2026-10-14 — English — L01/S04 i17 — pair gendered matching glosses
- Status: active source/payload correction validated; v8 remains private.
- Scope/version: `sessions/en/l01/s04` i17 RU/UK pair grid and Markdown,
  additional unpaired glossary feedback found by the active-source scan,
  UK locale batch, payload sync helper, and S04 regression tests.
- Evidence: new test was RED against v7 (`занят`, `один`, `устал`, `уверен`);
  GREEN suite is 63/63. Factory S04 has 0 findings; actor clarity, locale batch
  parity, source feedback count 0, and diff check pass. A scan found remaining
  gendered glossary strings in i12/i19/i20/i21 and these were made neutral.
  Exact old-pattern hits remain only in three historical `draft_*` Markdown
  files; active final Markdown, batch and atomic payload were updated.
- Cause: pair-grid glosses were single masculine forms; related wrong-tile
  feedback also used masculine standalone glosses.
- Change: i17 now uses RU paired forms (`занят/занята`, `один/одна`,
  `устал/устала`, `уверен/уверена`) and natural UK equivalents
  (`зайнятий/зайнята`, `сам/сама`, `втомлений/втомлена`,
  `упевнений/упевнена`). Other identified learner feedback is phrased
  situationally to avoid gendered person glosses. Historical drafts unchanged.
- Quality guard: regression checks each of four i17 terms in both RU/UK atomic
  projections and exact Markdown sequence; source feedback and locale parity
  checks pass. No blind learner review was performed.
- Time/cost: elapsed time and model/token/cache telemetry not measured.
- Reuse: gender normalization is specific to these localized glossary pairs;
  no broader language claim.
- Next check: verify v8 receipt binds the accepted S03 predecessor and retains
  `releaseAuthority:false`.
### 2026-10-14 — English — L01/S06 — contextual distractors and concise wrong-only feedback
- Status: bounded source repair validated; release and reviewed/mockup projections remain stale and are not acceptance evidence.
- Scope/version: `sessions/en/l01/s06` RU/UK Markdown, UK locale batch, atomic practice, and `pipeline/l01s06_feedback_repair.test.mjs`.
- Evidence: the new regression was RED on four observed defects: authored correct-choice feedback, three-row choice feedback arrays containing the correct response, gendered learner-facing strings, and intro 3 feedback that did not distinguish grammatical English from a contextually unsuitable answer. After repair, the focused suite is 5/5 PASS; scoped locale-batch parity PASS; atomic JSON parse and scoped `git diff --check` PASS. `audit_selectable_feedback.mjs --scope en/l01/s06 --json` reports source=0, release=10, mockup=10; the 20 remaining findings are stale downstream copies.
- Cause: confirmed source/contract drift. Correct verdict copy had been authored beside wrong-answer corrections; listening corrections made unverified fine-grained sound claims; RU/UK used single-gender glosses; and a grammatical distractor was described only as wrong without naming the contextual mismatch.
- Change: retained exact IDs, targets, task order and 19-interaction inventory; removed authored correct-answer explanations; made wrong listening feedback identify the selected word and contextual target without asserting unheard phonetic details; aligned intro 2 distractors; explicitly labelled `I am here` grammatical but off-target in intro 3; replaced single-gender prompts/glosses with natural situational wording; and tied i16 `not` feedback to the exact `I am free` context. `locales_batch.md` now exactly mirrors the Ukrainian source.
- Quality guard: RED/GREEN recorded by the focused test. No audio-listening claim is made. Frozen release/mockup projections and receipts were not overwritten; their failing equality checks remain HOLD until a new immutable reviewed candidate is built and accepted.
- Time/cost: elapsed time and model/token/cache telemetry not measured.
- Reuse: do not call a grammatical option ungrammatical when it is merely unsuitable in the scene; wrong-answer feedback must name that distinction. This principle is language-agnostic, while the exact English examples remain S06-specific.
- Next check: build a create-only S06 candidate bound to the accepted S05 receipt, obtain fresh final-version learner and locale reviews, then validate a new text-canonical acceptance before changing the owner-review status.

### 2026-10-14 — English — L01/S06 — exact semantic and locale acceptance
- Status: `TEXT_CANONICAL`; immutable candidate v5 accepted for text review only. Release authority remains false and audio/listening was not reviewed.
- Scope/version: S06 final RU/UK sources, locale batch, atomic practice, focused regression suite, create-only candidate `s06-review-fixed-private-20261014-v5`, two independent Luna reviews, deterministic report, acceptance receipt, and owner-review manifest.
- Evidence: focused acceptance set 39/39 PASS; candidate contains 3 intro pages and 19 interactions per locale; all 22 receipt entries rehashed exactly; blind learner and language/pedagogy/localization reviews both returned PASS with empty findings; acceptance receipt independently rebuilds and validates at SHA-256 `5924fa304dd4a4e3afcba11ec520c272cdcd996e737f4f0c1bd6c337e213f58a`.
- Cause: repeated review exposed defects that shallow structural checks missed: unnatural task wording, unsupported pronunciation spellings, masculine learner glosses, correct-answer explanations left in source, invented scene facts, and an inaccurate `back`/`home` equivalence.
- Change: i18 now directly asks to match English words with meanings; unsupported pronunciation claims were removed; `done` and `back` explanations are gender-neutral; i09/i11 keep only wrong-answer feedback; i11 no longer invents prior dialogue; i12 and intro 2 consistently teach `I am back` as return/being here again rather than being home.
- Quality guard: every discovered defect received a regression assertion before repair. A candidate is accepted only after source↔atomic parity, two final-version independent reviews, exact receipt rehashing, and deterministic gates pass. Audio semantics remain explicitly outside the evidence boundary.
- Time/cost: elapsed time and token/cache telemetry not measured; five immutable review candidates were required because each HOLD invalidated the prior bytes.
- Reuse: distinguish structural parity from semantic correctness; require reviewers to inspect exact source Markdown as well as learner JSON so stripped or stale feedback cannot survive in canonical source.
- Next check: apply the same sequence to S07, then separately synchronize only the contiguous accepted prefix with the application after release/runtime gates pass.

### 2026-10-14 — English — L01/S07 — exact semantic and locale acceptance
- Status: `TEXT_CANONICAL`; immutable candidate v6 accepted for text review only. Audio listening was explicitly excluded.
- Scope/version: S07 RU/UK sources, locale batch, atomic practice, focused regression, candidate `s07-review-fixed-private-20261014-v6`, two independent Luna reviews, deterministic report, acceptance receipt, and owner-review manifest.
- Evidence: focused acceptance set 39/39 PASS; 3 intro pages and 18 interactions per locale; 22 candidate files bound by the receipt; blind learner and language/pedagogy/localization reviews returned PASS with empty findings; acceptance receipt rebuilds at SHA-256 `917f8a999547b78b8e481fe30fc820adfca53ca66359edbfb6e82630fc85a745`; owner-review UI suite passes 8/8.
- Cause: previous rounds found ambiguous scene truth, nested and flat locale-map drift, gendered wording, source/atomic divergence, and feedback or glosses that did not match the tested error.
- Change: made i09 and i10 uniquely solvable, aligned RU/UK nested maps and active-locale columns, removed gender assumptions and correct-answer explanations, aligned scenes, prompts and tested dimensions, and made `done` completion-focused.
- Quality guard: immutable bytes are accepted only after exact deterministic and independent learner/locale PASS results. A reviewer test launched from the deliberately minimal snapshot was rejected as the wrong executable root; the hash-bound repository gate supplied the authoritative 39/39 result.
- Time/cost: elapsed time and token/cache telemetry not measured; six immutable candidates were required because each semantic HOLD invalidated earlier bytes.
- Reuse: reviewers must separate a content defect from an incorrectly launched verification command; executable gates run from their declared repository root, while reviews remain bound to immutable candidate hashes.
- Next check: repair S08 source with the same wrong-only feedback and source-to-atomic parity rules.

### 2026-10-14 — English — L01/S08 — wrong-only feedback and source parity
- Status: bounded source repair validated; no immutable candidate or acceptance is claimed yet.
- Scope/version: S08 RU/UK Markdown, locale batch, atomic practice, and `pipeline/l01s08_feedback_repair.test.mjs`.
- Evidence: focused regression 10/10 PASS; Markdown-to-atomic comparison reports 0 mismatches across all 21 interactions in both locales; scoped `git diff --check` PASS.
- Cause: the source required correct-answer explanations, contained masculine learner glosses, overstated rules about `not`, `I am`, and explicit English subjects, showed an inaccurate `I no sure` explanation, reported 17 tasks while 21 exist, and diverged between RU/UK Markdown and atomic prompts, feedback, pairs, and tiles.
- Change: removed correct-answer explanations, retained concise error-specific feedback only for wrong options, neutralized learner wording, narrowed grammar claims to the taught construction, corrected the task count, and restored exact source-to-atomic parity.
- Quality guard: regressions explicitly reject correct-answer feedback, gender assumptions, overbroad grammar claims, wrong counts, and RU/UK projection drift. Audio listening and presence remain outside this text repair.
- Time/cost: elapsed time and token/cache telemetry not measured.
- Reuse: never encode correct-answer feedback as a required field; require only error-specific correction paths and enforce the active source as the canonical projection boundary.
- Next check: build a create-only S08 candidate against accepted S07, then obtain fresh exact-version learner and locale reviews.

### 2026-10-14 — English — L01/S08 — exact semantic and locale acceptance
- Status: `TEXT_CANONICAL`; immutable candidate v1 accepted. Audio listening was explicitly excluded and no release authority is claimed by the acceptance receipt.
- Scope/version: S08 RU/UK sources, locale batch, atomic practice, focused regressions, candidate `s08-review-fixed-private-20261014-v1`, deterministic report, two independent Luna reviews, acceptance receipt, and owner-review manifest.
- Evidence: combined focused suite 42/42 PASS; 3 intro pages and 21 interactions per locale; all 18 receipt entries rehashed exactly; blind learner and language/pedagogy/localization reviews returned PASS with empty findings; candidate bundle SHA-256 is `abcc1794aea92f92e2df4cf5f0a3a33f560d0140865f80026ead97752cd57477`; acceptance receipt independently validates at SHA-256 `f6bef2caba216f954e73737138dce192bcfb0caec9671cb4889fd459402a0fab`.
- Cause: the prior source combined correct-answer explanations, gendered wording, inaccurate or overbroad grammar claims, wrong task count, and RU/UK source-to-atomic divergence.
- Change: retained only concise response-specific correction for wrong choices; neutralized learner wording; narrowed grammar statements to the construction actually taught; corrected the inventory to 21 interactions; normalized answer-bearing prompts without leaking the answer; restored exact RU/UK source, locale-batch and atomic parity.
- Quality guard: green status requires exact immutable lineage from accepted S07, deterministic gate PASS, two independent final-version reviews, and acceptance-receipt revalidation. Audio playback and semantic listening are not asserted or required by this text acceptance.
- Time/cost: elapsed time and token/cache telemetry not measured; no project OpenAI API was used.
- Reuse: answer-bearing source prompts must use the same learner-safe projection in diagnostics, candidate construction, and release validation; raw answer tails must never be restored merely to satisfy a stale diagnostic.
- Next check: synchronize S08 as the next contiguous locally active session while retaining course release HOLD, then begin S09.

### 2026-10-14 — English — L01/S09 — wrong-only feedback and source parity
- Status: bounded source repair validated; downstream release/mockup copies remain stale until immutable acceptance.
- Scope/version: S09 RU/UK Markdown, locale batch, atomic practice, and `pipeline/l01s09_feedback_repair.test.mjs`.
- Evidence: the focused S09 regression was RED 0/3 before repair; the combined S08+S09 suite is now 14/14 PASS. Locale-batch parity and scoped `git diff --check` pass. Selectable-feedback audit reports source=0, release=12, mockup=12; the latter two are deliberately untouched stale projections.
- Cause: selectable tasks retained learner-visible correct-answer rationales; several scenes and prompts did not identify the intended meaning tightly enough; locale wording drifted; and feedback made sound-level claims without audio evidence.
- Change: removed correct-choice feedback, retained concise correction for every wrong selectable response, clarified the i05 meaning target, aligned scenes and prompts, removed unsupported phonetic claims, neutralized learner wording, and restored exact RU/UK Markdown-to-atomic and UK batch parity without changing IDs, order or targets.
- Quality guard: a source repair never overwrites release or mockup projections. Source, release, and mockup finding counts are reported separately so stale downstream copies cannot be mistaken for active-source defects or silently synchronized before immutable review.
- Time/cost: elapsed time and token/cache telemetry not measured; no project OpenAI API was used.
- Reuse: semantic source gates and downstream projection audits answer different questions; require source=0 first, then rebuild and independently review an immutable candidate before updating any green status.
- Next check: build S09 against the exact accepted S08 predecessor and obtain fresh final-version learner and locale reviews.

### 2026-10-14 — English — L01/S09 — exact semantic and locale acceptance
- Status: `TEXT_CANONICAL`; immutable candidate v4 accepted. Audio listening was explicitly excluded and no course-wide release authority is claimed.
- Scope/version: S09 RU/UK sources, locale batch, atomic practice, focused regressions, candidate `s09-review-fixed-private-20261014-v4`, deterministic report, two independent Luna reviews, and acceptance receipt.
- Evidence: source/candidate/acceptance checks are 38/38 PASS; runtime visibility checks are 25/25 PASS; exact receipt reconstruction passes; both blind-learner and language/pedagogy/localization reviews returned PASS with empty findings. Candidate bundle SHA-256 is `9a53fac66007c96f4f46c8fd47cacebeb08ba3359d8bf5749e683157793044ec`; acceptance receipt SHA-256 is `d7f9430e3121cf541d922a3c1c1c975bde96735538d5d75aa4ab424d4e4edaba`.
- Cause: earlier candidates still contained an indirect-address locale mismatch, incomplete gender forms, overclaims about being sorry or flirting, and unsupported sound-level wording.
- Change: i06 now addresses Mira directly in both locales; i17 supplies paired grammatical-gender forms; scene claims were narrowed to stated facts; correct-answer explanations were removed; wrong-answer feedback is concise and specific to the selected error; unsupported phonetic claims were removed.
- Quality guard: final acceptance is bound to exact source, inventory, candidate receipt and independent final-version reviews. No audio was played, generated or semantically approved.
- Time/cost: elapsed time and token/cache telemetry not measured; no project OpenAI API was used.
- Reuse: a candidate invalidated by a semantic or locale finding must be rebuilt and reviewed on the new exact bytes; prior reviewer PASS cannot be carried forward.
- Next check: activate only the contiguous accepted S01–S09 prefix while retaining course release HOLD and keeping S10 closed.

### 2026-10-14 — English — L01/S09 — contiguous local activation
- Status: locally active in the application as part of the exact S01–S09 green prefix; S10 remains closed and `courseReleaseState` remains `HOLD`.
- Scope/version: accepted S09 projections, active-session manifest, exact runtime audio omissions, native generated projections/catalog/manifest, availability ceiling, and owner-review preview.
- Evidence: activation/status 13/13 PASS; runtime/availability/released-client 25/25 PASS; owner-review 14/14 PASS; audio-ceiling 6/6 PASS; bounded native manifest is fresh; HTTP owner-review surface shows nine active green sessions. Owner manifest SHA-256 is `accc2f1f400002d85e088983f65481f90849451bf4ee33e9138d54a052793579`.
- Change: activated only S09 after the already active S01–S08 prefix. Physical-file audit found absent audio only for i14, i18:s02 and i18:s04 across the four expected voices; exact bundle/source-bound omissions disable only those three interactions.
- Quality guard: audio files were checked for physical presence only; no audio was listened to or generated. S10 has an explicit negative activation test and remains unavailable. A pre-existing broad ingress failure concerning a legacy production-audio import is recorded separately and did not change this bounded activation result.
- Time/cost: elapsed time and token/cache telemetry not measured; no project OpenAI API was used.
- Reuse: green UI status must be derived from the active manifest and runtime availability tests, never from colour alone; missing media disables the smallest exact interaction set rather than blocking unrelated accepted content.
- Next check: repair S10 source in order, then repeat immutable candidate, independent review, exact acceptance and contiguous activation.

### 2026-10-15 — English — L01/S10 — exact acceptance and contiguous local activation
- Status: immutable candidate v3 accepted and S10 locally active in the exact S01–S10 green prefix; `courseReleaseState` remains `HOLD`, and S11 remains closed.
- Scope/version: S10 candidate/review/acceptance evidence, accepted native/runtime projections, active-session manifest, exact runtime audio omissions, availability ceiling, and owner-review preview.
- Evidence: the acceptance receipt binds candidate bundle SHA-256 `f77803358c13c22f2c51cb6b7b4821322b45290ddfce7185345ecaa05fcd1ba4` to receipt SHA-256 `57a2378df4e7fff8a7613452c1f6d3a30bdee7c0b7919e461c8a097bae7b2bc4`, state `TEXT_CANONICAL`, and two v3 review artifacts whose recorded verdicts are PASS (`blind_learner` and `language_pedagogy_locale`). The active-session manifest contains the exact S01–S10 prefix, records `courseReleaseState: HOLD`, and does not activate S11.
- Change: activated only accepted S10 after the existing S01–S09 prefix. The runtime-audio-omission manifest binds the same candidate bundle to exactly `lesson-01:session:10:i12` and `lesson-01:session:10:i18`; the public runtime removes exactly those raw interactions and returns a complete published-audio child for every remaining audio interaction.
- Quality guard: audio was audited only for physical file presence; no audio was played, listened to, generated, or semantically approved. The active prefix remains S01–S10, course release remains on HOLD, and S11 remains closed. Runtime omission matching remains fail-closed and does not authorize device-speech fallback.
- Time/cost: elapsed time and token/cache telemetry not measured; no project OpenAI API was used.
- Reuse: production audio completeness must be checked through the same omission-aware public bundled runtime used by the learner, while comparing its interaction set with the raw source so only exact authorized omissions can disappear.
- Next check: keep S11 closed until it completes the same source repair, immutable review, exact acceptance, audio-presence, and bounded activation sequence.

### 2026-10-15 — English — L01/S11 — exact acceptance and contiguous local activation
- Status: immutable candidate v1 remains accepted and S11 is locally active in the exact S01–S11 green prefix; `courseReleaseState` remains `HOLD`, and S12 remains closed.
- Scope/version: accepted S11 candidate bundle `1445fa85a7dc2eb496a574ec93c379f1f616019628bbb95fd7f6cb0a5b60c35d`, acceptance receipt SHA-256 `b3225f3f70f310efe339e7693003dbe483596296fa3fe0d7148e8c8f75ac9214`, five byte-identical release/native projections, exact runtime audio omissions, bounded native manifest/catalog, runtime availability ceiling, and owner-review state/tests.
- Evidence: acceptance/activation 7/7 PASS; native projection, released client, runtime omission and availability 34/34 PASS; production-audio contract 1/1 PASS; audio-ceiling unit gate 6/6 PASS; omission-aware audio coverage reports released=11 and contiguous=11; owner-review status/browser tests 16/16 PASS; full-course HTTP gate PASS. Live HTTP inspection at `http://127.0.0.1:59691/` showed 11 text-verified, locally active green cards and S12 without the locally-active marker.
- Change: activated only accepted S11 after S01–S10. A physical file audit found exactly eight absent requirements: `You are not busy.` for i17 and `You are not wrong.` for i18, each for ash/coral/nova/onyx. The policy is bound to the exact accepted candidate bundle and factory source fingerprint `4ebf35a89ba1ca33e3171e8872bc3964a8fcb4e252d428359b24a626f0d9de66`; it disables only i17 and i18.
- Quality guard: no audio was played, listened to, generated, or semantically approved. The omission policy and runtime materialization fail closed on bundle/fingerprint/interaction drift. S12 is absent from the active manifest and is the first unavailable runtime session.
- Residual evidence: `tests/learning_v2_static_owner_review_bundle_v1_gate.ts` remains red because the separate authoring registry currently exposes zero `LOCKED` sessions; this is outside the accepted-candidate full-course owner-review activation path and was not altered. The recurring ts-jest isolatedModules deprecation warning remains.
- Time/cost: elapsed time and token/cache telemetry not measured; no project OpenAI API was used.
- Reuse: bind every media omission simultaneously to accepted candidate identity, source/native fingerprint, and the exact missing runtime interaction set; verify raw-to-public interaction loss explicitly before raising availability.
- Fresh review: PASS with no P0/P1/P2 findings after independent reproduction of acceptance, activation, native/runtime/availability, production-audio, owner-review HTTP, omission inventory, and five-file parity checks. Residual preservation proof is bounded because several files were already dirty and lacked pre-task blobs.
- Next check: do not activate S12 until it independently completes repair, immutable acceptance, physical-audio audit, the same bounded activation sequence, and fresh review.

### 2026-10-15 — English — L01/S12 — exact v12 acceptance and contiguous local activation
- Status: immutable v12 candidate accepted and locally active in the exact S01–S12 prefix; S13 is the first unavailable session and `courseReleaseState` remains `HOLD`.
- Scope/version: candidate bundle `e10d6dc1a99359d29755c4ec20af69c36cf16d6391659a794e57b0d1762f4ca3`, content receipt SHA-256 `315c1a6a2805920edb01eb6ae540f5a58fc3945a2a1532442b3e0e27f6c7e6b8`, acceptance receipt SHA-256 `1646a700c90324ac4e17a35e6d4809f4a52c25ed4df4b2c8ea441950170e88f2`, five release/native projections, exact runtime audio omissions, app availability, and owner-review state.
- Evidence: focused source suite 23/23 PASS; blind packet contract 1/1; generic receipt/acceptance/promotion contracts 34/34; fresh exact blind and locale reviews both PASS with empty findings; all 18 receipt files rehashed; runtime/native/availability suite 37/37; activation/status 16/16; production-audio 1/1; audio-ceiling 6/6; coverage reports released=12 and contiguous=12; owner-review browser 4/4 and full-course HTTP gate PASS. Live `http://127.0.0.1:59693/` reports 12 text-verified active cards and S13 inactive.
- Change: polished Ukrainian i19 to natural `втомлений/втомлена`; added a runtime invariant that word cards queued before an omitted audio interaction carry forward to the next retained interaction; superseded only S12 while preserving S01–S11.
- Projection parity: candidate, release, and factory-native files are byte-identical: answers `ab4ef6…cde5`, auxiliary `7351c1…abd`, intro `865304…ee1`, learner RU `8e3a12…9897`, learner UK `d778cc…32f`.
- Audio boundary: physical/metadata audit found exactly 12 absent requirements—i08 `start`, i16 `You are quiet.`, and i20 `You are brave.`, each for ash/coral/nova/onyx. The policy binds only those interactions to bundle `e10d6d…f4ca3` and source/runtime fingerprint `b86811…eca7`. No audio was played, listened to, generated, or semantically approved.
- Quality guard: the strict blind reviewer received only the answer-free rendered packet SHA-256 `924618…6f64`; the locale reviewer validated 18/18 immutable receipt entries. No project OpenAI API, automation mutation, commit, push, deployment, production release, or rollback occurred.
- Residual: the recurring ts-jest `isolatedModules` deprecation warning remains. The locale reviewer noted that executing a test from the deliberately minimal immutable snapshot cannot resolve `owner_quality.mjs`; authoritative hash-bound repository gates passed.
- Next check: keep S13 closed until it completes the same immutable candidate, exact-current review, acceptance, physical media audit, and bounded activation sequence.

### 2026-10-15 — English — L01/S13 — exact acceptance and contiguous local activation
- Status: immutable candidate v1 accepted and locally active in the exact S01–S13 prefix; S14 is the first unavailable session and `courseReleaseState` remains `HOLD`.
- Scope/version: candidate bundle `538f4e2004ba4575944a49a00bd80a34d7d1c18407175b49acd7e1f6afb8670b`, content receipt SHA-256 `e3b3cb3ae5757edcbc91e94f1764104df5a8ec614c1e4f9ece35e2435cc1872a`, acceptance receipt SHA-256 `91bd34c0e421347bb5f4d09ea7c12df96aa4fe2da17f2cfa1ca7bfa69c4a8c68`, five release/native projections, exact runtime audio omission, app availability, and owner-review state.
- Evidence: focused S13 source suite 9/9 PASS; blind-packet contract 2/2; generic receipt builder 29/29; acceptance 4/4; promotion 2/2; fresh exact blind and locale reviews both PASS with empty findings; all 18 receipt files rehashed; activation/status 17/17; runtime/native/availability 39/39; production-audio 1/1; audio-ceiling 6/6; coverage released=13/contiguous=13; owner-review browser 4/4 and full-course HTTP gate PASS. Live `http://127.0.0.1:59694/` reports 186 cards, 13 text-verified active cards, and S14 inactive.
- Infrastructure: extended the fail-closed candidate builder to S13 through exact accepted-S12 lineage; generalized the strict blind-packet path from the immutable receipt identity; preserved byte reproduction for the legacy S09 receipt shape while retaining its predecessor bundle hash for validation.
- Projection parity: candidate, release, and factory-native files are byte-identical: answers `52121b…f1ea`, auxiliary `1a6630…e944`, intro `0d8515…09b4`, learner RU `247508…721a`, learner UK `55883b…d132`.
- Audio boundary: physical/metadata audit found exactly four absent requirements—i18 `You are kind.` for ash, coral, nova, and onyx. The omission policy binds only i18 to bundle `538f4e…8670b` and source/runtime fingerprint `0c9766…fd1d`. No audio was played, listened to, generated, or semantically approved.
- Quality guard: the blind reviewer received only the answer-free rendered packet SHA-256 `d1c70a…d68f`; the locale reviewer validated 18/18 receipt entries. No project OpenAI API, automation mutation, commit, push, deployment, production release, or rollback occurred.
- Residual: the recurring ts-jest `isolatedModules` deprecation warning remains; the worktree and HEAD changed concurrently outside this bounded activation, so preservation claims are limited to recorded artifacts and gates.
- Fresh review: independent critical review PASS with no P0/P1/P2/P3 findings after rehashing all 18 receipt files, all five projection triplets, all 13 active acceptances, exact omission metadata, live owner review, and the bounded gates.
- Next check: keep S14 closed until it completes its own source repair, immutable candidate, exact-current reviews, acceptance, physical media audit, and bounded activation sequence.

### 2026-10-15 — English — L01/S15 — exact acceptance and contiguous local activation
- Status: immutable candidate v3 accepted and locally active in the exact S01–S15 prefix; S16 is the first unavailable session, `courseReleaseState` remains `HOLD`, and `releaseAuthority` remains `false`.
- Scope/version: S15 RU/UK source repair, candidate `s15-review-fixed-private-20261015-v3`, exact deterministic and independent Luna review artifacts, acceptance receipt, five canonical/native projections, active-session and exact audio-omission manifests, runtime availability, and owner-review state.
- Evidence: candidate bundle SHA-256 `a7dc0771ac43c4e9682b6eaf2ba91b1fb88dffa0f1d59a8d1523f8b41377266f`; content receipt SHA-256 `830982882eba644a7b0290be742793ca964a1dd6725d7f5cabc323d13751bcbc`; deterministic gate SHA-256 `a9a965d1b6adb99337d89e865d1208b0b85d1ba1323d1e1ee1643033027b250b`; acceptance SHA-256 `521336dfdeac934ed7aed9b62062ad00caae97703cfa4c466300e3a837f72796`. Focused source 4/4, blind packet 2/2, receipt builder 31/31, acceptance/promotion 6/6, activation/status 19/19, runtime prefix 29/29, availability 3/3, factory projection 6/6, owner browser 4/4, native manifest FRESH, and all five candidate/release/native projections byte-identical.
- Cause: a generic `speed_match` projection exposed its authored answer pair as learner scene text; source and locale-batch copies had drifted; the i15 listening prompt disclosed the target meaning before the choice; and runtime validation rejected an intentionally absent optional feedback field even when both locale values were empty.
- Change: learner-safe speed-match projection no longer restores the answer-bearing tail; RU/UK Markdown, atomic and locale batch are synchronized; i15 asks only for the word heard in the first recording; selectable feedback is concise and appears only after a wrong answer; runtime omits an optional feedback object only when both locale values are empty and still rejects partial locale data.
- Audio boundary: physical/metadata-only audit found absent assets for exactly i15 and i17:s02 across the four expected voices. The omission policy is bound to the exact accepted bundle and source fingerprint and disables only those two interactions. No audio was played, listened to, generated, or semantically approved.
- Quality guard: green state is derived from exact acceptance, projection parity, runtime availability and active-prefix gates rather than UI colour. S16 has an explicit closed boundary; no course release, deployment, commit, push, automation mutation, or project OpenAI API use occurred.
- Time/cost: elapsed time and token/cache telemetry were not measured; no savings figure is claimed.
- Reuse: answer-bearing authored fields require a learner-safe projection regression; optional localized objects may be omitted only when all locales are empty, never when localization is partial; activation advances by exactly one contiguous accepted session.
- Next check: keep S16 closed until it completes the same source repair, immutable candidate, exact-current independent review, acceptance, physical media audit, and bounded activation sequence.

### 2026-10-15 — English — L01/S09 — packet-bound source candidate
- Status: new RU/UK source candidate only; immutable accepted artifacts were left unchanged. No candidate acceptance, activation, or release is claimed.
- Cause: the previous S09 source followed the stale course plan and introduced `You are`, while the currently owner-approved d956 packet requires `he/she/it + is`; the old practice also contained 21 interactions instead of the packet's 17.
- Change: rewrote learner source and atomic projection to the exact approved packet, including assigned senses, three intro purposes, 17 activity interactions, wrong-only feedback, a changed-context slot-19 independent probe, and slot 20 retained as guided `scripted_repeat_compare` per owner direction.
- TDD/evidence: `gpt-5.6-luna`; the packet-bound S09 regression was RED on the old 21-interaction source and GREEN after rewrite (3/3). Exact blueprint fingerprint `d956442e0946194e3de8105601ae993fe6f7932e7904cc3e4e972fc8444875da` passed; actor clarity, RU/UK parity, atomic JSON parse, exact locale-batch sync, and `git diff --check` passed. The selectable-feedback audit found zero source/release issues but remains HOLD on 12 pre-existing reviewed-mockup findings; those immutable artifacts were out of scope. At audit time, acceptance-receipt coverage existed for every S01–S15 directory (S12 had two receipts); this source-only edit did not validate or change activation state.
- Residual: packet slot 20 is marked `independentEvidence: true`, but current runtime rejects `scripted_repeat_compare` as an independent check and exposes its `targetPhrase`/reference before the attempt. Source marks it guided practice; no supported reveal-timing contract exists yet, so S09 remains HOLD for that technical contract. No audio was generated or heard.
- Reusable rule: before authoring, bind the change to the exact currently approved packet fingerprint and verify accepted-prefix prerequisite coverage; do not derive lesson scope from a stale plan or infer release/activation from source checks.

### 2026-10-15 — English — L01/S09 — prompt safety and locale gloss follow-up
- Finding: fresh locale/source review identified answer-inferential scenes in i05/i09/i15, a calm distractor correction that invented a first stage appearance instead of contrasting `calm` with `scared`, and a UK `fine` gloss too ambiguous to preserve the well-being sense.
- Change: all three listening prompts now identify only the person and ask for the heard phrase/meaning; i15 wrong-answer feedback directly contrasts `scared` with `calm`; RU/UK `fine` glosses align on “feels well.” Markdown, atomic and UK batch projections were synchronized.
- TDD/evidence: `gpt-5.6-luna`; new regression failed on the original i05 clue and passed after repair; focused suite 5/5, actor clarity PASS, JSON parse and exact locale-batch sync PASS, `git diff --check` PASS. Selectable-feedback audit remains HOLD on 12 unchanged mockup findings (source=0, release=0). Elapsed time and token/cache telemetry not measured.
- Boundary: source-only repair; no projection, audio, accepted artifact, activation, or release changes.

### 2026-10-15 — English — L01/S02 — d956 packet-bound source candidate
- Status: new RU/UK source candidate only; the immutable old accepted artifact was not modified. No acceptance, activation, or release is claimed.
- Scope/version: exact owner-approved packet `lesson-01:session:02`, fingerprint `d956442e0946194e3de8105601ae993fe6f7932e7904cc3e4e972fc8444875da`; no new grammar operation, present-be affirmative review, sad/tired new senses and here/ready/fine/happy retrieval senses.
- Change: rewrote RU/UK source, atomic practice and UK locale batch for the exact three intro purposes and 17 packet activities. Added a scoped regression for packet slots/families/examples, permitted language, feedback, listening prompt secrecy, changed-context independent slot 19 and guided slot 20. Preserved named actors and a coherent community-center scenario.
- TDD/evidence: the new test first REDed because the old source had 21 interactions; after rewriting, focused test passed 2/2. Exact blueprint gate PASS; actor clarity PASS (3 files); RU/UK source-to-atomic parity and UK locale-batch parity PASS; atomic JSON parse PASS; `git diff --check` PASS. Selectable-feedback audit reports source=0 and release=0, but overall HOLD on 12 pre-existing reviewed-mockup findings; mockups were outside scope and unchanged.
- Residual: packet slot 20 carries `independentEvidence: true`, but current runtime does not provide supported after-attempt concealment for `scripted_repeat_compare`; source keeps it guided and records the technical HOLD. No audio was generated, played, or listened to; no acceptance, activation, runtime, mockup, blueprint, or status artifact was changed. Elapsed time and token telemetry not measured; no project OpenAI API was used.
- Next check: wait for the versioned after-attempt runtime contract before promoting slot 20 to independent practice; then seek the required fresh reviews and owner acceptance without altering the preserved accepted artifact.

### 2026-10-15 — English — L01/S02 — independent review corrections
- Finding: review found that i06 localized meaning assigned sadness to Lena instead of Tom, and the slot-19 changed context of a ferry arrival favored `I am here` over the other match pairs.
- Change: corrected i06 localized meaning in the atomic source and removed the answer from both learner prompts; changed i16 to a neutral language-club card-check context with Rina, Tom and a clear matching purpose; aligned its four pairs to `here / ready / fine / happy` and updated the answer key. Kept `🔊 *target*` authoring notation as transcript metadata.
- TDD/evidence: added regression assertions first; they REDed on i06's incorrect actor. Focused L01/S02 plus build/source and reveal-policy tests passed 10/10; actor clarity, RU/UK atomic learner parity, locale-batch parity, JSON parse and `git diff --check` passed. Transcript tests assert learner prompts/accessibility labels omit transcripts and listen-choice reveal policy is `after_first_attempt`; dictation keeps its phrase in `hiddenTargetPhrase`.
- Boundary: source candidate only; no release projection, acceptance, activation, audio, or mockup changes. Selectable-feedback audit still reports source=0 and release=0, with 12 out-of-scope mockup findings (HOLD).

### 2026-10-15 — English — L01/S02 — independent scripted-repeat source update
- Finding: the versioned scripted-repeat strict after-first-attempt reveal contract is now implemented in the build path; keeping packet slot 20 guided would no longer match the approved independent evidence slot.
- Change: changed i17/slot 20 to `independent_check` in RU/UK source and atomic practice, with a radio microphone-check context distinct from guided repeat training and slot 19. The learner prompt names Rina, Tom, and its purpose without exposing `I am happy.`
- TDD/evidence: strengthened the scoped regression first; it REDed on the previous guided purpose. It now requires packet support `none`, independent evidence, strict schema `learning-v2-scripted-repeat-reveal-policy.v1` with `first_submitted_attempt`, all pre-attempt visibility flags false, and RU/UK prompts distinct from prior contexts and answer-free. Focused S02, build/reveal, actor, locale parity, JSON, and diff checks are recorded for this candidate update.
- Boundary: source candidate only; no release projections, acceptance, activation, or audio changes. The underlying runtime contract remains subject to its separate final independent review; this update does not claim release readiness.
- Verification addendum: focused d956 plus `build_release_scripted_repeat_reveal_policy` passed 5/5; actor clarity and UK locale-batch parity passed; atomic-to-Markdown learner parity and JSON parsing passed; scoped `git diff --check` passed (only line-ending warnings). Slot 20's strict reveal policy is verified through the build projection for RU and UK, not stored as an invented field in the raw atomic source.

### 2026-10-15 — English — L01/S09 — independent scripted-repeat source update
- Finding: the versioned strict after-first-attempt reveal contract now permits packet slot 20 to carry its approved independent-evidence purpose; the prior S09 source incorrectly labeled it guided and used a cup-breaking/frowning scene that hinted at `angry`.
- Change: set i17/slot 20 to `independent_check` in RU/UK Markdown and atomic purpose, retained `scripted_repeat_compare`, and replaced the scene with a neutral, novel language-club audio-library recording context. The build projection supplies the strict reveal policy; no unsupported visibility field was added to raw atomic source.
- TDD/evidence: `gpt-5.6-luna`; strengthened S09 regression REDed on the guided purpose, then passed 5/5 requiring independent purpose, packet support `none`, exact strict policy and all false pre-attempt visibility flags, and a neutral changed context. Build reveal tests 3/3, d956 blueprint gate PASS at fingerprint `d956442e0946194e3de8105601ae993fe6f7932e7904cc3e4e972fc8444875da`, actor clarity PASS, JSON parse, RU/UK atomic parity, exact locale-batch sync, and `git diff --check` PASS. Elapsed time and token/cache telemetry not measured.
- Boundary: S09 source/test only; no release projection, acceptance, activation, or audio changes. The authored target remains hidden by the build/runtime reveal contract until the first submitted attempt.

