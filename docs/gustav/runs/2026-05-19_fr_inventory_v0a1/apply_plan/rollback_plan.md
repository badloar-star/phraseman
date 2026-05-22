# GUSTAV Target Isolation Rollback Plan

- Route integration should be feature-flagged so English-only app shell can stay active.
- Keep helper additive first; do not delete legacy keys until migration confidence is recorded.
- Feature-flag the production target provider and keep dev Spanish path untouched until migration is complete.
- Keep flat achievements_state read-only during migration and never delete before rollback window.
- Certificate v2 can be hidden without deleting legacy certificate key.
- Diagnosis v2 can be disabled and legacy English diagnostic_last kept as en-only.
- Do not remove legacy keys; rollback disables v2 reads and falls back to existing English behavior.
- Flashcard v2 can read legacy English only when studyTarget=en.
- Store adapter can read v2 first and legacy en second only when studyTarget=en.
- Session adapter can clear v2 target session keys without touching legacy lesson progress.
- Quiz v2 keys can be cleared per target while preserving legacy English counters.
- Preserve legacy reward markers; disable new grants behind a feature flag if needed.
- Keep v1 stats payloads intact and expose v2 stats behind target feature flag.
- Keep legacy trainer_store_v1 and mistake_log_v1 mapped to en only.
- Remove proposed test files if the apply plan is rejected; no production state changes are made.
