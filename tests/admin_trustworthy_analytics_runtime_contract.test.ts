import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const liveHtml = fs.readFileSync(path.join(root, 'admin', 'v2', 'legacy.html'), 'utf8');
const an2Block = liveHtml.match(/\/\/ Analytics v2[\s\S]*?window\.an2RenderPayingUsers = an2RenderPayingUsers;/)?.[0] ?? '';
const onboardingExitBlock = liveHtml.match(/window\.loadOnboardingExits = async function loadOnboardingExits[\s\S]*?\n  };/)?.[0] ?? '';
const revenueViewWrapper = liveHtml.match(/function pmApplyRevenueView\(view\)[\s\S]*?window\.pmApplyRevenueView = pmApplyRevenueView;/)?.[0] ?? '';
const revenueFilterWrapper = liveHtml.match(/function pmSyncRevenueFilters\(\)[\s\S]*?\n  }/)?.[0] ?? '';
const functionsPackage = JSON.parse(fs.readFileSync(path.join(root, 'functions', 'package.json'), 'utf8')) as {
  scripts?: Record<string, string>;
};
const firestoreIndexes = JSON.parse(fs.readFileSync(path.join(root, 'firestore.indexes.json'), 'utf8')) as {
  indexes?: Array<{
    collectionGroup?: string;
    queryScope?: string;
    fields?: Array<{ fieldPath?: string; order?: string }>;
  }>;
};

