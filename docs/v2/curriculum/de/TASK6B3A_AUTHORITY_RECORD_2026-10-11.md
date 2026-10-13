# Task 6B3A authority record: `Aufzug` acceptance

`PASS_B3A_METHOD_PRECONDITION_ONLY / CURRENT_ACCEPTANCE_HOLD`

Task 6B3A is the sole proposed acceptance route for the frozen `Aufzug`
candidate. It applies the independently validated
`COUNTERFACTUAL_EXACT_CURRENT_MINUS_CANDIDATE` method to the acceptance
decision because the historical clean-B1 replay is unavailable. It does not
claim historical replay or retroactive Task 6B3 acceptance.

It supersedes only B2 quarantine's unavailable clean-B1 replay mechanism for
this exact acceptance decision. It preserves B1 acceptance, B2 source facts,
the quarantine's non-authority boundaries and every frozen candidate byte.

```text
method=COUNTERFACTUAL_EXACT_CURRENT_MINUS_CANDIDATE
supersedes=CLEAN_B1_REPLAY_MECHANISM_FOR_TASK6B3A_ONLY
doesNotSupersede=B1_ACCEPTANCE,B2_SOURCE_FACTS,QUARANTINE_NON_AUTHORITY
historicalB1Replay=UNAVAILABLE_NOT_CLAIMED
b3Acceptance=NOT_ESTABLISHED
candidateAcceptance=HOLD
rowsPromoted=0
task7Contacts=UNVERIFIED
learnerAuthoring=HOLD
mockup=HOLD
audio=HOLD
runtime=HOLD
releaseAuthority=HOLD
englishAuthority=EXCLUDED
```

No acceptance exists until the acyclic B3A closure passes: a frozen
pre-acceptance manifest P, fresh independent reviews of P, a final acceptance
manifest F that binds P and both review hashes, and a deterministic final gate
that verifies F. Neither P nor the reviews may name or hash F; F does not
self-hash and is not post-edited after the final gate.

The closure also freezes a protected-surface baseline over the German Learning
V2 surface and the existing English Learning V2 bytes. It records a
deterministic Git index plus working-tree digest of tracked and untracked,
nonignored files, excluding only the exact B3A receipt allowlist. The final
gate recomputes it byte-for-byte. This makes pre-existing dirty English files
an observed baseline, not a reason to delete, clean, or attribute them to
B3A; drift after freeze fails closed. It proves non-interference only from
this freeze onward and does not claim unknowable historical attribution.

Review receipt hashes alone are not a claim of reviewer independence. Each
terminal receipt must bind P and the baseline, name a distinct fresh runtime
task and its prescribed reviewer role. The orchestration log is the second
provenance layer; absent that fresh distinct-task evidence, acceptance remains
HOLD.

Any eventual receipt may set only:

```text
b3Acceptance=NOT_ESTABLISHED
b3aAcceptance=ESTABLISHED
candidateAcceptance=ACCEPTED_UNDER_B4_CURRENT_STATE
rowsPromoted=0
task7Contacts=UNVERIFIED
learnerAuthoring=HOLD
mockup=HOLD
audio=HOLD
runtime=HOLD
releaseAuthority=HOLD
englishAuthority=EXCLUDED
```
