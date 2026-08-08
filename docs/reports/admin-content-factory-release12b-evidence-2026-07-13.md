# Admin Content Factory — Release 12B evidence

Date: 2026-07-13  
Scope: deterministic prompt regression corpus and promotion gate  
Deployment: not performed

## Delivered

- Versioned offline corpus with 17 full fixtures: four golden-valid families (lesson, Quiz/Challenge, Flashcard, Arena) and 13 red-team/rejected cases from R3–R6 evidence.
- Hard-failure coverage: malformed schema, incomplete phrase, source-language calque, versioned grammar defect, word salad, weak hard item, ambiguous answer, answer/index mismatch, locale drift, CEFR drift, semantic duplicate, Arena runtime violation and invented grounding.
- Schema and Arena runtime cases reuse production validators; remaining linguistic checks are explicit versioned corpus rules and do not claim universal LLM-level grammar scoring.
- Manifest SHA-256 covers complete fixture contents. Report SHA-256 binds manifest hash, policy version/rule hash, per-case results and summary.
- Active prompt profile is centralized for all 17 stage kinds. Single-stage and bulk planning both resolve prompt/schema/QA versions through this registry.
- Adding a prompt definition does not activate it. The non-active `arena_questions:v5` candidate remains behind the production Arena validator while the active version stays `v4`.
- Promotion requires a consecutive version, an existing candidate definition, the exact candidate task/schema definition hash, the exact current manifest hash, an independently recomputed candidate-bound passing report and zero regressions.
- Candidate-bound reports also score schema compatibility, versioned prompt invariants and production-validator wiring. An intentionally weakened Arena task/schema fails the gate even though all 17 static fixture decisions remain unchanged.
- Dry-run runner writes only ignored `.codex-tmp/content-prompt-regression/manifest.json`, `report.json` and `arena-questions-v5-candidate-report.json`.

## Verification

- Focused Functions: 11 suites / 122 tests passed.
- Functions TypeScript build passed.
- Offline regression dry-run: 17 / 17 expected decisions, manifest `04ee152017d06205288d60e3fa8f4da6bcc3fc562e898e235391eb190d97642a`, baseline report `4d1a4922bf39827adf2edd65dd0853c98bc6a40e84f797812f79fbf85ec87e6d`.
- Candidate binding: `arena_questions` `v4` -> `v5`, definition `12679ac2c73e8a69af384647eb1c4fff44378076e908782d5f26b18a7d073b84`, candidate report `488c6e76556e7e406891c26bb25c83fa63caf72d76eabc3ae392b84ae0f3b097`.
- Admin source contracts: 3 suites / 19 tests passed.
- Admin Playwright smoke: 7 / 7 passed at 375, 768, 1024 and 1440 px.
- Focused `git diff --check` passed.

## Safety

- No project OpenAI API key, external model/provider call, Firestore write, deployment, publication, commit or push was used.
- Existing active prompt versions remain unchanged: lesson/Flashcard v3, Quiz/Challenge/Arena topic v2 and Arena questions v4.
- Existing plan fingerprint shape remains backward-compatible; current version values are unchanged.
