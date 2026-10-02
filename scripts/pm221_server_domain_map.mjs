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
// зачем (PM-221-A1, 2026-10-01): «dormant» — возможность сохранена решением владельца (D96 Learning V2),
// но у функции нет живого экспорта: в деплой не идёт; «atlas-false-positive» — атлас принял за функцию
// пример из комментария. Оба статуса НЕ означают «мусор» и не дают права удалять.
export const STATUSES = ['keep', 'dormant', 'retired-tombstone', 'atlas-false-positive', 'needs-owner-decision'];
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
const C_ARENA_DEL = 'Арена: матчи, заходы, витрина звёзд, партнёры — удалить (D74/D78/D79); пул заданий Шпиля сохранён отдельным правилом';
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
  // --- решения владельца из docs/phraseman-2.0/03_DECISIONS.md (PM-221-A1, 2026-10-01) ---
  { n: /^myCron$/u, d: 'notifications', c: 'Пример обёртки withCronHeartbeat в doc-комментарии cron_heartbeat.ts — не функция', s: 'atlas-false-positive', why: 'ложное срабатывание атласа: строка в комментарии' },
  { n: /^accountsV2DeletionStatus$/u, d: 'account-delete', c: C_DEL },
  { n: /^accountsV2SyncApply$/u, d: 'sync/progress', c: 'Accounts V2: синхронизация прогресса устройства с аккаунтом (D66: сервер = синхронизация)' },
  // зачем (Account V2, Пакет 6G, OD21): перенос при первом входе и гидрация новой установки.
  { n: /^(accountsV2MigrateMine|accountsV2PullMine)$/u, d: 'sync/progress', c: 'Accounts V2: перенос старых данных при первом входе (OD21) и чтение своей учётки на новой установке' },
  { n: /^cardTtsPackWorker$/u, d: 'ai/audio', c: 'Озвучка карточек OpenAI TTS при одобрении набора (D128)' },
  { n: /^dailyPollVote$/u, d: 'social/friends', c: 'Опрос дня на Главной (решение владельца 30.09)' },
  { n: /^(levelSpinStarGrant|giftsToCoinsMigrationReport)$/u, d: 'purchases/subscriptions', c: 'Кошелёк монет: начисление и серверный админ-отчёт старой миграции подарков (клиент миграции удалён: D148, Q109)' },
  // зачем: E22 2026-10-01 — новые функции в коде обязаны иметь привязку, иначе проба PM-221 (храповик) падает.
  { n: /^coinReconcileV1$/u, d: 'purchases/subscriptions', c: 'Разовая серверная сверка кошелька монет по level_spin_results (Q-COIN (b), решение координатора 01.10)' },
  { n: /^(activationEmailRetryCron|resendKeyHealthCron)$/u, d: 'purchases/subscriptions', c: 'Сторож почты активации: повтор писем и проверка ключа Resend (код перенесён в email_delivery_watchdog.ts 01.10, инцидент 21.09)' },
  { n: /^profileCardBioSetMine$/u, d: 'social/friends', c: 'Визитка профиля: текст «о себе» (D73/D114)' },
  { n: /^(statsInsightsGenerate|weeklyReviewGenerate)$/u, d: 'ai/audio', c: 'ИИ-заметки к статистике и ИИ-разбор ошибок для Plus (OpenAI)', s: 'needs-owner-decision', why: 'экспорта нет, вызова из клиента нет, решения в 03_DECISIONS нет: удалить код или подключить в 2.0' },
  { n: /^(adminArenaConfig|adminArenaContent|adminArenaPublication)/u, d: 'spire/arena', c: 'Пул заданий Шпиля и его админ-публикация (CLAUDE.md: рабочая зависимость Шпиля, D74/D78)' },
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
  { n: /^(devRunesGrant|devShardsGrant|referralDevGrantSpin|arenaV2DevFriendBotCreate)$/u, d: 'other', c: 'Разработческая выдача валюты/спина — удалить (D81/D78)', tomb: true },
  { n: /^tutorText/u, d: 'ai/audio', c: 'Текстовый репетитор с Максом — удалить вместе с MAX (D81)', tomb: true },
  { n: /^cosmeticAssetCatalogGet$/u, d: 'other', c: 'Каталог косметики — удалить (D102/D108)', tomb: true },
  { n: /^(maxVoice|adminListMaxVoiceFeedback|submitMaxVoiceFeedback|adminGetMaxVoiceOpsDashboard|voiceMinuteDevGrant)/u, d: 'ai/audio', c: C_MAX, tomb: true },
  { f: /^(max_voice|voice_minutes_dev_grant)/u, d: 'ai/audio', c: C_MAX, tomb: true },
  { n: /ournament/u, d: 'spire/arena', c: C_TOUR, tomb: true },
  { f: /^(tournament|admin_tournament)/u, d: 'spire/arena', c: C_TOUR, tomb: true },
  { n: /^(arena|adminArena)/u, d: 'spire/arena', c: C_ARENA_DEL, tomb: true },
  { f: /^(arena_|admin_arena)/u, d: 'spire/arena', c: C_ARENA_DEL, tomb: true },
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

