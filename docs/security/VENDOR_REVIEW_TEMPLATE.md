# Vendor review template

Complete in the restricted evidence repository; commit only sanitized status and evidence IDs.

| Field | Required value |
|---|---|
| Vendor ID / review ID | Stable IDs from the register |
| Service and data flow | Systems, data classes, region/residency questions |
| Criticality | Tier and user/business impact |
| Owner person ID | Named accountable reviewer in restricted evidence |
| DPA/legal basis | Evidence ID, status, renewal/expiry |
| Security evidence | SOC/ISO/pentest or explicit not requested, with evidence ID |
| Access/subprocessor review | Scope, result, open exceptions |
| Exit dependency | Export, replacement, rollback and tested fallback |
| Decision | Approved, pending, restricted, or rejected |
| Next review | ISO date and trigger conditions |

Do not mark a vendor approved from public marketing claims alone. Missing contract, data-flow or security evidence remains `pending`.
