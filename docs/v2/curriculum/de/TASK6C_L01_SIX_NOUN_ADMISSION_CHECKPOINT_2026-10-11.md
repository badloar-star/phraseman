# German Learning V2 — L01 six-noun admission checkpoint

## Scope

This checkpoint precedes the bounded Task 6C admission candidate for exactly
six L01 nouns: `Nachbarin`, `Aufzug`, `Briefkasten`, `Büro`, `Garten`, and
`Hausmeister`. It is not a Task 7 unlock, a packet, a phrase claim, or a
release decision.

## Frozen upstream anchors

| Artifact | SHA-256 | Role |
| --- | --- | --- |
| `.tmp/de-task6c-l01-direct-capture/registry.json` | `5dc2a6e3c497f19d5e291daf04d4af1f944ae42b502d24d0f92a7d7adaf208cc` | historical direct-capture receipt only |
| `.tmp/de-task6c-l01-source-anchor-amendment/registry.json` | `2e4e5d7d64594ed75a7ec7fff9afd835c58b17cd795e8ca4f5ec660ff1684a3c` | historical corrected-anchor receipt only |
| `.tmp/de-task6c-l01-morph-semantic-facts/registry.json` | `31029f1e7bc35cdcf1e3e5d11c1000b528fa03900dd0d228aa8c13345c37f99a` | fact-layer receipt only |
| `.tmp/de-task6a-exact-transport/task6a3-l01/lexical_item_evidence_de_v1.candidate.json` | `925fd41b11cd43fd30f18c94327353519481025a036a62c30139dbe5914a8837` | historical source-catalog anchor only |
| `modules/learning-v2/curriculum/de/chapter_blueprints_de_v1.json` | `494abd91c59c88ed652b3b4cdaaeaa118bc53ef64beb57ff54f735433612eb29` | immutable Task 5 semantic/chronology authority |
| `modules/learning-v2/curriculum/de/registries/lexical_senses_de_v1.json` | `3290e4f77449963f3ae836f609c7ca4a988ae165a2a3dc2daef51f2d8ca83d29` | existing two-row canonical registry; not changed by this candidate |

## Durable-evidence strategy

The candidate must create a versioned, non-`.tmp` bundle containing exact
raw response bytes for the six claims and a closed manifest containing each
byte hash, source anchor, sense span hash, morphology span hash, and Task 5
binding. The candidate loader must use that bundle as its evidence source;
the `.tmp` artifacts above are reconciliation anchors, never runtime
dependencies.

## Immutable limits

`rowsPromoted` remains `0`; Task 7 remains `HOLD`; no phrase, learner-facing
RU/UK text, contact allocation, mockup, audio, runtime, release, English
file, Task 5 file, B3A artifact, or historical fact/capture artifact may be
modified by this work.
