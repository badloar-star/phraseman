# Gustav Multilingual Daily Phrases (ES, FR, DE)

## Objective

Prepare three independent study-target Daily Phrase contours for Spanish (`es`), French (`fr`), and German (`de`). Each contour must provide 176 native expressions, the same learner flow as English (daily selection, explanation, pronunciation/save, deterministic three-option quest and feedback), and must be structurally incapable of serving the English idiom bank when that target is selected. This specification prepares content and runtime; it does **not** activate any additional target in production.

## Source of truth inspected

- English content/runtime: `app/idioms_data.ts`, `app/idioms_lazy.ts`, `admin/daily_phrases_seed.json`, `app/daily_phrase_system.ts`, `app/daily_phrase_quest.ts`, `components/DailyPhraseCard.tsx`.
- Target identity/isolation: `app/study_target.ts`, `app/target_storage_keys.ts`, `app/daily_phrase_target_gate.ts`.
- French reference implementation: `app/french_target_remote_registration.ts`, `app/french_daily_phrase_remote_runtime.ts`, `app/french_content_source_gate.ts`, `tests/gustav_fr_daily_phrase_*`.
- Existing locale quality checks: `tests/daily_phrase_locale.test.ts`, `scripts/audit_phrase_plausibility.mjs`, `scripts/audit_spanish_phrases.mjs`.
- Reliable language references: Duden’s *Redewendungen* and dictionary guidance, Larousse dictionary expression records, and Real Academia Española dictionary records. These govern each row’s lexical evidence; no uncontrolled bulk translation is admissible.

## English blueprint facts

1. English has exactly 176 rows. A row contains a target expression, literal meaning, learner meaning, contextual usage, RU and UK copies, and immutable id/order.
2. The Daily Phrase quest offers one correct meaning and two deterministic, non-duplicate distractors. Correctness is row-id based; its learning reward is idempotent per row/date.
3. English may use local `IDIOMS` only on the English target. The generic Firestore collection is also English-shaped and must not become a cross-target fallback.
4. The French server-pack architecture already establishes the required isolation pattern: target + source-locale scoped manifest, hash check, remote payload adapter, scoped cache keys, closed activation, rollback artifact and admin workflow.

## Current contour audit

| Target | Native 176-row bank | Target runtime | Target-scoped storage | English fallback blocked | Result |
| --- | --- | --- | --- | --- | --- |
| en | Yes | Yes | Legacy English | n/a | Reference |
| fr | Yes, server-pack artifacts | Yes | Yes | Yes in FR adapter | Prepared, activation closed |
| es | No (existing ES fields are UI translations for English rows) | No | No | No | BLOCK |
| de | No | No | No | No | BLOCK |

`StudyTarget` currently permits only `en | fr`, and unknown values are coerced to `en`; this is the direct cause of ES/DE English leakage.

## Requirements

### R1 — target model and isolation

- Extend the internal target model to recognise `es` and `de`, without adding either to `STUDY_TARGETS` production selection.
- Make all Daily Phrase storage, cache, achievement, and remote-pack keys target-scoped for `fr`, `es`, and `de`; preserve English legacy keys unchanged.
- `getTodayPhraseForTarget` and its synchronous counterpart must dispatch only to their own target adapter. Unknown/unsupported targets must return `null`, not English content.
- The generic English cloud read remains callable only from the English branch.

### R2 — native content packs

- Create one reviewed source package per target/source combination: `es/ru`, `es/uk`, `de/ru`, `de/uk`. Every package has exactly 176 active-ready (but activation-closed) native expression rows.
- Each row must contain `id`, `order`, `studyTarget`, `sourceLocale`, `surface`, `targetText`, `literal_ru`, `meaning_ru`, `text_ru`, `literal_uk`, `meaning_uk`, `text_uk`, `allowSave`, `active`, `activationApproved`, source evidence and content-review evidence.
- The target text must be native Spanish/German/French. Do not translate English idioms row-for-row. A direct translation is permitted only when it is itself an established expression in the target language and has its own source evidence.
- The learner copy must retain the English card’s compact pattern: literal reading, plain meaning, then a short natural example that contains the target expression. The quality budget is enforced as a measured distribution against the English reference, not an uncontrolled exact character count.

