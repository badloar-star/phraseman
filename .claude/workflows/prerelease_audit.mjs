export const meta = {
  name: 'prerelease-audit',
  description: 'Simulate ~100 user scenarios across 12 spheres, find broken text/errors/prod-blockers, verify, rank by risk',
  phases: [
    { title: 'Simulate', detail: '12 sphere agents read real code/copy and report concrete defects' },
    { title: 'Verify', detail: 'adversarially confirm HIGH/CRITICAL findings against the code' },
    { title: 'Synthesize', detail: 'rank by negativity×risk into one report' },
  ],
}

const ROOT = 'C:/appsprojects/phraseman'

const FINDINGS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['sphere', 'scenariosSimulated', 'findings'],
  properties: {
    sphere: { type: 'string' },
    scenariosSimulated: { type: 'number', description: 'how many of the listed scenarios you actually traced through code' },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['scenario', 'category', 'title', 'evidence', 'file', 'userImpact', 'negativity', 'risk', 'confidence'],
        properties: {
          scenario: { type: 'string', description: 'which scenario number/name triggered this' },
          category: { type: 'string', enum: ['broken_text', 'missing_text', 'wrong_language_fallback', 'crash_or_error', 'logic_bug', 'money_bug', 'placeholder_in_prod', 'data_loss', 'stuck_state', 'misleading_copy', 'accessibility', 'other'] },
          title: { type: 'string', description: 'one-line summary of the defect' },
          evidence: { type: 'string', description: 'concrete code excerpt or exact string proving it, with line refs' },
          file: { type: 'string', description: 'file:line' },
          userImpact: { type: 'string', description: 'what the user actually sees/experiences' },
          negativity: { type: 'number', minimum: 1, maximum: 5 },
          risk: { type: 'number', minimum: 1, maximum: 5 },
          confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
        },
      },
    },
  },
}

const VERDICT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['isReal', 'reasoning', 'adjustedNegativity', 'adjustedRisk', 'fix'],
  properties: {
    isReal: { type: 'boolean', description: 'true if the defect genuinely reaches a real user in a prod (store) build' },
    reasoning: { type: 'string', description: 'why real or false-positive — cite the code you re-read' },
    adjustedNegativity: { type: 'number', minimum: 0, maximum: 5 },
    adjustedRisk: { type: 'number', minimum: 0, maximum: 5 },
    fix: { type: 'string', description: 'concrete one-line fix suggestion' },
  },
}

const CTX = `You are auditing the Phraseman React Native app (Expo) at ${ROOT} before a production release.
CRITICAL CONTEXT you must respect:
- 8 interface languages exist (ru, uk, es, pt-BR, vi, id, tr, pl) localized via triLang(lang, {ru, uk, es, ...}).
- BUT in STORE (prod) builds only languages in INTERFACE_LANG_READY_FOR_PROD = ['ru','uk'] are shown to users; 'es' is gated by SPANISH_UI_LOCALE_ENABLED. getVisibleInterfaceLanguageOptions(storeRelease=true) filters to ready langs. So a missing 'vi'/'tr'/'pl' UI string is NOT user-facing in prod (those langs are hidden) — score such findings risk<=2 unless you prove the lang is actually reachable in a store build. Learning CONTENT (quizzes/packs) spans more locales and IS reachable.
- triLang fallback chain: uk->txt.uk, es->txt.es (if enabled), other->txt[lang] ?? txt.es, else->txt.ru. So an omitted non-ru/uk key falls back to SPANISH, not Russian. Flag only where the lang is reachable.
- This is a learning app: lessons, personal plans, quizzes, arena (multiplayer), friends, leagues+chat, paywall/premium (RevenueCat), referrals, streaks/energy/shards, gifts, collectibles, AI dialogs, exams.
- Money paths (paywall/pricing/purchase/premium grant) are HIGHEST risk — fake prices, double-charge, wrong premium grant = negativity 5.
- Some features are flag-gated and OFF in prod (e.g. AI dialog EXPO_PUBLIC_AI_DIALOG_ENABLED default false). If a defect is behind an off-by-default flag, score risk low and SAY SO.
- Speaking/pronunciation must be on-device only (no paid speech service) — flag any paid-speech call.

YOUR JOB: For each scenario, OPEN THE REAL FILES with Read/Grep and trace what the user actually sees. Report ONLY concrete, evidenced defects — broken/missing/wrong-language text, crashes, logic/money bugs, placeholders, data loss, stuck states, misleading copy. Quote the exact string or code with file:line. Do NOT invent hypothetical bugs. If a scenario is clean, don't report it. Distinguish prod-reachable from dev-only. Be skeptical and precise. Use ripgrep/grep generously to find strings across files.`

