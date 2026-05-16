# Admin Settings Audit — 2026-05-14

Scope: mobile dev/admin panel opened from Settings via `/settings_testers`, with focus on stale QA actions, broken routes, and personalized mistake training.

## Executive Summary

The admin panel is dev-gated correctly, but it had several stale QA assumptions from older Plan 02/03/04 work. The personalized mistake-training pipeline itself is mostly connected: exact mistakes can trigger CoachToast, CoachToast opens Diagnosis trainer with `microDiagnosisId`, and Diagnosis trainer can continue into Smart Trainer with diagnosis-specific params.

The main issue was that some admin buttons still tested the old phrase-only path. Phrase-only mistakes are intentionally not enough for a confident diagnosis now, so the old admin test could report "no pattern" even when the product engine was healthy.

## Fixed In This Pass

1. `app/_admin_settings_testers.tsx`
   - Renamed stale section titles:
     - `Персонализация пейволла (Plan 02)` -> `Пейволл: персонализация`
     - `Тренер — режимы и лог ошибок (Plan 03)` -> `Тренер: режимы и лог ошибок`
     - `Аналитика ошибок — категории слов (Plan 04)` -> `Ошибки -> персональные тренировки`
   - Added a `POS token audit` admin button expected by the Maestro POS audit flow.
   - Added direct Diagnosis trainer entries for current microdiagnoses:
     - `article_a_an`
     - `article_the_specific`
     - `article_zero`
     - `preposition_time_in_on_at`
     - `preposition_place_in_on_at`
     - `verb_present_simple_negative_question`
   - Added CoachToast previews for exact errors:
     - `article_a_an`
     - `preposition_time_in_on_at`
   - Replaced the stale real-log toast check with `getMistakeLogDebugSnapshot()` + `checkCoachToastNeededWithAnalytics()`.
   - Updated the admin seed to write exact POS mistake metadata instead of phrase-only mistakes.

2. `app/pos_analytics_audit.tsx` and `app/_pos_analytics_audit.tsx`
   - Restored the missing `/pos_analytics_audit` dev route.
   - Added the expected Maestro IDs:
     - `screen-pos-analytics-audit`
     - `pos-audit-release-ready`
     - `pos-audit-release-coverage`
     - `pos-audit-coverage-sources`
     - `pos-audit-runtime-events`

3. `docs/NO_VISIBLE_LOADING_AUDIT.md`
   - Removed a stale reference to deleted `app/suggestion_screen.tsx`.
   - Updated deleted `app/_admin_pos_analytics_audit.tsx` to current `app/_pos_analytics_audit.tsx`.

4. Modal QA follow-up
   - Renamed the admin modal gallery from `Новые модалки (QA core)` to `Активные core-модалки (QA)`.
   - Replaced the stale `ShardRewardModal` admin preview with the current production path:
     `emitAppEvent('shards_earned') -> GlobalShardsEarnedHost -> ShardsEarnedModal`.
   - Removed `ReleaseWaveBonusModal` from active core QA because `_layout.tsx` currently says `releaseWave` is not connected and `RELEASE_WAVE_BONUS_VERSION` / `RELEASE_WAVE_BONUS_SHARDS` are both `0`.
   - Added missing active `_layout` modal previews:
     - `ReleaseNotesModal`
     - `GlobalBroadcastModal`
   - Added `previewOnly` support to `GlobalBroadcastModal` so admin preview does not write claim markers, call cloud, open store URLs, or grant rewards.
   - Switched the league result admin preview from the old compatibility import `ClubResultModal` to the current source of truth `LeagueResultModal`.

5. Second admin sweep
   - Replaced the stale premium preview context `lesson_b1` / "Lesson 19 - B1" with the current `course_after_lesson3` course-lock scenario.
   - Added missing premium contexts for the current trainer paywall:
     - `trainer`
     - `trainer_limit`
   - Renamed the old "Soft Monetization" section to active monetization scenarios and removed old plan wording from comments/titles.
   - Added current TrainerStore admin actions:
     - seed the current "My Practice" store via `devSeedTrainerScenario('overloaded')`
     - clear current TrainerStore via `clearTrainerStore()`
   - Added direct admin routes for current trainer sessions:
     - `/trainer_words_session`
     - `/trainer_phrases_session`
     - `/trainer_arena_session`
     - `/trainer_smart_session?mode=smart_mix`
     - `/trainer_smart_session?mode=weak`
     - `/trainer_smart_session?mode=hard`
   - Marked old `/review` trainer-mode buttons as legacy SRS routes instead of presenting them as the current trainer hub.
   - Fixed the broken league result QA action that called `setOpenSection('league')` even though no `league` section exists. It now triggers the actual week-result preview.

