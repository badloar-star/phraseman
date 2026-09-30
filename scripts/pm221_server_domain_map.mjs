// PM-221 «Карта серверных доменов и владельцев».
// зачем: A1 — каждая function/trigger/cron привязана к сохраняемой возможности;
// A2 — auth/purchases/delete/support НИКОГДА не считаются мусором автоматически.
// Источник функций — атлас (scripts/server_decision_atlas), поверх него
// добавляем «домен / возможность / статус». Ничего не проверяется на проде:
// это статическая классификация по имени, файлу и живому экспорту index.ts.
import { readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import { buildServerDecisionAtlas } from './server_decision_atlas/catalog.mjs';

export const SERVER_ROUTE_TYPES = ['callable', 'http', 'schedule', 'firestore-trigger'];
export const DOMAINS = ['auth', 'purchases/subscriptions', 'account-delete', 'support/reports', 'content/video', 'notifications', 'sync/progress', 'admin', 'ai/audio', 'learning-v2', 'social/friends', 'spire/arena', 'retired-tombstone', 'other'];
export const STATUSES = ['keep', 'retired-tombstone', 'needs-owner-decision'];
// зачем: A2 — эти домены принудительно keep, что бы ни говорили остальные правила.
export const PROTECTED_DOMAINS = ['auth', 'purchases/subscriptions', 'account-delete', 'support/reports'];
const TYPE_LABEL = { callable: 'callable', http: 'http', schedule: 'schedule', 'firestore-trigger': 'trigger' };

const C_PURCH = 'Покупки, подписка Plus, промокоды, подарки и возвраты';
const C_DEL = 'Удаление аккаунта и восстановление в срок отсрочки';
const C_AUTH = 'Вход, стабильная личность, восстановление и слияние аккаунтов';
const C_SUP = 'Почта поддержки: чтение, ответы, автоматизация';
const C_REP = 'Жалобы и обратная связь пользователей, очередь разбора и ответы';
const C_MAX = 'Раздел MAX (голосовой звонок с ИИ) — законсервирован владельцем 2026-09-04';
const C_TOUR = 'Турниры — выключены владельцем 2026-08-23/09-02; модули живут ради Арены';
const C_ARENA = 'Арена: матчи, заходы, витрина звёзд, партнёры';
const ARENA_WHY = 'Арену в 2.0 заменяет Шпиль; удаление решает владелец (пул заданий сохранить)';
const C_SPIRE = 'Шпиль: группы, шаги, недельная финализация, паки';
const C_SOC = 'Друзья, рефералы, идеи, публичный профиль, имена и сообщество наборов';
const C_NOTIF = 'Уведомления, push, письма, объявления в приложении и алерты владельцу';
const C_L2 = 'Курс Learning V2 и учебный прогресс: выдача сессий, награды, фабрика контента';
const C_VID = 'Видео-фразы, наборы из видео и каталог YouTube';
const C_AI = 'ИИ: диалоги, репетитор, объяснения, переводы и бюджет OpenAI';
const C_SYNC = 'Связка записи профиля пользователя, квесты и регламентные сверки';
const C_ADM = 'Админка и аналитика владельца (Jarvis, конфиги, аудит, кошельки, пользователи)';

// n — regex по имени, f — regex по пути внутри functions/src. Первое совпадение побеждает.
// Защищённые домены идут ПЕРВЫМИ, чтобы admin-префикс не утянул их в «admin».
const RULES = [
  { n: /^(collectiblesClaimDrop|COLLECTIBLES_RETIRED_MESSAGE)$/u, d: 'retired-tombstone', c: 'Вежливый отказ старым клиентам за снятые коллекционные дропы' },
  { f: /help_board_decommission|collectibles_retired/u, d: 'retired-tombstone', c: 'Вежливый отказ старым клиентам за снятые Help Board / Compass / дропы' },
  { n: /^ACCOUNT_DELETE_RETRY_OPTIONS$/u, d: 'account-delete', c: 'Опции повтора воркера удаления аккаунта (константа, не функция — ложное срабатывание атласа)' },
  { n: /accountDelete|AccountDeletion|DeleteDuplicateUser/u, d: 'account-delete', c: C_DEL },
  { f: /^account_delete/u, d: 'account-delete', c: C_DEL },
  { n: /^(auth|accountClaim|accountMerge|adminRepairAuthLink|adminRelinkProvider|adminRequestUserMerge)/u, d: 'auth', c: C_AUTH },
  { f: /^(auth_|account_claim|account_merge|admin_auth_repair)/u, d: 'auth', c: C_AUTH },
  { n: /^recordAgeConsentSnapshot$/u, d: 'auth', c: 'Фиксация возрастного согласия (приватность и вход)' },
  { n: /support|Support/u, d: 'support/reports', c: C_SUP },
  { f: /^support_inbox/u, d: 'support/reports', c: C_SUP },
  { n: /^(submitClientReport|submitExplainReport|adminReplyToReport|claimReportReward|adminDraftReportReply|adminListReportQueue|adminExportReportDocuments|adminExportUnresolvedReports|adminUpdateReportStatus|adminResolveUserReport|adminAlertOnUserReport|adminAlertOnContentReport|reportUserIdea|adminAlertOnUserIdeaReport|adminListSafetyFlags|adminMarkSafetyFlagsHandled|maxVoiceSafetyReport)$/u, d: 'support/reports', c: C_REP },
  { n: /^(submitFeedbackEntry|adminListFeedbackEntries|adminGetFeedbackStats|adminSummarizeFeedback|adminAlertOnFeedbackCreated|adminAlertOnCancelSurvey|submitWebsiteContact)$/u, d: 'support/reports', c: C_REP },
  { n: /premium|Premium|purchase|Purchase|revenueCat|RevenueCat|stripe|Stripe|paypal|PayPal|webCheckout|webPrices|webOrderStatus|GiftCertificate|promoCode|PromoCode|adminPublishPaywall|adminGetPaywall|adminSubscription|adminListPromo|introFullAccessClaim|TelegramPremium|adminInspectTelegram|vipRevoke|Vip|adminGrantAccess|CoinExchange|exchangeCoinsForStars|recalcCoinExchangeRate|voiceMinuteWallet|adminGrantVoiceMinutes|aiDialogBuyExtraReplies|aiDialogSyncPurchase|Refund|webLead|webActivation|adminCancelStripe|ShardRefunds/u, d: 'purchases/subscriptions', c: C_PURCH },
  { f: /^(web_checkout|web_leads|web_activation|premium_expiry|revenuecat|promo_codes|gift_access|learning_v2_access|telegram_premium|coin_exchange|vip_|admin_referral_purchase|admin_shard_refunds|admin_subscription|admin_paywall|admin_revenuecat)/u, d: 'purchases/subscriptions', c: C_PURCH },
  // --- вне защищённых доменов ---
  { n: /^(devRunesGrant|devShardsGrant|referralDevGrantSpin|arenaV2DevFriendBotCreate)$/u, d: 'other', c: 'Разработческая выдача валюты/спина (флаги выключены по умолчанию)', s: 'needs-owner-decision', why: 'dev-выдача: нужно решение владельца, оставлять ли в проде' },
  { n: /^(maxVoice|adminListMaxVoiceFeedback|submitMaxVoiceFeedback|adminGetMaxVoiceOpsDashboard|voiceMinuteDevGrant)/u, d: 'ai/audio', c: C_MAX, tomb: true },
  { f: /^(max_voice|voice_minutes_dev_grant)/u, d: 'ai/audio', c: C_MAX, tomb: true },
  { n: /ournament/u, d: 'spire/arena', c: C_TOUR, tomb: true },
  { f: /^(tournament|admin_tournament)/u, d: 'spire/arena', c: C_TOUR, tomb: true },
  { n: /^(arena|adminArena)/u, d: 'spire/arena', c: C_ARENA, s: 'needs-owner-decision', why: ARENA_WHY },
  { f: /^(arena_|admin_arena)/u, d: 'spire/arena', c: C_ARENA, s: 'needs-owner-decision', why: ARENA_WHY },
  { n: /^(spire|adminSpire)/u, d: 'spire/arena', c: C_SPIRE },
  { f: /^(spire_|admin_spire)/u, d: 'spire/arena', c: C_SPIRE },
  { n: /^(friend|referral|adminSpin|adminSetSpinWeights|adminSetReferralRoulette|adminReferral|adminRevokeReferral|adminListReferrals|adminGetReferralDashboard|adminAlertOnReferral|likeUserIdea|unlikeUserIdea|submitUserIdea|updateUserIdea|listPublicUserIdeas|getPublicUserIdea|adminListUserIdeas|adminDeleteUserIdea|adminSetUserIdea|adminDecideUserIdea|adminDraftIdeaDecision|adminRestoreUserIdea|adminSetIdeaSubmission|name(Check|Generate|Reserve|Release)|publicProfileProjectMine|communit|flashcardPackGift|customCardMilestoneNotify|adminRefundCommunityPackPurchase)/u, d: 'social/friends', c: C_SOC },
  { f: /^(friend|referral|admin_referrals|leaderboard|community_pack|user_idea|public_profile|custom_card)/u, d: 'social/friends', c: C_SOC },
  { n: /^(notifyOn|onAppMessage|adminPushJob|adminAlert|adminSendPersonalAppMessage|adminListAppMessages|adminCreateAppMessage|adminSetAppMessageActive|adminUpdateAppMessage|adminDeleteAppMessage|adminCleanupExpiredAppMessages|adminLaunchVip|adminDeactivateVip|adminEmail|emailUnsubscribe|reEngagePushCron|globalBroadcast|adminListGlobalBroadcasts|adminPublishGlobalBroadcast|adminDeactivateGlobalBroadcast|adminScrubGlobalBroadcast|adminVerifyGlobalBroadcast|adminPublishHomeHints|adminGetHomeHintsCatalog|myCron|userNotificationsCleanupCron)/u, d: 'notifications', c: C_NOTIF },
  { f: /^(admin_alert|admin_push|admin_email|admin_app_messages|admin_global_broadcast|app_messages|user_notifications|global_broadcast|email_unsubscribe|cron_heartbeat|admin_home_hints)/u, d: 'notifications', c: C_NOTIF },
  { n: /^(video|adminGetVideo|adminSaveVideo|adminPublishVideo|adminParseVideo|adminBackfillVideo|adminAlignVideo|adminGetYoutube|adminPublishYoutube|adminRefreshYoutube|youtubeCatalogSyncCron|siteStatsTrack)/u, d: 'content/video', c: C_VID },
  { f: /^(video_|youtube_catalog|site_stats)/u, d: 'content/video', c: C_VID },
  { n: /^(dialogueV2|tutorText|premiumDialog|explain|openAi|aiDialog|adminTranslateMessage|adminGenerateDirectorDigestAudio|adminListMistakeExplanationCache|adminCommunityPack)/u, d: 'ai/audio', c: C_AI },
  { f: /^(dialogue_v2|tutor_text|explain|openai_|ai_dialog|admin_translate|admin_director_digest_audio|admin_explain_cache|admin_community_pack)/u, d: 'ai/audio', c: C_AI },
  { n: /^(learningV2|adminGetLearningV2|adminApproveLearningV2|adminRejectLearningV2|adminPreviewLearningV2|adminPublishAuthoredLearningV2|adminCreateV2|adminSeedV2|adminRunV2|adminConfirmV2|adminImportV2|adminGetV2|adminPrepareV2|adminIssueV2|adminReviewV2|adminApproveV2|adminSubmitV2|adminRequestV2|adminArchiveV2|adminSaveV2|adminPublishV2|adminDeprecateV2|adminValidateV2|authorizeLearningV2|resolveLearningV2|finalizeLearningV2|submitLearningV2|getLearningV2|createRequiredSession|adminGetContentFactory|adminListContentFactory|adminCreateContent|adminRunContent|adminSealCourse|adminReviewCourse|adminEditContentStage|adminListContentStages|adminGetContentStage|adminPreviewContentStage|adminReviewContentStage|adminControlContentStage|adminActivateCourseRelease|adminRollbackCourseRelease|getPublishedCourseRelease|dailyPhrase|mistake|grantMistake|practiceRuneGrant|progressSubmit|progressMigrate|shardsApplyDelta|recordOnboarding|adminGetOnboarding|weeklyReview|statsInsights|submitSettingsPollVote|getActiveShardSurvey|submitShardSurvey|adminWriteShardSurvey|adminDeleteShardSurvey|adminCreateContentStageBulkPlan|adminCreatePlan|adminGetPlan|adminListPlans)/u, d: 'learning-v2', c: C_L2 },
  { f: /^(content_factory|learning_v2|content_stage|admin_content|language_release|daily_phrases|mistake_|progress_events|practice_rune|shards_apply|onboarding_funnel|weekly_review|stats_insights|settings_poll|shard_survey|admin_v2|admin_plans)/u, d: 'learning-v2', c: C_L2 },
  { n: /^(usersWriteRouter|quest|adminWriteQuest|adminActivateQuest|adminArchiveQuest|adminDeleteQuest|adminListQuests|soc2)/u, d: 'sync/progress', c: C_SYNC },
  { f: /^(users_write_router|quests|soc2)/u, d: 'sync/progress', c: C_SYNC },
  { n: /^(admin|jarvis)/u, d: 'admin', c: C_ADM },
  { f: /^(admin_|jarvis\/|warm_instance|openai_budget)/u, d: 'admin', c: C_ADM },
];

function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//gu, '').replace(/(^|[^:'"`])\/\/[^\n]*/gu, '$1');
}

