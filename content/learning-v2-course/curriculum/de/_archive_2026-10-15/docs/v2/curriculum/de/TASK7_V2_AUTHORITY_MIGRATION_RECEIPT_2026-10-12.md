# German Learning V2 — Task 7 v2 authority migration receipt

**Date:** 2026-10-12  
**Status:** `V2_AUTHORITY_MIGRATED_PARTIAL / HOLD`

<!-- TASK7_V2_MODULE_SHA256: a24e9af5702672cf5619a33e063bbb477d30a31f46c3c13731d5aa8220116ea6 -->
<!-- TASK7_V2_INVENTORY_SHA256: db6f68d392783c120efea506157050b7ac53b805cca4be43b31948458853d415 -->
<!-- TASK7_V2_GATE_SHA256: 8a4eb5564877a205f9223adc6cd796439c529cd1fbf74fddaf80d1dfd4ae3c67 -->
<!-- TASK7_V2_DRY_RUN_SCRIPT_SHA256: 80789962e90bfd3c2ad025b8a0e60426801af60e633c5a7806c62e7fdcfdf14b -->
<!-- TASK7_V2_DRY_RUN_GATE_SHA256: 24379296db6154b642b9be1a88f8f8b0a6cde8d1cfc5afe76f0821cda74465b7 -->

## Exact migrated state

The fixed-path v2 inventory is bound to Task5-v2 byte SHA
`18e2be42099785838fc7739ac0c13df2ad1283352881b15ea574fa03099a1b23`
and canonical-body SHA
`3c6979ecccd37806f993a78c3403e455ef0c76079ab5d82d1d3d3b66334cfcf3`.
It contains 288 Task5 plan identities: exactly 6 resolved and 282 unresolved.
There are 1792 exact Task5 packet identities and 0 of 1792 packets materialized.

The six resolved identities are the two preserved L01 mappings and four
Task6-v2 L02 mappings. Only the two L01 mappings have an admitted earlier
first-introduction packet. The four L02 mappings retain their Task5 checkpoint
uses, but those checkpoint uses are not rebranded as first introductions.

The exact next ordered session is `de_l01_s01`. This is an ordering fact for a
future separately authorized Task 7 slice, not present materialization or
preauthoring authority. `de_l02_s01` is not first because the L01 prerequisite
has not been materialized.

## Authority boundary

- classification: `PARTIAL_INVENTORY_ONLY`;
- `task7Unlock=false`;
- `learnerFacing=false`;
- `releaseAuthorized=false`;
- owner approval: `NOT_REQUESTED_NOT_GRANTED`;
- consumer cutover: `NONE`;
- materialized packet paths: empty;
- no session content, RU/UK learner text, mockup, audio, runtime, release, or
  English/default-consumer change was created.

The fixed-path loader rejects caller-provided authority, owner approval, paths,
hashes, or allocation rows. The partial inventory cannot be branded as a full
allocation, preauthoring approval, consumer cutover, or release authority.

## Task6-v2 predecessor binding

Phase A is bound to all eight frozen artifacts recorded in the inventory.
Phase B is bound to the reviewed quartet:

- lexical registry:
  `31934e35b5278c7a7e901d08e02da5398f3503825782acbb604d06de094726a5`;
- canonical bundle:
  `ba4ddc48ce99aeb97788ba767e2179c507c8740be24446cbf6b4f9abf591681f`;
- Phase B gate:
  `b0fd5ed0f11273a18d70c2d60e3171bc4e22c8bcbafcb92a6924be45a54d104b`;
- Phase B receipt:
  `2b162e1ac798372327636bf29663c6a5378e629a63b51c0331379c31a291474e`.

Fresh predecessor verdict summaries were reported by:

- `/root/l02_task6_v2_phase_b/phase_b_native_review` — PASS, P0/P1/P2 = 0;
- `/root/l02_task6_v2_phase_b/phase_b_spec_review` — PASS, P0/P1/P2 = 0;
- `/root/l02_task6_v2_phase_b/phase_b_adversarial_review` — PASS,
  P0/P1/P2 = 0.

Run IDs and thread IDs were not exposed and are recorded as `null`. These are
`ORCHESTRATION_ATTESTED_SUMMARY_NOT_SELF_AUTHENTICATING` records; they are not
invented receipts and do not independently grant Task 7 authority.

## TDD and hostile coverage

The RED command was:

```text
node --import tsx tests/learning_v2_de_task6c_full_allocation_authority_v2_gate.ts
```

The observed initial failure was `MODULE_NOT_FOUND` for the not-yet-created v2
authority module. The gate covers wrong v1 path/digest, false totals, duplicate
canonical sense, a missing Task5 packet, a missing Task5 plan, L02-first
reordering, use of L02 `s08` as first introduction, caller-supplied authority,
false owner approval, and attempts to brand this partial inventory as
preauthoring or cutover authority. The post-review repair additionally binds
the complete canonical Task6-v2 bundle semantics: hostile noun-gender,
`wohnen` gloss, and extra L02 planned-packet mutations are rejected. Receipt
validation executes all five recorded artifact hashes, including both dry-run
files, and rejects a mutated dry-run hash.

Observed focused GREEN:

```text
TASK7_V2_AUTHORITY_MIGRATION_GATE PASS status=V2_AUTHORITY_MIGRATED_PARTIAL plans=288 resolved=6 unresolved=282 packets=1792 materialized=0 next=de_l01_s01 task7Unlock=false learner=false release=false
```

The separate fixed-path dry-run gate also passed. It rejects `--write` and
caller paths before loading authority and leaves the German packet root absent:

```text
TASK7_V2_DRY_RUN_GATE PASS fixedPaths=true v1=UNCHANGED write=REJECTED callerPaths=REJECTED materialized=0
```

The existing exact-packets gate remains deliberately RED at
`task7_exact_packet_files_required` with `0 !== 1792`. This is the required
proof that the migration packet did not create or unlock packet bytes.

Independent reviews of this new Task 7 v2 packet remain required after the
exact hashes above are frozen.