// зачем (PM-221, «карта доменов и ВЛАДЕЛЬЦЕВ»): кто отвечает за домен. Решает всегда владелец
// продукта; «сессия» — какая рабочая сессия правит код домена (D40: «Дизайн» — только UI).
export const DOMAIN_OWNERS = {
  auth: 'Логика/сервер (Accounts V2); вход в админку — CLAUDE.md «не ломать»',
  'purchases/subscriptions': 'Логика/сервер (покупки, монеты); цены и пакеты в сторах — владелец',
  'account-delete': 'Логика/сервер',
  'support/reports': 'Логика/сервер + админка legacy.html',
  'content/video': 'Логика/сервер + админка legacy.html',
  notifications: 'Логика/сервер',
  'sync/progress': 'Логика/сервер (D66 local-first)',
  admin: 'Логика/сервер + админка legacy.html; Jarvis — jarvis_data_contract_guard',
  'ai/audio': 'Логика/сервер; бюджет OpenAI — PM-224',
  'learning-v2': 'Логика/сервер + фабрика курса',
  'social/friends': 'Логика/сервер',
  'spire/arena': 'Логика/сервер (Шпиль, D113)',
  'retired-tombstone': 'Логика/сервер (надгробия старым клиентам)',
  other: 'Логика/сервер',
};