const SPHERES = [
  {
    key: 'S1-onboarding',
    title: 'Onboarding & first run',
    files: 'app/(tabs)/index.tsx, app/auth_provider.ts, app/onboarding.tsx (search for it), app/stable_id.ts, app/app_resume_policy.ts, app/app_health.ts, app/settings/profile_name_service.ts, components for name entry',
    scenarios: `1. Brand-new RU install: language detection + first-screen copy. 2. Reopen after kill: resume policy, no re-onboard. 3. UK interface: first-run copy in UK not RU. 4. pt-BR/vi/id/tr/pl device in STORE build: what langs shown, what's default. 5. No network during onboarding: sign-in timeout (recent H-ENTER fix), no hard freeze. 6. Force-close mid-onboarding then reopen: partial state. 7. Name entry empty/emoji/50-char/profanity: validation + uniqueness (recall: hardcoded 'ok' uniqueness bug history). 8. No Google account: anon sign-in.`,
  },
  {
    key: 'S2-lessons',
    title: 'Lessons core (lesson1 + data 1-32)',
    files: 'app/lesson1.tsx, app/lesson_data_1_8.ts, lesson_data_9_16.ts, lesson_data_17_24.ts, lesson_data_25_32.ts, app/lesson_complete.tsx, app/lesson_intro_screens*.ts (esp lessonN_v2), app/lesson_lock_system.ts, app/lesson1_distractor_logic.ts, app/lesson_premium_gate.ts',
    scenarios: `9. Lesson1 tap tile: audio+accent+flash. 10. Wrong answer: mistake log, retry, energy cost. 11. Complete lesson: lesson_complete modal (recall P0 fix: ReviewModal vs AchievementNotif collision — verify resolved). 12. Lesson intro v2 screens for lessons 1-22: any empty/missing/placeholder text? 13. Locked lesson 9+ free user: premium gate copy. 14. ES study-target: spanish UI strings vs english fallback. 15. Empty/missing word options: distractor logic must yield exactly 5 distractors (6 options). 16. Hard-mode answer tolerance edge cases.`,
  },
  {
    key: 'S3-personal-plan',
    title: 'Personal plan (Ф4 just shipped)',
    files: 'app/personal_plan_exercise.tsx, personal_plan.tsx, plan_content_*.ts (gavan/voyazh/impuls/mitap/echo), plan_content_registry.ts, personal_plan_day_runtime_*.ts, personal_plan_phrase_explanation.ts, personal_plan_audio_asset_readiness.ts, personal_plan_content_quality_contract.ts, personal_plan_day_reward.ts, personal_plan_thank_you.tsx',
    scenarios: `17. Open plan day: exercises load NOT empty (the \${lessonId}_phrase_\${N} re-key contract — if broken, day is empty). 18. Newly shipped Ф4 plans (Запас/Реплика/Эфир/Атлас/Фокус) days render with content. 19. Plan day with audio: asset readiness, missing asset handling. 20. Phrase explanation non-empty per exercise type. 21. Pronunciation on-device only. 22. Complete day: reward + XP ledger + thank-you. 23. Plan setup/activation/catalog. 24. Day comparison/stats copy. 25. Recovery when day data corrupt.`,
  },
  {
    key: 'S4-quizzes',
    title: 'Quizzes & thematic packs',
    files: 'app/quizzes.tsx, quizzes_screen.tsx, app/quiz_data.ts, quiz_data_es_l2.ts, quiz_thematic_*.ts (at_the_doctor/body_and_health/home_and_rooms/kitchen_and_cooking/shopping_and_money), quiz_daily_limit.ts, quiz_phrases_loader.ts',
    scenarios: `26. Open daily quiz: loads, daily-limit copy free vs premium. 27. Each thematic pack content non-empty + correct answers present. 28. Quiz ES L2 strings. 29. quiz_phrases_loader missing phrase fallback. 30. Hit daily quiz limit: paywall/limit message accurate. 31. Quiz result + share text.`,
  },
  {
    key: 'S5-arena',
    title: 'Arena (multiplayer)',
    files: 'app/arena_lobby.tsx, arena_game.tsx, arena_join.tsx, arena_results.tsx, arena_room.tsx, arena_access_gate.ts, arena_daily_limit.ts, arena_queue_hint.ts, arena_friend_room_guest.ts, arena_bot_profile_write.ts, arena_match_wager.ts',
    scenarios: `32. Open arena: access gate (premium? referral VIP?) copy. 33. Join queue: queue hint text, no hang (watchdog). 34. Match found: opponent name/avatar. 35. Win/lose: results, rating change, share. 36. Arena daily limit hit: message. 37. Friend room create + guest join: room code flow. 38. Abort/disconnect mid-match: orphan cleanup, no stuck state. 39. Bot opponent profile text believable.`,
  },
  {
    key: 'S6-social',
    title: 'Friends, leagues, league chat',
    files: 'app/(tabs)/friends.tsx, app/firestore_friends.ts, app/friend_code.ts, app/friends_self_code_messages.ts, app/friend_gifts.ts, friend_gift_inbox.ts, app/league_screen.tsx, app/league_chat_system.ts, league_chat_moderation.ts, league_chat_blocklist.generated.ts, app/use_league_chat_unread.ts, app/friend_activity_likes.ts',
    scenarios: `40. Search friend by nickname: found. 41. Search friend by 6-char code: found — BUT friend-code vs referral-code confusion (two different 6-char codes exist). 42. Friend request: copy, accept/decline. 43. Send gift: inbox + push text across reachable langs. 44. Own friend code: self-code message. 45. League screen: rank, promotion/demotion copy. 46. League chat: send, blocklist/moderation/profanity filter. 47. Unread badge. 48. Like friend activity: optimistic update.`,
  },
  {
    key: 'S7-paywall-money',
    title: 'Paywall, pricing, premium (MONEY)',
    files: 'app/paywall_a.tsx, paywall_b.tsx, paywall_c.tsx, paywall_copy.ts, paywall_pricing.ts, paywall_trial_info.ts, paywall_trial_offer.ts, paywall_testimonials.ts, paywall_percentile_line.ts, paywall_purchase.ts, paywall_variant.ts, paywall_funnel.ts, app/monetization_policy.ts, app/premium_modal.tsx, premium_context.ts, winback_offer.ts, app/premium_trial_eligibility.ts',
    scenarios: `49. Free user hits paywall: variant A/B/C renders; no double paywall_shown event. 50. Prices: REAL not hardcoded/fake; currency localized (recall: hardcoded-price history). 51. Trial offer copy accurate (toggle-trial dead since 01.2026 — is it still shown?). 52. Purchase success: premium unlock + celebration. 53. Restore: works. 54. Testimonials: real not DRAFT (recall: DRAFT-review-in-v2-prod history). 55. Percentile line believable. 56. Winback copy. 57. Annual vs monthly default. 58. Lifetime price if exists. 59. Premium expiry/grace copy.`,
  },
  {
    key: 'S8-referral',
    title: 'Referral & VIP',
    files: 'app/referral_system.ts, referral_cloud.ts, referral_vip.ts, referral_flags.ts, referrals.tsx, referral_code_entry.tsx, referral_access_activated_modal.tsx, referral_access_ended_modal.tsx, referral_invite_share.ts, referral_clipboard.ts, referral_bootstrap.ts',
    scenarios: `60. Enter referral code: 7-day VIP + activated modal. 61. Share own code: share text + link. 62. Referral qualified (friend reaches lesson1): reward. 63. referral_enabled flag default — is it ON in prod (RC default false history)? 64. VIP ended: ended modal copy. 65. iOS clipboard attribution. 66. Referral-code vs friend-code collision/confusion in UI copy.`,
  },
  {
    key: 'S9-streaks-economy',
    title: 'Streaks, energy, shards, gifts, collectibles',
    files: 'app/streak_freeze.ts, streak_repair.ts, streak_revive.ts, streak_safety.ts, streak_stats.tsx, app/energy_system.ts, energy_shard_refill.ts, app/shards_shop.tsx, shards_shop_catalog.ts, shards_system.ts, app/friend_gift_inbox.ts, app/collectibles_screen.tsx, app/collectibles/*, app/level_gifts_inventory.tsx, level_gift_system.ts',
    scenarios: `67. Daily streak increment: count, week markers. 68. Streak freeze/repair/revive: copy + cost. 69. Streak-risk toast (#8). 70. Out of energy: refill copy, shard refill. 71. Shards shop: buy, catalog prices. 72. Open gift: reward, collectibles claim drop. 73. Collectibles screen: 330 phrases/30 sets render, no broken cards (recall SvgXml fix). 74. Level gift inventory triLang across reachable langs (missing-lang -> es fallback). 75. Billing-issue toast (#2).`,
  },
  {
    key: 'S10-settings-account',
    title: 'Settings, profile, account lifecycle, legal',
    files: 'app/(tabs)/settings.tsx, components/settings/*, app/settings_language.tsx, settings_notifications.tsx, settings_themes.tsx, settings_edu.tsx, settings_invite_friend.tsx, app/legal/* (privacy/terms json), app/privacy_screen.tsx, terms_screen.tsx, app/account_delete_timeout.ts, app/auth_provider.ts (sign out / swap)',
    scenarios: `76. Open settings: all rows render (Telegram-style groups). 77. Change interface language: STORE build shows only ready langs (ru/uk) — verify locked langs hidden, not broken. 78. Change study target: ES/EN switch, content reloads. 79. Notifications toggles copy. 80. Legal: privacy + terms render (EN json + iOS variant) — non-empty, no truncation. 81. Delete account: confirmation + timeout + wipe. 82. Edu/themes/invite. 83. Sign out then re-login: identity preserved (stable_id), no premium dup (recall H3 dup-premium). 84. Switch/swap account: server merge wired to client (recall H2: server merge written but maybe not wired).`,
  },
  {
    key: 'S11-ai',
    title: 'AI features (dialogs, explain, companion)',
    files: 'app/ai_dialog_home.tsx, ai_dialog_session.tsx, ai_dialog_flags.ts, ai_dialog_client.ts, ai_dialog_scenarios.ts, app/ai_mistake_explain_client.ts, ai_mistake_explain_flags.ts, app/explain_phrase_client.ts, explain_phrase_flags.ts, explain_phrase_request.ts, app/ai_companion_session.tsx, ai_companion_memory.ts',
    scenarios: `85. Open AI dialog: flag-gated — is EXPO_PUBLIC_AI_DIALOG_ENABLED default false (so OFF in prod)? Confirm visibility. 86. AI dialog free limit (1/day) copy. 87. Explain-like-I'm-five: 90-140 words, English highlighted, button copy. 88. Mistake explain: false-reject retry-TTL, dedup complaints. 89. Report bad explanation: form copy. 90. AI companion voice session + memory. 91. AI feature on network/API error: friendly error text not raw error/[object Object].`,
  },
  {
    key: 'S12-crosscut',
    title: 'Exam, diagnostic, flashcards, errors, misc surfaces',
    files: 'app/exam.tsx, level_exam.tsx, exam_certificate.ts, exam_readiness.ts, app/diagnostic_test.tsx, app/flashcards.tsx, flashcards_swipe.tsx, flashcards_audio.tsx, flashcards_collection.tsx, app/error_report.ts, client_reports.ts, app/app_messages.ts, release_notes_modal.ts, global_broadcast_modal.ts, app/+not-found.tsx, +native-intent.tsx, components/error_traps or app/error_traps/*',
    scenarios: `92. Diagnostic test: results + training recommendations copy. 93. Level exam: certificate, readiness, share; 10000-XP cap (league-break risk). 94. Flashcards swipe/audio/collection: render, no empty-deck crash. 95. Error report button: submits, friendly message. 96. App messages inbox: no fake inbox, no triple-stacked modals. 97. Release notes modal copy per version. 98. Global broadcast modal renders. 99. Network loss anywhere: graceful, no raw stack/[object Object]/undefined in UI. 100. Deep link / +not-found / native intent: routes + screen copy.`,
  },
]

