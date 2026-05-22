# GUSTAV P1A Key Collision Audit

Run: `2026-05-19_fr_inventory_v0a1`

Status: `PASS`

Generated at: 2026-05-19T21:13:22.053Z

## Summary

- Target domains: 10
- Study targets: 2
- Source locales: 2
- Sample ids: 8
- Encoded id samples: 8
- Generated keys: 252
- Unique keys: 252
- Collisions: 0
- Separator leak checks: 232
- Separator leaks: 0
- Reserved patterns: 8
- Implementation rules: 6
- Required test additions: 3
- Blockers: 0
- Warnings: 0
- Collision safe after approval: yes
- May start French generation: no
- May modify production app files: no

## Encoding Policy

- Separator: `::`
- ID encoder: `encodeURIComponent(String(id))`
- Empty id policy: `omit_optional_id_or_reject_empty_explicit_id`

Implementation rules:
- Use a single constant separator: '::'.
- Convert id with String(id) and encode with encodeURIComponent before appending to a storage key.
- Never concatenate raw user/content ids into target-sensitive keys.
- Treat undefined id as omitted; reject an explicit empty-string id before key creation.
- Keep studyTarget and sourceLocale as typed enum segments, not free-form encoded ids.
- Keep legacyEnglishKey output visibly English-only and migration-only.

Reserved raw patterns:
- `::`
- `/`
- `\`
- `?`
- `#`
- `&`
- `%`
- ` leading/trailing whitespace `

## Sample IDs

- `1` -> `1`
- `lesson::1` -> `lesson%3A%3A1`
- `a/b` -> `a%2Fb`
- `query?x=1&y=2` -> `query%3Fx%3D1%26y%3D2`
- ` spaced id ` -> `%20spaced%20id%20`
- `ru::fr` -> `ru%3A%3Afr`
- `level#A1` -> `level%23A1`
- `percent%25` -> `percent%2525`

## Sample Keys

