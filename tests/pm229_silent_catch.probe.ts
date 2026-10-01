// PM-229 — ратчет «не подавлять ошибки молча».
//
// зачем: PM-229 (A1) — в очередях, outbox, синхронизации и фоновых работах не
// должно быть `catch {}` и `.catch(() => {})` без причины в логе. Годами так
// умирали целые механизмы (прогрев картинок, почта) — и никто не видел.
// Проба считает немые обработчики в app/, components/, modules/, hooks/ и роняет
// прогон, если их больше, чем записано в BASELINE. Список может только
// сокращаться: устаревшая запись (стало меньше) тоже роняет пробу.
//
// Немой = `catch {}` / `catch (e) {}` с пустым телом (комментарии не считаются
// действием) ИЛИ `.catch(() => {})` / `.catch(() => null|undefined|[]|{}|false|0)`
// без единого вызова внутри.
//
// Запуск: npx tsx tests/pm229_silent_catch.probe.ts
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const root = path.resolve(__dirname, '..');
const SCAN_DIRS = ['app', 'components', 'modules', 'hooks'] as const;
const SKIP_DIRS = new Set(['node_modules', '__tests__', 'graphify-out', '__mocks__']);

// Ключ — файл, значение — сколько немых обработчиков разрешено (долг).
// Только сокращать. Новые файлы сюда не добавлять — логируй причину.
const BASELINE: Record<string, number> = {
  'app/(tabs)/friends.tsx': 9,
  'app/(tabs)/home.tsx': 13,
  'app/(tabs)/lessons.tsx': 1,
  'app/(tabs)/settings.tsx': 4,
  'app/_layout.tsx': 125,
  'app/account_delete_quarantine.ts': 4,
  'app/account_delete_restore_client.ts': 2,
  'app/account_switch_backup_restore.ts': 1,
  'app/account_switch_quarantine.ts': 3,
  'app/achievements.ts': 1,
  'app/achievements_screen.tsx': 1,
  'app/age_consent_cloud.ts': 5,
  'app/ai_companion_session.tsx': 1,
  'app/ai_dialog_client.ts': 5,
  'app/ai_dialog_extra_replies_client.ts': 2,
  'app/ai_dialog_hint_economy.ts': 1,
  'app/ai_dialog_ownership.ts': 3,
  'app/ai_dialog_session.tsx': 5,
  'app/ai_mistake_explain_client.ts': 2,
  'app/analytics.ts': 1,
  'app/analytics_consent.ts': 1,
  'app/app_resume_policy.ts': 1,
  'app/app_snapshot_bootstrap.ts': 6, // Q5: чтение Avatar DNA на старте удалено
  'app/audio_session_coordinator.ts': 2,
  'app/auth_clean_install_recovery_flow.ts': 4,
  'app/auth_provider.ts': 26,
  'app/auth_recovery_adoption.ts': 2,
  'app/auth_recovery_boot_gate.ts': 1,
  'app/auth_recovery_flow.ts': 1,
  'app/campaign_dismissals.ts': 1,
  'app/client_reports.ts': 1,
  'app/cloud_restore_coordinator.ts': 1,
  'app/coin_rank.tsx': 1,
  'app/community_pack_create.tsx': 1,
  'app/community_packs/CommunityPackSocialBar.tsx': 2,
  'app/community_packs/PackCommentsSheet.tsx': 1,
  'app/community_packs/communityPackDraftStorage.ts': 2,
  'app/community_packs/functionsClient.ts': 1,
  'app/community_packs/localAuthorPacks.ts': 1,
  'app/community_packs/packAuthorNames.ts': 1,
  'app/community_packs/savedCardSetStaging.ts': 2,
  'app/community_packs/staging.ts': 1,
  'app/content_delivery_migration.ts': 1,
  'app/daily_journey_gift_inbox.ts': 1,
  'app/daily_journey_gift_inventory_adapter.ts': 1,
  'app/daily_journey_home_orchestration.ts': 3,
  'app/daily_journey_production_host.ts': 2,
  'app/daily_phrase_quest.ts': 1,
  'app/daily_phrase_system.ts': 4,
  'app/debug-logger.ts': 2, // PM-228 2026-10-01: 7 → 2 (остались .catch(() => undefined) в цепочке очереди — намеренный разрыв цепочки)
  'app/diagnostic_test.tsx': 2,
  'app/dialogue_v2_prepared_bot_voice_runtime.ts': 1,
  'app/error_report.ts': 3,
  'app/events.ts': 1,
  'app/exam.tsx': 3,
  'app/explain_choice_client.ts': 1,
  'app/explain_phrase_client.ts': 3,
  'app/feedback_client.ts': 1,
  'app/firebase.ts': 12,
  'app/firestore_friend_requests.ts': 4,
  'app/firestore_friends.ts': 1,
  'app/firestore_leaderboard.ts': 7,
  'app/flashcards/CollectionListView.tsx': 1,
  'app/flashcards/FlashcardsHubScreen.tsx': 4,
  'app/flashcards/FlashcardsTabBar.tsx': 2,
  'app/flashcards/PhraseCard.tsx': 1,
  'app/flashcards/SoundService.ts': 5,
  'app/flashcards/collection_view_prefs.ts': 1,
  'app/flashcards/custom_cards_store.ts': 3,
  'app/flashcards/deck_options.ts': 1,
  'app/flashcards/deck_sources.ts': 5,
  'app/flashcards/low_power.ts': 1,
  'app/flashcards/marketplace.ts': 4,
  'app/flashcards/pack_trial_gift.ts': 3,
  'app/flashcards/trainingSources.ts': 9,
  'app/flashcards/useCollectionData.ts': 17,
  'app/flashcards_blitz_session.tsx': 12,
  'app/flashcards_collection.tsx': 2,
  'app/flashcards_market_dev.tsx': 1,
  'app/flashcards_my_packs.tsx': 6,
  'app/flashcards_packs.tsx': 7,
  'app/flashcards_recall_session.tsx': 4,
  'app/flashcards_speaking_session.tsx': 10,
  'app/flashcards_swipe.tsx': 23,
  'app/flashcards_training_setup.tsx': 1,
  'app/friend_activity_likes.ts': 3,
  'app/friends_profiles_batch.ts': 2,
  'app/friends_tab_swr_warm.ts': 1,
  'app/friends_together/nudge_client.ts': 2,
  'app/friends_together/sender_identity.ts': 3,
  'app/friends_together/together_store.ts': 7,
  'app/gift_access_cloud.ts': 2,
  'app/gift_account_storage.ts': 1,
  'app/global_broadcast_modal.ts': 9,
  'app/hall_of_fame_utils.ts': 5,
  'app/interactive_network_quiet.ts': 1,
  'app/intro_full_access.ts': 7,
  'app/invite_code_singleton.ts': 1,
  'app/learning-v2/lesson/[id].tsx': 4,
  'app/learning-v2/session/[id].tsx': 3,
  'app/learning_v2_active_course_catalog_client_v1.ts': 3,
  'app/learning_v2_activity_auxiliary_client.ts': 6,
  'app/learning_v2_activity_released_session_client_v1.ts': 5,
  'app/learning_v2_course_released_session_client_v2.ts': 5,
  'app/learning_v2_course_released_session_client_v3.ts': 6,
  'app/learning_v2_course_session_save_card_v1.ts': 2,
  'app/learning_v2_direct_session_player_v1.tsx': 1,
  'app/learning_v2_new_word_encounter_save_v1.ts': 3,
  'app/learning_v2_telemetry.ts': 1,
  'app/legacy_free_lesson_access.ts': 1,
  'app/lesson1.tsx': 32,
  'app/lesson_bonus_grant.ts': 3,
  'app/lesson_complete.tsx': 18,
  'app/lesson_irregular_verbs.tsx': 2,
  'app/lesson_menu.tsx': 4,
  'app/lesson_premium_gate.ts': 2,
  'app/lesson_words.tsx': 3,
  'app/level_exam.tsx': 3,
  'app/level_exam_attempts.ts': 1,
  'app/level_spin_star_grants.ts': 2,
  'app/manage_subscription.tsx': 3,
  'app/manage_subscription_purchase.ts': 1,
  'app/nickname_guard.ts': 9,
  'app/onboarding_funnel.ts': 7,
  'app/paywall_personalization.ts': 1,
  'app/pending_auth_link.ts': 3,
  'app/phone_state_bootstrap.ts': 1,
  'app/phone_state_preference_bridge.ts': 1,
  'app/phone_state_progress_register_bridge.ts': 1,
  'app/phone_state_runtime.ts': 4,
  'app/practice_rune_settlement.ts': 1,
  'app/premium_activation_event_guard.ts': 1,
  'app/premium_guard.ts': 16,
  'app/premium_revenuecat_state.ts': 1,
  'app/premium_vip_storage.ts': 2,
  'app/preposition_drill.tsx': 3,
  'app/promo_code_client.ts': 1,
  'app/promo_code_entry.tsx': 1,
  'app/public_profile_snapshot.ts': 1,
  'app/push_token_registration.ts': 3,
  'app/release_notes_modal.ts': 1,
  'app/report_reward_bundle.ts': 2,
  'app/revenuecat_account_identity.ts': 1,
  'app/revenuecat_init.ts': 14,
  'app/roulette_spin_client.ts': 3,
  'app/runes_wallet_stats.ts': 2,
  'app/saved_cards_first_run.ts': 3,
  'app/screen_snapshot_store.ts': 2,
  'app/settings_poll_vote.ts': 1,
  'app/shards_pending_grants.ts': 4,
  'app/shards_system.ts': 17,
  'app/stable_id.ts': 14,
  'app/statsCache.ts': 3,
  'app/stats_daily_breakdown.ts': 1,
  'app/streak_stats.tsx': 7,
  'app/support_diagnostics.ts': 4,
  'app/support_report.tsx': 2,
  'app/survey_client.ts': 1,
  'app/survey_offer_cache.ts': 1,
  'app/synthetic_activity_likes.ts': 1,
  'app/synthetic_friend_requests.ts': 1,
  'app/tester_premium_override.ts': 1,
  'app/theme_ownership_store.ts': 1,
  'app/use_learning_v2_activity_action_session_v1.ts': 4,
  'app/use_learning_v2_activity_audio_session_v1.ts': 1,
  'app/use_mistake_explain.ts': 1,
  'app/user_stats.ts': 1,
  'app/user_warning_check.ts': 1,
  'app/vip_survey.ts': 8,
  'components/AddToFlashcard.tsx': 1,
  'components/AiLimitUpsellCard.tsx': 1,
  'components/BillingIssueToastHost.tsx': 5,
  'components/CleanOnboarding.tsx': 27, // D126: 3 немых catch выбора языка теперь логируют причину
  'components/DailyPhraseCard.tsx': 6,
  'components/DialogsTabContent.tsx': 1,
  'components/EnergyContext.tsx': 2,
  'components/EntitlementExpiredHost.tsx': 7,
  'components/ErrorBoundary.tsx': 1,
  'components/ExamResultPreviewAdminModal.tsx': 1,
  'components/ForceUpdateGate.tsx': 1,
  'components/LangContext.tsx': 3,
  'components/PremiumContext.tsx': 23,
  'components/RegistrationPromptModal.tsx': 4,
  'components/ReportReplyHomeBanner.tsx': 1,
  'components/ScreenGradient.tsx': 1,
  'components/SoftContextualUpsellCard.tsx': 1,
  'components/SpeakingPanel.tsx': 2,
  'components/StreakRiskToastHost.tsx': 2,
  'components/ThemeContext.tsx': 1,
  'components/VipSurveyReviewPromptModal.tsx': 4,
  'components/auth_recovery_modal_model.ts': 2,
  'components/dev/DevHubSheet.tsx': 1,
  'components/level-exam/LevelExamIntro.tsx': 1,
  'components/level-exam/LevelExamV2.tsx': 5,
  'components/onboarding_aha/aha_events.ts': 1,
  'components/prize_arc.tsx': 1,
  'components/share_cards/shareCardPng.ts': 5,
  'components/text-integrity/use_text_integrity_probe.ts': 1,
  'components/theory/TheoryLessonView.tsx': 1,
  'components/youtube/YoutubePremiereHero.tsx': 2,
  'components/youtube/YoutubeVideoPhrases.tsx': 1,
  'hooks/phrase_audio_player.ts': 1,
  'hooks/use-audio.ts': 1,
  'hooks/use-flashcards.ts': 2,
  'hooks/usePracticeRunes.ts': 1,
  'hooks/useSessionAttempts.ts': 1,
  'hooks/use_dialogue_v2_prepared_bot_voice_playback.ts': 3,
  'hooks/use_dialogue_v2_voice_message.ts': 7,
  'hooks/use_learning_v2_local_hold_to_talk_v1.ts': 5,
  'hooks/use_managed_spoken_audio_player.ts': 2,
  'hooks/use_reduce_motion.ts': 1,
  'hooks/use_soft_upsell_opportunity.ts': 2,
  'modules/account-session-v2/account_scope_store.ts': 1,
  'modules/audio/expo_sfx_backend.ts': 3,
  'modules/learning-v2/runtime/activity_auxiliary_client_loader_v1.ts': 2,
  'modules/learning-v2/runtime/voice_audio_offline_cache_v1.ts': 1,
  'modules/phone-state/keyed_exclusive_transaction.ts': 1,
  'modules/spire/report_store.ts': 1,
  'modules/spire/task_report_client.ts': 2,
  'modules/voice_minutes/purchase.ts': 1,
  'modules/voice_minutes/wallet.ts': 1,
};

