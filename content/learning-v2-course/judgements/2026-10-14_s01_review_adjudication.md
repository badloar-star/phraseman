# S01 candidate review adjudication — 2026-10-14

## Scope and authority

- Candidate: `outputs/s01-feedback-naturalness-fixed-20261014`
- Content inventory: `362658ddc6a17ae37cde5d4bf3529a5f5f0cf400480c9c2efb6aa581d85eee17`
- Review bundle: `0548773ad10f1aa6be9416311070227ca1a536891c37c6a264185b2f1c8fecd9`
- Seven raw role outputs are stored unchanged beside this file. This adjudication does not rewrite their verdicts or certify a formal runner ledger.
- Candidate and preview remain non-canonical; no release authority is granted.

## Evidence-based dispositions

1. Reader findings for i01/i03/i05/i07 (“Новое слово” / “Нове слово” is not an instruction to choose a meaning): not a confirmed defect in the rendered candidate. `app.js` branches on `modePayload.isWordCard` and `renderCard` visibly renders the target word, its audio control, localized definition, and an “understood/continue” action. These entries are vocabulary presentation cards, not multiple-choice questions. A prompt-only review incorrectly treated them as ordinary choice items.
2. Learner findings that i08 and i17:s01 lack visible pairs: not a confirmed defect. `modePayload.pairGrid` contains the pairs and `renderPairs` renders both localized columns as interactive buttons. The review assessed prompt text without the rendered control data.
3. Pedagogy findings about detailed correct-choice feedback in i01/i03/i05/i07: not learner-visible in the verified runtime branch. `resolveLearningV2ModeFeedbackV1` returns a locale-specific short verdict for `outcome === "correct"` before reading authored choice feedback; the static candidate likewise advances directly after a correct choice. Detailed records remain internal evaluator data.
4. Audio findings for i12/i13/i16 are not substantiated by the manifest check: their exact transcripts have four existing voice assets each in `assets/audio/learning-v2/factory-production-v1/manifest.json`, and all corresponding files exist.
5. Confirmed blocker: i17:s03 requires the exact dictation transcript `I am fine.`. The same production manifest has zero entries for that exact transcript. It contains other utterances that include those words, but those are not an exact clip and cannot substitute. Do not claim audio readiness or release readiness.

## Current decision

S01 remains HOLD. Four declared role reports passed and three declared HOLD, but the reports are not a formal `packet-gate` pass: no immutable runner ledger was supplied for these seven runs. The exact audio blocker above is independently reproducible; canonical sync is still pending. No source repair, receipt mutation, checkpoint refresh, or publication is authorized by this adjudication.

## Checkpoint integrity

The existing `sessions/en/l01/s01/factory.checkpoint.json` is a 2026-10-13 checkpoint pinned to predecessor inputs and package digests. Verification reports changed source hashes and changed package hashes. Preserve it as historical evidence; do not refresh it or use it to authorize authoring. The 2026-10-14 candidate has its own content and review-bundle receipts, which do not override the checkpoint mismatch or grant release authority.
