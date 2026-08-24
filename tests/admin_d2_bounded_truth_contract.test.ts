import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const html = fs.readFileSync(path.join(root, 'admin/v2/legacy.html'), 'utf8');

function block(start: string, end: string): string {
  const from = html.indexOf(start);
  const to = html.indexOf(end, from + start.length);
  expect(from).toBeGreaterThanOrEqual(0);
  expect(to).toBeGreaterThan(from);
  return html.slice(from, to);
}

function lastBlock(start: string, end: string): string {
  const from = html.lastIndexOf(start);
  const to = html.indexOf(end, from + start.length);
  expect(from).toBeGreaterThanOrEqual(0);
  expect(to).toBeGreaterThan(from);
  return html.slice(from, to);
}

function expectLoadedOnlyAfterRead(source: string, flag: string): void {
  const readAt = Math.min(...['await getDocs', 'await getDoc', 'await pabFn', 'await callable', 'await getAdmin', 'await an2Fetch', 'await loadAdminRemoteConfigWorkspace', 'await onboardingSourceFetchRows', 'await revenueFetchRows', 'await Promise.all(', 'await Promise.allSettled', 'await window.fetchUserIdeasShared', 'await loadCompassToggleStates']
    .map((needle) => source.indexOf(needle))
    .filter((index) => index >= 0));
  const loadedAt = source.indexOf(`${flag} = true`);
  expect(readAt).toBeGreaterThanOrEqual(0);
  expect(loadedAt).toBeGreaterThan(readAt);
  expect(source).toContain(`${flag} = false`);
}