function listSourceFiles(): string[] {
  const out: string[] = [];
  const walk = (dir: string): void => {
    for (const name of readdirSync(dir)) {
      if (SKIP_DIRS.has(name) || name.startsWith('.')) continue;
      const abs = path.join(dir, name);
      if (statSync(abs).isDirectory()) walk(abs);
      else if (/\.(ts|tsx)$/.test(name) && !/\.(test|spec)\.tsx?$/.test(name) && !name.endsWith('.d.ts')) out.push(abs);
    }
  };
  for (const dir of SCAN_DIRS) walk(path.join(root, dir));
  return out;
}

function isSilentValue(expr: ts.Expression): boolean {
  let e = expr;
  while (ts.isParenthesizedExpression(e) || ts.isAsExpression(e)) e = e.expression;
  if (ts.isVoidExpression(e)) return isSilentValue(e.expression);
  if (e.kind === ts.SyntaxKind.NullKeyword || e.kind === ts.SyntaxKind.TrueKeyword
    || e.kind === ts.SyntaxKind.FalseKeyword) return true;
  if (ts.isIdentifier(e) && e.text === 'undefined') return true;
  if (ts.isNumericLiteral(e) || ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e)) return true;
  if (ts.isArrayLiteralExpression(e)) return e.elements.length === 0;
  if (ts.isObjectLiteralExpression(e)) return e.properties.length === 0;
  return false;
}

