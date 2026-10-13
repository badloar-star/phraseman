# German Learning V2 — Task 6C packet-level lexical allocation authority

**Status:** `PENDING / NOT_CANONICAL / TASK7_UNLOCK_FORBIDDEN`

**Gate state:** `HOLD`

## Scope and source binding

This is a new Task 6C authority. It does not amend Task 6 v1, Task 5 source
blueprints, B3A artifacts, or English. Its machine-readable schema is
`modules/learning-v2/curriculum/de/registries/task6c_packet_lexical_allocation_schema_de_v1.json`; the schema binds the
canonical body digest of Task 5
`modules/learning-v2/curriculum/de/chapter_blueprints_de_v1.json`.

The historical docs-local JSON at
`docs/v2/curriculum/de/task6c_packet_lexical_allocation_schema_de_v1.json` is
a `NON_AUTHORITATIVE_MIRROR`: it is required to stay byte-identical to the
module-canonical schema and cannot be used as an independent authority.

Task 5 checkpoint lexical plans are preserved as source plans. They identify a
checkpoint's scored use; they do **not** by themselves establish the earlier
first-introduction packet. A later approved Task 6C allocation must therefore
assign first introduction across every one of the 1,792 packet IDs, preserve
every one of the 288 Task 5 plan IDs as a reference and demonstrate chronology before it can be read as
a canonical lexical registry.

## Closed future allocation contract

The eventual allocation is a separate `PROPOSED_NOT_CANONICAL` object. Each
row has exactly `canonicalSenseId`, `firstIntroductionPacketId`, `sourceKind`,
and `sourcePlanId`. The proposal must cover every Task 5 packet exactly once
at minimum, with one through five genuinely new lexical senses per packet.
The production allocation must additionally prove each source plan's exact
lexical identity, evidence binding, utility, grammar boundary and the relation
of first introduction to every Task 5 checkpoint scored-use. Those semantic
facts are absent here and must not be inferred from a packet number.

## Explicit holds

- This schema contains no German lexical surface, sense gloss, lexical evidence
  or canonical lexical row.
- `canonicalRegistryStatus=NOT_CANONICAL` and `task7Unlock=false` are fixed.
- Task 7 packet materialization stays blocked. `task7Unlock=false`. No learner-facing RU/UK text,
  mockup, audio, runtime, release, promotion or approval is authorized.
- A future authority cannot be substituted by generated fillers, fabricated
  evidence or reclassification of a checkpoint scored-use as first encounter.

The focused gate is:

```text
node --import tsx tests/learning_v2_de_task6c_packet_lexical_authority_gate.ts
```