// зачем: «живая» серверная поверхность = имена, реально экспортированные из functions/src/index.ts
// (закомментированные экспорты — это уже снятые владельцем функции).
export function readLiveExports(root = process.cwd()) {
  const code = stripComments(readFileSync(resolve(root, 'functions/src/index.ts'), 'utf8'));
  const names = new Set();
  for (const m of code.matchAll(/\bexports\.([A-Za-z0-9_]+)\s*=/gu)) names.add(m[1]);
  for (const m of code.matchAll(/\bexport\s*\{([^}]*)\}/gu)) {
    for (const part of m[1].split(',')) {
      const t = part.trim().split(/\s+as\s+/u).at(-1);
      if (t) names.add(t);
    }
  }
  for (const m of code.matchAll(/\bexport\s+const\s+([A-Za-z0-9_]+)/gu)) names.add(m[1]);
  return names;
}

export function classify(record, liveExports) {
  const file = record.sourcePath.replace('functions/src/', '');
  const rule = RULES.find((r) => (r.n && r.n.test(record.name)) || (r.f && r.f.test(file)));
  const exported = liveExports.has(record.name);
  const base = { name: record.name, type: TYPE_LABEL[record.routeType], sourcePath: record.sourcePath, line: record.line, exported };
  if (!rule) {
    return { ...base, domain: 'other', capability: 'Не удалось определить возможность по имени и файлу', status: 'needs-owner-decision', reason: 'не классифицировано уверенно' };
  }
  let status = 'keep';
  let reason = 'живая возможность';
  if (rule.d === 'retired-tombstone') { status = 'retired-tombstone'; reason = 'надгробие для старых клиентов'; }
  else if (rule.tomb) {
    status = exported ? 'needs-owner-decision' : 'retired-tombstone';
    reason = exported ? 'помечено как снятое владельцем, но экспорт в index.ts ещё жив' : 'снято владельцем, экспорта в index.ts нет';
  } else if (rule.s) { status = rule.s; reason = rule.why; }
  else if (!exported) { status = 'needs-owner-decision'; reason = 'нет живого экспорта в index.ts и нет записи о решении владельца'; }
  // зачем: A2 — защищённый домен нельзя сделать не-keep.
  if (PROTECTED_DOMAINS.includes(rule.d)) {
    status = 'keep';
    reason = exported ? 'A2: домен защищён (auth/покупки/удаление/поддержка)' : 'A2: домен защищён; живого экспорта в index.ts нет — проверить подключение';
  }
  return { ...base, domain: rule.d, capability: rule.c, status, reason };
}