describe('Admin D2 bounded and truthful loader contract', () => {
  test('clubs and its archive use ordered cap sentinels and sample-safe copy', () => {
    const clubs = block('window.loadClubsData = async function', 'let _leagueChestArchiveLoaded');
    const archive = block('window.loadLeagueChestArchive = async function', 'function streakMult');
    expect(html).toContain('const CLUBS_PAGE =');
    expect(clubs).toContain("orderBy('weekId', 'desc')");
    expect(clubs).toContain('limit(CLUBS_PAGE + 1)');
    expect(clubs).toContain('window._clubsSourceHealth');
    expect(clubs).toContain('snap.docs.slice(0, CLUBS_PAGE)');
    expect(archive).toContain("orderBy('weekId', 'desc')");
    expect(archive).toContain('limit(LEAGUE_CHEST_ARCHIVE_PAGE + 1)');
    expect(archive).toContain('window._leagueChestArchiveSourceHealth');
    expect(html).toContain('показана ограниченная выборка');
  });

  test('bounded list surfaces use cap+1 and persistent sample/truncation truth', () => {
    const cases: Array<[string, string, string]> = [
      ['window.loadHelpersBoard = async function', 'window.renderHelpersBoard = function', 'HELPERS_PAGE'],
      ['window.loadVipSurveyResponses = async function', 'window.renderVipSurveyResponses = function', 'VIP_SURVEY_PAGE'],
      ['window.fetchUserIdeasShared = async function', 'const XR_REASON_LABELS', 'USER_IDEAS_PAGE'],
      ['window.loadCancelSurveys = async function', '/**', 'CANCEL_SURVEYS_PAGE'],
      ['window.loadUgcPurchases = async function', 'window.renderUgcPurchases = function', 'UGC_PURCHASES_PAGE'],
      ['window.loadDailyPhrases = async function', 'window.renderDailyPhrases = function', 'DAILY_PHRASES_PAGE'],
      ['window.loadCardPacks = async function', 'window.renderCardPacks = function', 'CARD_PACKS_PAGE'],
      ['async function loadShardSurveyResponses()', 'window.renderShardSurveyFeed = function', 'SHARD_SURVEY_RESPONSES_PAGE'],
    ];
    for (const [start, end, cap] of cases) {
      const source = block(start, end);
      expect(source).toContain(`limit(${cap} + 1)`);
      expect(source).toContain('truncated');
    }
    expect(html).toContain('в загруженной выборке');
  });

  test('community queues filter before ordered cap+1 and disclose truncation', () => {
    const reports = block('window.loadCommunityPackReports = async function', 'function renderCommunityPackReports');
    const submissions = block('window.loadCommunitySubmissions = async function', 'window.loadActiveCommunityPacks = async function');
    const active = block('window.loadActiveCommunityPacks = async function', '// ── REPORTS');
    expect(reports).toContain("where('status', '==', status)");
    expect(reports).toContain('limit(COMMUNITY_REPORTS_PAGE + 1)');
    expect(reports).toContain('_communityPackReportsHealth');
    expect(submissions).toContain('limit(COMMUNITY_SUBMISSIONS_PAGE + 1)');
    expect(submissions).toContain('_communitySubmissionsHealth');
    expect(active).toContain('limit(COMMUNITY_ACTIVE_PAGE + 1)');
    expect(active).toContain('_communityActiveHealth');
  });

  test('reports, user reports, website inbox, audit and paywall set loaded only after success', () => {
    expectLoadedOnlyAfterRead(block('window.loadReports = async function', '// ── CLUB NAMES'), 'window._reportsLoaded');
    expectLoadedOnlyAfterRead(block('window.loadUserReports = async function', 'window.loadMoreUserReports'), 'window._userReportsLoaded');
    expectLoadedOnlyAfterRead(block('window.loadWebsiteInbox = async function', 'window.loadMoreWebsiteInbox'), 'window._websiteInboxLoaded');
    expectLoadedOnlyAfterRead(block('window.loadAuditLog = async function', 'window.loadMoreAuditLog'), 'window._auditLoaded');
    expectLoadedOnlyAfterRead(block('window.loadPaywallAb = async function', 'window.savePaywallAb'), 'window._paywallAbLoaded');
  });

  test('paged loaders use cap sentinels instead of exact-cap has-more guesses', () => {
    const cases: Array<[string, string, string]> = [
      ['window.loadReports = async function', '// ── CLUB NAMES', 'REPORTS_PAGE'],
      ['window.loadUserReports = async function', 'window.loadMoreUserReports', 'USER_REPORTS_PAGE'],
      ['window.loadWebsiteInbox = async function', 'window.loadMoreWebsiteInbox', 'WEBSITE_INBOX_PAGE'],
      ['window.loadAuditLog = async function', 'window.loadMoreAuditLog', 'AUDIT_PAGE'],
    ];
    for (const [start, end, cap] of cases) {
      const source = block(start, end);
      expect(source).toContain(`limit(${cap} + 1)`);
      expect(source).toContain(`slice(0, ${cap})`);
      expect(source).not.toContain(`snap.size === ${cap}`);
    }
  });

  test('ideas/explain/cache/compass clear false success and preserve source failures', () => {
    const ideas = block('window.loadUserIdeas = async function', 'window.filterUserIdeas');
    const explain = block('window.loadExplainReports = async function', 'window.filterExplainReports');
    const cache = block('window.loadExplainCache = async function', 'window.filterExplainCache');
    const compass = block('window.loadCompassAdmin = async function', '// ── APP MESSAGES INBOX');
    expectLoadedOnlyAfterRead(ideas, 'window._userIdeasLoaded');
    expectLoadedOnlyAfterRead(explain, 'window._explainReportsLoaded');
    expectLoadedOnlyAfterRead(cache, 'window._explainCacheLoaded');
    expectLoadedOnlyAfterRead(compass, 'window._compassAdminLoaded');
    expect(explain).toContain('Promise.allSettled');
    expect(explain).toContain('_explainReportsSourceHealth');
    expect(cache).toContain('_explainCacheSourceHealth');
    expect(compass).not.toMatch(/await loadCompassToggleStates\(\);\s*cmStatus\('Загружено'/);
  });

  test('App Messages child reads are bounded and failures never become empty arrays or zero', () => {
    const read = block('async function loadAppMessageReactionCounts', 'function renderSettingsMessageSlots');
    const detail = block('window.openAppMessageEngagement = async function', '// ── Remote Config');
    const cleanup = block('const APP_MESSAGE_ENGAGEMENT_PAGE', 'window.deleteAppMessage = async function');
    for (const source of [read, detail]) {
      expect(source).toContain('APP_MESSAGE_ENGAGEMENT_PAGE + 1');
      expect(source.toLowerCase()).toContain('truncated');
      expect(source).not.toContain("collection(db, 'app_messages', messageId, 'reactions'));");
    }
    expect(cleanup).toContain('limit(APP_MESSAGE_DELETE_BATCH)');
    expect(cleanup).not.toContain("catch(() => ({ docs: [] }))");
    expect(html).not.toMatch(/(reactions|poll_votes)[\s\S]{0,180}catch\(\(\) => \(\{ docs: \[\] \}\)\)/);
  });

  test('user economy child journals are bounded and partial evidence never becomes a numeric balance', () => {
    const visible = block('async function fillVisibleShardBalances', 'async function loadShardsRealBalance');
    const detail = block('async function loadShardsRealBalance', 'function shardsSection');
    for (const source of [visible, detail]) {
      expect(source).toContain('limit(SHARD_BALANCE_EVENT_PAGE + 1)');
      expect(source).toContain('truncated');
      expect(source).toContain('—');
    }
    expect(html).not.toContain("getDocs(collection(db, 'users', uid, 'external_economy_events'))");
  });

  test('user 360 lazy sources preserve failures instead of rendering clean or empty zeros', () => {
    const source = block('window.u360LoadLazySection = async function', 'window._userIdeasLoaded = false');
    expect(source).not.toContain('.catch(() => [])');
    expect(source).toContain('Promise.allSettled');
    expect(source).toContain('u360PartialNotice');
    expect(source).toContain('Источник недоступен');
    expect(source).toContain("violationCount == null ? '🚩 —'");
  });

  test('promo redemption collection-group feed has a cap sentinel and sample disclosure', () => {
    const source = block('window.loadPromoRedemptions = async function', 'setTimeout(() =>');
    expect(source).toContain('limit(PROMO_REDEMPTIONS_PAGE + 1)');
    expect(source).toContain('slice(0, PROMO_REDEMPTIONS_PAGE)');
    expect(source).toContain('truncated');
    expect(source).toMatch(/старые активации здесь не показаны/i);
  });

  test('remaining live loaders never set cache success before their authoritative read', () => {
    const cases: Array<[string, string, string]> = [
      ['window.loadAdminEmails = async function', 'window.loadMoreAdminEmails', 'window._adminEmailsLoaded'],
      ['window.loadRemoteConfig = async function', 'window.saveRemoteConfig', 'window._remoteConfigLoaded'],
      ['window.loadControlPanel = async function', 'window.saveControlPanelBool', 'window._controlPanelLoaded'],
      ['window.loadAlertsConfig = async function', 'window.saveAlertsConfig', 'window._alertsLoaded'],
      ['window.loadOpenAiDialogModelConfig = async function', 'window.saveOpenAiDialogModel', '_openAiDialogModelLoaded'],
      ['window.loadOpenAiDialogQuotaConfig = async function', 'window.saveOpenAiDialogQuota', '_openAiDialogQuotaLoaded'],
      ['window.loadOpenAiBudgetDashboard = async function', 'window.loadOnboardingSources', '_openAiBudgetLoaded'],
      ['window.loadOnboardingSources = async function', '// ── 🧭 Экраны онбординга', '_onboardingSourcesLoaded'],
      ['window.loadOnboardingScreens = async function', 'window.previewOnboardingScreens', '_onboardingScreensLoaded'],
      ['window.loadOnboardingFunnel = async function', 'window.loadOnboardingExits', '_onboardingFunnelLoaded'],
      ['window.loadRevenueAnalytics = async function', 'const ADMIN_BADGE_CACHE_MS', '_revenueAnalyticsLoaded'],
      ['window.tnOpenTab = async function', '</script>', 'window._tournamentsLoaded'],
    ];
    for (const [start, end, flag] of cases) expectLoadedOnlyAfterRead(block(start, end), flag);
  });

  test('the final overriding UGC loader is bounded and cannot turn unordered fallback into complete', () => {
    const source = lastBlock('window.loadUgcPurchases = async function', 'window.pmDebouncedRenderUgcPurchases');
    const render = lastBlock('window.renderUgcPurchases = function', '/* Removed optimistic refund override');
    expect(source).toContain('limit(UGC_PURCHASES_PAGE + 1)');
    expect(source).toContain("state:'partial'");
    expect(source).toContain('window._ugcPurchasesLoaded = false');
    expect(source).not.toContain('limit(500)');
    expect(render).toContain('_ugcPurchasesSourceHealth?.complete');
    expect(render).toContain("'—'");
  });

  test('lazy Jarvis and Product Charter flags remain false until their loaders prove complete', () => {
    const switchTab = block('window.switchTab = function(tab, opts)', 'function normalizeAdminTabSearch');
    const jarvis = block('window.loadJarvisAllDecisions = async function', '// ── Журнал подтверждений');
    const charter = block('window.loadProductCharter = async function', 'window.saveProductCharter');
    expect(switchTab).not.toContain('window._jarvisLoaded = true');
    expect(switchTab).not.toContain('window._productCharterLoaded = true');
    expect(jarvis).toContain('window._jarvisLoaded = false');
    expect(jarvis).toContain('window._jarvisLoaded = true');
    expect(charter).toContain('window._productCharterLoaded = false');
    expect(charter).toContain('window._productCharterLoaded = true');
  });

  test('daily phrase saved-count failure stays unknown and never becomes zero', () => {
    const source = block('window.loadDailyPhrases = async function', 'window.renderDailyPhrases = function');
    expect(source).toContain('Promise.allSettled');
    expect(source).toContain('_dailyPhrasesSourceHealth');
    expect(source).toContain('(Number.isFinite(ownCount) ? ownCount : null)');
    expect(source).not.toContain("catch(() => ({ docs: [] }))");
  });

  test('ban list and Ops log are bounded, ordered, and partial-safe', () => {
    const bans = block('window.loadBanList = async function', 'window.renderBanList = function');
    const ops = block('window.loadOpsLog = async function', 'window.filterOpsLog = function');
    expect(bans).toContain("orderBy('bannedAt', 'desc')");
    expect(bans).toContain('limit(BAN_LIST_PAGE + 1)');
    expect(bans).toContain('_banListSourceHealth');
    for (const cap of ['OPS_ADMIN_PAGE', 'OPS_REPORT_PAGE']) expect(ops).toContain(`limit(${cap} + 1)`);
    expect(ops).toContain('window._opsSourceHealth');
    expect(ops).toContain('Показана выборка');
    expectLoadedOnlyAfterRead(ops, 'window._opsLoaded');
  });

  test('Learning V2 pipeline labels its hardcoded state as a static manual checklist', () => {
    const source = block('// ── Пайплайн генератора урока', 'window.v2gPipelineExpandAll');
    expect(html).toContain('Статический ручной чек-лист');
    expect(html).toContain('Перерисовать чек-лист');
    expect(source).toContain('Ручной статус');
    expect(html).not.toContain('Обновить состояние</button>');
  });

  test('embedded beta-testers sample is disclosed from the single live surface', () => {
    const beta = block('<div id="tab-beta-testers"', '<div id="tab-site-admin"');
    expect(beta).toContain('не более 300');
    expect(beta).toContain('старые записи здесь не ищутся');
  });

  test('onboarding sources and exits are globally bounded and partial loads stay retryable', () => {
    const sources = block('async function onboardingSourceFetchRows', 'function onboardingSourceRowsCard');
    const exits = block('window.loadOnboardingExits = async function', 'function revenueCountByDay');
    expect(sources).toContain('ONBOARDING_SOURCE_MAX_ROWS + 1');
    expect(sources).toContain('truncated');
    expect(exits.indexOf('_onboardingExitsLoaded = true')).toBeGreaterThan(exits.indexOf('await getDocs'));
    expect(exits).toContain('_onboardingExitsLoaded = false');
    expect(exits).toContain('if (!truncated) _onboardingExitsLoaded = true');
  });

  test('shard survey config/stat lists use deterministic cap sentinels and incomplete health', () => {
    const source = block('window.loadShardSurveys = async function', 'function renderShardSurveySummary');
    expect(source).toContain('SHARD_SURVEYS_PAGE + 1');
    expect(source).toContain('orderBy(documentId())');
    expect(source).toContain('_shardSurveysSourceHealth');
    expect(source).toContain('window._shardSurveysLoaded = false');
    expect(source).not.toContain('limit(200)');
  });

  test('navigation badge count failures remain unknown and aggregate counts are not artificially capped', () => {
    const source = block('async function adminCount', '// ── Duplicates panel');
    expect(source).not.toContain('return 0;');
    expect(source).not.toContain('limit(999)');
    expect(source).toContain('throw e');
  });

  test('Revenue v2 and onboarding refresh stamps do not claim complete after partial allSettled responses', () => {
    const revenue = block('window.loadAnalyticsFunnelV2 = async function', 'function initAnalyticsFunnelV2');
    const onboarding = block('window.pmRefreshOnboardingAnalytics = async function', 'function pmOnboardingChanges');
    expect(revenue).not.toContain('_an2.loaded = true;');
    expect(revenue).toContain('an2EvidenceComplete');
    expect(onboarding).toContain('_onboardingFunnelLoaded && _onboardingExitsLoaded');
    expect(onboarding).toContain('частично');
  });

  test('Telegram orders and legacy Plus migration use cap sentinels and never mutate an unknown tail', () => {
    const telegram = block('window.loadTelegramPremiumOrders = async function', 'window.openTelegramPremiumOrder');
    const migration = block('window.repairAdminGrantPremiumCompat = async function', 'function appMessageClampDays');
    expect(telegram).toContain('TELEGRAM_PREMIUM_ORDERS_PAGE + 1');
    expect(telegram).toContain('truncated');
    expect(migration).toContain('LEGACY_PLUS_MIGRATION_PAGE + 1');
    expect(migration).toContain('if (truncated)');
    expect(migration.indexOf('if (truncated)')).toBeLessThan(migration.indexOf('for (let offset'));
  });

  test('helper and Plus-survey samples do not become session-complete caches', () => {
    const helpers = block('window.loadHelpersBoard = async function', 'window.renderHelpersBoard = function');
    const vip = block('window.loadVipSurveyResponses = async function', 'window.renderVipSurveyResponses = function');
    const vipRender = block('window.renderVipSurveyResponses = function', 'window.addTestReport');
    expect(helpers).toContain('if (!truncated) window._helpersBoardLoaded = true');
    expect(vip).toContain('if (!truncated) window._vipSurveyLoaded = true');
    expect(vipRender).toContain('загруженной выборке');
  });

  test('user shard-log totals and App Message paywall funnels use cap sentinels', () => {
    const shards = block('async function loadShardLog', 'window.loadHelpersBoard = async function');
    const funnel = block('async function loadSettingsMessageFunnel', 'const APP_MESSAGES_PAGE');
    expect(shards).toContain('SHARD_LOG_PAGE + 1');
    expect(shards).toContain('truncated');
    expect(shards).toContain("truncated ? '—'");
    expect(funnel).toContain('APP_MESSAGE_FUNNEL_PAGE + 1');
    expect(funnel).toContain('funnel-truncated');
    expect(funnel).toContain('campaign.settingsFunnel = null');
  });

  test('daily digest does not turn a failed latest-run read into no saved report', () => {
    const digest = block('window.loadDailyDigest = async function', 'window.generateDailyDigest');
    expect(digest).not.toContain("getDocs(query(collection(db, 'admin_digest_runs'), orderBy('generatedAtMs', 'desc'), limit(1))).catch(() => null)");
    expect(digest).toContain('window._dailyDigestLoaded = false');
  });
});
