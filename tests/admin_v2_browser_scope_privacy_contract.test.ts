import fs from 'node:fs';
import path from 'node:path';

const read = (file: string) => fs.readFileSync(path.resolve(__dirname, '..', file), 'utf8');
const core = read('admin/v2/scripts/admin-core.js');
const firebase = read('admin/v2/scripts/admin-firebase.js');

describe('Admin V2 browser-local preference privacy contract', () => {
  test('passes Firebase UID through every auth-state path without changing role authorization', () => {
    expect(firebase).toContain("onAuth({ authorized: false, email: '', role: '', uid: '' })");
    expect(firebase).toMatch(/onAuth\(\{ authorized: token\.claims\.admin === true && Boolean\(role\), email: user\.email \?\? '', role, uid: user\.uid \}\)/);
    expect(firebase).toContain("onAuth({ authorized: false, email: user.email ?? '', role: '', uid: user.uid })");
    expect(firebase).toContain("const role = typeof token.claims.adminRole === 'string' ? token.claims.adminRole : ''");
  });

  test('derives persistent dashboard scope asynchronously from UID and rejects stale auth completion', () => {
    expect(core).toContain('deriveAdminBrowserPreferenceScope');
    expect(core).toContain('drainLegacyDashboardWidgetPreferences');
    expect(core).toContain('migrateDashboardWidgetPreferences');
    expect(core).toContain('async function establishDashboardWidgetScope');
    expect(core).toMatch(/authGeneration !== state\.authGeneration[\s\S]*!state\.authorized/);
    expect(core).toContain('void establishDashboardWidgetScope({');
    expect(core).not.toContain('return state.authorized && email ? `admin:${email}` : null;');
  });

  test('uses session-only defaults before digest and removes the prior opaque key on switch or sign-out', () => {
    const authBlock = core.slice(core.indexOf('export function setAuthState(auth)'), core.indexOf('\nexport function renderRoute', core.indexOf('export function setAuthState(auth)')));
    expect(authBlock).toContain('const previousDashboardScope = dashboardWidgetsScope;');
    expect(authBlock).toContain('resetDashboardWidgetPreferences({');
    expect(authBlock).toContain('scope: previousDashboardScope');
    expect(authBlock).toContain('dashboardWidgetsScope = null;');
    expect(authBlock).toContain('hydrateDashboardWidgetDraft({ fallbackVisibleIds });');
    expect(authBlock).toContain('state.adminUid = state.authorized ? normalizeFirebaseUid(auth.uid) : null;');
  });

  test('keeps a drained legacy preference in memory across same-account auth refresh races', () => {
    const authBlock = core.slice(core.indexOf('export function setAuthState(auth)'), core.indexOf('\nexport function renderRoute', core.indexOf('export function setAuthState(auth)')));
    expect(core).toContain('let pendingLegacyDashboardWidgetIds = null;');
    expect(authBlock).toContain('if (!nextAuthorized || !nextUid || previousUid !== nextUid) pendingLegacyDashboardWidgetIds = null;');
    expect(authBlock).toContain('pendingLegacyDashboardWidgetIds = legacy.visibleIds;');
    expect(authBlock).toContain('const fallbackVisibleIds = legacy.visibleIds ?? pendingLegacyDashboardWidgetIds;');
    expect(core).toContain('pendingLegacyDashboardWidgetIds = null;');
  });

  test('contains browser storage getter failures inside the preference boundary', () => {
    expect(core).toMatch(/function dashboardWidgetStorage\(\) \{[\s\S]*try \{ return globalThis\.localStorage; \}[\s\S]*catch \{ return null; \}[\s\S]*\}/);
    expect(core).toContain('storage: dashboardWidgetStorage()');
    const saveSettings = core.slice(core.indexOf('function saveAdminUiSettings'), core.indexOf('\nfunction applyAdminUiSettings'));
    expect(saveSettings).toContain('try { globalThis.localStorage?.setItem(ADMIN_V2_SETTINGS_STORAGE_KEY, JSON.stringify(normalized)); }');
    expect(saveSettings).toContain('catch {}');
  });
});
