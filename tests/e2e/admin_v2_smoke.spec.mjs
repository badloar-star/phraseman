import { expect, test } from '@playwright/test';

const FIREBASE_APP_MOCK = `export const initializeApp = (config) => ({ config });`;
const FIREBASE_AUTH_MOCK = `
  const user = {
    uid: 'admin-v2-e2e',
    email: 'admin-v2-e2e@localhost',
    getIdTokenResult: async () => ({ claims: { admin: true, adminRole: 'admin' } }),
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
  export const getFunctions = () => ({});
  export const httpsCallable = () => async () => ({ data: {} });
`;

async function installLoopbackBackend(page) {
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.origin === 'http://127.0.0.1:4173' && url.pathname === '/__/firebase/init.json') {
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ projectId: 'admin-v2-e2e' }) });
    }
    if (url.hostname === 'www.gstatic.com' && url.pathname.endsWith('/firebase-app.js')) {
      return route.fulfill({ contentType: 'application/javascript', body: FIREBASE_APP_MOCK });
    }
    if (url.hostname === 'www.gstatic.com' && url.pathname.endsWith('/firebase-auth.js')) {
      return route.fulfill({ contentType: 'application/javascript', body: FIREBASE_AUTH_MOCK });
    }
    if (url.hostname === 'www.gstatic.com' && url.pathname.endsWith('/firebase-functions.js')) {
      return route.fulfill({ contentType: 'application/javascript', body: FIREBASE_FUNCTIONS_MOCK });
    }
    if (url.origin === 'http://127.0.0.1:4173') return route.continue();
    throw new Error(`Unexpected network request: ${url.href}`);
  });
}

