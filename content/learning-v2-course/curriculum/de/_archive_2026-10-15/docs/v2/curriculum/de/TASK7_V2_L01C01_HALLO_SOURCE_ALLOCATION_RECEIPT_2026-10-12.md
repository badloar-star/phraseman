# Task 7 V2 L01/C01 `Hallo` source-allocation HOLD receipt

Date: 2026-10-12  
Packet: `DE-TASK7-V2-L01C01-HALLO-SOURCE-ALLOCATION-HOLD`  
Status: `HOLD`  
Decision: `PHRASE_AUTHORITY_REQUIRED`

## Bounded result

This packet allocates source support only for the single Task5-v2 plan
`de_lex_plan_l01_c01_hallo_v1` in target session `de_l01_s01`. Its exact
contacts are the introduction context `de_l01_c01_s01` and checkpoint planned
use `de_l01_c01_s08`. The phrase context is
`de_pf_l01_c01_hallo_nachbarin_v1`; the separate source plan
`de_lex_plan_l01_c01_nachbarin_v1` is excluded from this packet.

The captured DWDS target is the lowercase URL
`https://www.dwds.de/wb/hallo`: headword `hallo`, source part of speech
`Interjektion`, and exact greeting sense `d-1-1-2`, `Anrede zur Begrüßung`.
The case-distinct URL `https://www.dwds.de/wb/Hallo` is captured separately as
`Substantiv (Neutrum)` and rejected as the target greeting source.

The Goethe A1 raw artifact is byte-bound to SHA-256
`5e514493a55e10895e04b16be6efcb91c5a3f19d8b18357abe799567e3331085`.
Its allocation is limited to the exact occurrence `Guten Tag! / Hallo!`, PDF
page 3, heading
`WIE SAGT MAN? > BEGRÜSSEN UND VERABSCHIEDEN`. Fresh discovery found the
Goethe-owned public HTTPS route
`https://lernen.goethe.de/deutschonline/A1/PDF/DE/deutschonline_Redemittel_und_Grammatik_1-18.pdf`.
The repair capture received HTTP 200 without a redirect, content type
`application/pdf`, ETag `"0x8DCD349F391FF1F"`, and the same immutable body SHA
above. The capture script now fails closed on DNS, HTTP identity, or body drift;
there is no pinned or cached fallback.

The sources support the lowercase headword, DWDS source part of speech,
greeting function, and exact Goethe learning occurrence. They do not support a
`neutral` register claim. No broader pragmatic or phrase authority is inferred.

## Authority boundary

- `canonicalAdmission=false`
- `inventoryResolutionApplied=false`
- `task7Unlock=false`
- `preauthoringAuthority=false`
- `learnerFacing=false`
- `releaseAuthorized=false`
- `consumerCutover=NONE`
- canonical sense identity is intentionally absent and forbidden
- inventory remains 6 resolved / 282 unresolved / 0 materialized
- no packet was created under the German packet root
- this repair run did not modify English or pre-existing German `_v1` surfaces;
  repair-start aggregates were externally recorded before the repair as
  English `1570 / 8f73cffb0d735b436aad2b7679dd242df0fb609962e43b27229bea2e30934db9`
  and German `_v1`
  `74 / 34d91df20aa6e52bbdf3106198effe3f42d381e55c477266b4877cdef312e2e6`

No independently persisted baseline from before the original packet was found
in Git, repository manifests/snapshots, or runner logs. This receipt therefore
withdraws the earlier wording that described the in-gate literals as an
independent pre-packet attestation. The repair-start baseline proves only the
bounded repair scope; it is not retroactively relabelled as original-packet
provenance.

The successor phrase-authority HOLD packet and the later correction candidate
add two legitimate `_v1` paths each; the subsequent V3 migration candidate adds
exactly four more. None changes the protected 74-file German-v1 baseline. The
gate uses normalized repo-relative POSIX paths and a closed exact-path set of 17
files: the predecessor module and its exact eight evidence files, the exact
phrase-authority pair, the exact correction-candidate pair, and the exact V3
module plus its manifest and two candidate JSON files.

The deterministic lineage is explicit and additive:

1. excluding only the original nine predecessor paths leaves 82 protected
   `_v1` paths;
2. additionally excluding the exact phrase-authority pair leaves
   `80`;
3. additionally excluding the exact correction-candidate pair leaves `78`;
4. additionally excluding the exact four V3-candidate paths restores the
   protected `74 / 34d91df2…2e6` baseline.

The two stage deltas must equal those exact pairs. Directory prefixes,
wildcards and rebaselining are not accepted. Extra descendants, `_v1`
lookalikes, `_de_v1_lookalike.ts`, an unknown future `_v1`, backslash, `./`,
`../`, case variants, and deletion, rename, or byte mutation of a real old
sentinel remain protected hostile cases and change the count or digest.
Platform-relative discovery converts backslashes only when the host path
separator itself is `\`; on POSIX, a literal backslash remains part of the
filename and therefore cannot alias an allowlisted `/` path.

## RED and deterministic gate

RED was observed with:

```powershell
node --import tsx tests/learning_v2_de_task7_v2_l01_c01_hallo_allocation_gate.ts
```

The first failure was `MODULE_NOT_FOUND` for the not-yet-created allocation
module. The gate then remained RED on the missing receipt until this bounded
receipt was added. GREEN requires the same command to exit 0 and emit the
`TASK7_V2_L01C01_HALLO_SOURCE_ALLOCATION_GATE PASS` line.

The predecessor-compatibility repair reproduced a later RED after the frozen
correction candidate was added: `78 !== 76` at
`task7_hallo_v1_pre_repair_count`. That failure proved the closed set knew only
the predecessor and phrase-authority pairs. The repair adds only the two exact
correction-candidate paths and preserves the original 74-file digest.

## Immutable artifact bindings

<!-- TASK7_HALLO_MANIFEST_SHA256: 674f789c05922ddce29103393228ee26f4c428255baf4fc646b90c95b97bfd33 -->
<!-- TASK7_HALLO_EXTRACTION_MAP_SHA256: 3b0ab0c32c3dd8bb42b2c22f0f43bc514272f23c60c97003334418f5afaaabad -->
<!-- TASK7_HALLO_MODULE_SHA256: 71e96a433e2906ffd86e05aa0ea42a09300c1d83a46ecae680bfa842a637e5aa -->
<!-- TASK7_HALLO_CAPTURE_SCRIPT_SHA256: 8cdb265ec9b634a358b46d812086eb243c073ea0db4f485589163bf6417756e2 -->
<!-- TASK7_HALLO_GATE_SHA256: d44acf3eea91c3d0f5a3444d2d19de1b6814508923ebc11d2b8e89bbbce9aca3 -->

These bindings attest bytes only. Fresh native/spec and adversarial reviews are
independent orchestration evidence and are not self-authenticated by this file.
No push, deployment, release, cutover, or canonical inventory mutation is
authorized by this receipt.
