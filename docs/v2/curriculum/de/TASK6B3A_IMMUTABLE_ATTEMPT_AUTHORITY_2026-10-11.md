# B3A immutable acceptance-attempt authority

`ATTEMPT_NAMESPACE_ONLY / ACCEPTANCE_HOLD`

The target-scoped amendment
`TASK6B3A_TARGET_SCOPED_AUTHORITY_AMENDMENT_2026-10-11.md` supersedes this
record only with respect to English snapshot treatment. B3A attempts are
German-target-only; English is rejected from attempt inputs and untouched.

The mutable singleton B3A evidence files are preserved as superseded audit
history. Their protected surface continued to drift during the required
P → reviews → F chain, so they cannot establish acceptance.

The next attempt must use a unique immutable attempt ID and create-only files:
snapshot, guardian, P, distinct spec and adversarial receipts, and F. There is
no separate mutable baseline artifact in the attempt authority: `snapshot.json`
is the sole per-attempt byte baseline, and it is SHA-256-bound by guardian, P,
both reviews and F. The historical singleton protected-surface baseline is not
an immutable-authority input and cannot be substituted for an attempt snapshot.
It must capture per-path content hashes plus Git-index metadata before review.
The gate must bind that attempt ID, P hash, candidate tuple and snapshot root;
it must never read or overwrite the mutable singleton baseline.

The three candidate hashes, B4 conditions, and terminal constraints remain
unchanged: B3 is not established; rows remain zero; Task 7, learner authoring,
mockup, audio, runtime and release remain HOLD; English remains EXCLUDED.
No production action, API-key use, deletion, reset, staging or English edit is
authorized by this record.
