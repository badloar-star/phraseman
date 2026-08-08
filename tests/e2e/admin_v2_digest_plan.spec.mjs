import { expect, test } from '@playwright/test';
import { createHash } from 'node:crypto';

const LINKED_SOURCE_HASH = createHash('sha256').update(JSON.stringify({ dayKey: '2026-07-19', generatedAtMs: 1784457600000, signals: ['investigate_safety_flags'] })).digest('hex');

const APP = `export const initializeApp = () => ({});`;
const AUTH = `
  const user = { uid: 'owner', email: 'owner@example.test', getIdTokenResult: async () => ({ claims: { admin: true, adminRole: 'owner' } }) };
  export const browserSessionPersistence = {};
  export const getAuth = () => ({ currentUser: user });
  export class GoogleAuthProvider { setCustomParameters() {} }
  export const onAuthStateChanged = (_auth, callback) => { setTimeout(() => callback(user), 40); return () => {}; };
  export const setPersistence = async () => {};
  export const signInWithPopup = async () => ({ user });
  export const signOut = async () => {};
`;
const FUNCTIONS = `
  const digest = { state: 'ready', digest: { dayKey: '2026-07-19', generatedAtMs: 1784457600000, facts: { safety: { open: 1 }, revenue: { refunds: 0 }, appErrors: { critical: 0 }, reports: { open: 0 }, cancels: { total: 0 }, queues: [], ideas: { total: 0 } }, sourceHealth: [] } };
  export const getFunctions = () => ({});
  export const httpsCallable = (_functions, name) => async (input = {}) => {
    globalThis.__digestPlanCalls.push({ name, input });
    if (name === 'adminGetDailyBriefing') return { data: digest };
    if (name === 'adminListPlans') return { data: { items: globalThis.__digestPlanLinked ? [{ source: { ref: 'director_digest:sha256:${LINKED_SOURCE_HASH}' } }] : [] } };
    if (name === 'adminCreatePlan') return { data: { id: 'plan-1' } };
    if (name === 'adminGetAnalyticsTrends') return { data: { series: [], points: [] } };
    throw new Error('unexpected_callable:' + name);
  };
`;

async function installMockBackend(page, { linked = false } = {}) {
  await page.addInitScript((hasLinkedPlan) => { globalThis.__digestPlanCalls = []; globalThis.__digestPlanLinked = hasLinkedPlan; globalThis.confirm = () => true; }, linked);
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.origin === 'http://127.0.0.1:4173' && url.pathname === '/__/firebase/init.json') return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ projectId: 'digest-plan' }) });
    if (url.hostname === 'www.gstatic.com' && url.pathname.endsWith('/firebase-app.js')) return route.fulfill({ contentType: 'application/javascript', body: APP });
    if (url.hostname === 'www.gstatic.com' && url.pathname.endsWith('/firebase-auth.js')) return route.fulfill({ contentType: 'application/javascript', body: AUTH });
    if (url.hostname === 'www.gstatic.com' && url.pathname.endsWith('/firebase-functions.js')) return route.fulfill({ contentType: 'application/javascript', body: FUNCTIONS });
    if (url.origin === 'http://127.0.0.1:4173') return route.continue();
    throw new Error(`unexpected_network:${url.href}`);
  });
}

test('direct Plans route waits for auth, then creates a confirmed structured plan from one digest signal', async ({ page }) => {
  await installMockBackend(page);
  await page.goto('/#plans');
  await expect(page.locator('#plan-kind')).toBeVisible();
  await expect(page.locator('#plan-source-hash')).toHaveValue('');

  await page.evaluate(() => { globalThis.location.hash = 'daily-briefing'; });
  await expect(page.locator('[data-action="load-daily-briefing"]')).toBeVisible();
  await page.locator('[data-action="load-daily-briefing"]').click();
  await expect(page.locator('[data-action="add-digest-signal-to-plan"]')).toHaveCount(1);
  await page.locator('[data-action="add-digest-signal-to-plan"]').click();
  await expect(page).toHaveURL(/#plans$/);
  await expect(page.locator('#plan-source-hash')).toHaveValue(/^[a-f0-9]{64}$/);

  await page.locator('[data-action="create-plan"]').click();
  await expect.poll(() => page.evaluate(() => globalThis.__digestPlanCalls.filter((call) => call.name === 'adminCreatePlan'))).toHaveLength(1);
  const call = await page.evaluate(() => globalThis.__digestPlanCalls.find((entry) => entry.name === 'adminCreatePlan'));
  expect(call.input).toMatchObject({ source: { kind: 'director_digest', ref: expect.stringMatching(/^director_digest:sha256:[a-f0-9]{64}$/) }, actionCodes: ['investigate_metrics', 'prepare_change'] });
  expect(Object.keys(call.input)).not.toEqual(expect.arrayContaining(['title', 'summary', 'details']));
});

test('does not offer a digest action already linked by a freshly loaded plan', async ({ page }) => {
  await installMockBackend(page, { linked: true });
  await page.goto('/#plans');
  await expect(page.locator('#plan-kind')).toBeVisible();
  await expect.poll(() => page.evaluate(() => globalThis.__digestPlanCalls.filter((call) => call.name === 'adminListPlans'))).toHaveLength(1);

  await page.evaluate(() => { globalThis.location.hash = 'daily-briefing'; });
  await page.locator('[data-action="load-daily-briefing"]').click();
  await expect(page.locator('[data-action="add-digest-signal-to-plan"]')).toHaveCount(0);
});
