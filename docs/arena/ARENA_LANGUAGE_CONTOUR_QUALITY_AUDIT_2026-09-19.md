# Arena language-contour quality audit — 2026-09-19

## Verdict: HOLD

Two independent read-only reviewers compared the partial multilingual Arena foundation with the proven English Arena standard. Both returned FAIL/HOLD. No Spanish, French or German Arena contour may be enabled, generated or published from the current code.

## Correct English reference

The reference is the V11 replacement contract, not live V10. The authoritative V10 audit records that all 1,493 `guess_phrase` tasks fail the strict distractor rule. V11 requires an exact mode matrix, canonical hashes, deterministic validation and independent semantic receipts before publication. Its fake-only pipeline verification does not substitute for real linguistic review.

Sources:

- `docs/arena/ARENA_DISTRACTOR_AUDIT_2026-08-21.md`
- `docs/arena/OWNER_DECISIONS.md` D-76
- `functions/src/tournament_pool_v11_*`

## Findings

| Severity | Finding | Evidence |
|---|---|---|
| P1 | The current target checker is not a linguistic gate. | `functions/src/arena_target_quality.ts` accepts missing options, allows two choices and accepts arbitrary reason strings. |
| P1 | A German task can contain English and still pass the current checker. | The profile is metadata only; no executable target validator or target-script/content proof exists. |
| P1 | No new target guard is in the runtime, matchmaking, pool selection, admin or publication path. | New helpers are used only by their own tests. |
| P1 | Target readiness can be spoofed by shape-valid hashes. | `resolveArenaTargetPublication` does not recompute a manifest, bundle, receipt ledger or Merkle root. |
| P1 | Existing `learning_v2_arena_max_target_gate` calls the changed target-gate API with the old arity. | This is a compile/test regression until the contract and callers are migrated together. |
| P1 | Global legacy cache and active-match paths still exist. | Target-scoped cache helpers do not yet replace the production paths. |

## Quality Agents introduced

`docs/arena/ARENA_QUALITY_AGENTS.md` is now the normative contract for the new Arena-specific preauthoring guardian, six task judges, pool auditor and release guardian. It requires immutable hash-bound receipts, independently verified citations, fresh reviewer context, double review of subjective roles, strict V11 mode matrices and a fail-closed publish decision.

## Required remediation before another audit

1. Wire target identity through every Arena client/server path and cache key.
2. Implement executable target-language profile validators and the complete mode-specific V11 grammar/semantic matrices.
3. Add an immutable receipt schema, validator, ledger and release guardian.
4. Make publication recompute target pool hash, Merkle root, quotas, five-mode coverage and receipt identities.
5. Add target-aware admin controls in `admin/v2/legacy.html`, then run only the new Arena Quality Agent pipeline before a language is made ready.

This audit is evidence of a block, not a release approval.