### R3 — quest parity and distractors

- Provide the native bank as the quest pool so correct answers and distractors all refer to the selected target.
- Retain exactly three options when the bank contains at least three eligible meanings; selections are stable for target + row + date and do not duplicate the correct meaning.
- Do not use an English idiom as an ES/FR/DE distractor or expose English wording in the target-learning card.

### R4 — quality gates and reviewer evidence

- Add a deterministic multilingual bank validator and a reviewer-decision artifact gate. A bank is rejected if count, source/target, field completeness, per-row source evidence, hash, duplicate target text/meaning, target-script/language heuristics, or no-English-leak rules fail.
- Add a two-layer style-parity gate fixed by `content/daily-phrases/quality/STYLE_CONTRACT.md`. The deterministic layer requires 50–70 words, 4–7 paced sentences, a heart-led human hook, exact target integration, varied narrative punctuation, a non-trivial closing and non-repeated batch openings in both RU and UK; it rejects missing text, the dry “definition → так говорят/так кажуть → например/наприклад” formula, explanations that omit the target and batches where learner questions exceed 60% per locale. A vivid scene may pass without direct address. A fresh independent taste judge then compares vividness, narrative rhythm and memorability with exact English baseline cards. Either layer returning HOLD blocks authoring/release.
- Add a fail-closed source-link gate before style review. `scripts/daily_phrase_source_link_gate.mjs` requires every authored row to point to one explicit authoritative-ledger index and match its source id, URL, HTTP status, exact definition quote, usage marker and snapshot timestamp. It permits punctuation normalization only when the phrase's lexical sequence is unchanged; mismatched or unlinked HOLD placeholders cannot enter authoring.
- Replace target-language random-pool distractors with authored per-locale diagnostic quizzes. `quiz_ru`/`quiz_uk` derive the correct option from `meaning_ru`/`meaning_uk` and carry localized correct feedback plus exactly two distractors (`id`, `text`, `misconceptionCode`, `feedback`). `scripts/daily_phrase_quiz_content_gate.mjs` must pass before `judge_distractors`; ES/FR/DE runtime returns no quest when this contract is absent or invalid and may never fall through to English `IDIOMS`.
- Add a deterministic semantic reviewer input/output contract per target. Review evidence must record row id, target, status, issue code, and accepted/rejected decision; a row may enter a runtime dry-run only when accepted.
- Use trusted-source URLs per accepted row. The quality agent does not fabricate evidence; absent evidence keeps the row on HOLD.

### R5 — delivery and administration

- Generalise the existing French hash-verified server-pack registration/adapter architecture for ES and DE instead of bundling large production banks in the app.
- Create dry-run manifests, publication/rollback drafts and single-live-admin workflow modules only. Do not upload, apply, set `activationApproved=true`, or expose targets in production.
- Preserve the live-admin boundary: only `admin/v2/legacy.html` and its directly loaded scripts may be changed.

## Edge cases

- A selected ES/DE/FR target with no accepted pack, unavailable network, invalid manifest, failed hash, mixed source locale, or insufficient valid quest pool returns no Daily Phrase and a target-specific unavailable state. It never returns English.
- RU and UK records are distinct; a RU source pack cannot become a UK explanation by fallback.
- Target text can include diacritics, apostrophes, hyphens and German `ß`; duplicate normalization must case-fold and normalize Unicode without stripping meaningful letters.
- French’s current flashcard bridge stays only as an explicitly labelled rollback baseline. ES/DE have no English bridge.

## Definition of done

This work is complete only when all three target packs have 176 reviewed, source-backed native rows for RU and UK; target-aware runtime dispatch and storage isolation prove no English fallback; quest parity tests pass; quality/style/reviewer gates pass; delivery is dry-run only; and production activation remains closed. A failing source, reviewer, or isolation gate is a HOLD, never a bypass.

