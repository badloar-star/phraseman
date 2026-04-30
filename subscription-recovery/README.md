# Subscription Recovery

B2B SaaS tool that finds recurring software spend, flags waste, and tracks savings.

## Initial Scope

- Ingest bank transactions from an Open Banking provider.
- Normalize noisy merchant labels into canonical vendors.
- Detect recurring charges with confidence scores.
- Surface waste findings (duplicate, orphaned, unused).
- Track potential and confirmed monthly savings.

## Repository Layout

- `apps/api` - REST API for ingestion, findings, and dashboard data.
- `apps/web` - Dashboard for finance and operations teams.
- `apps/worker` - Background jobs for sync, detection, and reports.
- `packages/core` - Shared types and schemas.
- `packages/detection` - Recurrence and waste detection logic.
- `packages/merchant-kb` - Merchant alias and normalization rules.
- `prisma` - Database schema and migrations.
- `docs` - Product, architecture, and security documents.

## Immediate Next Steps

1. Add monorepo package manager setup (`npm` workspaces).
2. Create Prisma schema and first migration.
3. Implement `POST /bank/webhook` in `apps/api`.
4. Add normalization and recurrence worker jobs.
5. Build first dashboard page with spend and findings.

## Local Run (Pilot)

1. Copy `.env.example` to `.env`.
2. Start PostgreSQL:
   - `npm run db:up`
3. Run migrations and generate Prisma client:
   - `npm run prisma:migrate`
   - `npm run prisma:generate`
4. Seed demo data:
   - `npm run seed`
5. Start API and web:
   - `npm run dev`
6. Optional smoke test (with API running):
   - `npm run smoke`