phase('Simulate')
log(`Simulating ~100 scenarios across ${SPHERES.length} spheres...`)

// pipeline: each sphere simulates, then its HIGH/CRITICAL findings verify as soon as that sphere returns
const HIGH = (f) => (f.negativity * f.risk) >= 12 || f.category === 'money_bug' || f.category === 'data_loss'

const results = await pipeline(
  SPHERES,
  (s) => agent(
    `${CTX}\n\n=== YOUR SPHERE: ${s.title} (${s.key}) ===\nPrimary files to read (use Glob/Grep to locate exact paths under ${ROOT}):\n${s.files}\n\nScenarios to simulate (trace each through the real code):\n${s.scenarios}\n\nReturn structured findings. scenariosSimulated = how many you actually traced. Only evidenced, concrete defects. Quote exact strings/code with file:line.`,
    { label: `sim:${s.key}`, phase: 'Simulate', schema: FINDINGS_SCHEMA, agentType: 'Explore' }
  ),
  async (res, s) => {
    if (!res || !res.findings || res.findings.length === 0) return { sphere: s.title, key: s.key, scenariosSimulated: res?.scenariosSimulated ?? 0, findings: [] }
    const toVerify = res.findings.filter(HIGH)
    const verified = await parallel(toVerify.map((f) => () =>
      agent(
        `${CTX}\n\nAdversarially verify this audit finding from sphere "${s.title}". Re-open the cited file(s) and decide if it GENUINELY reaches a real user in a STORE (prod) build. Be skeptical — many findings are false positives (dev-only flags, hidden languages, unreachable code, already-fixed). Default to isReal=false if you cannot confirm reachability.\n\nFINDING:\n- title: ${f.title}\n- category: ${f.category}\n- file: ${f.file}\n- evidence: ${f.evidence}\n- claimed user impact: ${f.userImpact}\n- claimed negativity: ${f.negativity}, risk: ${f.risk}\n\nReturn your verdict.`,
        { label: `verify:${s.key}:${f.file}`.slice(0, 60), phase: 'Verify', schema: VERDICT_SCHEMA, agentType: 'Explore' }
      ).then((v) => ({ ...f, verdict: v })).catch(() => ({ ...f, verdict: null }))
    ))
    // unverified (lower-severity) findings pass through with no verdict
    const unverified = res.findings.filter((f) => !HIGH(f)).map((f) => ({ ...f, verdict: null }))
    return { sphere: s.title, key: s.key, scenariosSimulated: res.scenariosSimulated, findings: [...verified.filter(Boolean), ...unverified] }
  }
)

