# Architecture (Pilot v1)

## Goals

- Deliver first "money recovery" insights within 24 hours.
- Keep ingestion and detection modular to improve quickly.
- Preserve raw financial data for auditability.

## Services

### API (`apps/api`)

- Organization and user access boundaries.
- Bank webhook endpoint.
- Query endpoints for subscriptions, findings, and dashboard.

### Worker (`apps/worker`)

- Pull/sync jobs from provider APIs.
- Merchant normalization pipeline.
- Recurrence detection and waste rule execution.

### Web (`apps/web`)

- Insights dashboard.
- Findings review queue.
- Savings tracking and export.

## Data Pipeline

1. Provider sends or exposes transactions.
2. Ingestion stores `transactions_raw`.
3. Normalization maps merchant aliases and categories.
4. Recurrence engine builds `subscriptions_detected`.
5. Waste rules create `waste_findings`.
6. User actions update workflow and `savings_ledger`.

## Design Principles

- Keep raw and normalized records separate.
- Never auto-delete money-impacting records.
- Store confidence with each inference.
- Make every recommendation explainable.