test('desktop exposes the utility control, search, and favorites without external services', async ({ page }) => {
  await installLoopbackBackend(page);
  await page.goto('/#overview');

  const utilityControl = page.locator('#utility-nav [data-route="control-panel"]');
  await expect(utilityControl).toBeVisible();
  await utilityControl.click();
  await expect(page).toHaveURL(/#control-panel$/);
  await expect(page.locator('#app h1')).toContainText('Пульт управления');

  await page.locator('#global-search-launcher').click();
  await expect(page.locator('#global-search-dialog')).toBeVisible();
  await page.locator('#global-search-input').fill('обзор');
  const matchingResult = page.locator('#global-search-results [data-global-search-route="users"]').first();
  const nonMatchingResult = page.locator('#global-search-results [data-global-search-route="overview"]').first();
  await expect(nonMatchingResult).toBeVisible();
  await page.locator('#global-search-input').fill('польз');
  await page.waitForTimeout(100);
  await expect(nonMatchingResult).toBeVisible({ timeout: 50 });
  await expect(nonMatchingResult).toBeHidden({ timeout: 400 });
  await expect(matchingResult).toBeVisible({ timeout: 400 });
  const favorite = page.locator('[data-global-search-favorite-id="section-users"]');
  await expect(favorite).toBeVisible();
  await favorite.click();
  await page.keyboard.press('Escape');

  await page.locator('#global-search-launcher').click();
  await expect(page.locator('#global-search-favorites-list [data-global-search-route="users"]')).toBeVisible();
  await page.keyboard.press('Escape');
});

test('loopback serves only the canonical root entry', async ({ request }) => {
  await expect((await request.get('/')).status()).toBe(200);
  await expect((await request.get('/v2')).status()).toBe(404);
  await expect((await request.get('/v2/')).status()).toBe(404);
});

test('shell keeps usable workspace geometry across desktop, tablet, and drawer breakpoints', async ({ page }) => {
  await installLoopbackBackend(page);
  await page.setViewportSize({ width: 1800, height: 900 });
  await page.goto('/#overview');

  for (const width of [1800, 1440, 1020, 761, 760]) {
    await page.setViewportSize({ width, height: 900 });
    const geometry = await page.evaluate(() => {
      const rect = (selector) => {
        const element = document.querySelector(selector);
        if (!element) throw new Error(`Missing layout element: ${selector}`);
        const bounds = element.getBoundingClientRect();
        return {
          left: bounds.left,
          right: bounds.right,
          width: bounds.width,
        };
      };
      const sidebar = document.querySelector('.sidebar');
      const workspace = document.querySelector('.workspace');
      const collapsedLabel = document.querySelector('.nav-group > summary span');
      if (!sidebar || !workspace || !collapsedLabel) throw new Error('Missing shell layout controls');
      return {
        documentScrollWidth: document.documentElement.scrollWidth,
        bodyScrollWidth: document.body.scrollWidth,
        workspace: rect('.workspace'),
        page: rect('.page'),
        topbar: rect('.topbar'),
        sidebar: rect('.sidebar'),
        sidebarPosition: getComputedStyle(sidebar).position,
        workspaceMarginLeft: getComputedStyle(workspace).marginLeft,
        collapsedLabelDisplay: getComputedStyle(collapsedLabel).display,
      };
    });

    for (const [name, bounds] of Object.entries({
      workspace: geometry.workspace,
      page: geometry.page,
      topbar: geometry.topbar,
    })) {
      expect(bounds.width, `${name} width at ${width}px`).toBeGreaterThan(0);
      expect(bounds.right, `${name} right edge at ${width}px`).toBeLessThanOrEqual(width + 0.5);
    }
    expect(geometry.documentScrollWidth, `document overflow at ${width}px`).toBeLessThanOrEqual(width);
    expect(geometry.bodyScrollWidth, `body overflow at ${width}px`).toBeLessThanOrEqual(width);

    if (width > 1020) {
      expect(geometry.sidebar.width, `desktop sidebar width at ${width}px`).toBeCloseTo(284, 0);
      expect(geometry.sidebarPosition, `desktop sidebar position at ${width}px`).toBe('sticky');
    } else if (width > 760) {
      expect(geometry.sidebar.width, `labeled tablet sidebar width at ${width}px`).toBeCloseTo(236, 0);
      expect(geometry.sidebarPosition, `labeled tablet sidebar position at ${width}px`).toBe('sticky');
      expect(geometry.collapsedLabelDisplay, `tablet sidebar label at ${width}px`).toBe('block');
    } else {
      expect(geometry.sidebarPosition, 'drawer sidebar position').toBe('fixed');
      expect(geometry.workspaceMarginLeft, 'drawer workspace offset').toBe('0px');
    }
  }

  await expect.poll(async () => {
    return page.locator('.sidebar').evaluate((sidebar) => sidebar.getBoundingClientRect().right);
  }, { message: 'closed drawer right edge' }).toBeLessThanOrEqual(0);

  const launcher = page.locator('#mobile-nav-toggle');
  await expect(launcher).toBeVisible();
  await launcher.click();
  await expect(launcher).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('body')).toHaveClass(/nav-open/);
  await expect.poll(async () => {
    return page.locator('.sidebar').evaluate((sidebar) => sidebar.getBoundingClientRect().left);
  }, { message: 'open drawer left edge' }).toBeCloseTo(0, 0);
});

test.describe('mobile navigation', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('opens the drawer and restores focus to its launcher on close', async ({ page }) => {
    await installLoopbackBackend(page);
    await page.goto('/#overview');

    const launcher = page.locator('#mobile-nav-toggle');
    await expect(launcher).toBeVisible();
    await launcher.click();
    await expect(page.locator('body')).toHaveClass(/nav-open/);
    await expect(launcher).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('.sidebar')).toBeVisible();
    await expect(launcher).not.toBeFocused();
    await expect(page.locator('.sidebar a:focus, .sidebar button:focus, .sidebar summary:focus')).toHaveCount(1);

    await page.keyboard.press('Escape');
    await expect(page.locator('body')).not.toHaveClass(/nav-open/);
    await expect(launcher).toHaveAttribute('aria-expanded', 'false');
    await expect(launcher).toBeFocused();
  });
});

