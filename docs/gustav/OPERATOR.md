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

## System map (30-second version)

- `docs/gustav/runs/2026-05-19_fr_inventory_v0a1/` — the single run:
  `generated/fr/lessons/` (32 ledgers × 50 rows), `generated/fr/app_domains/`
  (flashcards 120, collectibles 33, personal-plan echo), `pack_candidates/fr/`
  (runtime slices actually uploaded to the server), `generated/fr/reviewer/`
  (decision files; v2 = current schema with 11 quality gates per row).
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