phase('Synthesize')
const clean = results.filter(Boolean)
const totalScenarios = clean.reduce((a, r) => a + (r.scenariosSimulated || 0), 0)
const allFindings = clean.flatMap((r) => (r.findings || []).map((f) => ({ ...f, sphere: r.sphere, sphereKey: r.key })))

// Drop findings that verification refuted; keep unverified (lower-sev) and confirmed
const surviving = allFindings.filter((f) => !f.verdict || f.verdict.isReal !== false)
const refuted = allFindings.filter((f) => f.verdict && f.verdict.isReal === false)

// composite score (use adjusted if verified)
const scored = surviving.map((f) => {
  const neg = f.verdict && typeof f.verdict.adjustedNegativity === 'number' ? f.verdict.adjustedNegativity : f.negativity
  const risk = f.verdict && typeof f.verdict.adjustedRisk === 'number' ? f.verdict.adjustedRisk : f.risk
  return { ...f, effNeg: neg, effRisk: risk, composite: neg * risk, fix: f.verdict?.fix || null }
}).sort((a, b) => b.composite - a.composite)

return {
  totalScenarios,
  spheres: clean.map((r) => ({ key: r.key, sphere: r.sphere, simulated: r.scenariosSimulated, findingCount: (r.findings || []).length })),
  counts: {
    total: scored.length,
    refutedByVerification: refuted.length,
    critical: scored.filter((f) => f.composite >= 16).length,
    high: scored.filter((f) => f.composite >= 9 && f.composite < 16).length,
    medium: scored.filter((f) => f.composite >= 4 && f.composite < 9).length,
    low: scored.filter((f) => f.composite < 4).length,
  },
  findings: scored,
  refuted: refuted.map((f) => ({ title: f.title, file: f.file, sphere: f.sphere, why: f.verdict?.reasoning })),
}
