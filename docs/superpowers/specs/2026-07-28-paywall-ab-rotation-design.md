# Paywall A/B Rotation Design

Date: 2026-07-28
Status: approved design, awaiting written-spec review

## Objective

Select the strongest Phraseman paywall among variants A–G without showing a user inconsistent screens inside one experiment and without declaring a winner from insufficient purchase volume.

Current traffic is approximately 400–500 unique ordinary paywall viewers per week. At this volume, a permanent seven-way purchase test would allocate only about 57–71 unique viewers to each variant per week and would be too noisy for a reliable purchase decision.

## Experiment structure

The experiment has two stages.

### Stage 1: A–G screening

- Duration: four complete weeks.
- Audience: eligible users who render an ordinary paywall outside onboarding.
- Allocation: all seven variants enabled with the nearest possible integer split totaling 100%: A 15%, B 15%, C 14%, D 14%, E 14%, F 14%, G 14%.
- Assignment unit: canonical `stable_id`.
- Assignment remains frozen for the entire screening experiment.
- Primary screening metric: unique CTA click-through rate, calculated as users with at least one CTA click divided by users with a valid rendered exposure.
- Secondary metrics: plan-selection distribution, checkout start rate, paywall close rate, and completed purchases.
- Purchase data is directional during screening and must not alone determine the winner.
- Outcome: advance the two variants with the strongest CTA evidence, provided their guardrails are acceptable.

If results are close, prefer the variant with the better checkout-start rate. If that is also inconclusive, advance the control C together with the strongest challenger. Do not select a winner using raw event counts or repeated impressions.

### Stage 2: purchase final

- Duration: eight complete weeks by default.
- Allocation: the two finalists receive 50% each.
- Assignment is re-seeded with a new experiment identity and frozen for the full final.
- Primary metric: unique completed purchasers divided by unique valid paywall exposures.
- Secondary metrics: checkout-start rate, CTA click-through rate, selected plan, and revenue per exposed user when trustworthy store revenue attribution is available.
- Guardrails: purchase-error rate, cancellation rate, refund rate when available, paywall close rate, and any material deterioration in app stability.
- The final must not stop early because one variant temporarily leads.

At the end of eight weeks, report effect size and uncertainty. A variant is promoted only when the result is both directionally credible and commercially meaningful. If the purchase result remains inconclusive, keep the safer current control and record the test as inconclusive rather than manufacturing a winner.

## Assignment contract

Variant assignment is deterministic:

```text
hash(stable_id + experiment_id + assignment_salt) -> allocation bucket -> variant
```

The following invariants apply:

1. A user sees one variant throughout an experiment, including repeat paywall opens.
2. The same account sees the same variant on another device after canonical identity recovery.
3. A new experiment uses a new `experiment_id` and assignment salt, allowing a clean reassignment.
4. Variant assignment must never use a shared fallback such as the literal `pending` as an analyzable assignment.
5. If canonical identity or the experiment configuration is not ready, the app may render a safe fallback only as `pending_fallback`; that exposure must be excluded from causal experiment analysis.
6. The rendered variant and recorded exposure must come from the same frozen assignment.
7. Changes to weights during a running stage require a new experiment version; weights are not edited in place.

There is no daily, weekly, per-session, or per-open rotation. Such rotation would expose the same user to multiple treatments and contaminate conversion attribution.

## Configuration loading

Before an analyzable paywall assignment, the client must have:

- a real canonical or locally persisted `stable_id`;
- the last persisted valid paywall experiment configuration;
- a matching experiment passport whose allocation and salt agree with the effective config.

The persisted config should hydrate the in-memory resolver before ordinary paywall navigation. A background refresh may update the config for the next experiment decision, but it must not swap the variant after the current paywall has rendered.

Invalid, missing, expired, or internally inconsistent experiment configuration fails closed to a non-analyzable fallback. It must not silently add fallback impressions to a valid experiment cohort.

## Exposure and metric rules

- Emit an exposure only after the selected paywall has actually rendered.
- Reuse one impression/exposure identity across the paywall's associated funnel events.
- Deduplicate the primary denominator by `stable_id` and experiment stage.
- Repeated CTA clicks by the same user do not create additional successes for the primary rate.
- Purchase completion must be attributed to the frozen exposure and experiment identity.
- Development previews, tester overrides, Expo Go, and explicitly marked QA traffic are excluded.
- Analytics-consent limitations must remain visible in reports; consented telemetry must not be described as complete revenue attribution.

## QA preview

Testers need an explicit A–G preview selector independent of production assignment. It should:

- open any selected variant directly;
- display the active production experiment identity and published allocation;
- clearly mark the session as QA;
- suppress experiment exposure and conversion events or mark them as excluded QA events;
- provide a reset action returning the tester to normal production assignment.

The QA selector is for visual and purchase-flow verification only. It must never mutate the production allocation or a user's frozen experiment assignment.

## Admin workflow

The live admin surface remains `admin/v2/legacy.html`. The paywall experiment controls should support these deliberate transitions:

1. Draft the screening allocation and experiment passport.
2. Validate that enabled weights total 100% and exactly match the passport allocation.
3. Publish Stage 1 as a new immutable experiment version.
4. After four complete weeks, record the screening decision and finalists.
5. Publish Stage 2 with a new experiment identity, salt, 50/50 allocation, fixed start/end timestamps, and the named primary metric.
6. After the planned duration, close the final and record winner, loser, or inconclusive.

Publishing must remain audited, idempotent, and protected by the existing admin role and permission checks. The UI must not imply that creating seven screen files automatically activates a seven-way experiment.

## Verification and acceptance criteria

The implementation is accepted when focused automated tests and a QA pass prove all of the following:

- A–G screening allocation totals 100% and all seven variants receive buckets.
- Final allocation is exactly 50/50 for two configured finalists.
- The same stable ID always resolves to the same variant inside one experiment.
- Changing the experiment identity re-seeds assignments.
- A missing stable ID cannot generate a valid analyzable exposure.
- Cached configuration is available to the synchronous router before an ordinary paywall decision.
- A background refresh cannot change an already rendered paywall.
- Exposure, CTA, checkout, and purchase events carry a consistent experiment and variant identity.
- QA preview can open A–G without contaminating production metrics.
- Existing manage-subscription behavior and all ordinary paywall entry points remain intact.
- No onboarding behavior is changed by this project.

## Out of scope

- Changing paywall visual designs or copy.
- Changing prices, products, trial eligibility, or RevenueCat offerings.
- Rotating screens on each open for variety.
- Personalizing variants by demographic or behavioral segment.
- Altering onboarding paywalls.
