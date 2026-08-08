import { expect, test } from '@playwright/test';

const CANONICAL_ROUTES = [
  'overview', 'control-panel', 'application', 'campaigns', 'users', 'support',
  'report-center', 'money', 'analytics', 'daily-briefing', 'asset-studio',
  'content', 'community', 'diagnostics', 'admin-settings', 'agent-office', 'agent-manager',
];
const ANALYTICS_BOOKMARKS = [
  { hash: 'today', report: 'overview', panel: '[data-analytics-report-panel="overview"]' },
  { hash: 'growth', report: 'product', panel: '#product-analytics-panel' },
  { hash: 'subscriptions', report: 'subscriptions', panel: '#subscription-analytics-panel' },
  { hash: 'learning', report: 'exports', panel: '#monthly-decision-pack-panel' },
];
const READ_ONLY_CALLABLES = new Set([
  'adminListContentFactoryJobs', 'adminGetContentFactoryJobDetail', 'adminGetContentFactoryUnitPreview',
  'adminGetContentFactoryWorkspace', 'adminGetContentFactoryRolloutMetrics', 'adminListContentStages',
  'adminListContentStageDependencies', 'adminGetContentStageCapabilities', 'adminSupportList',
  'adminListAssetJobs', 'adminGetAnalyticsSnapshot', 'adminGetAnalyticsTrends', 'adminProductAnalytics',
  'adminSubscriptionAnalytics', 'adminMonthlyDecisionPack', 'adminSearchUsers', 'adminGetUserProfile',
  'openAiBudgetDashboard', 'adminGetRemoteConfigWorkspace', 'adminListPromoCodes', 'adminListAppMessages',
  'adminListGlobalBroadcasts', 'adminGetDailyBriefing', 'adminListReportQueue', 'adminListAuditLog',
  'adminListOpsLog', 'agentOfficeListCases', 'agentOfficeGetCase', 'agentOfficeListRecommendations',
  'agentOfficeListAuditEvents', 'agentManagerListTasks', 'agentManagerListAgents', 'agentManagerListRunbooks',
]);

const FIREBASE_APP_MOCK = `export const initializeApp = (config) => ({ config });`;
const FIREBASE_AUTH_MOCK = `
  const user = {
    uid: 'admin-v2-safe-smoke',
    email: 'admin-v2-safe-smoke@localhost',
    getIdTokenResult: async () => ({ claims: { admin: true, adminRole: 'owner' } }),
  };
  export const browserSessionPersistence = {};
  export const getAuth = () => ({ currentUser: user });
  export class GoogleAuthProvider { setCustomParameters() {} }
  export const onAuthStateChanged = (_auth, callback) => { queueMicrotask(() => callback(user)); return () => {}; };
  export const setPersistence = async () => {};
  export const signInWithPopup = async () => ({ user });
  export const signOut = async () => {};
`;
const FIREBASE_FUNCTIONS_MOCK = `
  const readOnly = new Set(${JSON.stringify([...READ_ONLY_CALLABLES])});
  const listPayload = { items: [], nextCursor: '', sourceHealth: [] };
  const payloadFor = (name) => {
    if (name === 'adminGetAnalyticsSnapshot') return { rangeDays: 28, kpis: {}, series: [] };
    if (name === 'adminGetAnalyticsTrends') return { series: [], points: [] };
    if (name === 'adminGetDailyBriefing') return { state: 'ready', digest: null };
    if (name === 'adminGetRemoteConfigWorkspace') return { revision: 1, config: {}, history: [] };
    if (name === 'adminGetContentFactoryWorkspace') return { jobs: [], stages: [] };
    if (name === 'adminGetContentStageCapabilities') return { capabilities: [] };
    if (name === 'agentManagerListRunbooks') return { items: [] };
    return listPayload;
  };
  export const getFunctions = () => ({});
  export const httpsCallable = (_functions, name) => async (input = {}) => {
    globalThis.__adminV2SafeSmokeCalls.push({ name, input });
    if (!readOnly.has(name)) throw new Error('unsafe_callable_invoked:' + name);
    return { data: payloadFor(name) };
  };
`;