// зачем: «коллекции» домена — литералы .collection('x') (включая подколлекции) в файлах его
// функций. Статический разбор строк: имена через константы (collection(SOME_CONST)) не раскрываются.
const COLLECTION_RE = /\.collection\(\s*(['"`])([A-Za-z0-9_-]+)\1/gu;
export function collectionsOf(root, sourcePaths) {
  const found = new Set();
  for (const sp of new Set(sourcePaths)) {
    let code = '';
    try {
      code = readFileSync(resolve(root, sp), 'utf8');
    } catch (err) {
      process.stderr.write(`[PM-221] не прочитан ${sp}: ${err?.message ?? err}\n`);
      continue;
    }
    for (const m of code.matchAll(COLLECTION_RE)) found.add(m[2]);
  }
  return [...found].sort();
}

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
  else if (!exported && rule.d === 'learning-v2') { status = 'dormant'; reason = 'D96: Learning V2 сохраняется в 2.0; экспорта в index.ts нет — в деплой не идёт (подключить или удалить решает задача домена)'; }
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
  const domainCollections = Object.fromEntries(DOMAINS.map((d) => [d, collectionsOf(root, rows.filter((r) => r.domain === d).map((r) => r.sourcePath))]));
  return { rows, liveExportCount: live.size, domainCollections, cloudOnly: readCloudOnly(root) };
}

// --- Облако без кода (PM-007, сверка ядра 3f63c244d) ---
// зачем (PM-221-A1): «каждая function» — это и то, что крутится в облаке, хотя кода в ветке уже нет.
// Полная выкладка удалит такие функции; карта обязана сказать, какие из них уходят по решению,
// а какие уйдут СЛУЧАЙНО. Источник — список в evidence/PM-007 (снят владельцем/ядром, только чтение).
const PM007_PATH = 'docs/phraseman-2.0/evidence/PM-007_code_vs_cloud_functions.md';
const CLOUD_ONLY_RULES = [
  { n: /^(activationEmailRetryCron|resendKeyHealthCron)$/u, d: 'purchases/subscriptions', s: 'keep', why: 'сторож почты активации (инцидент 21.09). Код только в ветке claude/sad-cannon-876ae9 (3d3f7a824, bcfbd5836) — ПЕРЕНЕСТИ до полной выкладки, иначе удалится молча (PM-222 §6)' },
  { n: /^(arena|adminMoveLeague|adminResetLeague|league|leaderboard|computeLeaderboard|resetWeeklyXp)/u, d: 'spire/arena', s: 'retired-tombstone', why: 'Арена/лиги/XP удалены (D02, D74, D78); снять после drain-окна (PM-222)' },
  { n: /^(tutorText|devRunesGrant|devShardsGrant|referralDevGrantSpin)/u, d: 'ai/audio', s: 'retired-tombstone', why: 'D81: репетитор Макса и dev-выдачи удалить' },
  { n: /^(maxVoice|adminGetMaxVoice|adminListMaxVoice|submitMaxVoice)/u, d: 'ai/audio', s: 'retired-tombstone', why: 'MAX законсервирован (CLAUDE.md 2026-09-04)' },
  { n: /^(cosmeticAssetCatalogGet|adminGetCosmeticAssetArchive|adminSetCosmeticAssetSaleStatus)$/u, d: 'other', s: 'retired-tombstone', why: 'D102/D108: косметика удалена' },
  { n: /^(shardsApplyDelta|adminSetShardBalance|adminGetCoinExchangeCenter|adminSetCoinExchangeRate|exchangeCoinsForStars|getCoinExchange|recalcCoinExchangeRate)/u, d: 'purchases/subscriptions', s: 'retired-tombstone', why: 'D70/D78/D84: жемчуг и биржа удалены; клиентский вызов shardsApplyDelta — только досылка старой очереди, not-found снимается как постоянный отказ (PM-222 §6.1)' },
  { n: /^adminRefundCommunityPackPurchase$/u, d: 'purchases/subscriptions', s: 'retired-tombstone', why: 'D110: удалить' },
  { n: /^videoWatchRunesClaim$/u, d: 'content/video', s: 'retired-tombstone', why: 'D78/PM-080 (Q109): руны за просмотр видео удалены, код снят; в облаке функция живёт для 1.6.24 до min_app_version >= 2.0 (DEPLOY_NOW Шаг 2)' },
  { n: /^aiDialogSyncPurchase$/u, d: 'purchases/subscriptions', s: 'retired-tombstone', why: 'D124: покупки диалогов за руны не учитываются; клиентский вызов мёртв (PM-222 §6.1)' },
  { n: /^(levelGift|levelRewardSpin|levelSpinActivatePackGift|friendSendGift|friendThankGift|welcomeGiftClaim)/u, d: 'social/friends', s: 'retired-tombstone', why: 'подарки и спины удалены (D90; Q12/Q13 — остаток переведён в монеты)' },
];

// зачем (Q109, 02.10): код этих функций УДАЛЁН уже ПОСЛЕ снимка PM-007, а в облаке они живут для
// 1.6.24 до min_app_version >= 2.0. Снимок PM-007 только читаем — поэтому добавляем их сюда явно,
// иначе карта «потеряла» бы функцию, а полная выкладка удалила бы её молча.
const CODE_REMOVED_AFTER_PM007 = ['videoWatchRunesClaim'];

export function readCloudOnly(root = process.cwd()) {
  let md = '';
  try {
    md = readFileSync(resolve(root, PM007_PATH), 'utf8');
  } catch (err) {
    process.stderr.write(`[PM-221] нет ${PM007_PATH}: облачная сверка пропущена (${err?.message ?? err})\n`);
    return [];
  }
  const start = md.indexOf('### В облаке, но нет в коде');
  if (start < 0) {
    process.stderr.write('[PM-221] в PM-007 нет раздела «В облаке, но нет в коде» — сверка пропущена\n');
    return [];
  }
  const tail = md.slice(start).split('\n').slice(1);
  const end = tail.findIndex((l) => l.startsWith('### '));
  const names = (end < 0 ? tail : tail.slice(0, end)).flatMap((l) => [...l.matchAll(/`([A-Za-z0-9_]+)`/gu)].map((m) => m[1]));
  return [...new Set([...names, ...CODE_REMOVED_AFTER_PM007])].sort().map((name) => {
    const rule = CLOUD_ONLY_RULES.find((r) => r.n.test(name));
    return rule
      ? { name, domain: rule.d, status: rule.s, reason: rule.why }
      : { name, domain: 'other', status: 'needs-owner-decision', reason: 'в облаке живёт, кода нет, решения в 03_DECISIONS нет — полная выкладка удалит' };
  });
}

function countBy(rows, key) {
  const m = new Map();
  for (const r of rows) m.set(r[key], (m.get(r[key]) ?? 0) + 1);
  return m;
}

export function renderMarkdown({ rows, liveExportCount, domainCollections = {}, cloudOnly = [] }) {
  const esc = (s) => String(s).replaceAll('|', '\\|');
  const sorted = [...rows].sort((a, b) => DOMAINS.indexOf(a.domain) - DOMAINS.indexOf(b.domain) || a.name.localeCompare(b.name));
  const out = [];
  out.push('# PM-221 — Карта серверных доменов и владельцев', '');
  out.push('Сгенерировано `node scripts/pm221_server_domain_map.mjs` (детерминированно: без даты и без обращения к сети).', '');
  out.push(`Всего серверных точек (callable/http/schedule/trigger) из атласа: **${rows.length}**. Имён с живым экспортом в \`functions/src/index.ts\`: ${liveExportCount}.`, '');
  out.push('## Сводка по доменам', '', `| Домен | Всего | ${STATUSES.join(' | ')} |`, `|---|---:|${STATUSES.map(() => '---:').join('|')}|`);
  for (const d of DOMAINS) {
    const g = rows.filter((r) => r.domain === d);
    if (!g.length) continue;
    out.push(`| ${d} | ${g.length} | ${STATUSES.map((s) => g.filter((r) => r.status === s).length).join(' | ')} |`);
  }
  const st = countBy(rows, 'status');
  out.push(`| **Итого** | **${rows.length}** | ${STATUSES.map((s) => `**${st.get(s) ?? 0}**`).join(' | ')} |`, '');
  out.push('## Владельцы и коллекции доменов', '', 'Решения по любому домену принимает владелец продукта; колонка «Сессия» — кто правит код (D40).', '', '| Домен | Сессия | Коллекции Firestore (статический разбор файлов домена) |', '|---|---|---|');
  for (const d of DOMAINS) {
    if (!rows.some((r) => r.domain === d)) continue;
    const cols = domainCollections[d] ?? [];
    out.push(`| ${d} | ${esc(DOMAIN_OWNERS[d] ?? '—')} | ${cols.length ? cols.map((c) => '`' + c + '`').join(', ') : '— (имена через константы)'} |`);
  }
  out.push('');
  out.push('## Правила (A1/A2)', '',
    '- A1: у каждой строки есть домен и сохраняемая возможность одной фразой.',
    '- A2: домены auth, purchases/subscriptions, account-delete, support/reports всегда `keep` — даже если живого экспорта нет (тогда причина прямо говорит «проверить подключение»).',
    '- retired-tombstone только там, где решение владельца записано в `03_DECISIONS.md` / `functions/src/index.ts` / CLAUDE.md (MAX, турниры, Арена D74/D78, tutorText и dev-выдачи D81, косметика D102) и экспорта нет.',
    '- dormant — возможность сохранена решением (D96 Learning V2), но экспорта нет: функция не деплоится. atlas-false-positive — не функция (строка из комментария).',
    '- Всё, что не удалось классифицировать уверенно, либо не экспортируется без записи о решении, — `needs-owner-decision`.', '');
  out.push('## Список needs-owner-decision', '', '| Функция | Тип | Домен | Файл | Причина |', '|---|---|---|---|---|');
  for (const r of sorted.filter((x) => x.status === 'needs-owner-decision')) out.push(`| ${r.name} | ${r.type} | ${r.domain} | ${esc(r.sourcePath)} | ${esc(r.reason)} |`);
  if (cloudOnly.length) {
    const cst = countBy(cloudOnly, 'status');
    out.push('', `## В облаке, но нет в коде (сверка PM-007): ${cloudOnly.length}`, '',
      `Статусы: ${STATUSES.filter((s) => cst.get(s)).map((s) => `${s} ${cst.get(s)}`).join(', ')}. Полная выкладка \`default\` удалит ВСЕ эти функции — keep здесь значит «код надо вернуть в ветку до выкладки».`, '',
      '| Функция | Домен | Статус | Основание |', '|---|---|---|---|');
    for (const r of cloudOnly) out.push(`| ${r.name} | ${r.domain} | ${r.status} | ${esc(r.reason)} |`);
  }
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
