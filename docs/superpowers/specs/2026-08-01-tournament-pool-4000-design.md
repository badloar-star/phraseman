# Tournament Pool v7: 4000 Quality Tasks

## Goal

Replace the live 180-task `tpool_20260801_v6` catalog with exactly 4000 reviewed,
deterministically generated `tpool_20260801_v7` tasks. The larger catalog must improve
real player exposure, not merely store 4000 documents that runtime never selects.

The implementation must preserve the strict phrase-builder one-trap contract, tournament
generation barrier, task-secret evidence, deterministic room construction, rollback safety,
and the project OpenAI API firewall.

## Approved quality-first distribution

| Mode | D1 | D2 | D3 | Total |
| --- | ---: | ---: | ---: | ---: |
| `guess_phrase` | 400 | 400 | 400 | 1200 |
| `fill_gap` | 160 | 180 | 160 | 500 |
| `find_oddity` | 200 | 200 | 0 | 400 |
| `translate_build` | 400 | 700 | 400 | 1500 |
| `speed_match` | 100 | 200 | 100 | 400 |
| **Total** | **1260** | **1680** | **1060** | **4000** |

This distribution stays below the currently measured quality-candidate ceilings:
3219 guess, 726 fill-gap, 510 oddity, 39,030 phrase-builder, and 497 speed-match.
The generator must fail rather than weaken a quality gate if the stronger uniqueness rules
reduce any cell below its approved quota.

## Definition of unique

All 4000 tasks must have unique `taskId` values and unique normalized semantic signatures.
A signature includes the mode, tested prompt or corrupted phrase, expected answer, and the
meaningful option/pair set. Reordering options or changing only supporting distractors does
not create a new task.

Additional rules:

- `translate_build` may select at most one task for a normalized source phrase. A different
  trap alone does not make a clone acceptable.
- `find_oddity` uniqueness is anchored to the corrupted phrase and repair, not to its three
  supporting natural phrases.
- `fill_gap` uniqueness is anchored to the complete authored phrase, gap position, correct
  token, grammar role, and translation.
- `speed_match` requires a unique six-pair set. Its selected production set must not reuse an
  English/Russian pair across two speed tasks.
- A source phrase may appear in different modes only when the modes test genuinely different
  skills. Primary-source reuse is capped and reported; supporting distractor reuse is reported
  separately.

It is not possible to forbid every source phrase from appearing anywhere twice: the source
bank contains 3276 phrases while the requested catalog contains 4000 tasks. The contract
therefore forbids semantic task clones, not legitimate cross-mode reuse.

## Offline generation architecture

The v7 factory uses an explicit per-mode/per-difficulty quota map instead of the v6 constant
of 36 tasks per mode. Candidate creation remains deterministic and uses only the checked-in
author content; it must not call OpenAI or any other paid generation API.

Selection is quality-first:

1. Apply the audited EN/RU quarantine before a phrase can become a task or distractor.
2. Validate each mode-specific semantic contract.
3. Deduplicate normalized semantic signatures before selection.
4. Select against diversity state for source phrase, day, topic, grammar role, position,
   correct token, trap part of speech, and speed pair.
5. Fail closed on quota or diversity shortfall.
6. Produce a frozen manifest, old-pool backup, new-pool NDJSON, independent SHA-256 hashes,
   and zero-write dry-run report.

## Runtime exposure without loading 4000 documents

The existing runtime reads at most 40 tasks per mode and would silently hide most of a
4000-task catalog. v7 therefore adds deterministic exposure buckets while preserving roughly
the current read volume.

Every v7 task receives an indexed `exposureBucket` value containing the generation, mode, and
bucket ordinal. Each bucket contains at most 40 tasks and includes enough tasks from every
difficulty used by that mode. The ready barrier stores the validated bucket counts for v7.

For a room-creation window, runtime deterministically chooses one bucket per mode from the
ready barrier generation and day ordinal. It performs five single-field equality queries,
validates that every returned document belongs to the barrier generation and expected bucket,
and then runs the existing deterministic round selector inside those slices. No new composite
Firestore index is required, and a warm instance continues to cache only the bounded slices.

