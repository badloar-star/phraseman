# Phraseman State

**Last updated:** 2026-05-03

## Current Status

- **Milestone:** v1.0 — Friends MVP
- **Active phase:** None yet (planning)
- **Next action:** `/gsd:plan-phase 1` — plan Phase 1 (Foundation)

## Project Snapshot

- Brownfield project — Phraseman is in production with 32 lessons, arena PvP, leaderboard, premium, achievements, energy system, etc.
- This GSD initialization tracks the **Friends MVP** addition only — existing features are preserved and not re-planned.
- See `PROJECT.md` for full inventory of validated existing capabilities.

## Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-05-03 | Initialize GSD with coarse granularity (3 phases) | User wants minimal overhead for single MVP feature; existing CLAUDE.md and docs/ provide rich context already. |
| 2026-05-03 | Skip codebase mapping | Existing CLAUDE.md, docs/MASTER_MAP* references, and ARCHITECTURE.md cover the codebase well enough for friends MVP. Can run `/gsd:map-codebase` later if needed. |
| 2026-05-03 | Workflow: plan-checker only (research + verifier off) | Friends MVP is a well-understood domain (standard friend codes pattern). Don't need researcher; user can manually verify. |
| 2026-05-03 | Mode: YOLO (auto-approve) | User explicitly asked for fast path. |
| 2026-05-03 | Friend codes 6-char base32 (no `0/O/1/I/L`) | Anti-typo, standard pattern. |
| 2026-05-03 | Friend requests require accept (not auto-add) | Anti-spam, anti-stalking. |
| 2026-05-03 | NO push challenge / NO presence in v1.0 | Requires FCM + presence infra; deferred to v1.1. |
| 2026-05-03 | NO contact auto-import | Privacy + no phone-account binding in Phraseman. |
| 2026-05-03 | NO nickname search | Stalking risk. |

## Phase Status

| Phase | Status | Plans | Notes |
|-------|--------|-------|-------|
| 1 — Foundation | not started | — | Friend codes, weekly xp, security rules, Cloud Function cron |
| 2 — Requests & Friends List | not started | — | UI screen + request lifecycle |
| 3 — HoF & Arena Integration | not started | — | Friends HoF + arena lobby friends list |

---
*Last updated: 2026-05-03 after initialization*
