---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: Apple Watch Micro-Repetition
status: Defining requirements
last_updated: "2026-06-07T00:00:00.000Z"
progress:
  total_phases: 0
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
---

# Phraseman State

**Last updated:** 2026-06-07

## Current Position

Phase: 5 — Explain Like I'm Five (v1.2 AI Content track) — EXECUTING
Plan: 01 ✅ (39ab0705) · 02 ✅ (ea49a8bf) · 03 ✅ (10c5a40c) · 04 next (UI, autonomous:false) · 05 pending (deploy)
Status: Waves 1-2 done (backend complete), 73 functions tests + 46 rules tests green
Last activity: 2026-06-09 — backend done (core+CF+judge+reports), all committed path-scoped on content/mitap-week1-6
Deferred to plan 05 (deploy wiring — shared dirty files, parallel sessions editing them):
  - functions/src/index.ts: add require+export for explainPhrase AND submitExplainReport (currently only mitap's edits there)
  - firestore.rules: 5 explain blocks WRITTEN in working tree (uncommitted, mixed with mitap's admin_config) → commit with rules deploy
  - tests/firestore_rules_security.test.ts: toContain asserts WRITTEN in working tree → commit with rules
  - deploy:safe whitelist: ADD explainPhrase + submitExplainReport (memory invariant: new CF must be in whitelist or deploy:safe skips it). Point-to-point deploy also fine.

## Current Status

- **Milestone:** v1.1 — Apple Watch Micro-Repetition — **defining requirements**
- **Previous:** v1.0 — Friends MVP — COMPLETE (3 phases, 7 plans)
- **Phase numbering:** continues from v1.0 → v1.1 phases start at **Phase 5**
- **Next action:** research → requirements → roadmap

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
| 2026-06-09 | New track v1.2 "AI Content" — Phase 5 "Explain Like I'm Five" planned | New feature outside Friends/Watch milestones; opens reusable AI-content track. |
| 2026-06-09 | Public cache validated by SEPARATE AI-judge call (not self-check/heuristic-only) | Public content asymmetry: one bad answer reaches all; judge cost ≈ pennies, fail-closed. Heuristic = pre-filter; reports = backstop. |
| 2026-06-09 | Streaming to the TRIGGER user only; cache written only after judge passes | Wow-effect for the waiter without risking raw text to everyone; judge protects the shared cache, not the individual. |
| 2026-06-09 | Global daily budget breaker (feature is free-for-all, not premium) | Protect wallet from viral spike; cache reads are free & unlimited. |
| 2026-06-09 | Approach: clone&extend premium_dialog.ts, core split into functions/src/explain/* | Ship fast now; cheap refactor into ai_content platform later (ideas #1/#11/#12 queued). |
| 2026-05-03 | NO push challenge / NO presence in v1.0 | Requires FCM + presence infra; deferred to v1.1. |
| 2026-05-03 | NO contact auto-import | Privacy + no phone-account binding in Phraseman. |
| 2026-05-03 | NO nickname search | Stalking risk. |

## Phase Status

| Phase | Status | Plans | Notes |
|-------|--------|-------|-------|
| 1 — Foundation | complete | 3/3 | Friend codes, weekly xp, security rules, Cloud Function cron. Commits: a10a66e, 620e4ab, d0d9b03 |
| 2 — Requests & Friends List | complete | 2/2 done | Plan 01 complete 2026-05-05. Plan 02 complete 2026-05-05. Commits: 4851be8, 474f6dd, 38eda49, 0212a12. |
| 3 — HoF & Arena Integration | complete | 2/2 | Plan 01 complete 2026-05-05. Plan 02 complete 2026-05-05. Commits: 3bcf201, 87ba4de, 3b0be3d. |

## Decisions Log (Phase 3)

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-05-05 | AvatarView prop is `avatar` (not `avatarId`) | TypeScript check caught this; same fix in both Plan 01 and Plan 02. |
| 2026-05-05 | ROW_HEIGHT = 64 for getItemLayout in HoF FlatList | Deterministic scroll-to-own-row (HOF-07); must match actual row render height. |
| 2026-05-05 | Loop variable `friend` (not `f`) in arena friends map | `f` is the font-scale object from useTheme(); renaming avoids shadowing. |

## Decisions Log (Phase 2 Plan 02)

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-05-05 | textSecond (not textSecondary) in theme | Theme type uses shortened key; auto-corrected from codebase inspection. |
| 2026-05-05 | bgSurface (not bgCardAlt) in theme | bgCardAlt does not exist on theme type; bgSurface used as closest alternative. |
| 2026-05-05 | getBestAvatarForLevel from constants/avatars, not components/AvatarView | Confirmed actual export location from codebase grep. |

## Decisions Log (Phase 2 Plan 01)

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-05-05 | declineFriendRequest deletes doc (not update to 'declined') | Avoids stale declined docs blocking future re-requests; cleaner Firestore state. |
| 2026-05-05 | acceptFriendRequest: separate status update write before batch | Security rules must see status='accepted' for the reverse friend entry create to be permitted. |
| 2026-05-05 | friends create rule: get() check for accepted request | Enables client-side two-step accept without Cloud Function; security rules gate on existing accepted request doc. |

---
*Last updated: 2026-05-05 after Phase 3 execution — milestone v1.0 Friends MVP complete*
