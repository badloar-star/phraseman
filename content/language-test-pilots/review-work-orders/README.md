# Qualified external review handoff

These files are unreviewed work orders for the four isolated candidate banks. They do not grant release approval and must not be copied into runtime data.

## Reviewer requirements

Use a qualified reviewer for the assessed language who can judge CEFR placement items and is independent of the authoring pass. The reviewer must inspect every stimulus, option, stored answer, explanation, RU/EN review text, construct, CEFR rationale, and ambiguity note against the exact `contentHash`.

For each language file:

1. Fill all reviewer fields: a stable reviewer reference, an external identity-evidence ID, qualification text, a qualification-evidence ID, `independentFromAuthoring: true`, an ISO review timestamp, and explicit attestation.
2. Review the embedded `question` snapshot, then change each decision from `unreviewed` to either `approved` or `changes_required`.
3. Add a unique, traceable `reviewEvidenceId` and concrete notes to every decision. For `changes_required`, describe the defect and proposed correction precisely.
4. Do not edit `questionId`, `level`, `contentHash`, or the embedded `question`. A changed candidate item requires a newly generated work order.
5. Return the completed JSON without renaming the language code.

Validate a completed file with:

```text
node scripts/language_test_external_review.mjs --validate es --input content/language-test-pilots/review-work-orders/es.external-review.json
```

Replace `es` with `de`, `it`, or `fr`. A valid release review must report exactly:

```text
releaseReady=true approved=240/240 blockers=0
```

Any missing reviewer evidence, missing or duplicate decision, missing or duplicate per-item evidence ID, stale content hash, edited snapshot, blank note, or non-approved item blocks release. Corrections must be applied to candidate source data first, rebuilt, regenerated into a fresh work order, and reviewed again.