describe('live admin trustworthy analytics runtime contract', () => {
  test('AN2 uses the bounded cached server projections and never reads money collections in the browser', () => {
    expect(an2Block).toContain("httpsCallable(functionsUs, 'adminGetAnalyticsSnapshot')");
    expect(an2Block).toContain("httpsCallable(functionsUs, 'adminGetAnalyticsTrends')");
    expect(an2Block).toContain("httpsCallable(functionsUs, 'adminGetRevenueCatOverviewMetrics')");
    expect(an2Block).toContain('rangeDays: _an2.range');
    expect(an2Block).toContain("scope: 'paywall'");
    expect(an2Block).toContain('presetDays: _an2.range');
    expect(an2Block).toContain('comparePrevious: false');
    expect(an2Block).not.toMatch(/collection\(db,\s*['"](?:revenuecat_premium_events|paywall_funnel|revenuecat_shard_transactions)['"]\)/);
    expect(an2Block).not.toContain('window._users');
  });

  test('cards are mapped to authoritative snapshot fields and cancellation remains explicitly unavailable', () => {
    expect(an2Block).toContain('access.byKind.store_lifetime');
    expect(an2Block).toContain('access.scannedUsers - access.hiddenUsersExcluded');
    expect(an2Block).toContain('storeActivity.newPurchases');
    expect(an2Block).toContain('storeActivity.renewals');
    expect(an2Block).toContain('storeActivity.trialStarts');
    expect(an2Block).toContain('storeActivity.refunds');
    expect(an2Block).toContain('shardActivity.productionPurchases');
    expect(an2Block).toContain('funnelSignals.events.shown');
    expect(an2Block).toContain('funnelSignals.events.ctaClick');
    expect(an2Block).toContain('funnelSignals.events.trialStarted');
    expect(an2Block).toContain('funnelSignals.events.purchaseCompleted');
    expect(an2Block).toContain("an2Set('an2-pay-cancelled', 'n/a')");
  });

  test('metric IDs are exact and null/partial series cannot be totalled into a number', () => {
    [
      'paywall.shown.v1',
      'paywall.cta_click.v1',
      'paywall.trial_started.v1',
      'paywall.purchase_completed.v1',
      'store.initial_purchase.v1',
      'store.non_renewing_purchase.v1',
      'store.renewal.v1',
      'store.confirmed_trial_start.v1',
      'store.refund.v1',
      'shards.store_transaction.v1',
      'revenue.gross_usd_micros.v1',
    ].forEach((metricId) => expect(an2Block).toContain(metricId));
    expect(an2Block).toContain('function an2ExactSeriesTotal(series)');
    expect(an2Block).toMatch(/series\.status[^\n]+(?:partial|unavailable)/);
    expect(an2Block).toMatch(/series\.coverage[^\n]+complete/);
    expect(an2Block).toMatch(/point\.value === null/);
    expect(an2Block).not.toMatch(/Number\(point\.value\s*\|\|\s*0\)/);
  });

  test('complete empty sources render exact zero while partial/error sources render n/a with health and freshness', () => {
    expect(an2Block).toContain('function an2SourceExact(snapshot, sourceId)');
    expect(an2Block).toMatch(/state === 'ready' \|\| state === 'empty'/);
    expect(an2Block).toContain("return exact ? AN2_NUM(value) : 'n/a'");
    expect(an2Block).toContain('latestAtMs');
    expect(an2Block).toContain('freshness');
    expect(an2Block).toContain('an2RenderSourceHealth');
  });

  test('Revenue/Paywall platform is forced to all while Product Analytics remains an independent selector', () => {
    expect(liveHtml).toMatch(/id="pm-revenue-platform"[^>]*disabled[^>]*title="[^"]*(?:нет|отсутств|all)/i);
    expect(liveHtml).toMatch(/id="pm-revenue-platform"[\s\S]{0,180}<option value="all" selected>/);
    expect(liveHtml).toMatch(/id="product-analytics-platform"(?![^>]*disabled)/);
    expect(an2Block).not.toContain("document.getElementById('product-analytics-platform')");
    expect(revenueViewWrapper).toContain("platform.value = 'all'");
    expect(revenueViewWrapper).toContain('platform.disabled = true');
    expect(revenueViewWrapper).not.toContain('platform.disabled = !supported');
    expect(revenueFilterWrapper).not.toContain('product-analytics-platform');
  });

  test('a failed trends refresh clears a previously rendered chart and canvas before showing n/a', () => {
    const clearBody = an2Block.match(/function an2ClearChart\(\) \{([\s\S]*?)\n  \}/)?.[1] ?? '';
    expect(clearBody).not.toBe('');
    const destroy = jest.fn();
    const clearRect = jest.fn();
    const state: { chart: { destroy: () => void } | null } = { chart: { destroy } };
    const canvas = { width: 640, height: 320, getContext: () => ({ clearRect }) };
    const clear = new Function('_an2', 'document', `return function an2ClearChart() {${clearBody}\n}`)(
      state,
      { getElementById: (id: string) => id === 'analytics-trend-canvas' ? canvas : null },
    ) as () => void;

    clear();
    expect(destroy).toHaveBeenCalledTimes(1);
    expect(clearRect).toHaveBeenCalledWith(0, 0, 640, 320);
    expect(state.chart).toBeNull();
    expect(an2Block).toMatch(/if \(!resolved\) \{[\s\S]{0,180}an2ClearChart\(\)/);
  });

  test('onboarding exits query only the consented exit action before the cap and never invent completion rates', () => {
    expect(onboardingExitBlock).toContain("where('action', '==', 'onboarding_exit')");
    expect(onboardingExitBlock).toContain("where('createdAtMs', '>=', fromMs)");
    expect(onboardingExitBlock).toContain("where('createdAtMs', '<=', toMs)");
    expect(onboardingExitBlock).toContain("orderBy('createdAtMs', 'desc')");
    expect(onboardingExitBlock).toContain('limit(ONBOARDING_EXIT_CAP + 1)');
    expect(onboardingExitBlock).toContain('const truncated = snap.docs.length > ONBOARDING_EXIT_CAP');
    expect(onboardingExitBlock).toMatch(/соглас/i);
    expect(onboardingExitBlock).toMatch(/усеч|лимит|не попали/i);
    expect(onboardingExitBlock).toContain("['Пропустили онбординг', 'n/a']");
    expect(onboardingExitBlock).toContain("['Завершили онбординг', 'n/a']");
    expect(onboardingExitBlock).not.toContain("r.action === 'onboarding_skip'");
    expect(onboardingExitBlock).not.toContain("r.action === 'onboarding_complete'");
    expect(onboardingExitBlock).toMatch(/catch \(e\) \{[\s\S]{0,260}grid\.innerHTML = '';[\s\S]{0,120}summary\.innerHTML = '';/);
  });

  test('the live newest-first onboarding exit query has its exact Firestore composite index', () => {
    expect(onboardingExitBlock).toContain("where('action', '==', 'onboarding_exit')");
    expect(onboardingExitBlock).toContain("orderBy('createdAtMs', 'desc')");
    expect(firestoreIndexes.indexes).toEqual(expect.arrayContaining([
      expect.objectContaining({
        collectionGroup: 'app_activity',
        queryScope: 'COLLECTION',
        fields: [
          { fieldPath: 'action', order: 'ASCENDING' },
          { fieldPath: 'createdAtMs', order: 'DESCENDING' },
        ],
      }),
    ]));
  });

  test('money cards describe event counts and every access kind included in Active Plus', () => {
    expect(liveHtml).toContain('События покупок');
    expect(liveHtml).toContain('События INITIAL_PURCHASE и NON_RENEWING_PURCHASE, не уникальные плательщики.');
    expect(liveHtml).toContain('подписка магазина, trial, подарок, VIP, ручной или админский доступ');
    expect(liveHtml).not.toContain('Новые платящие пользователи.');
  });

  test('changed analytics and Jarvis endpoints have one exact narrow deploy profile', () => {
    const command = functionsPackage.scripts?.['deploy:admin-analytics-jarvis'] ?? '';
    const names = [...command.matchAll(/functions:([A-Za-z0-9_]+)/g)].map((match) => match[1]);
    expect(names).toEqual([
      'adminGetAnalyticsSnapshot',
      'adminGetAnalyticsTrends',
      'adminGetRevenueCatOverviewMetrics',
      'jarvisGetMoneySnapshot',
      'jarvisGetAllDecisions',
      'jarvisDailyDepartmentsCron',
    ]);
    expect(command).not.toContain('--only functions"');
  });
});
