import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const read = (relativePath: string): string => fs.readFileSync(path.join(root, relativePath), 'utf8').replace(/\r\n/g, '\n');

describe('Admin v2 unified user profile', () => {
  test('uses protected server callables and never reads private profile collections directly', () => {
    const core = read('admin/v2/scripts/admin-core.js');
    const firebase = read('admin/v2/scripts/admin-firebase.js');
    const index = read('functions/src/index.ts');

    expect(firebase).toContain("httpsCallable(functionsUs, 'adminSearchUsers')");
    expect(firebase).toContain("httpsCallable(functionsUs, 'adminGetUserProfile')");
    expect(core).toContain("disabledWhenUnauthorized('users.read')");
    expect(core).toContain('search-admin-users');
    expect(core).toContain('data-user-profile-uid');
    expect(core).toContain('Источник не прочитан');
    expect(core).toContain("if (!can('users.read'))");
    expect(core).toContain("state.users = { query: '', searched: false, items: [], profile: null, profileLoading: false, searchState: 'idle', searchErrors: [] }");
    expect(core).toContain('Поиск не выполнен');
    expect(core).toContain('admin/index.html?openUser=');
    expect(index).toContain("export { adminSearchUsers, adminGetUserProfile } from './admin_user_profile';");
    for (const collectionName of ['users', 'auth_links', 'user_reports', 'error_reports', 'revenuecat_premium_events']) {
      expect(firebase).not.toContain(`collection(db, '${collectionName}')`);
    }
  });

  test('resolves every bounded candidate through auth links and preserves search source failures', () => {
    const server = read('functions/src/admin_user_profile.ts');
    expect(server).toContain("slice(0, MAX_SEARCH_CANDIDATES)");
    expect(server).toContain("state: searchErrors.length ? (items.length ? 'partial' : 'error') : 'ready'");
    expect(server).toContain('isSafeDocumentId(input.query)');
    expect(server).toContain("const prefix = isSafeDocumentId(input.query)");
    expect(server).toContain('applyAuthoritativeBan(');
    expect(server).toContain('identityErrors.length');
    expect(server).toContain("throw new HttpsError('unavailable', 'identity_resolution_failed')");
    expect(server).toContain("throw new HttpsError('unavailable', 'ban_status_unavailable')");
    expect(server).toContain('applySearchBanState(');
    const core = read('admin/v2/scripts/admin-core.js');
    expect(core).toContain("if (!state.authorized) {\n    state.detail = null;");
    expect(core).toContain("if (!state.authorized || !can('users.read')) {\n    state.users =");
    expect(core).toContain("user.banState === 'unknown'");
    expect(core).toContain('const authGeneration = state.authGeneration');
    expect(core).toContain("authGeneration !== state.authGeneration || !can('users.read')");
    expect(core).toContain('state.authGeneration += 1');
    expect(core).toContain("state.users.searchState === 'loading'");
    expect(core).toContain('state.users.profileLoading');
    expect(core).toContain('role="status" aria-live="polite"');
    expect(core).toContain('data-tooltip="Обновить все источники профиля"');
    expect(core).toContain('data-tooltip="Открыть защищённое управление аккаунтом"');
    expect(core).toContain('data-tooltip="Найти пользователя без загрузки всей базы"');
    const profileRenderer = core.slice(core.indexOf('function renderProfile()'), core.indexOf('function renderUsers()'));
    expect(profileRenderer).toContain('renderAdminAccessControls(profile.canonicalUid, summary)');
    expect(profileRenderer).not.toContain('data-action="grant-user-plus"');
    expect(profileRenderer).not.toContain('data-action="ban-user"');
    expect(server).toContain("invitedBy: sources.invitedBy");
    expect(server).toContain("sourceResult('referral_attribution_owner'");
  });

  test('uses the guarded V2 preview, confirm, server transaction and audit protocol for access changes', () => {
    const core = read('admin/v2/scripts/admin-core.js');
    expect(core).toContain('preview-admin-premium');
    expect(core).toContain('preview-admin-vip');
    expect(core).toContain('preview-admin-ban');
    expect(core).toContain('publish-admin-access');
    expect(core).toContain('preview → подтверждение → серверную транзакцию и аудит');
    expect(core).toContain('await actions.grantAccess(preview)');
    expect(core).toContain('await actions.setUserBan(preview)');
    expect(core).toContain('if (!globalThis.confirm(');
    expect(core).not.toContain('data-action="delete-user"');
    expect(core).not.toContain('data-action="merge-user"');
    expect(core).not.toContain('data-action="grant-user-plus"');
  });

  test('shows the app nickname together with the canonical UUID in user-facing identity surfaces', () => {
    const core = read('admin/v2/scripts/admin-core.js');
    expect(core).toContain('Ник:');
    expect(core).toContain('UUID:');
    expect(core).toContain('userIdentityLabel(');
    expect(core).toContain('users.primaryName');
    expect(core).toContain('users.reportedName');
  });
});
