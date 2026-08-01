# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests\e2e\admin_v2_smoke.spec.mjs >> shell keeps usable workspace geometry across desktop, tablet, and drawer breakpoints
- Location: tests\e2e\admin_v2_smoke.spec.mjs:80:1

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/#overview", waiting until "load"

```

# Test source

```ts
  1   | import { expect, test } from '@playwright/test';
  2   | 
  3   | const FIREBASE_APP_MOCK = `export const initializeApp = (config) => ({ config });`;
  4   | const FIREBASE_AUTH_MOCK = `
  5   |   const user = {
  6   |     uid: 'admin-v2-e2e',
  7   |     email: 'admin-v2-e2e@localhost',
  8   |     getIdTokenResult: async () => ({ claims: { admin: true, adminRole: 'admin' } }),
  9   |   };
  10  |   export const browserSessionPersistence = {};
  11  |   export const getAuth = () => ({ currentUser: user });
  12  |   export class GoogleAuthProvider { setCustomParameters() {} }
  13  |   export const onAuthStateChanged = (_auth, callback) => { queueMicrotask(() => callback(user)); return () => {}; };
  14  |   export const setPersistence = async () => {};
  15  |   export const signInWithPopup = async () => ({ user });
  16  |   export const signOut = async () => {};
  17  | `;
  18  | const FIREBASE_FUNCTIONS_MOCK = `
  19  |   export const getFunctions = () => ({});
  20  |   export const httpsCallable = () => async () => ({ data: {} });
  21  | `;
  22  | 
  23  | async function installLoopbackBackend(page) {
  24  |   await page.route('**/*', async (route) => {
  25  |     const url = new URL(route.request().url());
  26  |     if (url.origin === 'http://127.0.0.1:4173' && url.pathname === '/__/firebase/init.json') {
  27  |       return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ projectId: 'admin-v2-e2e' }) });
  28  |     }
  29  |     if (url.hostname === 'www.gstatic.com' && url.pathname.endsWith('/firebase-app.js')) {
  30  |       return route.fulfill({ contentType: 'application/javascript', body: FIREBASE_APP_MOCK });
  31  |     }
  32  |     if (url.hostname === 'www.gstatic.com' && url.pathname.endsWith('/firebase-auth.js')) {
  33  |       return route.fulfill({ contentType: 'application/javascript', body: FIREBASE_AUTH_MOCK });
  34  |     }
  35  |     if (url.hostname === 'www.gstatic.com' && url.pathname.endsWith('/firebase-functions.js')) {
  36  |       return route.fulfill({ contentType: 'application/javascript', body: FIREBASE_FUNCTIONS_MOCK });
  37  |     }
  38  |     if (url.origin === 'http://127.0.0.1:4173') return route.continue();
  39  |     throw new Error(`Unexpected network request: ${url.href}`);
  40  |   });
  41  | }
  42  | 
  43  | test('desktop exposes the utility control, search, and favorites without external services', async ({ page }) => {
  44  |   await installLoopbackBackend(page);
  45  |   await page.goto('/#overview');
  46  | 
  47  |   const utilityControl = page.locator('#utility-nav [data-route="control-panel"]');
  48  |   await expect(utilityControl).toBeVisible();
  49  |   await utilityControl.click();
  50  |   await expect(page).toHaveURL(/#control-panel$/);
  51  |   await expect(page.locator('#app h1')).toContainText('Пульт управления');
  52  | 
  53  |   await page.locator('#global-search-launcher').click();
  54  |   await expect(page.locator('#global-search-dialog')).toBeVisible();
  55  |   await page.locator('#global-search-input').fill('обзор');
  56  |   const matchingResult = page.locator('#global-search-results [data-global-search-route="users"]').first();
  57  |   const nonMatchingResult = page.locator('#global-search-results [data-global-search-route="overview"]').first();
  58  |   await expect(nonMatchingResult).toBeVisible();
  59  |   await page.locator('#global-search-input').fill('польз');
  60  |   await page.waitForTimeout(100);
  61  |   await expect(nonMatchingResult).toBeVisible({ timeout: 50 });
  62  |   await expect(nonMatchingResult).toBeHidden({ timeout: 400 });
  63  |   await expect(matchingResult).toBeVisible({ timeout: 400 });
  64  |   const favorite = page.locator('[data-global-search-favorite-id="section-users"]');
  65  |   await expect(favorite).toBeVisible();
  66  |   await favorite.click();
  67  |   await page.keyboard.press('Escape');
  68  | 
  69  |   await page.locator('#global-search-launcher').click();
  70  |   await expect(page.locator('#global-search-favorites-list [data-global-search-route="users"]')).toBeVisible();
  71  |   await page.keyboard.press('Escape');
  72  | });
  73  | 
  74  | test('loopback serves only the canonical root entry', async ({ request }) => {
  75  |   await expect((await request.get('/')).status()).toBe(200);
  76  |   await expect((await request.get('/v2')).status()).toBe(404);
  77  |   await expect((await request.get('/v2/')).status()).toBe(404);
  78  | });
  79  | 
  80  | test('shell keeps usable workspace geometry across desktop, tablet, and drawer breakpoints', async ({ page }) => {
  81  |   await installLoopbackBackend(page);
  82  |   await page.setViewportSize({ width: 1800, height: 900 });
> 83  |   await page.goto('/#overview');
      |              ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  84  | 
  85  |   for (const width of [1800, 1440, 1020, 761, 760]) {
  86  |     await page.setViewportSize({ width, height: 900 });
  87  |     const geometry = await page.evaluate(() => {
  88  |       const rect = (selector) => {
  89  |         const element = document.querySelector(selector);
  90  |         if (!element) throw new Error(`Missing layout element: ${selector}`);
  91  |         const bounds = element.getBoundingClientRect();
  92  |         return {
  93  |           left: bounds.left,
  94  |           right: bounds.right,
  95  |           width: bounds.width,
  96  |         };
  97  |       };
  98  |       const sidebar = document.querySelector('.sidebar');
  99  |       const workspace = document.querySelector('.workspace');
  100 |       const collapsedLabel = document.querySelector('.nav-group > summary span');
  101 |       if (!sidebar || !workspace || !collapsedLabel) throw new Error('Missing shell layout controls');
  102 |       return {
  103 |         documentScrollWidth: document.documentElement.scrollWidth,
  104 |         bodyScrollWidth: document.body.scrollWidth,
  105 |         workspace: rect('.workspace'),
  106 |         page: rect('.page'),
  107 |         topbar: rect('.topbar'),
  108 |         sidebar: rect('.sidebar'),
  109 |         sidebarPosition: getComputedStyle(sidebar).position,
  110 |         workspaceMarginLeft: getComputedStyle(workspace).marginLeft,
  111 |         collapsedLabelDisplay: getComputedStyle(collapsedLabel).display,
  112 |       };
  113 |     });
  114 | 
  115 |     for (const [name, bounds] of Object.entries({
  116 |       workspace: geometry.workspace,
  117 |       page: geometry.page,
  118 |       topbar: geometry.topbar,
  119 |     })) {
  120 |       expect(bounds.width, `${name} width at ${width}px`).toBeGreaterThan(0);
  121 |       expect(bounds.right, `${name} right edge at ${width}px`).toBeLessThanOrEqual(width + 0.5);
  122 |     }
  123 |     expect(geometry.documentScrollWidth, `document overflow at ${width}px`).toBeLessThanOrEqual(width);
  124 |     expect(geometry.bodyScrollWidth, `body overflow at ${width}px`).toBeLessThanOrEqual(width);
  125 | 
  126 |     if (width > 1020) {
  127 |       expect(geometry.sidebar.width, `desktop sidebar width at ${width}px`).toBeCloseTo(248, 0);
  128 |       expect(geometry.sidebarPosition, `desktop sidebar position at ${width}px`).toBe('sticky');
  129 |     } else if (width > 760) {
  130 |       expect(geometry.sidebar.width, `labeled tablet sidebar width at ${width}px`).toBeCloseTo(236, 0);
  131 |       expect(geometry.sidebarPosition, `labeled tablet sidebar position at ${width}px`).toBe('sticky');
  132 |       expect(geometry.collapsedLabelDisplay, `tablet sidebar label at ${width}px`).toBe('block');
  133 |     } else {
  134 |       expect(geometry.sidebarPosition, 'drawer sidebar position').toBe('fixed');
  135 |       expect(geometry.workspaceMarginLeft, 'drawer workspace offset').toBe('0px');
  136 |     }
  137 |   }
  138 | 
  139 |   await expect.poll(async () => {
  140 |     return page.locator('.sidebar').evaluate((sidebar) => sidebar.getBoundingClientRect().right);
  141 |   }, { message: 'closed drawer right edge' }).toBeLessThanOrEqual(0);
  142 | 
  143 |   const launcher = page.locator('#mobile-nav-toggle');
  144 |   await expect(launcher).toBeVisible();
  145 |   await launcher.click();
  146 |   await expect(launcher).toHaveAttribute('aria-expanded', 'true');
  147 |   await expect(page.locator('body')).toHaveClass(/nav-open/);
  148 |   await expect.poll(async () => {
  149 |     return page.locator('.sidebar').evaluate((sidebar) => sidebar.getBoundingClientRect().left);
  150 |   }, { message: 'open drawer left edge' }).toBeCloseTo(0, 0);
  151 | });
  152 | 
  153 | test.describe('mobile navigation', () => {
  154 |   test.use({ viewport: { width: 390, height: 844 } });
  155 | 
  156 |   test('opens the drawer and restores focus to its launcher on close', async ({ page }) => {
  157 |     await installLoopbackBackend(page);
  158 |     await page.goto('/#overview');
  159 | 
  160 |     const launcher = page.locator('#mobile-nav-toggle');
  161 |     await expect(launcher).toBeVisible();
  162 |     await launcher.click();
  163 |     await expect(page.locator('body')).toHaveClass(/nav-open/);
  164 |     await expect(launcher).toHaveAttribute('aria-expanded', 'true');
  165 |     await expect(page.locator('.sidebar')).toBeVisible();
  166 |     await expect(launcher).not.toBeFocused();
  167 |     await expect(page.locator('.sidebar a:focus, .sidebar button:focus, .sidebar summary:focus')).toHaveCount(1);
  168 | 
  169 |     await page.keyboard.press('Escape');
  170 |     await expect(page.locator('body')).not.toHaveClass(/nav-open/);
  171 |     await expect(launcher).toHaveAttribute('aria-expanded', 'false');
  172 |     await expect(launcher).toBeFocused();
  173 |   });
  174 | });
  175 | 
  176 | test('375px and 390px drawer routes to users, closes, and returns focus to the top control', async ({ page }) => {
  177 |   await installLoopbackBackend(page);
  178 | 
  179 |   for (const width of [375, 390]) {
  180 |     await page.setViewportSize({ width, height: 844 });
  181 |     await page.goto('/#overview');
  182 | 
  183 |     const launcher = page.locator('#mobile-nav-toggle');
```