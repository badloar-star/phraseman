# Task 7 V2 L01/C01 `Hallo` phrase-authority adjudication HOLD

Date: 2026-10-12  
Packet: `HALLO-PHRASE-AUTHORITY-ADJUDICATION-HOLD`  
Status: `HOLD`  
Decision: `EXACT_PHRASE_AUTHORITY_NOT_ESTABLISHED`

## Bounded finding

The exact proposed Task6-v2 phrase frame is `Hallo, Nachbarin!`
(`de_pf_l01_c01_hallo_nachbarin_v1`). The six frozen inputs establish only the
following facts:

- DWDS identifies lowercase `hallo` as an interjection and supports its
  greeting function (`Anrede zur Begrüßung`).
- The DWDS parent sense labels the entry `umgangssprachlich`; therefore the
  adjudication records `UMGANGSSPRACHLIC_SUPPORTED`, not a neutral-register
  claim.
- Goethe A1 contains the exact occurrence `Guten Tag! / Hallo!`. It does not
  attest the composed phrase `Hallo, Nachbarin!`.
- Task6-v2 contains that composed phrase with general CEFR evidence
  `DE-RSCH-CEFR-003`; general proficiency evidence is not an exact phrase
  attestation.

An exact UTF-8 literal scan found zero occurrences of `Hallo, Nachbarin!` in
the byte-bound DWDS interjection raw body, rejected DWDS noun body, Goethe A1
PDF body, and extraction map. Consequently:

- `greetingFunction=SUPPORTED`
- `neutralRegister=UNVERIFIED`
- `exactPhraseAttestation=ABSENT_FROM_BOUND_EVIDENCE`
- `phraseNaturalness=UNVERIFIED`
- `nativePhraseJudgement=REQUIRED`

The only permitted resolution route is
`NEW_EXACT_AUTHORITY_OR_VERSIONED_TASK5_TASK6_REPAIR`. This packet does not
select either repair yet and does not turn an unverified phrase into course
content.

## Frozen inputs

- Task5-v2 blueprint:
  `18e2be42099785838fc7739ac0c13df2ad1283352881b15ea574fa03099a1b23`
- Task6-v2 canonical registry:
  `ba4ddc48ce99aeb97788ba767e2179c507c8740be24446cbf6b4f9abf591681f`
- source manifest:
  `674f789c05922ddce29103393228ee26f4c428255baf4fc646b90c95b97bfd33`
- extraction map:
  `3b0ab0c32c3dd8bb42b2c22f0f43bc514272f23c60c97003334418f5afaaabad`
- source validator:
  `71e96a433e2906ffd86e05aa0ea42a09300c1d83a46ecae680bfa842a637e5aa`
- Task7-v2 inventory:
  `db6f68d392783c120efea506157050b7ac53b805cca4be43b31948458853d415`

## Authority boundary

- `canonicalAdmission=false`
- `inventoryResolutionApplied=false`
- `task7Unlock=false`
- `preauthoringAuthority=false`
- `learnerFacing=false`
- `releaseAuthorized=false`
- `consumerCutover=NONE`
- inventory remains 6 resolved / 282 unresolved / 1,792 packets / 0 materialized
- no `de_l01_s01` packet file exists
- no learner-facing session, native cutover, publication, deployment, or
  production change is part of this packet

## RED → GREEN

RED was observed before the module and adjudication existed:

```powershell
node --import tsx tests/learning_v2_de_task7_v2_l01_c01_hallo_phrase_authority_hold_gate.ts
```

It exited `1` with `MODULE_NOT_FOUND` for
`task7_v2_l01_c01_hallo_phrase_authority_hold_de_v1`. GREEN requires the same
command to exit `0` and emit the dedicated PASS line. The hostile matrix rejects
neutral-register promotion, re-labelling colloquial as neutral, Goethe or CEFR
scope inflation, exact phrase/contact drift, fake native judgement, any
authority opening, input drift, packet creation, and protected English or
pre-existing German-v1 drift.

## Predecessor compatibility repair

The frozen correction candidate adds exactly two legitimate `_v1` paths, and
the subsequent V3 migration candidate adds exactly four. This predecessor gate
now uses a closed set of 17 normalized repo-relative POSIX paths: the previous
exact 11 paths, the exact correction pair, and the exact V3 module, manifest,
Task5 candidate, and Task6 candidate. Before excluding the correction pair the
protected surface has `80` paths; excluding that pair leaves `78`; excluding
the exact V3 quartet restores the unchanged baseline
`74 / 34d91df20aa6e52bbdf3106198effe3f42d381e55c477266b4877cdef312e2e6`.

RED was reproduced as the exact mismatch
`76 / 4e20be72…7b56 != 74 / 34d91df2…2e6`. The repair does not use directory
prefixes, wildcards or rebaselining. It keeps phrase and correction
descendants, `_v1` lookalikes, `_de_v1_lookalike.ts`, unknown future `_v1`,
backslash, `./`, `../`, and case variants protected. Deletion, rename, or byte
mutation of the old Task6-v1 sentinel also remains a deterministic failure.
Platform-relative discovery converts backslashes only on hosts whose path
separator is `\`; a literal POSIX backslash remains byte-distinct from `/` and
cannot alias either exact correction-candidate exclusion.

## Immutable writer bindings

<!-- HALLO_PHRASE_ADJUDICATION_SHA256: 45778ef06b4eddceaa3ede01e83e95225731b9786cbd39868650add6980259a5 -->
<!-- HALLO_PHRASE_MODULE_SHA256: 627e19ebc533a0372e98f282e4c15687953afed2d040e3e84dc65c936827b019 -->
<!-- HALLO_PHRASE_GATE_SHA256: 1f0dbddc353b03f0256378e62e07037cc4716c15cbe5478258fda78126f217a5 -->

These bindings attest bytes only. Independent native/spec/adversarial judges
must assess the frozen quartet and create their own review records. The writer
does not self-approve this HOLD.
