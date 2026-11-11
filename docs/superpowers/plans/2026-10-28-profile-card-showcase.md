# Profile card showcase implementation plan

**Goal:** Implement the owner's approved seven-style mockup: up to three earned awards, opt-in streak display, owner settings and award picker, Obsidian without the triangular beam.
**Architecture:** Account-bound portable preference; existing public-profile projection and cache carry a bounded showcase object. Selection is cosmetic, never an achievement grant. Existing PRO purchase, style, biography, social actions and pair statistics remain available.
**Stack:** React Native, existing card/sheet primitives, Phone State preference bridge, Firebase callable projection.

- [x] Contract and persistence: tests for max three, ordered uniqueness, earned-only selection, false-by-default visibility, malformed data, account change, failed writes. Implement shared normalization and account-bound preference store.
- [x] Projection: include showcase in display hash; public normalize and disk round-trip; preserve showcase for old clients omitting field. Validate known award IDs and bound counts. Document server-only rules and Jarvis non-consumption. Test defaults and malformed payload.
- [x] UI: existing modal opens owner settings, then a two-column earned-awards picker. Cancel discards draft; save commits 0–3 awards. Reuse achievement art, theme sheet colors, accessible controls, virtualized collection and existing sheet motion. Keep account token bound to opened sheet.
- [x] Card layout: keep all six PRO styles and normal style; reserve content space for awards/streak; scroll on short viewports or large text. Remove only Obsidian beam. Preserve other actions and pair stats.
- [x] Focused verification: model/store/public-cache/projection tests, component interaction checks, existing profile regressions, syntax/type checks limited to touched files; inspect final diff. No release, version bump, emulator launch or deployment is part of this implementation.

Acceptance: fourth selection refused; saved order visible to others; hidden streak never rendered; save failure keeps draft and reports error; account transition cannot apply old selection; empty collection remains usable; no PRO gate on awards; no new direct client writes to public_profiles.


Verification 2026-10-28: 82 focused client/storage/cache tests, 5 native component interaction tests, 11 server projection tests, 2 owner-lock tests passed. Scoped TypeScript check: 18 changed production files, zero diagnostics. Read-only review findings fixed: matching journal required, committed writes survive mirror errors, malformed JSON recovers to private defaults, duplicate submissions ignored, reconnect republishes OFF preferences. No emulator/device visual run, release, deployment or commit performed.