- `targetKey` achievements (target=en): `achievements_v2::en`
- `targetKey` achievements (target=en, id=1): `achievements_v2::en::1`
- `targetKey` achievements (target=en, id=lesson::1): `achievements_v2::en::lesson%3A%3A1`
- `targetKey` achievements (target=en, id=a/b): `achievements_v2::en::a%2Fb`
- `targetKey` achievements (target=en, id=query?x=1&y=2): `achievements_v2::en::query%3Fx%3D1%26y%3D2`
- `targetKey` achievements (target=en, id= spaced id ): `achievements_v2::en::%20spaced%20id%20`
- `targetKey` achievements (target=en, id=ru::fr): `achievements_v2::en::ru%3A%3Afr`
- `targetKey` achievements (target=en, id=level#A1): `achievements_v2::en::level%23A1`
- `targetKey` achievements (target=en, id=percent%25): `achievements_v2::en::percent%2525`
- `targetKey` achievements (target=fr): `achievements_v2::fr`
- `targetKey` achievements (target=fr, id=1): `achievements_v2::fr::1`
- `targetKey` achievements (target=fr, id=lesson::1): `achievements_v2::fr::lesson%3A%3A1`
- `targetKey` achievements (target=fr, id=a/b): `achievements_v2::fr::a%2Fb`
- `targetKey` achievements (target=fr, id=query?x=1&y=2): `achievements_v2::fr::query%3Fx%3D1%26y%3D2`
- `targetKey` achievements (target=fr, id= spaced id ): `achievements_v2::fr::%20spaced%20id%20`
- `targetKey` achievements (target=fr, id=ru::fr): `achievements_v2::fr::ru%3A%3Afr`
- `targetKey` achievements (target=fr, id=level#A1): `achievements_v2::fr::level%23A1`
- `targetKey` achievements (target=fr, id=percent%25): `achievements_v2::fr::percent%2525`
- `legacyEnglishKey` achievements (id=1): `achievements_legacy_en::1`
- `legacyEnglishKey` achievements (id=lesson::1): `achievements_legacy_en::lesson%3A%3A1`
- `legacyEnglishKey` achievements (id=a/b): `achievements_legacy_en::a%2Fb`
- `legacyEnglishKey` achievements (id=query?x=1&y=2): `achievements_legacy_en::query%3Fx%3D1%26y%3D2`
- `targetKey` analytics_stats (target=en): `analytics_stats_v2::en`
- `targetKey` analytics_stats (target=en, id=1): `analytics_stats_v2::en::1`
- `targetKey` analytics_stats (target=en, id=lesson::1): `analytics_stats_v2::en::lesson%3A%3A1`
- `targetKey` analytics_stats (target=en, id=a/b): `analytics_stats_v2::en::a%2Fb`
- `targetKey` analytics_stats (target=en, id=query?x=1&y=2): `analytics_stats_v2::en::query%3Fx%3D1%26y%3D2`
- `targetKey` analytics_stats (target=en, id= spaced id ): `analytics_stats_v2::en::%20spaced%20id%20`
- `targetKey` analytics_stats (target=en, id=ru::fr): `analytics_stats_v2::en::ru%3A%3Afr`
- `targetKey` analytics_stats (target=en, id=level#A1): `analytics_stats_v2::en::level%23A1`
- `targetKey` analytics_stats (target=en, id=percent%25): `analytics_stats_v2::en::percent%2525`
- `targetKey` analytics_stats (target=fr): `analytics_stats_v2::fr`
- `targetKey` analytics_stats (target=fr, id=1): `analytics_stats_v2::fr::1`
- `targetKey` analytics_stats (target=fr, id=lesson::1): `analytics_stats_v2::fr::lesson%3A%3A1`
- `targetKey` analytics_stats (target=fr, id=a/b): `analytics_stats_v2::fr::a%2Fb`
- `targetKey` analytics_stats (target=fr, id=query?x=1&y=2): `analytics_stats_v2::fr::query%3Fx%3D1%26y%3D2`
- `targetKey` analytics_stats (target=fr, id= spaced id ): `analytics_stats_v2::fr::%20spaced%20id%20`
- `targetKey` analytics_stats (target=fr, id=ru::fr): `analytics_stats_v2::fr::ru%3A%3Afr`
- `targetKey` analytics_stats (target=fr, id=level#A1): `analytics_stats_v2::fr::level%23A1`
- `targetKey` analytics_stats (target=fr, id=percent%25): `analytics_stats_v2::fr::percent%2525`
- `legacyEnglishKey` analytics_stats (id=1): `analytics_stats_legacy_en::1`
- `legacyEnglishKey` analytics_stats (id=lesson::1): `analytics_stats_legacy_en::lesson%3A%3A1`
- `legacyEnglishKey` analytics_stats (id=a/b): `analytics_stats_legacy_en::a%2Fb`
- `legacyEnglishKey` analytics_stats (id=query?x=1&y=2): `analytics_stats_legacy_en::query%3Fx%3D1%26y%3D2`
- `targetKey` cloud_sync (target=en): `cloud_sync_v2::en`
- `targetKey` cloud_sync (target=en, id=1): `cloud_sync_v2::en::1`
- `targetKey` cloud_sync (target=en, id=lesson::1): `cloud_sync_v2::en::lesson%3A%3A1`
- `targetKey` cloud_sync (target=en, id=a/b): `cloud_sync_v2::en::a%2Fb`
- `targetKey` cloud_sync (target=en, id=query?x=1&y=2): `cloud_sync_v2::en::query%3Fx%3D1%26y%3D2`
- `targetKey` cloud_sync (target=en, id= spaced id ): `cloud_sync_v2::en::%20spaced%20id%20`
- `targetKey` cloud_sync (target=en, id=ru::fr): `cloud_sync_v2::en::ru%3A%3Afr`
- `targetKey` cloud_sync (target=en, id=level#A1): `cloud_sync_v2::en::level%23A1`
- `targetKey` cloud_sync (target=en, id=percent%25): `cloud_sync_v2::en::percent%2525`
- `targetKey` cloud_sync (target=fr): `cloud_sync_v2::fr`
- `targetKey` cloud_sync (target=fr, id=1): `cloud_sync_v2::fr::1`
- `targetKey` cloud_sync (target=fr, id=lesson::1): `cloud_sync_v2::fr::lesson%3A%3A1`
- `targetKey` cloud_sync (target=fr, id=a/b): `cloud_sync_v2::fr::a%2Fb`
- `targetKey` cloud_sync (target=fr, id=query?x=1&y=2): `cloud_sync_v2::fr::query%3Fx%3D1%26y%3D2`
- `targetKey` cloud_sync (target=fr, id= spaced id ): `cloud_sync_v2::fr::%20spaced%20id%20`
- `targetKey` cloud_sync (target=fr, id=ru::fr): `cloud_sync_v2::fr::ru%3A%3Afr`
- ...192 more

## Required Test Additions

- `P1A-KEY-ID-ENCODING` in `tests/gustav_target_storage_keys.test.ts`: targetKey encodes ids containing '::', '/', '?', '#', '&', '%' and whitespace without leaking separators.
- `P1A-KEY-COLLISION-MATRIX` in `tests/gustav_target_storage_keys.test.ts`: targetKey/sourceTargetKey/legacyEnglishKey produce unique keys across en/fr, ru/uk and reserved id samples.
- `P1A-KEY-EMPTY-ID-REJECTION` in `tests/gustav_target_storage_keys.test.ts`: An explicit empty-string id is rejected instead of producing a key indistinguishable from an omitted id.

## Findings

No findings.

## Notes

- This audit defines storage-key collision safety for P1A; it does not write app files.
- The required test additions extend the existing P1A target storage key test contract.
- French generation remains blocked until target isolation and content generation gates pass.
