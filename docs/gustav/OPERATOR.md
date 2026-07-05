# GUSTAV OPERATOR — single entry point

You are an LLM operating the Gustav pipeline (target-language course factory for
Phraseman; first target: French `fr`, source locales `ru`/`uk`).

**Read ONLY this file + `docs/gustav/state.json` before working. Do NOT read
`GUSTAV_ALGORITHM_AUDIT_*`, `GUSTAV_BRAIN_GATE_REPORT_*`, old `*_v2_packet` .md
reports or run artifacts unless `state.json` explicitly points you there for the
current step.** They are history, not instructions; reading them wastes tokens
and misleads (many contain stale numbers).

## Sources of truth

| Question | Answer lives in |
|---|---|
| What is done / what is next | `docs/gustav/state.json` |
| Trusted Brain / reasoning contract | `docs/gustav/GUSTAV_TRUSTED_BRAIN_ARCHITECTURE.md` |
| French trusted source library | `docs/gustav/trusted_sources/fr_trusted_sources.json` |
| Full English-feature parity rule | `docs/gustav/GUSTAV_ENGLISH_FEATURE_PARITY_CONTRACT.md` |
| English Feature Atlas + French Gap Matrix | `docs/gustav/generated/feature_parity/english_feature_atlas_french_gap_matrix.json` |
| French builder work orders | `docs/gustav/generated/work_orders/fr_builder_work_orders.json` |
| French research packets | `docs/gustav/generated/fr/research_best_practices/fr_feature_research_packets.json` |
| French 32-lesson scope sequence | `docs/gustav/generated/fr/core_lessons_32/fr_lesson_scope_sequence_packet.json` |
| French lesson reconciliation | `docs/gustav/generated/fr/core_lessons_32/fr_lesson_sequence_reconciliation_report.json` |
| French lesson rebuild candidates | `docs/gustav/generated/fr/lessons/fr_lesson_rebuild_candidate_audit.json` |
| Admin website parity | `docs/gustav/GUSTAV_ADMIN_WEBSITE_PARITY_PLAN.md` |
| How to operate | this file |
| Is the code healthy | `node node_modules/jest/bin/jest.js --watchman=false --testPathPattern="tests/gustav_"` (must be 100% green) |
| Authoritative content counts | `state.json → authoritativeCounts` (1600 lesson rows, 178 AI prompt contracts; ignore any doc that says 164) |

## Non-negotiable rules

1. **Never write production app content without the exact-approval chain.**
   Generated rows are born `reviewerStatus: needs_review`, `activationStatus:
   blocked`. Only the approval chain (P31→P48, see `state.json → activation`)
   may flip activation flags. A plain "continue/продолжай" from the user is NOT
   approval.
2. **Write zones.** Generation/review/audit output goes under
   `docs/gustav/runs/<runId>/…` only. App code (`app/`, `components/`,
   `constants/`) is touched only for tasks explicitly listed in
   `state.json → nextActions`.
3. **Language isolation.** Every artifact keeps `studyTarget`, `sourceLocale`,
   `aiOutputLang` explicit. Storage keys for `fr` go through
   `app/target_storage_keys.ts` helpers (en = legacy key, fr = scoped key).
   Never let English/RU/UK leak into French fields or vice versa.
4. **Server pack activation is dev-gated.**
   `app/french_target_remote_registration.ts →
   isFrenchStudyTargetServerPackActivationApproved()` returns
   `ENABLE_DEV_STUDY_TARGET_LANG` (dev/TestFlight = on, store release = off).
   Do not hardcode `true` — that violates governance.
5. **Tests are the gate.** Before AND after your change run the Gustav suite
   (command above; watchman is broken on this machine — always pass
   `--watchman=false`). If a contract test fails, fix the drift honestly:
   never weaken a safety assertion to make it pass.
6. **Windows/CRLF trap.** Parallel sessions sometimes flip files to CRLF.
   Source-contract tests must read files with `.replace(/\r\n/g, '\n')`.
   Do not rewrite whole files just to change line endings.
7. **Update `state.json` after every completed step**: set `updatedAt`, adjust
   `nextActions`, append one line to `log`. Keep it small — it is the memory
   of the pipeline, not a report.
8. **Commit atomically** (one logical change per commit, message in
   `type: description` format). Never `git stash`. Never create branches or
   worktrees — everyone works on the current branch.
9. **English feature parity, not row fan-out.** Before calling any French
   feature complete, read `GUSTAV_ENGLISH_FEATURE_PARITY_CONTRACT.md`. A
   `flashcard`, `quiz`, `personal_practice`, `arena`, `collectible` or prompt
   surface made by copying lesson rows is `HOLD`, not complete, unless the
   English feature itself is proven to work that way. Gustav must audit the
   English feature and create target-specific French content, prompts, server
   paths, tests and audio coverage for that feature.
