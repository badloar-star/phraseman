# German Learning V2 — L01 C01 `Hallo!` Task5/Task6 correction candidate

Status: **HOLD**  
Decision: `TASK5_TASK6_CORRECTION_CANDIDATE_READY_FOR_FRESH_REVIEW`

This packet is a closed, additive correction **candidate**. It does not modify
Task5 v2, Task6 v2, the Task7 inventory, any German v1 artifact, the English
course, or a learner packet. It grants no admission, authoring, release, or
consumer-cutover authority.

## Bound inputs

- Task5 v2 bytes:
  `18e2be42099785838fc7739ac0c13df2ad1283352881b15ea574fa03099a1b23`
- Task6 v2 bytes:
  `ba4ddc48ce99aeb97788ba767e2179c507c8740be24446cbf6b4f9abf591681f`
- Prior phrase-authority HOLD adjudication bytes:
  `45778ef06b4eddceaa3ede01e83e95225731b9786cbd39868650add6980259a5`
- Bound Goethe extraction bytes:
  `3b0ab0c32c3dd8bb42b2c22f0f43bc514272f23c60c97003334418f5afaaabad`

The source checker parses the bound occurrence `Guten Tag! / Hallo!` as
trimmed slash-separated alternatives and requires one exact `Hallo!` match.
That observation supports only an exact surface occurrence in the official
learning source. `DE-RSCH-CEFR-003` remains the base frame's general CEFR scope
evidence and is explicitly **not** treated as exact phrase attestation.

## Exact in-memory projection

Task5 changes only the `Hallo` plan ID, its colloquial semantic identity, its
utility facet, its sense gloss, and the checkpoint goal/context signature. All
other `de_l01_c01` fields remain byte-derived from the bound base.

Task6 changes only the L01 C01 phrase-frame/mapping ID, the frame to `Hallo!`,
and `lexicalSenseIds` to `[]`. Grammar, outcome, forbidden surfaces, and the
single existing evidence ID remain unchanged. `Nachbarin` is absent from the
projected phrase and remains a separate lexical plan/sense outside this
candidate.

Projected canonical SHA-256 values:

- chapter: `b59fafa8d475a0922ab0a7c636d0898c1ff4a70506d145c7075c5c39543293fa`
- plan: `707379a2e2e7c6f51e90d14fcf82f8d5542553a0b5ddc7626fb35c4cce179ff0`
- phrase frame: `6b1bb17c8951f36793fc1fa36c6cd76723ee3b322632cf31850f422b520a0ff1`
- phrase mapping: `713f2575bd59a0c7352dbd64b021fe1c42846e4d5b5de329026debd9f4da0735`

The candidate-core fingerprint is
`9f5330ca5c44593d80c8299ee78101032fe2376a804ad82fb7567857d1ecddab`.
Its declared scope is
`CLOSED_CANDIDATE_CORE_NOT_OWNER_BLUEPRINT_FINGERPRINT`; it is not owner
approval and not a replacement for the future Task5 v2 owner fingerprint.

## Deterministic result

TDD RED was observed before implementation as `MODULE_NOT_FOUND` for the new
validator. The final command:

```text
npx tsx tests/learning_v2_de_task7_v2_l01_c01_hallo_task5_task6_correction_candidate_gate.ts
```

returns:

```text
TASK7_V2_L01C01_HALLO_TASK5_TASK6_CORRECTION_CANDIDATE_GATE PASS status=HOLD exactSurface=Hallo! resolved=6 unresolved=282 packets=1792 materialized=0 canonicalAdmission=false task7Unlock=false preauthoring=false learner=false release=false cutover=NONE owner=PENDING native=REQUIRED
```

Scoped Prettier, ESLint, and TypeScript checks also return exit 0.

Affected regression results are recorded without converting failures into
PASS. The separately authorized predecessor-compatibility repair now models the
complete additive lineage: 9 predecessor exclusions leave 82 protected paths;
the phrase pair leaves 80; the correction pair leaves 78; and the exact V3
quartet restores the protected 74-file baseline. The correction validator uses
platform-aware repo-relative POSIX normalization, keeps a literal POSIX
backslash distinct, and requires the protected surface to remain `74` files
with SHA-256
`34d91df20aa6e52bbdf3106198effe3f42d381e55c477266b4877cdef312e2e6`.
No wildcard, prefix, directory, case-folded, lookalike, or future-v1 exclusion
is accepted.

Frozen artifact SHA-256 values before independent review:

- candidate JSON:
  `31eb560eb2efce736c7d96d643fdad46f8796b55aa222e8b6a3c5702f21ca79a`
- validator module:
  `ebdcc450e9ac07ab21ca51efacbdf1b74b053eaa8739a2bee7e91f4266cbe75c`
- hostile gate:
  `ba6d82ec429d345c2d2d1f18e9d36162d1f94743496e611749b3b748000585ac`

## Authority and next permitted action

Authority remains `canonicalAdmission=false`,
`inventoryResolutionApplied=false`, `task7Unlock=false`,
`preauthoringAuthority=false`, `learnerFacing=false`,
`releaseAuthorized=false`, and `consumerCutover=NONE`. Inventory remains
`6 resolved / 282 unresolved / 1792 packet IDs / 0 materialized`.

Owner approval is `PENDING`; native review is `REQUIRED`. The frozen bytes must
receive fresh independent native and specification review. Adversarial review
is permitted only if both pass. Only after that review sequence may a separate
versioned Task5/Task6 migration candidate be proposed. This packet itself may
not author or materialize `de_l01_s01`.