function isSilentHandler(fn: ts.Expression): boolean {
  if (!ts.isArrowFunction(fn) && !ts.isFunctionExpression(fn)) return false;
  if (ts.isBlock(fn.body)) return fn.body.statements.length === 0;
  return isSilentValue(fn.body);
}

export function countSilent(source: string, fileName = 'x.ts'): number {
  const kind = fileName.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sf = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, kind);
  let n = 0;
  const visit = (node: ts.Node): void => {
    if (ts.isCatchClause(node) && node.block.statements.length === 0) n += 1;
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)
      && node.expression.name.text === 'catch' && node.arguments.length === 1
      && isSilentHandler(node.arguments[0]!)) n += 1;
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return n;
}

if (require.main === module || process.argv[1]?.endsWith('pm229_silent_catch.probe.ts')) {
  const found: Record<string, number> = {};
  let total = 0;
  for (const abs of listSourceFiles()) {
    const n = countSilent(readFileSync(abs, 'utf8'), abs);
    if (n > 0) { found[path.relative(root, abs).replace(/\\/g, '/')] = n; total += n; }
  }
  if (process.argv.includes('--print')) {
    for (const [f, n] of Object.entries(found).sort()) console.log(`  '${f}': ${n},`);
    console.log(`TOTAL ${total}`);
  } else {
    const violations = Object.entries(found)
      .filter(([f, n]) => n > (BASELINE[f] ?? 0))
      .map(([f, n]) => `${f}: немых catch ${n}, разрешено ${BASELINE[f] ?? 0}`);
    const stale = Object.entries(BASELINE)
      .filter(([f, n]) => (found[f] ?? 0) < n)
      .map(([f, n]) => `${f}: осталось ${found[f] ?? 0} из ${n} — сократи BASELINE (ратчет)`);
    if (violations.length + stale.length > 0) {
      console.error('[PM-229] silent catch ratchet:');
      for (const l of [...violations, ...stale]) console.error(`  - ${l}`);
    }
    assert.equal(violations.length, 0, 'PM-229: новые немые catch — залогируй причину (DebugLogger / console.warn с префиксом)');
    assert.equal(stale.length, 0, 'PM-229: BASELINE устарел — сократи (ратчет только уменьшается)');
    console.log(`PM-229 PROBE PASS: silentCatch=${total} files=${Object.keys(found).length}`);
  }
}