## Explicit production HOLD

`STUDY_TARGETS` remains English-only and no pack is uploaded or enabled. Target selection activation is a later owner-controlled release decision after the entire course, not merely Daily Phrase, is ready.

## Daily Phrase quality factory — V2-derived, section-specific

The existing field validator is necessary but not a semantic/content gate. Before any ES/FR/DE row can enter a candidate bank, the Daily Phrase factory requires a **fresh, independent** `prephrase-guardian` receipt. It binds the exact candidate-bank SHA-256, English baseline manifest SHA-256, source-evidence ledger SHA-256 and all earlier accepted rows for that target/source. A changed input invalidates the receipt.

Six narrow row judges produce individual JSON receipts for every candidate row. A separate bank-level progression judge checks the full 176-row manifest; a deterministic release gate is not a judge and only accepts their current evidence:

| Role | It proves | It must block |
| --- | --- | --- |
| `judge_truth` | target expression, meaning, literal reading, register and usage are supported by a row-linked trusted source | invented meaning, false etymology, invented cross-language contrast, unsupported frequency/register claim |
| `judge_reader` | a tired beginner understands each RU and UK explanation once and knows what the expression means and when to say it | vague or circular meaning, unexplained linguistic term, ambiguity, prose that requires rereading |
| `judge_pedagogy` | literal → plain meaning → contextual example is coherent; the example naturally uses the exact target and teaches its intended function | target omitted/redefined in example, misleading literal reading, example that makes another meaning look correct |
| `judge_distractors` | the quest has one exact correct answer and two native, plausible, meaning-level diagnostic distractors; feedback distinguishes the chosen trap | duplicate/equivalent choices, silly unrelated options, more than one accepted meaning, English-pool distractor |
| `judge_locale` | RU and UK are independently native, preserve the target sense and do not leak/collapse into each other or into UI localisation | machine translation artifacts, Russian copied into UK, target-language/English leak, locale meaning drift |
| `judge_taste` | RU and UK reproduce the English cards' mini-story mechanics: human hook, relevant image, naturally woven target, concrete situation, direct learner contact and memorable final turn | dictionary exposition, repeated “так говорят → например” shell, flat or synthetic prose, copied opening, forced humour, invented origin, style materially drier than English baseline |
| `judge_bank_progression` | the complete manifest has no duplicate/near-duplicate targets or meanings, no English translation map, and useful register/topic distribution | near duplicates, translated English sequence, repetitive bank or missing coverage |

Each row receipt has `contractVersion`, `judge`, `candidateBankSha256`, `rowId`, `rowSha256`, `sourceEvidenceSha256`, `englishBaselineSha256`, `priorAcceptedManifestSha256`, `verdict`, `findings`, `mustFix`, `evidenceQuotes`, `reviewedAt`, `reviewerIndependence` and `reviewerIdentity`. The bank-level receipt has `rowId: "__bank__"` and carries the same authority hashes. The release gate calculates those hashes itself from canonical artifact bytes, requires exactly 176 structurally closed rows, and calls only its imported orchestrator-owned trust root for every guardian and judge. Until a signature-backed verifier is installed, every candidate is `HOLD`; caller-provided code or identity strings never override that rule.

After every author or editor change, the deterministic style gate runs on the exact changed ids, hashes are recomputed and every affected row returns to `CANDIDATE`; its guardian and all six row judges rerun on the changed bytes. Old receipts are evidence only of the old row and never make a changed row ready.

The release gate is deterministic: it validates the English baseline manifest, all source records, all seven receipt classes, exact 176-row coverage, per-row hash linkage, absence of duplicate/near-duplicate target or answer text, and closed activation. It writes a compact audit receipt; it never edits content, uploads a pack or grants activation.

## Build handoff

Build from this specification in the following order: target isolation tests and runtime dispatch, generic pack contracts, ES/DE native-bank intake plus validator/reviewer evidence, quest-pool wiring, dry-run delivery/admin workflows, then independent audits.
