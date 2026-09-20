# Daily Phrase Quality Factory

This is the quality system for native Daily Phrase banks. It follows the proven Learning V2 discipline—independent reviewers, exact evidence, hash-bound receipts and fail-closed release—but it is intentionally **not** a lesson/session pipeline.

## Status flow

`CANDIDATE → GUARDED → REVIEWED → AUTO_PASS → READY_FOR_EXPLICIT_ACTIVATION`

Any missing, stale or non-PASS receipt returns the candidate to `HOLD`. `AUTO_PASS` never enables a target, uploads a pack, or changes `activationApproved`.

Before every new or edited batch, a fresh independent `prephrase-guardian` must also issue a row-by-row style brief under `STYLE_CONTRACT.md`. The author may not invent this brief or begin from a stale one. After writing, the exact changed ids run through the deterministic source-link and style gates and a different independent `judge_taste`; edits invalidate all three results.

## Required independent roles

1. `prephrase-guardian`: verifies the exact candidate bank, its source ledger, English baseline snapshot and previous accepted target bank before judges see rows.
2. `judge_truth`: validates source-backed lexical truth and usage.
3. `judge_reader`: reads RU/UK explanations once as an ordinary learner.
4. `judge_pedagogy`: checks literal → meaning → contextual example alignment.
5. `judge_distractors`: checks one-answer quest construction and diagnostic distractors.
6. `judge_locale`: checks RU/UK are independently native and semantically equivalent.
7. `judge_taste`: enforces the owner-approved narrative style in `STYLE_CONTRACT.md` through a blind comparison with exact English baseline cards.
8. `judge_bank_progression`: checks the full manifest for translation mapping, near duplicates and narrow/repetitive coverage.

The author cannot self-issue a receipt. The release gate computes every authority hash from the supplied canonical bank and artifact bytes; it calls only the orchestrator-owned trust root for the guardian, bank reviewer and every row judge. Until a signature-backed verifier is installed there, every candidate is `HOLD`. A `reviewerIdentity` string by itself is never proof of independence. Each row receipt carries the candidate-bank SHA-256, row SHA-256, source-evidence SHA-256, English-baseline SHA-256, prior-accepted-manifest SHA-256 and row id. The bank-progression receipt has `rowId: "__bank__"`. Required JSON fields and acceptance rules are enforced by `scripts/daily_phrase_quality_release_gate.mjs`.

`validate_target_daily_phrase_bank.mjs` returns only `STRUCTURAL_PASS`; it proves the shape, count and isolation fields of a closed candidate bank, never linguistic correctness or release readiness. Only the quality release gate may return `PASS`.

## Non-negotiable section rules

- English `IDIOMS` are an English-only reference and cannot be translated row-for-row to create another target bank.
- No target phrase, distractor or example may be taken from the English quest pool for ES/FR/DE.
- A source URL alone is not evidence: the truth judge cites the exact source line/definition and explains its relevance to the bank row.
- Every authored source-linked row must pass `scripts/daily_phrase_source_link_gate.mjs`. It checks the explicit row→ledger index mapping and exact source id, URL, HTTP status, definition quotation, usage marker and snapshot timestamp; learner-facing punctuation may differ only when the lexical word sequence remains identical.
- Spanish HOLD inventory is source-scaffolded only by `scripts/sync_spanish_daily_phrase_cvc_scaffold.mjs`: it preserves authored rows, maps each remaining row one-to-one to the frozen CVC ledger and keeps all learner text and activation closed. Scaffolding is evidence preparation, never authoring or approval.
- A plausible sounding explanation is not enough: reader, pedagogy and locale judges each independently verify it.
- The English baseline calibrates field shape, concise delivery and learning flow. It does not license copying English idioms, examples or culture.
- Every authoring or edit batch must pass both `scripts/daily_phrase_source_link_gate.mjs` and `scripts/daily_phrase_style_gate.mjs` on the exact changed row ids, then receive a fresh independent `judge_taste` PASS on those exact bytes. Any failure is `HOLD`.
- The mandatory narrative shape is fixed in `STYLE_CONTRACT.md`: 50–70 words, 4–7 paced sentences, human hook, target woven into the story, concrete situation and memorable closing in each locale. Learner questions are optional and capped at 60% of a batch per locale so the gate cannot manufacture a new template.
- Native target quizzes use `quiz_ru` and `quiz_uk`. The correct option is always derived from the matching `meaning_*`; each quiz authors one localized `correctFeedback` plus exactly two stable distractors with `id`, `text`, `misconceptionCode` and diagnostic `feedback`. `scripts/daily_phrase_quiz_content_gate.mjs` rejects duplicate/equivalent answers, copied meanings from the target or English pools, generic feedback and two distractors that diagnose the same error. A fresh independent `judge_distractors` must still review semantic plausibility; the machine gate cannot self-approve it.

## Prompt contracts

The author supplies only the exact row, its target/source locale, source evidence, candidate-bank hash and requested role. A judge receives no author self-score and returns strict JSON:

```json
{
  "judge": "judge_truth",
  "contractVersion": "daily-phrase-quality-v1",
  "candidateBankSha256": "64-character SHA-256",
  "rowId": "es-001",
  "rowSha256": "64-character SHA-256",
  "sourceEvidenceSha256": "64-character SHA-256",
  "englishBaselineSha256": "64-character SHA-256",
  "priorAcceptedManifestSha256": "64-character SHA-256",
  "verdict": "PASS | REVISE | BLOCK",
  "findings": [{"field":"meaning_ru","quote":"…","why":"…","fix":"…"}],
  "mustFix": [],
  "evidenceQuotes": ["exact supporting or inspected wording"],
  "reviewedAt": "ISO-8601 timestamp",
  "reviewerIndependence": true,
  "reviewerIdentity": "independent-reviewer-id"
}
```

Use the individual role prompts in this directory. A receipt with an unresolved finding is never converted to `PASS` by another role.
