# GUSTAV Mixed Cloud Payload Audit

Run: `2026-05-19_fr_inventory_v0a1`

Status: `PASS`

Generated at: 2026-05-22T08:31:14.736Z

## Summary

- Payloads: 4
- Fields: 29
- Global fields: 17
- Target fields: 12
- Mixed fields: 0
- Unknown fields: 0
- Blockers: 0

## achievements_state

- Status: `PASS`
- Verdict: French target achievement state is split from legacy achievements_state.
- Current shape: `progress.achievements_state -> local achievements_v1 JSON array`
- Proposed shape: `legacy progress.achievements_state for English/global compatibility + achievements_v2::{studyTarget}::achievements_v1 for target unlock state`
- Code references: 22

### Field Decisions

- `AchievementState[].id` -> `global` / `medium`: Legacy achievements_state remains English/global compatibility; French target achievement ids are stored under achievementStateKey(fr).
- `AchievementState[].unlockedAt` -> `global` / `medium`: Legacy unlock timestamps no longer hydrate French target achievements; French target timestamps live in scoped achievements_v2::fr.
- `AchievementState[].notified` -> `global` / `medium`: Notification state for French target achievements is kept in the scoped target bucket.
- `AchievementState[].shardClaimed` -> `global` / `medium`: Shard-claim state for French target achievements is kept in the scoped target bucket.

### Blockers


## daily_stats

- Status: `PASS`
- Verdict: Daily stats stay global; target learning evidence is stored in scoped lesson/quiz/trainer/stat buckets.
- Current shape: `progress.daily_stats -> Record<YYYY-MM-DD, { points, streak }>`
- Proposed shape: `progress/global/daily_stats`
- Code references: 42

### Field Decisions

- `{date}.points` -> `global` / `medium`: Daily points are account XP by product policy; French and English share XP/daily stats while learning evidence stays target-scoped.
- `{date}.streak` -> `global` / `medium`: Streak is account-level by product policy and is not used as French learning content.

### Blockers


## user_stats_v1

- Status: `PASS`
- Verdict: French learning user stats are target-scoped; legacy user_stats_v1 remains global/English compatibility.
- Current shape: `progress.user_stats_v1 -> UserStats JSON object`
- Proposed shape: `legacy progress.user_stats_v1 for global telemetry + target_stats_v2::{studyTarget}::user_stats_v1 for learning telemetry`
- Code references: 19

### Field Decisions

- `lessonsStarted` -> `study_target` / `low`: Lesson starts are routed through userStatsKey(studyTarget).
- `lessonsAbandoned` -> `study_target` / `low`: Lesson abandonment is routed through userStatsKey(studyTarget).
- `answersTotal` -> `study_target` / `low`: Answer counts are routed through userStatsKey(studyTarget).
- `answersCorrect` -> `study_target` / `low`: Correct answer counts are routed through userStatsKey(studyTarget).
- `energyHits` -> `global` / `medium`: Energy limit hits are product/account behavior unless product wants target-specific energy analytics.
- `featuresOpened` -> `global` / `medium`: Feature ids may include global screens and target-content screens; it needs feature-level taxonomy. Current runtime keeps this commerce/feature telemetry in the legacy global user_stats_v1 bucket.
- `quizLevels.easy` -> `study_target` / `low`: Quiz attempts are routed through userStatsKey(studyTarget).
- `quizLevels.medium` -> `study_target` / `low`: Quiz attempts are routed through userStatsKey(studyTarget).
- `quizLevels.hard` -> `study_target` / `low`: Quiz attempts are routed through userStatsKey(studyTarget).
- `shardsShopOpens` -> `global` / `medium`: Shop opens are commerce/product behavior.
- `shardPackClicks` -> `global` / `medium`: Shard pack clicks are commerce behavior.
- `shardPackPurchases` -> `global` / `medium`: Shard pack purchases are commerce behavior.
- `cardPackClicks` -> `global` / `medium`: Card pack catalog may become target-specific; pack ids require target metadata. Current runtime keeps this commerce/feature telemetry in the legacy global user_stats_v1 bucket.
- `cardPackPurchases` -> `global` / `medium`: Card pack purchases may be global entitlement while learning content is target-specific. Current runtime keeps this commerce/feature telemetry in the legacy global user_stats_v1 bucket.

### Blockers


## stats_daily_breakdown_v1

- Status: `PASS`
- Verdict: French learning stats are target-scoped; legacy stats_daily_breakdown_v1 remains English/global compatibility.
- Current shape: `progress.stats_daily_breakdown_v1 -> Record<YYYY-MM-DD, metric counters>`
- Proposed shape: `legacy progress.stats_daily_breakdown_v1 for English/global metrics + target_stats_v2::{studyTarget}::stats_daily_breakdown_v1 for target learning metrics`
- Code references: 29

### Field Decisions

- `words_learned` -> `study_target` / `low`: Learned words are routed through statsDailyBreakdownKey(studyTarget).
- `flashcards_saved` -> `study_target` / `low`: Saved flashcards can be routed through statsDailyBreakdownKey(studyTarget) when emitted by target content.
- `phrases_learned` -> `study_target` / `low`: Learned phrases are routed through statsDailyBreakdownKey(studyTarget).
- `quizzes_completed` -> `study_target` / `low`: Completed quizzes are routed through statsDailyBreakdownKey(studyTarget).
- `arena_wins` -> `global` / `medium`: Arena wins appear product/global unless arena content becomes target-language specific.
- `arena_losses` -> `global` / `medium`: Arena losses appear product/global unless arena content becomes target-language specific.
- `daily_tasks_claimed` -> `study_target` / `low`: Daily task claims are routed through bumpDailyTaskClaimed(studyTarget).
- `shards_earned` -> `global` / `medium`: Shard balance is account-level currency, but source events should retain target attribution when generated by learning.
- `shards_spent` -> `global` / `medium`: Shard spending is account-level currency.

### Blockers


## Notes

- This audit is a field-level design pass for cloud payloads previously classified as block_unknown.
- It does not authorize product migration or cloud schema changes.
- French generation remains blocked while mixed payload fields lack product-approved split rules and tests.
