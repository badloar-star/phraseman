# B4 independent method-advisor receipt

**Reviewer:** fresh `orbit-advisor`, read-only, task
`/root/de_b4_authority_advisor`.

`verdict=PASS_B4_METHOD_PRECONDITION_ONLY`

```text
method=COUNTERFACTUAL_EXACT_CURRENT_MINUS_CANDIDATE
historicalB1Replay=UNAVAILABLE_NOT_CLAIMED
supersedes=CLEAN_B1_REPLAY_MECHANISM_FOR_TASK6B4_ONLY
doesNotSupersede=B1_ACCEPTANCE,B2_SOURCE_FACTS,QUARANTINE_NON_AUTHORITY
candidateAcceptance=HOLD
rowsPromoted=0
task7Contacts=UNVERIFIED
learnerAuthoring=HOLD
releaseAuthority=HOLD
englishAuthority=EXCLUDED
```

## Adjudication basis

The advisor found that Stage 0 requires target-scoped fail-closed gates and
exact closure, but not a historical replay. The only owner-pending decisions
are DACH receptive inventory, an external B1 cross-check and the final
blueprint fingerprint; none selects a RED mechanism. B2 permits a later,
separately approved RED/GREEN task. The clean-B1 replay is a historical
repair mechanism in quarantine/B3, not a product decision. The owner's
current instruction delegates procedural ambiguities to the strong advisor;
it permits this equivalent fail-closed B4 method, but does not waive review,
acceptance or release gates.

## Frozen inputs reviewed

| Artifact | SHA-256 |
| --- | --- |
| Stage 0 packet | `82d29e357da2e5444aa377de33dd07f06fe12dbaa8f1e3c3de8285d297489ba5` |
| Owner decisions | `eff5412a13531052aa56c1e40f4058f35da405297b418ca8fcbb7b44bc19f615` |
| B1 receipt | `183d82f9f83d5d79ab7078767cb468004b54a6b7fac656022c0daab642bd9bd0` |
| B2 source receipt | `a87d60144ff8274e54f41a1a0cea76ec716d09dea4da75e94a922339f9a63746` |
| B2 quarantine | `e3f700d0d6a8553af4d1807f3188bc16f1c4f3d2f0b20c7a7a571e5768487acf` |
| B3 packet (audit history) | `ef5548642c83759464cb51754bb75a1288e4ecd3a191a080334fab4d9395c1c3` |
| B4 packet | `cdf079e2d7b9ab4c0701de8e5922f293ad40dfd1365a3e9179cf5f3c18eba328` |
| Candidate evidence | `10c80c5f418b9e3f804f243b5ec8e8f5f03243023f938187b1a45a4b56edf74c` |
| Candidate registry | `3290e4f77449963f3ae836f609c7ca4a988ae165a2a3dc2daef51f2d8ca83d29` |
| Real lexical gate | `3346867a3c40fecf6dcf11ef12c97f9de52a949a7db64870957ac08235c36f58` |

## Required downstream evidence

The B4 gate must fail RED only as
`aufzug_canonical_materialization_missing` when it removes only the frozen
candidate from in-memory current copies, and must GREEN only through the real
lexical gate. A fresh guardian and independent spec/adversarial reviews remain
mandatory. This receipt does not accept `Aufzug` or open Task 7, authoring,
mockup, English, promotion or release.