export function buildDomainMap(root = process.cwd()) {
  const bundle = buildServerDecisionAtlas(root);
  const live = readLiveExports(root);
  const rows = bundle.records.filter((r) => SERVER_ROUTE_TYPES.includes(r.routeType)).map((r) => classify(r, live));
  return { rows, liveExportCount: live.size };
}

function countBy(rows, key) {
  const m = new Map();
  for (const r of rows) m.set(r[key], (m.get(r[key]) ?? 0) + 1);
  return m;
}

export function renderMarkdown({ rows, liveExportCount }) {
  const esc = (s) => String(s).replaceAll('|', '\\|');
  const sorted = [...rows].sort((a, b) => DOMAINS.indexOf(a.domain) - DOMAINS.indexOf(b.domain) || a.name.localeCompare(b.name));
  const out = [];
  out.push('# PM-221 — Карта серверных доменов и владельцев', '');
  out.push('Сгенерировано `node scripts/pm221_server_domain_map.mjs` (детерминированно: без даты и без обращения к сети).', '');
  out.push(`Всего серверных точек (callable/http/schedule/trigger) из атласа: **${rows.length}**. Имён с живым экспортом в \`functions/src/index.ts\`: ${liveExportCount}.`, '');
  out.push('## Сводка по доменам', '', '| Домен | Всего | keep | retired-tombstone | needs-owner-decision |', '|---|---:|---:|---:|---:|');
  for (const d of DOMAINS) {
    const g = rows.filter((r) => r.domain === d);
    if (!g.length) continue;
    out.push(`| ${d} | ${g.length} | ${g.filter((r) => r.status === 'keep').length} | ${g.filter((r) => r.status === 'retired-tombstone').length} | ${g.filter((r) => r.status === 'needs-owner-decision').length} |`);
  }
  const st = countBy(rows, 'status');
  out.push(`| **Итого** | **${rows.length}** | **${st.get('keep') ?? 0}** | **${st.get('retired-tombstone') ?? 0}** | **${st.get('needs-owner-decision') ?? 0}** |`, '');
  out.push('## Правила (A1/A2)', '',
    '- A1: у каждой строки есть домен и сохраняемая возможность одной фразой.',
    '- A2: домены auth, purchases/subscriptions, account-delete, support/reports всегда `keep` — даже если живого экспорта нет (тогда причина прямо говорит «проверить подключение»).',
    '- retired-tombstone только там, где решение владельца записано в `functions/src/index.ts` / CLAUDE.md (MAX, турниры, надгробия Help Board и коллекций) и экспорта нет.',
    '- Всё, что не удалось классифицировать уверенно, либо не экспортируется без записи о решении, — `needs-owner-decision`.', '');
  out.push('## Список needs-owner-decision', '', '| Функция | Тип | Домен | Файл | Причина |', '|---|---|---|---|---|');
  for (const r of sorted.filter((x) => x.status === 'needs-owner-decision')) out.push(`| ${r.name} | ${r.type} | ${r.domain} | ${esc(r.sourcePath)} | ${esc(r.reason)} |`);
  out.push('', '## Полная таблица', '', '| Функция | Тип | Домен | Возможность | Статус | Экспорт index.ts | Файл |', '|---|---|---|---|---|---|---|');
  for (const r of sorted) out.push(`| ${r.name} | ${r.type} | ${r.domain} | ${esc(r.capability)} | ${r.status} | ${r.exported ? 'да' : 'нет'} | ${esc(r.sourcePath)}:${r.line} |`);
  out.push('', '## Честные ограничения', '',
    '- Ничего не проверено на проде и деплое: `firebase functions:list`, реальные вызовы и логи не запускались.',
    '- Классификация статическая — по имени функции, имени файла и разбору `index.ts` без комментариев; ошибки вероятны на границах доменов (например, `admin*`-функции по покупкам/поддержке разобраны по имени, а не по смыслу кода).',
    '- Атлас сканирует только `functions/src`; кодовая база `functions-max` (MAX, снята с деплоя) и админка `admin/v2` в карту не входят.',
    '- Регулярка атласа даёт ложные срабатывания: `COLLECTIBLES_RETIRED_MESSAGE` и `ACCOUNT_DELETE_RETRY_OPTIONS` — константы, а не функции; `adminSummarizeFeedback` виден и как callable, и как schedule.',
    '- «Экспорт index.ts = да» — это наличие имени в неприкомментированном экспорте, а не факт деплоя.',
    '- Домен `other` и статус needs-owner-decision означают «не знаю», а не «мусор».', '');
  return out.join('\n');
}

// зачем: без top-level await и без import.meta — иначе tsx (cjs-режим пробы) не загрузит модуль.
async function main() {
  const map = buildDomainMap(process.cwd());
  const outPath = resolve(process.cwd(), 'docs/phraseman-2.0/evidence/PM-221_server_domain_map.md');
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, renderMarkdown(map), 'utf8');
  const byDomain = Object.fromEntries(countBy(map.rows, 'domain'));
  const byStatus = Object.fromEntries(countBy(map.rows, 'status'));
  process.stdout.write(`PM-221 SERVER DOMAIN MAP: total=${map.rows.length} domains=${JSON.stringify(byDomain)} status=${JSON.stringify(byStatus)}\n`);
}
if ((process.argv[1] ?? '').replaceAll('\\', '/').endsWith('/pm221_server_domain_map.mjs')) void main();
