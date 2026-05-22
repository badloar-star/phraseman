# GUSTAV Cloud Sync Mapping

Run: `2026-05-19_fr_inventory_v0a1`

Status: `PASS`

Generated at: 2026-05-21T10:55:19.936Z

## Summary

- Entries: 140
- Literal keys: 134
- Key patterns: 6
- Keep global: 99
- Map to target: 39
- Map to source locale: 2
- Map to source and target: 0
- Drop from cloud: 0
- Block unknown: 0
- Blockers: 0
- High risks: 2
- Target bucket required: 39
- Entries with local usage: 140
- Entries without local usage: 0
- Target-sensitive local keys missing from cloud: 0

## Blockers And High Risks

- `high` `lang` -> `map_to_source_locale` (source_locale) at app/cloud_sync.ts:294
  Reason: Interface/source locale preference; must not be treated as study target.
- `high` `app_lang` -> `map_to_source_locale` (source_locale) at app/cloud_sync.ts:295
  Reason: Interface/source locale preference; must not be treated as study target.

## Target-Sensitive Local Keys Missing From Cloud

No missing target-sensitive local keys found by the heuristic comparison.

## Notes

- This is an automated heuristic mapping of app/cloud_sync.ts SYNC_KEYS.
- A HOLD status means French generation remains blocked until target-sensitive cloud keys are migrated or explicitly scoped.
- block_unknown entries require manual classification before any Gustav apply.
