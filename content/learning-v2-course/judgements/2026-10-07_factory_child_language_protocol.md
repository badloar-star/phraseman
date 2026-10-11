# Factory protocol for a child language contour

Use this protocol for a new language contour only after the current English source
packet is frozen. It is a reproducible handoff, not permission to copy English
text or reuse English receipts.

## Required inputs

- Current factory Constitution and `pipeline/prompts/author.md`.
- The target language's curriculum, language-specific phonetic rules, and chapter
  blueprint.
- The accepted English operation contract, exact session packet, and atomic
  schema—not English learner prose as a translation template.
- The current pipeline contracts: `build_release.mjs`,
  `prejudge_choreography.mjs`, `session_readiness.mjs`, and the native manifest
  builder.
- A per-session source trio: `final.<locale>.md`, the canonical master source,
  and `practice.atomic.json`.

## Mandatory order per session

1. **Guardian first.** Validate prerequisites, target operation, vocabulary
   novelty/returns, sound contrasts, visible conditions, and assessment intent.
   Save its hash-bound preauthoring receipt before authoring.
2. **One source writer.** The writer owns the session's source trio and no other
   writer edits those files concurrently. It preserves stable interaction and
   response IDs, option order, and canonical English internals while supplying
   target-language learner meanings and feedback.
3. **Local structural gates.** Run pre-judge choreography, facts for every
   learner locale, and single-answer checks with the deterministic mock backend.
   Repair actual HOLDs in source; do not weaken a gate to accept a bad session.
4. **Fresh independent review.** Run learner, reader, pedagogy, taste/nonsense,
   locale, and any required native/phonetic reviewer against the current visible
   projection. Every receipt names the exact source SHA-256 values it reviewed.
   Old receipts do not transfer after source changes.
5. **Scoped release proof.** Build canonical RU/target-locale release projections,
   validate answers/feedback/option IDs and hashes, then run the native manifest
   builder and its check. A release failure blocks publication.
6. **Mockup proof.** Rebuild the mockup only from the successful canonical
   release, verify the session and both locale projections are present, then
   reload the open preview. Do not claim a browser reload or visual review that
   was not actually observed.

## Artifact storage

- Source: `content/learning-v2-course/sessions/<lang>/lNN/sNN/`.
- Hash-bound guardian and reviewer receipts: the session's `preauthoring.json`
  and the appropriate `content/learning-v2-course/judgements/` report.
- Generated release/native outputs: their existing canonical release and native
  manifest paths; never hand-edit generated learner JSON to conceal a source
  defect.
- Cross-session audit inventories and proof reports: dated files under
  `content/learning-v2-course/judgements/` or the assigned audit output folder,
  with the source hashes and command results recorded.

## Non-negotiable prohibitions

- No project OpenAI API keys, API spending, deployment, push, or publication.
- No parallel source writers for one session/contour.
- No copying a receipt, release, or learner projection after source bytes change.
- No broad migration to silence a first HOLD; prove the contract and repair the
  exact source or gate with a regression.
- No generating a later session before the current audit/release boundary is
  closed.
- No replacing a teaching objective merely to satisfy a heuristic gate. Fix the
  gate narrowly when a new explicit condition supports an independent assessment.
