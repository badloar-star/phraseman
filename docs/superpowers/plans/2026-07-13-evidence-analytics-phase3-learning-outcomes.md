# Evidence Analytics Phase 3: Learning Outcomes

## Goal

Measure real learning outcomes from the existing SRS review loop without exporting phrase text, answers, account identifiers, or other raw content.

## Approved semantics

- `learning`: no successful delayed recall yet, or the item returned here after a lapse.
- `strengthening`: successful reviews exist, but none after an actual delay of at least 7 days.
- `mastered`: a correct answer after an actual delay of at least 7 days.
- `durable_mastered`: a correct answer after an actual delay of at least 30 days.
- `lapsed` is a transition from `mastered`/`durable_mastered` on an incorrect answer; the stored state then returns to `learning`.
- Actual delay is measured from the previous `lastReviewed`, never inferred from the next scheduled interval.
- Delay buckets: `under_24h`, `d1_to_d6`, `d7_to_d29`, `d30_plus`, `unknown`.
- Review session completion requires explicit start/complete/abandoned events.
- Weekly Effective Learner v1 is a consent-observed app instance with meaningful learning on at least two distinct UTC days in a Monday-based week and at least one correct review after an actual delay of 24 hours or more.

## Implementation sequence

1. Add pure, boundary-tested delay, due-status, mastery-transition, and safe-payload functions.
2. Add random opaque analytics IDs to SRS items with idempotent legacy migration, collision repair, deterministic duplicate merge, and serialized storage mutations per study target.
3. Make `markReviewed` persist atomically and return a privacy-safe transition only after successful storage.
4. Integrate one stable review-attempt ID per shown card and emit analytics only from the explicit safe payload builder.
5. Add governed start/answer/complete/abandoned events and warehouse metrics for delayed recall, mastery transitions, review completion, content diagnostics, and Weekly Effective Learners.
6. Add Admin v2 rendering with consent/sample/watermark definitions and small-sample suppression.
7. Run focused app tests, contract audit, Functions tests/build, Admin rendering tests, and Advisor final review.

## Acceptance criteria

- No analytics payload contains phrase, answer, translation, error token, grammar text, account UID, or stable ID.
- Boundaries at 24 hours, 7 days, and 30 days are exact and tested.
- Legacy interval/repetition values alone cannot create mastered state.
- Concurrent SRS read-modify-write operations cannot overwrite each other.
- Storage failure produces no product analytics event.
- Duplicate taps cannot mutate or emit twice for the same displayed card.
- Warehouse output exposes aggregates only; item UUIDs are never returned to Admin/export.
- Lesson/content diagnostics suppress groups smaller than five app instances.
- Existing SRS scheduling, XP, energy, achievements, and trainer behavior remain intact.

## Verification limits

The local suite can verify SQL structure and contracts. A live BigQuery dry-run remains unavailable until the analytics dataset and credentials are configured; no synthetic historical backfill is permitted.