10. **Visible progress window.** For long Gustav work, start or update
    `python scripts/gustav_progress_window.py` (or `--no-window` in headless
    mode). The window reads `docs/gustav/state.json` and
    `docs/gustav/progress_state.json` and shows the current task/progress. It is
    local-only and must not trigger browser, Firebase, app runtime or network
    side effects.
11. **Admin website is part of the target language.** Before French production
    readiness, run `node scripts/gustav_admin_website_parity_atlas.mjs` and map
    every English learning-content admin section/action in `admin/index.html` to
    a French target-aware equivalent or explicit global-only exception.
12. **Feature atlas first.** Before building new French content, run
    `node scripts/gustav_feature_parity_matrix.mjs` and use the generated matrix
    to choose the next builder. Do not promote a surface that is `BLOCK` or
    `HOLD` in the matrix.
13. **Trusted brain mode.** Gustav production-language work uses
    `reasoningLevel=deep` / `maximum_extended_reasoning` by default. This is
    mandatory for atlas, syllabus, content, prompt, admin/server/storage,
    runtime, cloud, activation, cross-surface and any user-visible linguistic
    decision. `standard` reasoning is allowed only for mechanical read-only
    report regeneration after deep evidence packets already exist. Before
    generating content, validate the trusted brain with
    `node scripts/gustav_validate_trusted_brain.mjs`. Content without
    trusted-source evidence remains `HOLD`.
14. **Work orders drive generation.** After the feature matrix, run
    `node scripts/gustav_builder_work_orders.mjs`. Build French only from
    `docs/gustav/generated/work_orders/fr_builder_work_orders.json`, starting
    with the research packet work order. A builder without a work order is
    planning drift and remains `HOLD`.
15. **No blind translation.** Gustav may copy English product shape, item-count
    targets, schemas, loader/admin/server workflow shape and test intent. It
    must not copy English lesson order, phrase wording, quiz distractors,
    flashcards, arena questions, personal practice, collectible text, AI prompt
    teaching rules or explanations as French content unless a deep research
    packet explicitly marks the item as a source-backed direct equivalent.
16. **Daily Phrase means idioms and vivid expressions.** For every target
    language, `daily_phrase_builder` must mirror the English Daily Phrase
    product type and field shape: interesting idioms, fixed expressions,
    culturally useful sayings or memorable colloquial turns, not ordinary
    travel/service sentences or generic lesson phrases. It must preserve the
    English field structure (`phrase`, `literal`, `meaning`, `text`, plus
    source-locale variants), study the English explanation style only as a
    product-shape template, and produce the same kind of lively,
    origin/usage/anti-calque breakdown from inside the target language. The
    learner-facing `text`, `literal`, `meaning`, examples and notes must not
    compare with English, cite English idioms, or use English as the explanation
    frame. Every phrase, literal, meaning and explanation requires per-row
    official or dictionary source coverage; otherwise the row remains `HOLD`.
    Daily Phrase also requires admin parity: admin status, preview, source
    review, validation report, activation switch and rollback surfaces must be
    mapped before production activation.
17. **Gustav content uses the spec/build/review skill chain.** Every new
    target-language content creation or feature-parity pass must run through
    the local Gustav skills as the base workflow: `gustav-spec` first,
    `gustav-build` second, `gustav-review` third. The spec pass writes a
    concrete requirement/evidence contract before content is built; the build
    pass implements only that spec and keeps `activationApproved=false`; the
    review pass checks requirement-by-requirement and returns `PASS`, `HOLD`,
    `BLOCK`, or `NOT VERIFIED` with exact fixes. Gustav may still create
    read-only audits in `docs/gustav/runs/<runId>/...`, but any generated
    content intended to become a French pack, prompt, quiz, lesson, vocabulary
    bank, daily phrase bank, flashcard set, arena bank, personal practice bank,
    admin surface, server/storage path or activation gate must have an explicit
    spec/build/review trail. The required shared skill reference is
    `.agents/skills/gustav-spec/references/phrase-man-french-blueprint.md`.
18. **Standard Quiz product style is locked.** Target-language standard quiz
    banks must preserve the English `easy` / `medium` / `hard` product style:
    a source-locale meaning prompt (`ru`, `uk`, etc.) followed by four complete
    target-language sentence choices, one correct index (or an explicitly
    supported multi-correct row), and aligned per-choice explanations. A
    fill-in-the-blank grammar drill such as `___ cafe` is not an acceptable
    replacement for the standard quiz surface unless a separate product spec
    creates a new drill mode. For French `fr`, the choices must be full French
    phrases/sentences with realistic learner-error distractors, not copied
    English rows and not lesson-row fan-out. Any generated standard quiz sample
    that changes this style is `BLOCK_PRODUCT_STYLE_DRIFT` and must be
    superseded before further quiz-bank generation.
