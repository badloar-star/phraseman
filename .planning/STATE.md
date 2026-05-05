# Phraseman State

**Last updated:** 2026-05-05

## Current Status

- **Milestone:** v1.0 — Friends MVP
- **Active phase:** Phase 2 (Plan 01 complete, Plan 02 next)
- **Next action:** Execute Phase 2 Plan 02 — friends_screen UI + settings entry

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
| 1 — Foundation | complete | 3/3 | Friend codes, weekly xp, security rules, Cloud Function cron. Commits: a10a66e, 620e4ab, d0d9b03 |
| 2 — Requests & Friends List | in_progress | 1/2 done | Plan 01 complete 2026-05-05. Commits: 4851be8, 474f6dd. Wave 2 (Plan 02): friends_screen UI + settings entry — next. |
| 3 — HoF & Arena Integration | not started | — | Friends HoF + arena lobby friends list |

## Decisions Log (Phase 2 Plan 01)

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-05-05 | declineFriendRequest deletes doc (not update to 'declined') | Avoids stale declined docs blocking future re-requests; cleaner Firestore state. |
| 2026-05-05 | acceptFriendRequest: separate status update write before batch | Security rules must see status='accepted' for the reverse friend entry create to be permitted. |
| 2026-05-05 | friends create rule: get() check for accepted request | Enables client-side two-step accept without Cloud Function; security rules gate on existing accepted request doc. |

---
*Last updated: 2026-05-05 after Phase 2 Plan 01 execution*
