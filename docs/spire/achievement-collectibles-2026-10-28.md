# Peak collectible data contract — 2026-10-28

Owner decision: one collectible per tower. Completing all 135 steps (local floor 16, beyond floor 15) unlocks it. A confirmed promotion FROM that tower upgrades the same collectible. Twelve IDs, eleven possible upgrades; Diamond cannot promote. Global across study languages. No currency or access grants.

## Persistence and recovery

- Existing `achievements_v1` state gains optional `spirePromotedAt` on `spire_summit_*` rows. It is preserved independently of `unlockedAt`, including locked rows. Cloud restore merges both facts independently. Existing `achievements_state` snapshot serialization transports the extra field; no new collection or writer.
- Local summit delivery follows a successful step write. Loading durable local progress replays it. A week rollover preserves an old summit before replacing the local week record.
- Promotion facts come only from server-authored `users/{stableId}/spire_week_results` documents. Strict integer tier checks, `promoted === true`, `demoted === false`, `newTier === prevTier + 1`; original finalizedAt timestamp.
- A server-backed paginated scan (50 documents/page, all study languages) recovers old summits and promotions independently of dismissed cards or the three-week participation cache. Completed scans throttle for six hours per account generation; failures retry next entry. No permanent scan cursor can outlive restored achievement state. Fresh weekly results deliver immediately even while the scan is throttled.
- Every achievement write uses the existing serialized account queue and transition lock. Source generation tokens survive network/storage awaits; stale owners cannot award or post weekly stories to the next owner. Every changed fact schedules normal cloud sync, even if promotion precedes summit.

## History and presentation

The existing achievement story type uses `achievement:<id>` and `achievement:<id>:upgraded`. Original dates and the normal seven-day story TTL apply; old recovered awards return to the permanent collection without being presented as newly earned today. Story persistence failures stay retryable, including duplicate delivery in the same process.

Both stages use the same approved image. The upgrade adds a sparkle marker plus localized stage text in the collection/details and a distinct history heading. Art: 12 bundled transparent WebP files, 640×640, total 1,107,420 bytes. Names, conditions and stage descriptions cover all nine UI languages.

## Jarvis and Rules audit

No economy, entitlement, Firestore field path, collection or rule changes. Existing owner-only reads and server-only writes on `spire_week_results` remain authoritative. `spirePromotedAt` lives inside the existing private serialized achievement state and is not consumed by current Jarvis fetchers. A targeted guard was added to the central Jarvis contract audit.

## Verification boundary

Focused app tests and a selected central Jarvis contract test cover reducer, persistence failures, simultaneous facts, duplicate delivery, both restore directions, account switch, rollover, server recovery, stage rendering, localization and art files. See the session verification logs in `.codex-tmp/peak-*`. No emulator, production deployment, or real-device visual acceptance was performed.
