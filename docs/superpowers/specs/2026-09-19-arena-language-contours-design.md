# Arena language contours — design

## Decision

Arena becomes a target-scoped competitive learning surface for `en`, `es`, `fr`, and `de`. A player’s selected study target is submitted at every entry point, captured in the queue and immutable match plan, and used as the server-side selector for the published task pool. A missing, stale, disabled, or mismatched pool blocks entry with an explicit state; it can never fall back to English.

This is deliberately separate from the retired weekly Tournament product. It reuses the proven task schema and review workflow but introduces an Arena-owned target contract and target-scoped publication identity. Nothing re-enables `ENABLE_TOURNAMENTS` or restores retired routes.

## Target contract

`ArenaStudyTarget = 'en' | 'es' | 'fr' | 'de'` is the only supported set. The registry owns display name, speech locale, source locale (`ru` initially), grammar/distractor profile, and readiness requirements. The registry is shared by client, Functions and admin through a small data-only module plus mirrored contract tests.

Every draft and published task has a required `studyTarget`. Every queue ticket, match public document, private envelope, plan, response and content signature has the same target. Matchmaking is target-isolated. A callable rejects an unknown target, an unavailable target, or a request whose target differs from an existing queue/match. Firestore selection filters by `studyTarget` before random ordering.

## Content and quality model

The five existing Arena modes remain unchanged: `guess_phrase`, `fill_gap`, `find_oddity`, `translate_build`, and `speed_match`. The target language takes English’s content slot; Russian remains the learner-facing source language for the first release. Each target profile defines prompt wording, translation direction, CEFR anchors, permitted grammar dimensions, punctuation/tokenisation policy, and distractor families.

The quality pipeline is fail-closed:

1. deterministic schema and target consistency validation;
2. mode-specific correct-answer, duplicate-option, ambiguity, tokenisation and explanation validation;
3. target profile checks (for example Spanish agreement/conjugation, French articles/elision/agreement, German case/gender/verb position);
4. provenance, semantic-key and pool-local duplicate checks scoped by target;
5. structured independent reviewer receipts for pedagogy, nonsense, distractor quality and target isolation;
6. manual review/publish only after all required receipts are PASS and pool readiness is complete.

An editor changing text invalidates the receipts. AI-generated drafts are never automatically published. The client performs no language guessing and never repairs an incompatible payload.

## Admin workflow

The only operator surface is `admin/v2/legacy.html`. Its Arena Content section receives one target selector shared by generation, draft review, readiness and publication actions. The English workflow remains the reference, while Spanish, French and German appear as distinct target workspaces with independent counters, review evidence, duplicate ledgers and readiness badges. All controls have labels, tooltips, preview/dry-run paths, audit reasons, loading/error/empty states and one primary action per panel.

The Functions layer exposes target-aware, permission-gated draft generation and review actions. Publishing is idempotent, target-scoped and only writes a pool when every quality receipt and target pool threshold passes. No user content is generated or published by a client.

## Migration and safety

Existing English tasks are explicitly backfilled/tagged as `en` via a guarded migration with a dry-run report and immutable publication fingerprints. Legacy untagged tasks are not eligible for a new multilingual room. Existing English live matches remain readable through a compatibility parser, but new rooms require the target field.

Config has a global Arena master switch plus per-target availability and expected publication fingerprint. A target is unavailable until its pool is verified; turning on a language without a ready pool is rejected. New target-scoped fields require Firestore indexes, Rules review and Jarvis contract updates if server reads are added.

## Acceptance criteria

- Spanish, French and German selections can only receive content with the identical `studyTarget`.
- A target with no ready pool shows an unavailable state and cannot create a queue or match.
- Two players with different targets cannot be matched; all bot, friend, today and ranked paths preserve isolation.
- Admin can independently generate, inspect, review and publish each target’s pool in `legacy.html`.
- Each non-English target has the same five task families, target-specific generator instructions, distractor rules, reviewer receipts and quality gates as English.
- Tests demonstrate rejection of English content in `es`, `fr` and `de` rooms and rejection of malformed/ambiguous distractors.
- The retired Tournament surface remains disabled.
