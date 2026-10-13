# Task7 V2 L01/C02 `Tschüss` source-evidence HOLD receipt

Date: 2026-10-12  
Packet: `DE-TASK7-V2-L01C02-TSCHUESS-SOURCE-HOLD`  
Status: `HOLD`

## Bounded result

This additive packet binds only Task5-v2 source plan
`de_lex_plan_l01_c02_tschuess_v1`, whose exact Task5 checkpoint is
`de_l01_c02_s16`. It does not modify the Task5 blueprint, Task6 registries,
the current allocation inventory, any packet, a learner artifact, English, or
the existing V3 candidate surface.

The raw DWDS request is lowercase
`https://www.dwds.de/wb/tsch%C3%BCss`; the captured source representation
declares canonical URL `https://www.dwds.de/wb/Tsch%C3%BCss`. That distinction
is recorded rather than normalised away. The captured title and headword are
`Tschüss`; its exact source part of speech is `Interjektion`. Meaning locator
`d-1-1` contains `umgangssprachlich`, `lebe wohl!`, and `auf Wiedersehen!`.
This supports only the Task5 plan's informal leave-taking sense.

The direct official Goethe A1 PDF is separately captured with its own body and
transport binding. No text locator was extracted from that PDF in this packet,
so it supports no pedagogical-occurrence claim here. In particular, this
packet does not infer a neutral-register claim.

## Authority boundary

- `canonicalAdmission=false`
- `inventoryResolutionApplied=false`
- `task7Unlock=false`
- `preauthoringAuthority=false`
- `learnerFacing=false`
- `releaseAuthorized=false`
- `consumerCutover=NONE`
- no canonical sense ID, canonical registry mutation, packet output, or
  release output is present
- inventory remains `6 resolved / 282 unresolved / 0 materialized`

The only decision is
`SOURCE_EVIDENCE_CAPTURED_CANONICAL_ADMISSION_PENDING`. This is neither a
canonical admission nor permission to author `de_l01_s02`.

## RED and GREEN

RED was observed before the allocation module existed:

```powershell
node --import tsx tests/learning_v2_de_task7_v2_l01_c02_tschuess_source_hold_gate.ts
```

It failed with `MODULE_NOT_FOUND` for the new source-hold module. GREEN is the
same gate exiting zero. The gate also rejects a wrong-case extraction-map
mutation and any raw-DWDS body drift.

## Immutable artifact bindings

<!-- TASK7_TSCHUESS_MODULE_SHA256: f0b2804c6bd099fd388ceb6aa7bfe2a71c89e238c84622e0632a7a4a996c7993 -->
<!-- TASK7_TSCHUESS_MANIFEST_SHA256: d7aa6eed248a5d24c57eafcfdbf4560d433e985fc0a054a86c9836f38fadd612 -->
<!-- TASK7_TSCHUESS_EXTRACTION_MAP_SHA256: 072ae39ffa27ca489d4152bac243dd2ee50de90765d3089dd8f87b7d48d6d0fe -->
<!-- TASK7_TSCHUESS_CAPTURE_SCRIPT_SHA256: 5c854ac4f2d01ca6f856765c92bf707d1cce47a2ef83674221554c90aef28bf5 -->
<!-- TASK7_TSCHUESS_GATE_SHA256: 82578966b920a2850c72e2863cf3233bece0d8d71a3b529481d47ecdfec8ea79 -->

These hashes bind local bytes. They are not a substitute for the required
independent verifier. No push, deployment, publication, release, cutover, or
inventory update is authorized by this receipt.