async function installSafeBackend(page) {
  await page.addInitScript(() => { globalThis.__adminV2SafeSmokeCalls = []; });
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.origin === 'http://127.0.0.1:4173' && url.pathname === '/__/firebase/init.json') {
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ projectId: 'admin-v2-safe-smoke' }) });
    }
    if (url.hostname === 'www.gstatic.com' && url.pathname.endsWith('/firebase-app.js')) return route.fulfill({ contentType: 'application/javascript', body: FIREBASE_APP_MOCK });
    if (url.hostname === 'www.gstatic.com' && url.pathname.endsWith('/firebase-auth.js')) return route.fulfill({ contentType: 'application/javascript', body: FIREBASE_AUTH_MOCK });
    if (url.hostname === 'www.gstatic.com' && url.pathname.endsWith('/firebase-functions.js')) return route.fulfill({ contentType: 'application/javascript', body: FIREBASE_FUNCTIONS_MOCK });
    if (url.origin === 'http://127.0.0.1:4173') return route.continue();
    throw new Error(`Unexpected external network request: ${url.href}`);
  });
}

async function expectUsableRoute(page, route) {
  let routeControl = page.locator(`#primary-nav [data-route="${route}"], #utility-nav [data-route="${route}"], aside a[href="#${route}"], #admin-workspace-actions a[href="#${route}"]`).first();
  if (await routeControl.count() === 0) {
    await page.locator('#global-search-launcher').click();
    await page.locator('#global-search-input').fill(route);
    routeControl = page.locator(`[data-global-search-route="${route}"]`).first();
  }
  await expect(routeControl, `missing UI navigation control for ${route}`).toHaveCount(1);
  if (await routeControl.isHidden()) {
    const group = routeControl.locator('xpath=ancestor::details[1]');
    await expect(group, `collapsed navigation group for ${route}`).toHaveCount(1);
    await group.locator('summary').click();
  }
  await expect(routeControl, `missing UI navigation control for ${route}`).toBeVisible();
  await routeControl.click();
  await expect(page).toHaveURL(new RegExp(`#${route}$`));
  await expect(page.locator('#app')).toHaveAttribute('data-route', route);
  await expect(page.locator('#app h1')).toBeVisible();
  await expect(page.locator('.topbar')).toBeVisible();
  const appBox = await page.locator('#app').boundingBox();
  const headerBox = await page.locator('.topbar').boundingBox();
  expect(appBox?.width, `${route} app width`).toBeGreaterThan(320);
  expect(appBox?.height, `${route} app height`).toBeGreaterThan(80);
  expect(headerBox?.width, `${route} header width`).toBeGreaterThan(320);
  expect(headerBox?.height, `${route} header height`).toBeGreaterThan(32);
  const layout = await page.evaluate(() => {
    const viewportWidth = window.innerWidth;
    const overflowTolerance = 1;
    const boundsFor = (selector) => {
      const element = document.querySelector(selector);
      if (!element) throw new Error(`Missing route layout element: ${selector}`);
      const bounds = element.getBoundingClientRect();
      return { left: bounds.left, right: bounds.right, width: bounds.width };
    };
    const visibleContent = [...document.querySelectorAll('#admin-workspace, .topbar, #app, #app > *')]
      .filter((element) => {
        const style = getComputedStyle(element);
        const bounds = element.getBoundingClientRect();
        return style.display !== 'none'
          && style.visibility !== 'hidden'
          && bounds.width > 0
          && bounds.height > 0;
      })
      .map((element) => {
        const bounds = element.getBoundingClientRect();
        return {
          name: element.id || element.className || element.tagName.toLowerCase(),
          left: bounds.left,
          right: bounds.right,
          width: bounds.width,
        };
      });
    const overflowSources = [...document.querySelectorAll('body *')]
      .map((element) => {
        const bounds = element.getBoundingClientRect();
        return {
          name: element.id || element.className || element.tagName.toLowerCase(),
          right: bounds.right,
          scrollWidth: element.scrollWidth,
          clientWidth: element.clientWidth,
        };
      })
      .filter((element) => element.right > viewportWidth + overflowTolerance || element.scrollWidth > element.clientWidth + overflowTolerance)
      .slice(0, 12);
    return {
      viewportWidth,
      documentScrollWidth: document.documentElement.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
      overflowTolerance,
      basicContent: {
        page: boundsFor('.page'),
        header: boundsFor('.topbar'),
        heading: boundsFor('#app h1'),
      },
      visibleContent,
      overflowSources,
    };
  });
  expect(layout.documentScrollWidth, `${route} document horizontal overflow: ${JSON.stringify(layout.overflowSources)}`).toBeLessThanOrEqual(layout.viewportWidth + layout.overflowTolerance);
  expect(layout.bodyScrollWidth, `${route} body horizontal overflow`).toBeLessThanOrEqual(layout.viewportWidth + layout.overflowTolerance);
  for (const [name, bounds] of Object.entries(layout.basicContent)) {
    expect(bounds.width, `${route} ${name} width`).toBeGreaterThan(0);
    expect(bounds.left, `${route} ${name} left edge`).toBeGreaterThanOrEqual(-0.5);
    expect(bounds.right, `${route} ${name} right edge`).toBeLessThanOrEqual(layout.viewportWidth + 0.5);
  }
  for (const bounds of layout.visibleContent) {
    expect(bounds.left, `${route} visible ${bounds.name} left edge`).toBeGreaterThanOrEqual(-layout.overflowTolerance);
    expect(bounds.right, `${route} visible ${bounds.name} right edge`).toBeLessThanOrEqual(layout.viewportWidth + layout.overflowTolerance);
  }
}