6. Build-level connection gap
   - `functions/src/index.ts` exported `revenueCatShardsWebhook`, but `functions/src/revenuecat_shards.ts` was missing while compiled `functions/lib/revenuecat_shards.js` still existed.
   - Restored the source file so the exported Firebase function is connected at source level and TypeScript can resolve it.

7. Third deep sweep
   - Verified every static admin route target resolves to an `app/*` route file:
     `/audio_debug`, `/arena_results`, `/lesson_complete`, `/premium_modal`, `/trainer_*_session`, `/problem_coach`, `/pos_analytics_audit`, and the tab routes used by admin.
   - Fixed `CoachToast` admin preview: exact-error previews now pass through `priorityScore`, `recoveryScore`, `focusWords`, `microDiagnosisId`, micro labels, and evidence count. Before this, the admin toast could look correct while opening only the diagnosis-specific coach.
   - Fixed `lesson_complete` route-param typing/dependencies for the exact-error flow from lessons:
     `coachMicroDiagnosis`, `coachMicroLabelRu`, `coachMicroLabelUk`, `coachMicroLabelEs`, and `coachDiagnosisEvidenceCount`.
   - Removed duplicate `TTS Debug` from the account section because the same action already exists as a top pinned shortcut.
   - Corrected stale badge counts after the section reshuffle:
     - account: `6`
     - paywall personalization: `6`
     - mistake training / analytics: `35`
     - level-up and gifts: `14`
   - Fixed malformed `.gitignore` pattern `/functions/{` -> `/functions/[{]`; the old pattern made `rg` report an unclosed alternate group and weakened audit searches.

## Personalized Mistake Training Status

Connected:

- Mistake logging is active in lessons, lesson words, irregular verbs, quizzes, review/trainer, exams, and Diagnosis trainer.
- `app/coach_toast_trigger.ts` requires stronger evidence: 3 exact mistakes in the same category, or persistent analytics with enough exact stored evidence.
- `components/CoachToast.tsx` carries `microDiagnosisId`, focus words, labels, priority/recovery, and opens `/problem_coach`.
- `app/problem_coach.tsx` resolves `microDiagnosisId` through `getDiagnosisTraining()`.
- Diagnosis trainings exist for:
  - full MVP: `article_a_an`, `article_the_specific`, `article_zero`, `preposition_time_in_on_at`, `preposition_place_in_on_at`, `preposition_duration_for_since`, `preposition_direction_to_into_from`, `preposition_common_verb_patterns`, `object_order_give_me_it`, `word_order_basic_statement`, `word_order_basic_question`, `verb_present_simple_negative_question`, `verb_present_continuous_basic`, `verb_present_simple_vs_continuous`, `verb_past_simple_regular_irregular`, `verb_was_were`, `future_will_going_to`, `infinitive_vs_gerund_basic`, `too_enough`, `verb_present_simple_statement`, `verb_third_person`, `to_be_present_agreement`, `there_is_are`, `noun_singular_plural_basic`, `modal_base_form`, `pronoun_case`, `pronoun_possessive`, `adjective_comparison`, `adjective_vs_adverb`, `adverb_frequency_position`, `conjunction_logic`, `quantifier_some_any`, `determiner_this_that_these_those`
- Smart Trainer accepts `microDiagnosisId`, `contrastSet`, `focusWords`, `failedItems`, and `recoveredItems`.

Remaining gaps:

- Most microdiagnoses still fall back to broad POS lessons and broad weak pools.
- Diagnosis-specific mastery/progress is still marked as not done in `docs/POS_EXISTING_TRAININGS_EXPORT.md`.
- Admin QA checklist still does not include pass/fail checklist items for CoachToast -> Diagnosis trainer -> Smart Trainer.

## Broken Or Stale Items Found

High:

- `/pos_analytics_audit` was referenced by code, docs, and Maestro, but the route file was missing. Fixed.
- The admin real-log CoachToast test used phrase-only data. Fixed.
- `functions/src/index.ts` exported `revenueCatShardsWebhook` without a source file. Fixed.
- Admin exact-error `CoachToast` previews created microdiagnosis decisions but did not pass microdiagnosis props into `CoachToast`, so they did not validate the exact Diagnosis trainer route. Fixed.
- The admin exact training QA was buried inside analytics. Improved, but it still deserves its own smaller top-level section later.

Medium:

