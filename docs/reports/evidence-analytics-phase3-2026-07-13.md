# Evidence Analytics Phase 3 — Learning Outcomes

## Outcome

Phase 3 adds privacy-safe measurement of SRS review outcomes, delayed recall, evidence-based mastery, review-session completion, content diagnostics, and Weekly Effective Learners.

## Implemented evidence model

- Actual recall delay is measured from the previous persisted `lastReviewed` timestamp.
- Delay buckets use exact boundaries: under 24 hours, 1–6 days, 7–29 days, and 30+ days.
- `mastered` requires a correct answer after an observed delay of at least 7 days.
- `durable_mastered` requires a correct answer after an observed delay of at least 30 days.
- A wrong review after either mastered state records a lapse and returns the stored state to learning.
- Legacy repetition counts and scheduled future intervals cannot create mastery by themselves.
- Weekly Effective Learners are consent-observed app instances with meaningful learning on at least two distinct UTC days in a Monday-based week and at least one correct delayed review after 24+ hours.

## Privacy and integrity controls

- SRS items receive random local analytics IDs that are never derived from phrase text.
- Legacy items are migrated idempotently; ID collisions are repaired and duplicate merges preserve one deterministic existing ID.
- The analytics payload is built from an explicit allowlist and contains no phrase, answer, translation, error token, account UID, or stable ID.
- Item UUIDs are used inside the warehouse event only and are never projected into Admin aggregates.
- All SRS read-modify-write mutations are serialized per study target.
- `markReviewed` returns a transition only after `AsyncStorage` persistence succeeds.
- One stable attempt ID closes a displayed card against duplicate mutation and is reused as the analytics `event_id`.
- Review answer analytics is emitted only from the successfully persisted transition.
- Content diagnostics expose a lesson only at five or more consented app instances; smaller groups are combined as `suppressed_small_sample`.

## Governed events and aggregates

Added events:

- `learning_review_session_start`
- `learning_review_answer`
- `learning_review_session_complete`
- `learning_review_session_abandoned`

The contract audit now reports 33 declared, 33 called, 33 warehoused, and 33 measured events with zero contract errors. Warehouse rows include review summary, delay accuracy, mastery transitions, content diagnostics, session completion, and Weekly Effective Learners. Delivery-quality checks now apply schema, event-ID, session-ID, duplicate, and watermark checks to both product lifecycle and learning-review events.

## Admin v2

The analytics workspace now includes a dedicated learning-outcomes section with:

- first evaluated answer accuracy;
- delayed-recall accuracy;
- review-session completion;
- Weekly Effective Learners by UTC week;
- delay-bucket and mastery-transition tables;
- sample sizes and data watermark;
- small-sample suppression;
- an explicit warning that correlation does not prove causation.

## Verification

- Root focused regression: 8 suites, 214 tests passed.
- Additional Admin v2 regression: 3 suites, 10 tests passed.
- Functions focused regression: 4 suites, 20 tests passed.
- Functions TypeScript build passed.
- Focused ESLint passed with zero errors; one pre-existing unnecessary dependency warning remains in `review.tsx`.
- `git diff --check` passed for the Phase 3 paths.
- Analytics contract audit: 33/33/33/33, zero errors.

## Advisor review corrections

The mandatory final review identified and verified five corrections before approval:

- mistakes recorded outside the review screen now reset an existing mastered state to learning;
- WEL headlines exclude partial and left-truncated weeks;
- review-session completion pairs start and terminal events by app instance and review session;
- combined small-sample content diagnostics count distinct app instances after suppression;
- abandoned-session analytics waits for pending persisted answers before calculating counters.

Advisor final decision: `APPROVED`.

## Verification limit

A live BigQuery dry-run was not performed because the local workspace has no configured analytics dataset/credentials or `bq` environment. SQL behavior is covered by focused structure/semantic contracts and the Functions build; production validity must still be confirmed after the first Firebase daily export containing these events.

## Находки и предложения

- The existing server XP ledger event named `review_answer` still carries phrase text for reward idempotency. It is deliberately excluded from the product analytics source and should receive a separate privacy review before any future warehouse use.
- The current admin report is observational. Causal decisions still require experiment exposure/control metrics planned for Phase 4.
- Once enough 30-day observations mature, durable mastery should be monitored separately from the faster 7-day mastery signal rather than combined into one headline rate.
