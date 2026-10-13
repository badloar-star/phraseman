# L01 S02 current repair packet

Status: the first frozen candidate received seven independent reviews; their combined findings were repaired once in a new immutable successor. The successor now awaits affected-role review, and release authority remains false.

## Frozen scope

- Session: `en/l01/s02`.
- Preserve 3 intro pages, 21 numbered practice interactions, historical interaction IDs, curriculum vocabulary, and retrieval order.
- Repair only learner-visible RU/UK text, exact atomic parity, and the missing structured explanation sidecar.
- Do not generate audio, promote release files, alter S01 evidence, or claim reviewer PASS.

## Confirmed defects addressed in this batch

1. The intro heading overgeneralized the local `I am + state` pattern into “after I always use am”.
2. `tire` was incorrectly reduced to only the noun “tyre”; it also has a verb sense.
3. The vocabulary cards for `tired`, `busy`, and `late` used figurative filler instead of bounded definitions. Their deliberate card interaction and the total of 21 tasks remain unchanged.
4. The `tired/tide/tie` and `busy/bus/buzzy` feedback used unsupported respelling/syllable claims and falsely implied that `buzzy` was not a word.
5. Task 8 asserted that the learner was in fact tired and not going anywhere, although neither fact appeared in the prompt.
6. The session had no `practice.explanations.v1.json`, so intro responses, options, phrases, extra tiles, and pair matches could not show source-bound per-word/POS analysis.

## Evidence and acceptance boundary

- Linguistic anchors are recorded in `judgements/2026-10-13_l01_s02_source_evidence.md`.
- Acceptance requires exact RU/UK Markdown↔atomic parity, a zero-issue sidecar validation, 9 intro-response analyses, all 21 practice interactions covered, and authored analysis for every option/extra tile/phrase/pair.
- Passing deterministic gates proves structural and source-binding properties only. Independent learner, reader, pedagogy, nonsense, taste, progression, and locale reviews have not yet been run on the repaired candidate.

## Previous candidate evidence (superseded)

- Current candidate projection: `outputs/s02-diagnostics-fixed-20261013/en/l01/s02`.
- Candidate bundle SHA-256: `4fe3e22277235529e89c6171a1a51c6b92faddbe94acc8a0973ebc69f56e9497`.
- Content-receipt SHA-256: `d1f72e6bddceb4ac63f744a82670af4ccb7134a12e5498305ee8c635ce30a524`; inventory SHA-256: `5f9e237a554c3431855310a7ce74970f4d3738a03c45afcaf66aad153469243d` (19 bound files; five projection files; 13 source/evidence/contract origins captured in a candidate-local snapshot; preview not yet generated).
- Source SHA-256: RU `a03f4db070b70bebc09c7f2aa31e466e30d5c565d9633ce6103d237cc9eae831`; UK `8427f77077fe9b68803c2bc9cf828a25bdd3f62d792449c5fb0e63002370a3eb`; atomic `2ad17acbb23a5642a749ecaba2cbedbb6469855d3ed00306d4578b3d2fa2cfbe`; explanation sidecar `654e0ee8894503f2eb16b49e9947c8c30e61e572ecbd85fdd8f2146788611ced`.
- Earlier projections `outputs/s02-source-repair-20261013` and `outputs/s02-source-repair2-20261013` remain preserved as superseded evidence; they must not be reviewed or represented as current. The second version's first generic receipt bound mutable source paths and is therefore not the current immutable review authority.
- Focused regression: `node --test content/learning-v2-course/pipeline/l01s02_feedback_repair.test.mjs` — 10/10 PASS. Generic receipt regression: `node --test content/learning-v2-course/pipeline/build_session_candidate_receipt.test.mjs` — 4/4 PASS.
- The regression deliberately caught an intermediate builder error that shifted task ordinals and changed choreography. The final candidate restores ordinals 1–21, the existing purpose sequence, and populated speed-match answer keys.
- The candidate builder reported zero structural problems. Its separate file-mtime warning for UK is not treated as proof of semantic drift: the focused gate verifies that `locales_batch.md` exactly contains the current UK source and that RU/UK Markdown matches the atomic projection. A future receipt must bind file bytes, not mtimes.

## Independent findings on the superseded candidate

The following raw reports remain unchanged and are bound to the superseded candidate bundle `4fe3e22277235529e89c6171a1a51c6b92faddbe94acc8a0973ebc69f56e9497`:

- `judgements/2026-10-13_l01_s02_learner_raw.md` — HOLD.
- `judgements/2026-10-13_l01_s02_reader_raw.md` — HOLD.
- `judgements/2026-10-13_l01_s02_pedagogy_raw.md` — HOLD.
- `judgements/2026-10-13_l01_s02_nonsense_raw.md` — HOLD.
- `judgements/2026-10-13_l01_s02_taste_raw.md` — HOLD.
- `judgements/2026-10-13_l01_s02_progression_raw.md` — progression PASS only; no release authority.
- `judgements/2026-10-13_l01_s02_locale_raw.md` — scoped locale PASS only; no audio or release authority.
- `judgements/2026-10-13_l01_s02_locale_initial_raw.md` preserves the earlier incomplete locale attempt and is not eligible evidence.

The confirmed shared repair set was: five intro distractors whose boundaries incorrectly licensed malformed whole phrases; generic temptation/minimal-contrast text for those five choices; word-function descriptions that did not match missing/repeated `am` or standalone words; and two complete `I am tired.` listening alternatives misclassified as malformed phrases.

## Current immutable successor

- Candidate: `outputs/s02-review-fixed-20261013`.
- Candidate bundle SHA-256: `1e26259bf3b9e062e910a4450b2da38e06496d7cffbcf13450b187cefb6cdda1`.
- Content-receipt file SHA-256: `2dd34242e4e997551179ccd78a6e7183f4b50396b58954e79f7b78299dd2e4fa`; inventory SHA-256: `84ad4b4fe585aea845728486c40a3e7fc5120aaad96ebb819deff0a61fd2db79`.
- Source-snapshot index SHA-256: `90bc2b95f68ed5d001214adb3b2b5b9e4689f1c7f63692b6effc8a8432ce50e1`.
- Receipt binds 23 files: five RU/UK projections, all four private-preview files, the exact source/evidence/contract snapshot, and its index. The initial review manifest has no eligible roles and keeps `textReviewComplete:false` and `releaseAuthority:false`.
- Focused RED evidence: the new regression run reported 10 PASS / 3 FAIL, specifically for literal intro diagnostics, occurrence-accurate word functions, and complete-listening-alternative classification.
- Focused GREEN evidence: `node --test content/learning-v2-course/pipeline/l01s02_feedback_repair.test.mjs` — 13/13 PASS.
- Private candidate build: three intros and 21 interactions in RU/UK; builder reported zero structural problems. Candidate mockup contains exactly one session and is a private review artifact, not the 186-session owner catalogue or a release.

The successor still requires genuine affected-role checks on these exact hashes. Existing reviews are retained as findings but are not transferred as PASS evidence. Audio remains ungenerated and unverified; production/release authorization remains false.