19. **Official flashcard packs use `gustav_flashcard_pack_generator`.** Target-
    language marketplace flashcard packs for French and future languages must
    start from the reusable generator contract, not from ad hoc pack writing.
    The English flashcard marketplace is product-shape evidence only: pack
    density, metadata, categories, price shards, card-detail fields, and review
    style. It is never accepted as a row-by-row source to translate. Target
    packs must be native to the language and culture where relevant, cite
    trusted sources per accepted row, keep source-locale copy (`ru`, `uk`, etc.)
    reviewed, and stay `activationApproved=false` until source evidence,
    duplicate audit, target storage isolation, server dry-run, admin workflow,
    rollback, and final production gates pass. French examples include both
    learner-utility packs and culture-native packs such as cafe/terrace,
    boulangerie/market, metro/train, bureaucracy, and apero/social rituals.
20. **Marketplace flashcard descriptions must keep the English product-copy
    voice.** Any official target-language flashcard pack description must follow
    the English marketplace copy principle: scene first, conflict/tension,
    concrete social fantasy, useful promise, compact voice, and a little bite.
    Bland taxonomy text such as "набор для...", "contains phrases about...",
    "this pack teaches..." or generic topic summaries is
    `BLOCK_PRODUCT_COPY_DRIFT`. The copy may be culture-native and playful, but
    must still describe the actual learning value and must not invent facts not
    supported by the pack rows.
21. **French official flashcard packs are done only at activation-readiness.**
    For French flashcard marketplace packs, content-candidate gates are not
    enough. A completed handoff must include
    `admin/french-flashcard-packs-workflow.js`,
    `admin/french-flashcard-packs-admin.js`,
    `fr_flashcard_packs_runtime_activation_evidence.json`,
    `fr_flashcard_packs_admin_activation_handoff.json`, and
    `fr_flashcard_packs_activation_readiness_final_gate.json`. The final status
    must be `READY_FOR_EXPLICIT_ACTIVATION_APPROVAL`, with `productionReady=true`
    and `activationApproved=false`. Live Firebase upload execution and the final
    approval receipt remain explicit external steps, never automatic builder
    behavior.

## System map (30-second version)

- `docs/gustav/runs/2026-05-19_fr_inventory_v0a1/` — the single run:
  `generated/fr/lessons/` (32 ledgers × 50 rows), `generated/fr/app_domains/`
  (flashcards 120, collectibles 33, personal-plan echo), `pack_candidates/fr/`
  (runtime slices actually uploaded to the server), `generated/fr/reviewer/`
  (decision files; v2 = current schema with 11 quality gates per row).
- Existing 1600-row `quiz`, `flashcard` and `personal_practice` slices are
  derived from the lesson ledger. They are seed coverage only, not full
  English-feature parity, until feature-parity packets prove the French-specific
  banks, prompts, audio and tests.
- `scripts/gustav_*` — deterministic generators + packet validators. French
  text is currently **hardcoded inside generator scripts** (`TRANSLATIONS`,
  `FIELD_SPECS`, `PHRASE_FR`…). Roadmap Phase 2 moves it to data files.
- `tests/gustav_*` — 78 contract suites; the green wall protecting you.
- Runtime: French loads **remotely** from Firebase Storage bucket
  (`course-packs/fr/{ru|uk}/{surface}/…`), nothing is bundled in the app.
  Gates per surface live in `app/*_target_gate.ts`.

## Quality pipeline (target state — Phase 3)

Deterministic validators (cyrillic / mojibake / source-language leak / broken
elision / duplicate / schema) run first and are free. LLM judging happens only
after they pass, uses the 11-gate rubric from
`generated/fr/reviewer/reviewer_workflow_v2_decision_schema.json`, must output
a verdict **per gate** with a cited rule, and is calibrated against the golden
set before its verdicts count. Auto-accepting everything (the old
`promoted_decision_file_generation` behavior) is forbidden.

## Operating loop (repeat until nextActions is empty)

```
1. Read state.json → pick the FIRST item in nextActions.
2. Do the smallest complete version of it (respect write zones).
3. Validate: run the named test/validator for that item + the Gustav suite.
4. Update state.json (nextActions, log, updatedAt). Commit.
5. STOP and report if: a safety contract must be weakened, an approval is
   required, or the same failure repeats twice. Do not improvise around gates.
```