Compatibility rules:

- deployed runtime must accept both v6 and v7 before migration;
- v6 continues using the existing verified/source/mode query;
- v7 uses only generation-scoped exposure buckets;
- a missing, incomplete, duplicate, oversized, or wrong-generation bucket aborts room creation;
- the barrier is re-read after loading, so migration cannot leak a mixed generation;
- existing rooms continue reading their exact room task secrets by ID.

An exposure simulation must cover a two-year daily horizon and representative room series and
shards. It must prove that every one of the 4000 task IDs is reachable, no room repeats an ID,
and cell exposure is not dominated by a small prefix.

## Quality gates

The frozen 4000-task bundle must prove all of the following:

- exact approved mode and difficulty counts;
- 4000 unique task IDs and 4000 unique semantic signatures;
- zero validator failures and zero quarantined content matches;
- no normalized prompt/answer duplicate within a mode;
- all 1500 phrase-builder tasks have exactly one extra token and one unique primary phrase;
- fill-gap includes first, middle, and last positions, at least six grammar roles, no dominant
  correct token, `I` at no more than 10%, and at least 60% advanced D3 slots;
- oddity spans at least five parts of speech and never counts a distractor reshuffle as unique;
- speed-match has 400 unique six-pair sets, 2400 unique contextual EN/RU pairs, and phrases of
  at least two tokens on both sides;
- every explanation stays within byte limits and names the actual tested rule;
- all exposure buckets are complete, bounded to 40, generation-scoped, and collectively contain
  each task exactly once;
- deterministic room simulation validates at least 730 dates and all 4000 task IDs.

Human-readable audit artifacts must summarize repeated words, prompts, answers, roles, topics,
source days, trap types, source reuse, and the most frequent normalized n-grams. Large reports
belong under `.codex-tmp/` and are not committed.

## TDD and review sequence

1. Add RED tests for exact 4000 quotas, semantic uniqueness, no builder clones, speed-pair
   non-reuse, bucket integrity, and full exposure reachability.
2. Add RED migration tests for 4000-document chunked create/read/delete operations and v6/v7
   barrier compatibility.
3. Implement the smallest factory and runtime changes that make the focused tests GREEN.
4. Generate the frozen bundle and run the full offline quality audit.
5. Run focused Jest suites, Functions typecheck, script syntax checks, diff checks, and a fresh
   production-readiness review. Critical or important findings block release.

Tests remain read-only. Source generation and migration are separate explicit commands.

## Guarded production migration

Migration is a new v6-to-v7 contract; the already completed v5-to-v6 report is immutable.

1. Freeze a live v6 backup and v7 bundle with independent SHA pins.
2. Dry-run against production and scan all protected room/task-secret references.
3. Deploy only the compatible tournament runtime and verify every function is `ACTIVE` on one
   source hash.
4. Wait until no non-terminal room references removable v6 task IDs.
5. Acquire the shared generation barrier and stop new room creation.
6. Create v7 tasks in batches below Firestore's write limit and read them back in bounded chunks.
7. Validate the complete staged catalog, bucket layout, and room simulation.
8. Delete only the exact SHA-pinned v6 documents with update-time preconditions.
9. Release the barrier as ready v7 with bucket metadata.
10. Independently read production back and compare every document to the frozen bundle.

Rollback remains hash-pinned and barrier-owned. It restores the exact v6 backup only after
protected-room checks and removes only the exact v7 bundle. Deploy, migration, rollback, Metro,
admin UI, tab bar, and unrelated files remain outside any step unless explicitly required above.

## Acceptance criteria

The work is complete only when production contains exactly 4000 v7 tasks and zero v6 tasks,
the ready barrier reports v7, all tournament functions are active on the compatible runtime,
the live documents exactly match the frozen bundle, all quality/exposure gates pass, and the
task's files are committed without including unrelated workspace changes.
