import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const livePath = path.join(root, 'admin/v2/legacy.html');
const html = fs.readFileSync(livePath, 'utf8');
const broadcastSource = fs.readFileSync(path.join(root, 'functions/src/admin_global_broadcast.ts'), 'utf8');
const promoSource = fs.readFileSync(path.join(root, 'functions/src/promo_codes.ts'), 'utf8');
const indexSource = fs.readFileSync(path.join(root, 'functions/src/index.ts'), 'utf8');
const functionsPackage = JSON.parse(fs.readFileSync(path.join(root, 'functions/package.json'), 'utf8')) as {
  scripts: Record<string, string>;
};

function block(start: string, end: string): string {
  const from = html.indexOf(start);
  const to = html.indexOf(end, from + start.length);
  expect(from).toBeGreaterThanOrEqual(0);
  expect(to).toBeGreaterThan(from);
  return html.slice(from, to);
}

function deployTargets(name: string): string[] {
  const command = functionsPackage.scripts[name] || '';
  return [...command.matchAll(/functions:([A-Za-z0-9_]+)/g)].map((match) => match[1]).sort();
}

describe('Admin D2 review truth and server-boundary contract', () => {
  test('snapshot-style admin contracts target only the live legacy surface', () => {
    for (const file of [
      'tests/admin_report_reply_preview_contract.test.ts',
      'tests/admin_onboarding_sources_pagination_contract.test.ts',
      'tests/admin_legacy_mobile_signin_contract.test.ts',
    ]) {
      const source = fs.readFileSync(path.join(root, file), 'utf8');
      expect(source).toContain('admin/v2/legacy.html');
      expect(source).not.toMatch(/['"]admin['"],\s*['"]legacy\.html['"]/);
    }
  });

  test('global broadcasts use only the authenticated callable transport', () => {
    const source = block('let _fnAdminListGlobalBroadcasts', 'const VIP_SURVEY_ID');
    for (const callable of [
      'adminListGlobalBroadcasts',
      'adminPublishGlobalBroadcast',
      'adminDeactivateGlobalBroadcast',
      'adminScrubGlobalBroadcastMetadata',
    ]) expect(source).toContain(`httpsCallable(functionsUs, '${callable}')`);
    expect(source).not.toContain("collection(db, 'global_broadcast_modals')");
    expect(source).not.toMatch(/\b(?:addDoc|updateDoc|getDoc|getDocs)\s*\(/);
    expect(source).toContain('showConfirmModal');
    expect(source).toContain('reason');
    expect(source).toContain('idempotencyKey');
    expect(source).toContain('requestId');
    expect(source).toContain('historyTruncated');
  });

  test('broadcast server exports an AppCheck-off singular command and an exact deploy profile', () => {
    expect(broadcastSource).toContain('ADMIN_SENSITIVE_WRITE_OPTIONS');
    expect(broadcastSource).not.toContain('enforceAppCheck: ENFORCE_APP_CHECK');
    expect(broadcastSource).toContain('export const adminDeactivateGlobalBroadcast = onCall(');
    expect(broadcastSource).toContain('limit(input.limit + 1)');
    expect(broadcastSource).toContain('historyTruncated');
    expect(indexSource).toContain('adminDeactivateGlobalBroadcast,');
    expect(deployTargets('deploy:admin-global-broadcast')).toEqual([
      'adminDeactivateGlobalBroadcast',
      'adminListGlobalBroadcasts',
      'adminPublishGlobalBroadcast',
      'adminScrubGlobalBroadcastMetadata',
      'adminVerifyGlobalBroadcastPrivacyReadiness',
      'flashcardPackGiftGrantGlobalBroadcast',
      'globalBroadcastClaim',
      'globalBroadcastListActive',
    ]);
  });

  test('legacy Revenue Analytics delegates to the bounded server projection', () => {
    const source = block('window.loadRevenueAnalytics = async function loadRevenueAnalytics', 'const ADMIN_BADGE_CACHE_MS');
    const retiredBoundary = block('async function revenueSafeGetDocs(', 'window.loadRevenueAnalytics = async function loadRevenueAnalytics');
    expect(source).toContain('an2Fetch');
    expect(source).toContain('an2EvidenceComplete');
    expect(source).not.toContain('revenueFetchRows(');
    expect(source).not.toMatch(/\bgetDocs\s*\(/);
    expect(source).toContain("'—'");
    expect(retiredBoundary).not.toMatch(/collection\(db, '(?:app_activity|revenuecat_premium_events|revenuecat_shard_transactions)'\)/);
    expect(retiredBoundary).not.toMatch(/\bgetDocs\s*\(/);
  });

  test('User360 uses cap sentinels and propagates per-source completeness', () => {
    const query = block('async function u360Query(', 'function u360MergeRowsById');
    const lazy = block('window.u360LoadLazySection = async function', 'window._userIdeasLoaded = false');
    expect(query).toContain('limit(lim + 1)');
    expect(query).toContain('truncated');
    expect(query).toContain('complete');
    expect(lazy).toContain('u360SourceComplete');
    expect(lazy).toContain('загруженной выборке');
    expect(lazy).toContain('Источник недоступен');
  });

  test('full email export refuses a false-full result at the 200-page ceiling', () => {
    const source = block('window.loadAllAdminEmailsForExport = async function', 'window.setAdminEmailSource');
    expect(source).toContain('pages >= 200');
    expect(source).toContain('state.hasMore');
    expect(source).toContain("status:'error'");
    expect(source).toMatch(/неполный|не заверш[её]н|лимит/i);
  });

  test('clubs, archive, cancellation surveys, and nav cache only after complete success', () => {
    const clubs = block('window.loadClubsData = async function', 'const LEAGUE_CHEST_ARCHIVE_PAGE');
    const archive = block('window.loadLeagueChestArchive = async function', 'function streakMult');
    const cancel = block('window.loadCancelSurveys = async function', '/**');
    const nav = block('window.loadAdminNavLayout = async function', 'function decodeAdminMojibake');
    expect(clubs).toContain('if (!truncated) window._clubsLoaded = true');
    expect(archive).toContain('if (!truncated) _leagueChestArchiveLoaded = true');
    expect(cancel).toContain('if (!truncated) window._cancelSurveysLoaded = true');
    expect(nav.indexOf('window._adminNavLayoutLoaded = true')).toBeGreaterThan(nav.indexOf('await getAdminGetAdminConfigWorkspaceCallable'));
    expect(nav).toContain('window._adminNavLayoutLoaded = false');
  });

  test('promo list returns cap sentinels and UI discloses both truncated samples', () => {
    expect(promoSource).toContain('.limit(safeLimit + 1)');
    expect(promoSource).toContain('.limit(redemptionLimit + 1)');
    expect(promoSource).toContain('codesTruncated');
    expect(promoSource).toContain('redemptionsTruncated');
    const ui = block('window.loadPromoCodes = async function', 'function promoFormatDateTime');
    expect(ui).toContain('codesTruncated');
    expect(ui).toContain('redemptionsTruncated');
    expect(ui).toMatch(/старые.*не (?:показаны|ищутся)/i);
  });

  test('embedded site wrapper discloses both frozen sample ceilings', () => {
    const site = block('<div id="tab-site-admin"', '<!-- REPORTS TAB -->');
    expect(site).toMatch(/(?:100|≤\s*100)[^<]{0,80}веб-заказ/i);
    expect(site).toMatch(/(?:50|≤\s*50)[^<]{0,80}Telegram/i);
    expect(site).toMatch(/старые[^<]{0,80}не (?:показаны|ищутся)/i);
  });

  test('overview trends are bounded/server projected and failures cannot become zero series', () => {
    const site = block('async function overviewTrendEnsureSite()', 'async function overviewTrendEnsureRevenue()');
    const revenue = block('async function overviewTrendEnsureRevenue()', 'function overviewTrendLoadFor');
    expect(site).not.toContain('Promise.all(days.map');
    expect(site).toContain('OVERVIEW_TREND_MAX_DAYS + 1');
    expect(site).toContain('truncated');
    expect(site).not.toContain('_overviewTrend.site = {};');
    expect(revenue).toContain("httpsCallable(functionsUs, 'adminGetAnalyticsTrends')");
    expect(revenue).not.toMatch(/\bgetDocs\s*\(/);
    expect(revenue).not.toContain('_overviewTrend.revenue = {};');
  });

  test('onboarding color never scans then filters an unbounded client sample', () => {
    const source = block('async function loadOnboardingColorStats(', 'function bindOnboardingColorStatsControl');
    const retiredBoundary = block('async function loadOnboardingColorStatsRetiredUnsafe(', 'function bindOnboardingColorStatsControl');
    expect(source).not.toMatch(/\bgetDocs\s*\(/);
    expect(source).toMatch(/авторитетн|недоступ/i);
    expect(source).not.toContain("if (r.context !== 'onboarding') return");
    expect(retiredBoundary).not.toMatch(/\bgetDocs\s*\(/);
  });

  test('bounded zero states never claim global emptiness from a partial sample', () => {
    const bans = block('window.renderBanList = function', 'function applyCleanPremiumChrome');
    const cancel = block('window.renderCancelSurveys = function', 'window.loadUgcPurchases = async function');
    const daily = block('window.renderDailyPhrases = function', 'window.dpDrop = async function');
    const cards = block('window.renderCardPacks = function', 'window.viewCardPackContent');
    for (const source of [bans, cancel, daily, cards]) {
      expect(source).toContain('загруженной выборке');
      expect(source).toMatch(/complete|SourceHealth/);
    }
    expect(bans).not.toContain("list.innerHTML = '<div class=\"reports-empty\">No users in the ban list.</div>'");
    expect(cancel).not.toContain("list.innerHTML = '<div class=\"reports-empty\">No cancel surveys for this filter.</div>'");
    expect(daily).not.toContain("empty.textContent = 'No daily phrases for this filter.'");
    expect(cards).not.toContain("list.innerHTML = '<div class=\"reports-empty\">No card packs for this filter.</div>'");
  });
});
