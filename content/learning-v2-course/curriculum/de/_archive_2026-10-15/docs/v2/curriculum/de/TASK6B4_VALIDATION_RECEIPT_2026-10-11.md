# Task 6B4 validation receipt: `Aufzug`

`VALIDATION_PASS / CANDIDATE_ACCEPTANCE_HOLD`

## Bound final closure

| Artifact | SHA-256 |
| --- | --- |
| B4 gate | `a06b939b8965eb113af0779781a9cd630af1edf0b64b011fc9ea9c31e81fc771` |
| B4 packet | `cdf079e2d7b9ab4c0701de8e5922f293ad40dfd1365a3e9179cf5f3c18eba328` |
| B4 authority | `5859467b20dff7b3b915997b8f300c8aea700cb3d94c1a070c9821a814441508` |
| Final method advisor R4 | `48c08d2d83962ea6f9110f34005c078423221df53d2c127937384b049704b206` |
| Fresh B4 guardian | `906776679332d683ef3488dbdb3876a2758baad9decf176e198c25739ba7a3e1` |

## Execution and independent review

- RED command `node --import tsx tests/learning_v2_de_aufzug_current_state_admission_gate.ts --probe absent-aufzug` exited `1` only with
  `aufzug_canonical_materialization_missing`, including under
  `NODE_OPTIONS=--unhandled-rejections=warn`.
- GREEN command `node --import tsx tests/learning_v2_de_aufzug_current_state_admission_gate.ts` exited `0` with
  `TASK6B4_CURRENT_STATE_CANDIDATE_VALIDATED canonicalRows=2
  verifiedLexicalItemEvidenceRows=2 rowsPromoted=0
  task7Contacts=UNVERIFIED status=HOLD`.
- Fresh specification review R5: PASS, `P0=0 P1=0 P2=0`.
- Fresh adversarial review R6: PASS, actionable `P0=0 P1=0 P2=0`.

## Exact scope result

This accepts only the B4 validation mechanism
`COUNTERFACTUAL_EXACT_CURRENT_MINUS_CANDIDATE`. It does **not** accept the
candidate, establish B3 acceptance, promote any row, open Task 7, author
learner-facing RU+UK content, rebuild a mockup, generate audio, release, or
modify English. The continuing state is:

```text
historicalB1Replay=UNAVAILABLE_NOT_CLAIMED
b3Acceptance=NOT_ESTABLISHED
candidateAcceptance=HOLD
rowsPromoted=0
task7Contacts=UNVERIFIED
learnerAuthoring=HOLD
mockup=HOLD
releaseAuthority=HOLD
englishAuthority=EXCLUDED
```
