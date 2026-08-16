# GUSTAV Run Validator Report

Run: `2026-05-19_fr_inventory_v0a1`

Status: `BLOCK`

Generated at: 2026-08-16T09:19:15.018Z

## Summary

- Checks/findings: 27132
- Blockers: 12
- Warnings: 0

## Findings

- `blocker` `required_dir_missing_curriculum`: Missing required path: /home/user/phraseman/docs/gustav/runs/2026-05-19_fr_inventory_v0a1/curriculum
  Artifact: `/home/user/phraseman/docs/gustav/runs/2026-05-19_fr_inventory_v0a1/curriculum`
- `blocker` `required_dir_missing_generated`: Missing required path: /home/user/phraseman/docs/gustav/runs/2026-05-19_fr_inventory_v0a1/generated
  Artifact: `/home/user/phraseman/docs/gustav/runs/2026-05-19_fr_inventory_v0a1/generated`
- `blocker` `produced_artifact_not_found`: Produced artifact does not exist: docs/gustav/runs/2026-05-19_fr_inventory_v0a1/audits/p1a_import_contract_probe/compile.log
  Artifact: `docs/gustav/runs/2026-05-19_fr_inventory_v0a1/audits/p1a_import_contract_probe/compile.log`
- `blocker` `produced_artifact_not_found`: Produced artifact does not exist: docs/gustav/runs/2026-05-19_fr_inventory_v0a1/apply_plan/p1a_implementation_blueprint/compile.log
  Artifact: `docs/gustav/runs/2026-05-19_fr_inventory_v0a1/apply_plan/p1a_implementation_blueprint/compile.log`
- `blocker` `produced_artifact_not_found`: Produced artifact does not exist: docs/gustav/runs/2026-05-19_fr_inventory_v0a1/apply_plan/p1a_implementation_blueprint/runtime.log
  Artifact: `docs/gustav/runs/2026-05-19_fr_inventory_v0a1/apply_plan/p1a_implementation_blueprint/runtime.log`
- `blocker` `produced_artifact_not_found`: Produced artifact does not exist: docs/gustav/runs/2026-05-19_fr_inventory_v0a1/audits/p1a_transaction_simulation/compile.log
  Artifact: `docs/gustav/runs/2026-05-19_fr_inventory_v0a1/audits/p1a_transaction_simulation/compile.log`
- `blocker` `produced_artifact_not_found`: Produced artifact does not exist: docs/gustav/runs/2026-05-19_fr_inventory_v0a1/audits/p1a_transaction_simulation/runtime.log
  Artifact: `docs/gustav/runs/2026-05-19_fr_inventory_v0a1/audits/p1a_transaction_simulation/runtime.log`
- `blocker` `p1a_import_contract_compile_log_missing`: P1A compile probe log is missing.
  Artifact: `/home/user/phraseman/docs/gustav/runs/2026-05-19_fr_inventory_v0a1/audits/p1a_import_contract_audit.json`
- `blocker` `p1a_blueprint_compile_log_missing`: P1A blueprint compile log is missing.
  Artifact: `/home/user/phraseman/docs/gustav/runs/2026-05-19_fr_inventory_v0a1/audits/p1a_implementation_blueprint_audit.json`
- `blocker` `p1a_blueprint_runtime_log_missing`: P1A blueprint runtime log is missing.
  Artifact: `/home/user/phraseman/docs/gustav/runs/2026-05-19_fr_inventory_v0a1/audits/p1a_implementation_blueprint_audit.json`
- `blocker` `p1a_transaction_simulation_compile_log_missing`: P1A transaction simulation compile log is missing.
  Artifact: `/home/user/phraseman/docs/gustav/runs/2026-05-19_fr_inventory_v0a1/audits/p1a_transaction_simulation_audit.json`
- `blocker` `p1a_transaction_simulation_runtime_log_missing`: P1A transaction simulation runtime log is missing.
  Artifact: `/home/user/phraseman/docs/gustav/runs/2026-05-19_fr_inventory_v0a1/audits/p1a_transaction_simulation_audit.json`

## Notes

- This validator checks run structure and safety gates only.
- A PASS here does not approve French generation.
- A run verdict of HOLD or BLOCK remains authoritative for next-stage gating.
