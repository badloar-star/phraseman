# GUSTAV French Research Pack Firewall Audit

Run: `2026-05-19_fr_inventory_v0a1`

Status: `PASS`

Generated at: 2026-05-20T07:48:09.286Z

## Summary

- Real pack candidates: 1
- Real packs present: 0
- Exact pack matches: 0
- Temp fixtures: 11
- Rejected temp fixtures: 11
- Accepted shape fixtures: 1
- Temp exact shape blocked by path: 1
- Single-source fixtures rejected: 1/1
- Missing RU/UK fixtures rejected: 1/1
- Missing fields fixtures rejected: 1/1
- Shortcut fixtures rejected: 1/1
- French output fixtures rejected: 1/1
- Firewall passed: yes
- Research pack still missing: yes
- May start translation now: no
- May start French generation: no
- Blockers: 0
- Warnings: 0

## Probe Results

- `REAL-FR-RESEARCH-PACK-JSON`: accept=no, expected=no, reason=`research_pack_absent`, path=`/Users/maksymbabiev/Documents/phraseman/docs/gustav/runs/2026-05-19_fr_inventory_v0a1/research/fr_research_pack.json`
- `TMP-IMPLICIT-DALSHE`: accept=no, expected=no, reason=`schema_mismatch`, path=`/private/tmp/gustav-french-research-pack-firewall-2026-05-19_fr_inventory_v0a1/implicit_dalshe.json`
- `TMP-WRONG-RUN`: accept=no, expected=no, reason=`run_id_mismatch`, path=`/private/tmp/gustav-french-research-pack-firewall-2026-05-19_fr_inventory_v0a1/wrong_run.json`
- `TMP-WRONG-TARGET`: accept=no, expected=no, reason=`target_mismatch`, path=`/private/tmp/gustav-french-research-pack-firewall-2026-05-19_fr_inventory_v0a1/wrong_target.json`
- `TMP-MISSING-SOURCE-LOCALE`: accept=no, expected=no, reason=`source_locales_missing_or_wrong`, path=`/private/tmp/gustav-french-research-pack-firewall-2026-05-19_fr_inventory_v0a1/missing_source_locale.json`
- `TMP-MISSING-TRUSTED-SOURCE`: accept=no, expected=no, reason=`trusted_sources_incomplete`, path=`/private/tmp/gustav-french-research-pack-firewall-2026-05-19_fr_inventory_v0a1/missing_trusted_source.json`
- `TMP-SINGLE-SOURCE-CLUSTER`: accept=no, expected=no, reason=`cluster_lacks_two_sources`, path=`/private/tmp/gustav-french-research-pack-firewall-2026-05-19_fr_inventory_v0a1/single_source_cluster.json`
- `TMP-MISSING-RU-UK`: accept=no, expected=no, reason=`ru_uk_comparison_missing`, path=`/private/tmp/gustav-french-research-pack-firewall-2026-05-19_fr_inventory_v0a1/missing_ru_uk.json`
- `TMP-MISSING-FIELDS`: accept=no, expected=no, reason=`required_fields_incomplete`, path=`/private/tmp/gustav-french-research-pack-firewall-2026-05-19_fr_inventory_v0a1/missing_fields.json`
- `TMP-SHORTCUT-ALLOWED`: accept=no, expected=no, reason=`shortcut_policy_not_rejected`, path=`/private/tmp/gustav-french-research-pack-firewall-2026-05-19_fr_inventory_v0a1/shortcut_allowed.json`
- `TMP-FRENCH-OUTPUT`: accept=no, expected=no, reason=`french_output_started`, path=`/private/tmp/gustav-french-research-pack-firewall-2026-05-19_fr_inventory_v0a1/french_output.json`
- `TMP-EXACT-SHAPE-WRONG-PATH`: accept=no, expected=no, reason=`research_pack_path_not_accepted`, path=`/private/tmp/gustav-french-research-pack-firewall-2026-05-19_fr_inventory_v0a1/exact_shape_wrong_path.json`

## Rejection Order

- research_pack_absent
- not_parseable_json
- schema_mismatch
- run_id_mismatch
- target_mismatch
- source_locales_missing_or_wrong
- trusted_sources_incomplete
- required_fields_incomplete
- grammar_clusters_incomplete
- cluster_lacks_two_sources
- ru_uk_comparison_missing
- shortcut_policy_not_rejected
- french_output_started
- research_pack_path_not_accepted

## Findings

No findings.

## Notes

- This audit tests French research pack acceptance with temp fixtures only; it does not create the real research pack.
- An exact-shape temp research pack is rejected because only the canonical run research path can be accepted.
- Single-source, missing RU/UK comparison, missing required fields, shortcut-enabled and French-output fixtures are rejected.
- French translation remains blocked.
