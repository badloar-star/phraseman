# German Learning V2 — Task 7 packet materialization manifest

**Status:** `RED / BLUEPRINT_ONLY / NO_LEARNER_AUTHORING`

## Declared input authority

- Task 5 chapter route:
  `modules/learning-v2/curriculum/de/chapter_blueprints_de_v1.json`.
- Task 6 canonical registry bundle:
  `modules/learning-v2/curriculum/de/registries/task6_canonical_registry_de_v1.json`.
- Closed packet contract:
  `modules/learning-v2/curriculum/de/course_blueprint_contract_de_v1.ts`.
- Stage 0 boundary:
  `docs/v2/curriculum/de/TASK_PACKET_STAGE_0.md`.

## Intended output boundary

Task 7 owns only German blueprint packet JSON at:

```text
content/learning-v2-course/curriculum/de/packets/l01/s01.json
...
content/learning-v2-course/curriculum/de/packets/l32/s56.json
```

The required topology is exactly 32 lessons × 56 packets = **1,792** files;
there are 224 Task 5 chapters × eight packets each.

## RED evidence and contact authority

`tests/learning_v2_de_exact_packets_gate.ts` is the pre-materialization gate.
It requires the exact packet topology and an approved full-course allocation
authority that semantically proves one to five planned first-introduction
senses for every packet. Canonical lexical-row counts are deliberately not a
readiness predicate: forged 1,856 or 2,080 rows cannot satisfy Task 7. The
current Task 6 registry has two canonical lexical senses, while
the current Task 5 chapter plans list 288 checkpoint-level lexical plans.
The former `288 + 1,568 = 1,856` arithmetic is retained as a historical RED
observation only. It omitted explicit checkpoint first-introduction allocation
under the current one-to-five-per-packet Task 6C authority; it is not a
universal or release-minimum claim. The exact global allocation total is
`DEFERRED_UNTIL_ALL_32_LESSON_ALLOCATIONS`. No IDs will be invented or
promoted by Task 7.

This is a factual RED observation, not a permission to weaken the invariant or
to reuse a sense as new. The subsequent materialization route must be decided
against a fresh authority decision before file generation begins.

`scripts/learning-v2-de-materialize-packets.mjs` is deliberately fail-closed:
the only checked allocation present is the L01 target with 70 senses / 56
packets, so it emits `TASK7_FULL_ALLOCATION_AUTHORITY_PARTIAL` and writes no
packet path. That L01 proof is explicitly non-sufficient for the full course.
A future full-course authority must use the existing Task 6C
`learning-v2-german-task6c-packet-lexical-allocation.v1` fields and
`PROPOSED_NOT_CANONICAL` status, including its canonical Task 5 source digest.
It must cover every one of 1,792 packet IDs at one to five rows each and bind
every referenced source plan to a resolvable evidence record: the evidence
bytes/hash and the source plan's actual checkpoint packet are checked. Empty,
fabricated or cross-wired evidence is a HOLD. `canonicalRegistryStatus` remains
`NOT_CANONICAL` and `task7Unlock=false`. Even after that authority is supplied,
the default is dry-run; `--write` remains a separate unimplemented guard until
a reviewed native packet-record generator exists.

The materializer accepts no caller-provided authority, evidence path, hash or
fixture. Dry-run resolves only fixed project registry paths. `--write` first
executes its zero-I/O `TASK7_WRITE_UNIMPLEMENTED` guard, before any authority
or filesystem read; it cannot be used to probe or overwrite packet paths.
There is currently no approved fixed additive-evidence registry, so no
synthetic full-authority fixture is accepted.

## Explicit exclusions

No learner-facing RU/UK prompts, translations, options, distractors, feedback,
audio, mockup, runtime, release, English files, promotion, or approval receipt
are part of this Task 7 manifest or gate.

## HOLD checkpoint — 2026-10-11

Observed inputs and derived counts are exact:

- 32 Task 5 lessons, 224 chapters and 1,792 unique canonical packet IDs;
- 224 checkpoint packet IDs and 288 existing checkpoint lexical plans;
- 1,568 non-checkpoint packet IDs without a lexical plan;
- historical incomplete arithmetic: `1,856` senses; its universal-minimum
  reading is superseded, and the exact global allocation total is
  `DEFERRED_UNTIL_ALL_32_LESSON_ALLOCATIONS`;
- current Task 6 canonical authority: 2 senses, 2 phrase frames and 1
  pronunciation target;
- current German packet files: 0 / 1,792.

The focused RED command is:

```text
node --import tsx tests/learning_v2_de_exact_packets_gate.ts
```

It first proves that the materializer is fail-closed at
`TASK7_FULL_ALLOCATION_AUTHORITY_PARTIAL`, then fails the unfulfilled packet
count at `task7_exact_packet_files_required` (`0 !== 1792`). This expected RED
is recorded evidence, not a PASS and not permission to synthesize senses.

Task 6 and B3A protected artifacts are deliberately untouched. The next lawful
writer is a separate Task 6C full-registry completion slice; it must establish
its own additive authority and reviews before this Task 7 writer may generate
any packet bytes.
