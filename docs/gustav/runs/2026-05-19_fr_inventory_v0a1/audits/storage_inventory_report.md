# GUSTAV Storage Inventory Report

Run: `2026-05-19_fr_inventory_v0a1`

Status: `PASS`

Generated at: 2026-05-23T10:18:40.681Z

## Summary

- Files scanned: 1247
- Records: 2183
- Unique literal keys: 360
- Key patterns: 23
- Unknown expressions: 542
- Cloud sync keys observed: 139
- Learning-state records: 314
- Target namespace required: 0
- Blockers: 0
- High risks: 0
- Unknown-scope records: 0

## Top Risks

No high/blocker risks found.

## Unknowns


## Notes

- This is an automated heuristic inventory, not a final migration plan.
- French generation remains blocked while blocker/high-risk learning keys are unresolved.
- Dynamic key expressions require manual review or a stronger AST-based scanner.
- The scanner resolves common local arrays, Array.from template keys, simple string variables and selected storage helper wrappers; it is still not a full TypeScript AST evaluator.