test('Admin V2 renders every canonical route with mocked read-only data and no unsafe effects', async ({ page }) => {
  const pageErrors = [];
  const consoleErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  await installSafeBackend(page);
  await page.goto('/#overview');
  await expect(page.locator('#app h1')).toBeVisible();

  // Local-only controls: search and report switching must not call a write callable.
  await page.locator('#global-search-launcher').click();
  await page.locator('#global-search-input').fill('analytics');
  await expect(page.locator('#global-search-dialog')).toBeVisible();
  await page.keyboard.press('Escape');

  for (const route of CANONICAL_ROUTES) await expectUsableRoute(page, route);

  await expectUsableRoute(page, 'analytics');
  for (const bookmark of ANALYTICS_BOOKMARKS) {
    const bookmarkControl = page.locator(`[data-route="${bookmark.hash}"]`).first();
    await expect(bookmarkControl, `missing analytics bookmark ${bookmark.hash}`).toBeVisible();
    await bookmarkControl.click();
    await expect(page).toHaveURL(new RegExp(`#${bookmark.hash}$`));
    await expect(page.locator(`[data-analytics-report="${bookmark.report}"]`)).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator(bookmark.panel)).toBeVisible();
  }

  const recordedCalls = await page.evaluate(() => globalThis.__adminV2SafeSmokeCalls);
  for (const { name } of recordedCalls) expect(READ_ONLY_CALLABLES, `unsafe callable invoked: ${name}`).toContain(name);
  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

test('authorized route entry refreshes only its safe read models once', async ({ page }) => {
  await installSafeBackend(page);
  await page.goto('/#overview');

  const callsFor = async (name) => page.evaluate((callableName) => (
    globalThis.__adminV2SafeSmokeCalls.filter((call) => call.name === callableName).length
  ), name);
  const expectSingleRouteLoad = async (route, callableNames) => {
    await page.evaluate((nextRoute) => { globalThis.location.hash = nextRoute; }, route);
    for (const callableName of callableNames) {
      await expect.poll(() => callsFor(callableName), { message: `${route} loads ${callableName}` }).toBe(1);
    }
    const beforeRepeatedHash = await page.evaluate(() => [...globalThis.__adminV2SafeSmokeCalls]);
    await page.evaluate(() => globalThis.dispatchEvent(new HashChangeEvent('hashchange')));
    await page.waitForTimeout(50);
    await expect.poll(() => page.evaluate(() => globalThis.__adminV2SafeSmokeCalls)).toEqual(beforeRepeatedHash);
  };

  await expect.poll(() => callsFor('adminGetDailyBriefing'), { message: 'overview loads its saved briefing' }).toBe(1);
  await expect.poll(() => callsFor('adminGetAnalyticsTrends'), { message: 'overview loads its trends' }).toBe(1);
  await expectSingleRouteLoad('report-center', ['adminListReportQueue']);
  await expectSingleRouteLoad('asset-studio', ['adminListAssetJobs']);
  await expectSingleRouteLoad('agent-office', ['agentOfficeListCases']);
  await expectSingleRouteLoad('agent-manager', [
    'agentManagerListTasks',
    'agentManagerListAgents',
    'agentManagerListRunbooks',
  ]);

  const automaticCalls = await page.evaluate(() => globalThis.__adminV2SafeSmokeCalls.map((call) => call.name));
  for (const forbidden of [
    'adminGenerateDailyBriefing',
    'adminSupportList',
    'adminSearchUsers',
    'adminGetUserProfile',
  ]) expect(automaticCalls, `manual loader must not auto-run: ${forbidden}`).not.toContain(forbidden);
});