- `lesson_complete` accepted only the broad coach route params in its typed param contract/effect dependencies. Exact microdiagnosis params are now explicit.
- `.gitignore` had a malformed literal `{` ignore pattern, causing `rg` parse warnings during audits. Fixed.
- Several badge counts were stale after the admin panel was reorganized. Fixed the obviously wrong ones.
- The premium-preview list still referenced `lesson_b1` as the main course lock even though the current app has normalized around `course_after_lesson3`. Fixed.
- Current trainer sessions were missing from admin, while old `/review` SRS modes looked like the main trainer. Fixed by adding current routes and labeling legacy routes.
- A league-result admin action pointed to a non-existent accordion section. Fixed.
- `docs/atlas/*` and several older report docs reference removed paths such as `app/(tabs)/hall_of_fame.tsx` and `app/lesson_cards_data.ts`.
- `docs/AUDIT_PROMPT.md` and lesson-card pipeline docs still reference deleted `app/lesson_cards_data.ts`.
- Several admin sections are broad modal galleries, not true end-to-end flow tests. They are useful previews, but their labels should say "preview" where they do not validate real production data paths.
- `components/ShardRewardModal.tsx` still exists but is no longer used by the active app shell; current shard rewards are shown by `GlobalShardsEarnedHost` + `ShardsEarnedModal`.
- `components/ReleaseWaveBonusModal.tsx` still exists for a future release-wave scenario, but the active app queue does not mount it today.
- `components/AfterLesson5PushModal.tsx` remains unreferenced by production screens; keep it out of active admin QA unless the flow is reconnected.

Low:

- TTS Debug is exposed twice: as a top shortcut and again inside account state.
- Badge counts are approximate in some large sections and should be treated as navigation hints, not reliable coverage counts.

## Verification

Passed:

- `npx tsc --noEmit --pretty false`

Latest second-pass verification:

- `npx tsc --noEmit --pretty false`
- `npx jest --runTestsByPath tests/pos_coverage_audit.test.ts tests/trainer_modes.test.ts --no-cache --runInBand --modulePathIgnorePatterns="<rootDir>/tmp/" --modulePathIgnorePatterns="<rootDir>/.claude/" --watchPathIgnorePatterns="<rootDir>/tmp/" --watchPathIgnorePatterns="<rootDir>/.claude/"`

Latest third-pass verification:

- `npx tsc --noEmit --pretty false`
- `npx jest --runTestsByPath tests/pos_coverage_audit.test.ts tests/trainer_modes.test.ts --no-cache --runInBand --modulePathIgnorePatterns="<rootDir>/tmp/" --modulePathIgnorePatterns="<rootDir>/.claude/" --watchPathIgnorePatterns="<rootDir>/tmp/" --watchPathIgnorePatterns="<rootDir>/.claude/"` — 79 tests passed.
- Static admin route scan: all parsed static admin routes resolve to route files.

Verification blockers fixed during this pass:

- `app/lesson_complete.tsx` had a syntax blocker in the Lingman exam unlock text path.
- `components/LingmanCertificateTextPanel.tsx` typed `completedAt` as `string`, while `formatCertDate()` and all certificate callers use numeric timestamps.

Earlier focused checks from this audit:

- `npm run audit:pos`
- `npx jest --runTestsByPath tests/trainer_modes.test.ts tests/pos_coverage_audit.test.ts --no-cache --runInBand --modulePathIgnorePatterns="<rootDir>/tmp/" --watchPathIgnorePatterns="<rootDir>/tmp/"`

Note: a plain repeat Jest run hit a locked temporary bundle artifact under `tmp/`; the focused run above ignores tmp artifacts and passed. Jest also reports duplicate mock/package warnings from `.claude/worktrees`, which are unrelated to these changes.

Focused route scan:

- Admin router pushes now resolve for the static routes used in `_admin_settings_testers.tsx`.
- `/pos_analytics_audit` now has a dev-only route gate and a real dev screen.

## Recommended Next Pass

1. Split the current admin panel into smaller top-level groups: `Pinned QA`, `Mistake Training`, `Monetization`, `Account/Data`, `Modal Previews`, `Legacy`.
2. Add an admin checklist item that validates the full chain:
   `seed exact POS errors -> CoachToast -> Diagnosis trainer microdiagnosis -> Smart Trainer microdiagnosis`.
3. Clean or archive stale generated docs under `docs/atlas/*` and old lesson-card pipeline docs.
4. Decide whether broad modal preview sections should stay in Settings admin or move to a separate QA gallery screen.