test('375px and 390px drawer routes to users, closes, and returns focus to the top control', async ({ page }) => {
  await installLoopbackBackend(page);

  for (const width of [375, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/#overview');

    const launcher = page.locator('#mobile-nav-toggle');
    await launcher.click();
    await expect(page.locator('body')).toHaveClass(/nav-open/);

    await page.locator('.sidebar .nav-group').filter({ hasText: 'Пользователи' }).locator('summary').click();
    await page.locator('.sidebar button[data-route="users"]').click();
    await expect(page).toHaveURL(/#users$/);
    await expect(page.locator('body')).not.toHaveClass(/nav-open/);
    await expect(page.locator('.sidebar button[data-route="users"]')).toHaveAttribute('aria-current', 'page');
    await expect(page.locator('#app h1')).toBeVisible();
    await expect(launcher).toBeFocused();

    const routeTop = await page.locator('#app h1').evaluate((heading) => heading.getBoundingClientRect().top);
    expect(routeTop, `users route heading at ${width}px`).toBeGreaterThanOrEqual(0);
    expect(await page.evaluate(() => window.scrollY), `users route scroll at ${width}px`).toBe(0);
  }
});

test('375px analytics keeps its title, status badges, and global controls readable', async ({ page }) => {
  await installLoopbackBackend(page);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/#analytics');

  await expect(page.locator('#app h1')).toBeVisible();
  await page.locator('[data-analytics-report="exports"]').click();
  await expect(page.locator('#app .badge:visible').first()).toBeVisible();

  const layout = await page.evaluate(() => {
    const viewportWidth = window.innerWidth;
    const rect = (element) => {
      const bounds = element.getBoundingClientRect();
      return { top: bounds.top, bottom: bounds.bottom, left: bounds.left, right: bounds.right, width: bounds.width, height: bounds.height };
    };
    const title = document.querySelector('#app h1');
    const isVisible = (element) => {
      const style = getComputedStyle(element);
      const bounds = element.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && bounds.width > 0 && bounds.height > 0;
    };
    const badges = [...document.querySelectorAll('#app .badge')]
      .filter(isVisible)
      .map((badge) => {
        const cardHeader = badge.closest('.card-header');
        const cardHeading = cardHeader?.querySelector('h1, h2, h3, h4, h5, h6, [role="heading"]');
        if (!cardHeader || !cardHeading || !isVisible(cardHeader) || !isVisible(cardHeading)) {
          throw new Error('Visible analytics status badge is missing a visible local card header and heading');
        }
        return { badge: rect(badge), cardHeading: rect(cardHeading) };
      });
    const globalControls = [
      document.querySelector('#mobile-nav-toggle'),
      document.querySelector('#global-search-launcher'),
    ];
    if (!title || badges.length === 0 || globalControls.some((control) => !control)) {
      throw new Error('Analytics title, visible status badge, or global control is missing');
    }
    return {
      viewportWidth,
      documentScrollWidth: document.documentElement.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
      title: rect(title),
      titleFontSize: Number.parseFloat(getComputedStyle(title).fontSize),
      badges,
      controls: globalControls.map(rect),
    };
  });

  expect(layout.documentScrollWidth, 'analytics document horizontal overflow').toBeLessThanOrEqual(layout.viewportWidth);
  expect(layout.bodyScrollWidth, 'analytics body horizontal overflow').toBeLessThanOrEqual(layout.viewportWidth);
  expect(layout.title.width, 'analytics title width').toBeGreaterThan(0);
  expect(layout.title.left, 'analytics title left edge').toBeGreaterThanOrEqual(0);
  expect(layout.title.right, 'analytics title right edge').toBeLessThanOrEqual(layout.viewportWidth);
  expect(layout.titleFontSize, 'analytics title font size').toBeGreaterThanOrEqual(24);
  for (const { badge, cardHeading } of layout.badges) {
    expect(badge.width, 'analytics badge width').toBeGreaterThan(0);
    expect(badge.height, 'analytics badge height').toBeGreaterThan(0);
    expect(badge.left, 'analytics badge left edge').toBeGreaterThanOrEqual(0);
    expect(badge.right, 'analytics badge right edge').toBeLessThanOrEqual(layout.viewportWidth);
    expect(badge.top, 'analytics badge stacks below its local card heading').toBeGreaterThanOrEqual(cardHeading.bottom - 1);
  }
  for (const control of layout.controls) {
    expect(control.width, 'global control width').toBeGreaterThanOrEqual(44);
    expect(control.height, 'global control height').toBeGreaterThanOrEqual(44);
  }
});
