# Task Packet: Privacy Data Inventory and Lifecycle Baseline

## Scope

- Turn the telemetry/privacy contract into a field-level lifecycle inventory covering purpose, consent/legal basis, store, retention, deletion, vendor, residency and child-data sensitivity.
- Keep unresolved legal/owner decisions explicit; do not invent retention or residency claims.

## Non-goals

- No privacy policy rewrite, vendor console access, DPA approval, data export/deletion, or production mutation.
- No claim that a field is legally compliant from repository evidence alone.

## Technical debt

- `PENDING` lifecycle fields are blockers for final privacy/SOC 2 approval.
- Any new personal-data field must add an inventory row in the same task packet.

## Verification

- `node scripts/verify_privacy_data_inventory.mjs`
- `node --test scripts/verify_privacy_data_inventory.test.mjs`

## Status

Inventory baseline pending privacy/legal and vendor review.
