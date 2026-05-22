# GUSTAV P1B Post-Write Proof Firewall Audit

Run: `2026-05-19_fr_inventory_v0a1`

Status: `PASS`

Generated at: 2026-05-20T07:25:35.103Z

## Summary

- Real proof candidates: 1
- Real proofs present: 0
- Exact proof matches: 0
- Temp fixtures: 11
- Rejected temp fixtures: 11
- Accepted shape fixtures: 1
- Temp exact shape blocked by path: 1
- Outside-file fixtures rejected: 1/1
- Missing-hash fixtures rejected: 1/1
- Missing-receipt fixtures rejected: 1/1
- Verification-failure fixtures rejected: 1/1
- French-generation fixtures rejected: 1/1
- Firewall passed: yes
- Post-write proof still missing: yes
- Can start P1B now: no
- May start French generation: no
- Blockers: 0
- Warnings: 0

## Probe Results

- `REAL-P1B-POST-WRITE-PROOF-JSON`: accept=no, expected=no, reason=`proof_absent`, path=`/Users/maksymbabiev/Documents/phraseman/docs/gustav/runs/2026-05-19_fr_inventory_v0a1/apply_plan/p1b_post_write_proof.json`
- `TMP-IMPLICIT-DALSHE`: accept=no, expected=no, reason=`schema_mismatch`, path=`/private/tmp/gustav-p1b-post-write-proof-firewall-2026-05-19_fr_inventory_v0a1/implicit_dalshe.json`
- `TMP-WRONG-RUN`: accept=no, expected=no, reason=`run_id_mismatch`, path=`/private/tmp/gustav-p1b-post-write-proof-firewall-2026-05-19_fr_inventory_v0a1/wrong_run.json`
- `TMP-WRONG-SLICE`: accept=no, expected=no, reason=`approved_slice_mismatch`, path=`/private/tmp/gustav-p1b-post-write-proof-firewall-2026-05-19_fr_inventory_v0a1/wrong_slice.json`
- `TMP-OUTSIDE-FILE`: accept=no, expected=no, reason=`changed_files_outside_p1b_slice`, path=`/private/tmp/gustav-p1b-post-write-proof-firewall-2026-05-19_fr_inventory_v0a1/outside_file.json`
- `TMP-DIFF-MISMATCH`: accept=no, expected=no, reason=`changed_files_do_not_match_git_diff`, path=`/private/tmp/gustav-p1b-post-write-proof-firewall-2026-05-19_fr_inventory_v0a1/diff_mismatch.json`
- `TMP-MISSING-HASH`: accept=no, expected=no, reason=`missing_pre_post_hash_chain`, path=`/private/tmp/gustav-p1b-post-write-proof-firewall-2026-05-19_fr_inventory_v0a1/missing_hash.json`
- `TMP-MISSING-RECEIPT`: accept=no, expected=no, reason=`receipt_chain_invalid`, path=`/private/tmp/gustav-p1b-post-write-proof-firewall-2026-05-19_fr_inventory_v0a1/missing_receipt.json`
- `TMP-FAILED-VERIFY`: accept=no, expected=no, reason=`verification_results_not_pass`, path=`/private/tmp/gustav-p1b-post-write-proof-firewall-2026-05-19_fr_inventory_v0a1/failed_verify.json`
- `TMP-DIRTY-NOT-PRESERVED`: accept=no, expected=no, reason=`user_dirty_not_preserved`, path=`/private/tmp/gustav-p1b-post-write-proof-firewall-2026-05-19_fr_inventory_v0a1/dirty_not_preserved.json`
- `TMP-FRENCH-STARTED`: accept=no, expected=no, reason=`french_generation_started`, path=`/private/tmp/gustav-p1b-post-write-proof-firewall-2026-05-19_fr_inventory_v0a1/french_started.json`
- `TMP-EXACT-SHAPE-WRONG-PATH`: accept=no, expected=no, reason=`proof_path_not_accepted`, path=`/private/tmp/gustav-p1b-post-write-proof-firewall-2026-05-19_fr_inventory_v0a1/exact_shape_wrong_path.json`

## Rejection Order

- proof_absent
- not_parseable_json
- schema_mismatch
- run_id_mismatch
- approved_slice_mismatch
- approved_files_mismatch
- changed_files_outside_p1b_slice
- changed_files_do_not_match_git_diff
- missing_pre_post_hash_chain
- receipt_chain_invalid
- verification_results_not_pass
- user_dirty_not_preserved
- french_generation_started
- proof_path_not_accepted

## Findings

No findings.

## Notes

- This audit tests P1B post-write proof handling with temp fixtures only; it does not create a real proof.
- A syntactically exact P1B post-write proof in /private/tmp is rejected because only the configured run proof path can be accepted.
- Proofs touching files outside the four-file P1B slice, missing hashes, missing receipts, failed verification, dirty-work loss or French generation are rejected.
- French generation and broad production apply remain blocked.
