# Spire Italian Contour Design

**Date:** 2026-10-03  
**Owner decision:** approved in the current session; supersedes D133 only for Italian Spire availability.

## Goal

Make Italian a first-class Spire study contour with the same runtime, weekly-pack, moderation, admin, and quality guarantees as Spanish, French, and German. Italian must never fall back to English or another study target.

## Product contract

- Spire supports `en`, `es`, `fr`, `de`, and `it`.
- Italian uses a dedicated deterministic pool of exactly 4,000 real tasks.
- The Italian pool mirrors the proven multilingual task-family quotas and difficulty distribution.
- Italian has its own grammar facts, lexical inventory, rendering rules, distractors, and speech locale (`it-IT`).
- A missing, incomplete, mismatched, or non-approved Italian release is fail-closed: the UI reports that the pack is unavailable and never substitutes another language.
- Italian remains marked beta under the same user-facing policy as the existing non-English contours.

## Content and release gate

The existing multilingual builder remains the single pipeline. It gains Italian source facts and deterministic render rules; no Italian-only parallel generator is introduced.

The release bundle must contain:

- exactly 4,000 tasks and the established per-mode/per-difficulty quotas;
- unique player-visible surfaces where required;
- source-bound grammatical and lexical facts;
- valid distractor reasons and inverse proofs;
- a matching task hash, semantic-ledger hash, and manifest hash;
- approved lexical evidence;
- an independent read-only Italian linguistic review receipt;
- an explicit admin publication receipt.

Any missing receipt or failing invariant blocks weekly-pack generation.

## Runtime and weekly packs

- The canonical Spire language registry includes `it`.
- The pack builder loads the bundled Italian pool and applies the same 12-tier weekly build as other contours.
- Progress, room membership, scores, finalisation, caches, and pack paths remain scoped by language.
- Italian task audio resolves only `device-tts:it:*` to `it-IT`; mismatched audio is rejected.

## Reports and quarantine

- Every Italian task uses the existing report flag.
- A valid player report creates or updates the canonical Italian incident and immediately quarantines the task from future weekly packs.
- Admin review can restore the task only through the protected incident action after correction.
- Italian flags live in `config/spire_task_flags_it`; browser writes remain denied.

## Admin surface

The production admin adds “Итальянский” to the existing Spire content selector. The same user-friendly actions work without Italian-specific technical controls:

- inspect preparation state;
- review complaints;
- remove or restore a task;
- build all 12 weekly packs;
- view technical diagnostics only inside the existing disclosure.

## Verification

The change is complete only when:

1. Italian-specific tests fail before implementation and pass afterwards.
2. The deterministic builder emits exactly 4,000 Italian tasks.
3. All multilingual structural and linguistic gates pass for Italian.
4. Spire app, Functions, admin, Firestore rules, and asset packaging agree on the five-language registry.
5. A fresh independent review finds no cross-language fallback or quarantine bypass.

