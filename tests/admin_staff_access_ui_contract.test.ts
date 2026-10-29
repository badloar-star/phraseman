import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'admin/v2/legacy.html'), 'utf8');

function runtimeSource(): string {
  const match = html.match(/<script id="pm-staff-access-runtime-v1">([\s\S]*?)<\/script>/);
  if (!match) throw new Error('staff access runtime marker missing');
  return match[1];
}

describe('staff access UI integration', () => {
  test('owner surface has labeled bounded controls and explicit feedback', () => {
    const source = runtimeSource();
    expect(source).toContain('Рабочие места сотрудников');
    expect(source).toContain('Подготовить приглашение');
    expect(source).toContain('for="pm-staff-invite-email"');
    expect(source).toContain('for="pm-staff-invite-badge"');
    expect(source).toContain('for="pm-staff-invite-expiry"');
    expect(source).toContain('Письмо не отправляется');
    expect(source).toContain('Аккаунт и доступ не созданы');
    expect(source).toContain('Для существующей записи доступ можно только отозвать');
    expect(source).toContain('Выбрать для отзыва');
    expect(source).toContain('id="pm-staff-status" role="status" aria-live="polite"');
    expect(source).not.toContain('можно включить только просмотр');
    expect(source).not.toMatch(/Firebase|admin:true|\bUID\b|адаптер|ревизия/);
    expect(html).toMatch(/\.pm-staff-field input,[\s\S]*height:\s*44px;[\s\S]*max-height:\s*44px/);
    expect(source).toContain('await refreshList({ preserveStatus:true })');
    expect(source).toContain('Версия доступа:');
  });

  test('staff session resolves before managed legacy access and cannot start the admin app', () => {
    const staff = html.indexOf('staffAccessResult = await window.pmStaffAccessTrySession');
    const managed = html.indexOf("managedAccessResult = await tryResolveManagedAdminAccess");
    expect(staff).toBeGreaterThan(0);
    expect(managed).toBeGreaterThan(staff);
    const granted = html.match(/if \(staffAccessResult\?\.granted === true\) \{([\s\S]*?)\n\s*\}/)?.[1] || '';
    expect(granted).toContain('pmStaffAccessShowWorkspace');
    expect(granted).not.toContain('startAdminApp');
    expect(html).toContain('const pmStaffAuthEpoch = ++_pmStaffAuthEpoch');
    expect(html).toContain('if (!pmStaffAuthIsCurrent()) return;');
    expect(html).toContain('window.pmStaffAccessReset?.();');
    expect((html.match(/catch \(e\) \{\s*if \(!pmStaffAuthIsCurrent\(\)\) return;/g) || []).length).toBeGreaterThanOrEqual(2);
  });

  test('runtime lists only server-returned visible sections and uses an exact callable allowlist', async () => {
    const call = jest.fn(async (name: string) => name === 'adminStaffGetSession'
      ? { data: { schemaVersion: 1, uid: 'staff-1', active: true, revision: 1, badge: 'Редактор', sections: { workspace: 'view', hiddenOne: 'hidden' } } }
      : { data: {} });
    const fakeWindow: Record<string, unknown> = { pmStaffAccessCall: call };
    const fakeDocument = { readyState: 'loading', addEventListener: jest.fn() };
    const fakeCrypto = { randomUUID: () => 'staff-op-test' };
    new Function('window', 'document', 'crypto', runtimeSource())(fakeWindow, fakeDocument, fakeCrypto);
    const runtime = fakeWindow.pmStaffAccessRuntime as { visibleSections: (session: unknown) => string[] };
    expect(runtime.visibleSections({ sections: { workspace: 'view', hiddenOne: 'hidden' } })).toEqual(['workspace']);
    // зачем (владелец 29.10, «персонал и приглашения — не включать»): раздел выключен флагом в рантайме — проверка сессии
    // сотрудника отвечает owner_disabled без единого вызова сервера (функций adminStaff*Membership на бою нет).
    await expect((fakeWindow.pmStaffAccessTrySession as (user: unknown) => Promise<unknown>)({ uid: 'staff-1' }))
      .resolves.toEqual({ granted: false, reason: 'owner_disabled' });
    expect(call).not.toHaveBeenCalled();
    expect(runtimeSource()).toContain('const PM_STAFF_SECTION_ENABLED = false;');
    expect(runtimeSource()).toContain('[ADMIN-STAFF] hidden reason=');
    expect(html).toContain("new Set(['adminStaffGetSession','adminStaffListMemberships','adminStaffResolveIdentity','adminStaffSetMembership','adminStaffCreateInvitation','adminStaffListInvitations','adminStaffRevokeInvitation'])");
  });

  test('staff runtime has no direct database, claim grant, or arbitrary legacy dispatch', () => {
    const source = runtimeSource();
    expect(source).not.toMatch(/\bcollection\s*\(|\bgetDocs?\s*\(|setCustomUserClaims|admin\s*:\s*true/);
    expect(source).not.toMatch(/\bcreateUser\s*\(|inviteUrl|password/i);
    expect(source).not.toMatch(/window\s*\[|eval\s*\(|new Function/);
    expect(source).toContain('state.generation++');
    expect(source).toContain('window.pmStaffAccessReset = reset');
    expect(source).toContain('await window.adminSignOut?.()');
    expect(source).toContain('Не удалось выйти. Повторите попытку.');
  });

  test('a save continuation cannot update a newly mounted account after logout while list refresh is pending', async () => {
    let releaseList: ((value: unknown) => void) | null = null;
    const call = jest.fn(async (name: string) => {
      if (name === 'adminStaffSetMembership') return { data: { schemaVersion: 1, revision: 2, active: true, replayed: false } };
      if (name === 'adminStaffListMemberships') return new Promise(resolve => { releaseList = resolve; });
      return { data: {} };
    });
    const element = (value = ''): any => ({ value, disabled: false, hidden: false, textContent: '', innerHTML: '', dataset: {},
      remove: jest.fn(), replaceChildren: jest.fn(), querySelectorAll: () => [], addEventListener: jest.fn() });
    const elements: Record<string, any> = {
      'pm-staff-mode': element('view'), 'pm-staff-badge': element('Редактор'), 'pm-staff-reason': element('staff_onboarding'),
      'pm-staff-status': element(), 'pm-staff-target': element(), 'pm-staff-list': element(),
      'pm-staff-save': element(), 'pm-staff-revoke': element(), 'pm-staff-resolve': element(), 'pm-staff-refresh': element(),
    };
    const fakeDocument: any = { readyState: 'loading', addEventListener: jest.fn(), getElementById: (id: string) => elements[id] || null,
      createElement: () => element(), body: { appendChild: jest.fn() } };
    const instrumented = runtimeSource().replace(
      'window.pmStaffAccessRuntime = Object.freeze({ visibleSections });',
      'window.__pmStaffTest = { state, saveMembership, reset }; window.pmStaffAccessRuntime = Object.freeze({ visibleSections });',
    );
    const fakeWindow: any = { pmStaffAccessCall: call };
    new Function('window', 'document', 'crypto', instrumented)(fakeWindow, fakeDocument, { randomUUID: () => 'op-race' });
    fakeWindow.__pmStaffTest.state.members = [{ uid: 'staff-old', email: 'old@example.test', emailVerified: true, disabled: false,
      active: true, revision: 1, badge: 'Редактор', sections: { workspace: 'view' } }];
    fakeWindow.__pmStaffTest.state.selected = { uid: 'staff-old', email: 'old@example.test', emailVerified: true, disabled: false };
    const saving = fakeWindow.__pmStaffTest.saveMembership(false);
    while (!releaseList) await Promise.resolve();
    fakeWindow.__pmStaffTest.reset();
    const newStatus = element();
    elements['pm-staff-status'] = newStatus;
    fakeWindow.__pmStaffTest.state.members = [{ uid: 'staff-new', email: 'new@example.test', emailVerified: true, disabled: false,
      active: true, revision: 7, badge: 'Новый', sections: { workspace: 'view' } }];
    fakeWindow.__pmStaffTest.state.selected = { uid: 'staff-new', email: 'new@example.test', emailVerified: true, disabled: false };
    releaseList?.({ data: { schemaVersion: 1, truncated: false, members: [] } });
    await saving;
    expect(newStatus.textContent).toBe('');
  });

  test('owner controls stay concealed when the server rejects a managed non-owner', async () => {
    const call = jest.fn(async (name: string) => {
      if (name === 'adminStaffListMemberships') {
        const error = new Error('owner required') as Error & { code?: string };
        error.code = 'functions/permission-denied';
        throw error;
      }
      return { data: {} };
    });
    const created: any[] = [];
    const element = (): any => ({ disabled: false, hidden: false, textContent: '', innerHTML: '', dataset: {},
      removed: false, remove() { this.removed = true; }, replaceChildren: jest.fn(), querySelectorAll: () => [],
      addEventListener: jest.fn(), appendChild: jest.fn(), insertBefore: jest.fn(), prepend: jest.fn(), setAttribute: jest.fn() });
    const host = element();
    const controls: Record<string, any> = {
      'tab-control-panel': host, 'pm-staff-status': element(), 'pm-staff-list': element(), 'pm-staff-target': element(),
      'pm-staff-resolve': element(), 'pm-staff-refresh': element(), 'pm-staff-save': element(), 'pm-staff-revoke': element(),
    };
    const fakeDocument: any = { readyState: 'loading', addEventListener: jest.fn(), querySelectorAll: () => [],
      getElementById: (id: string) => controls[id] || created.find(item => item.id === id && !item.removed) || null,
      createElement: () => { const item = element(); created.push(item); return item; }, body: { appendChild: jest.fn() } };
    const fakeWindow: any = { pmStaffAccessCall: call, switchTab: jest.fn(), location: { hash: '', search: '' } };
    new Function('window', 'document', 'crypto', runtimeSource())(fakeWindow, fakeDocument, { randomUUID: () => 'op-owner' });
    // зачем (владелец 29.10): раздел выключен — при обычном входе карточка владельца не создаётся и сервер не зовётся
    fakeWindow.pmStaffAccessMountOwnerPanel();
    expect(created.find(item => item.id === 'pm-staff-access-card')).toBeUndefined();
    expect(created.find(item => item.id === 'pm-staff-disabled-notice')).toBeUndefined();
    expect(call).not.toHaveBeenCalled();
    expect(host.prepend).not.toHaveBeenCalled();
    // прямой вход (#staff): заглушка «раздел выключен» в Пульте и переход на вкладку; сервер по-прежнему не зовётся
    fakeWindow.location = { hash: '#staff', search: '' };
    fakeWindow.pmStaffAccessMountOwnerPanel();
    const notice = created.find(item => item.id === 'pm-staff-disabled-notice');
    expect(notice).toBeDefined();
    expect(notice.textContent).toBe('Раздел «Персонал» выключен владельцем.');
    expect(notice.hidden).toBe(false);
    expect(host.prepend).toHaveBeenCalledWith(notice);
    expect(fakeWindow.switchTab).toHaveBeenCalledWith('control-panel', expect.objectContaining({ replaceHash: true }));
    expect(created.find(item => item.id === 'pm-staff-access-card')).toBeUndefined();
    expect(call).not.toHaveBeenCalled();
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(call).not.toHaveBeenCalled();
  });

  test('committed revoke remains accurate when the follow-up list refresh fails', async () => {
    const call = jest.fn(async (name: string) => {
      if (name === 'adminStaffSetMembership') return { data: { schemaVersion: 1, revision: 2, active: false, replayed: false } };
      if (name === 'adminStaffListMemberships') throw new Error('temporary list failure');
      return { data: {} };
    });
    const element = (value = ''): any => ({ value, disabled: false, hidden: false, textContent: '', innerHTML: '', dataset: {},
      remove: jest.fn(), replaceChildren: jest.fn(), querySelectorAll: () => [], addEventListener: jest.fn() });
    const elements: Record<string, any> = {
      'pm-staff-mode': element('hidden'), 'pm-staff-badge': element('Редактор'), 'pm-staff-reason': element('access_revoked'),
      'pm-staff-status': element(), 'pm-staff-target': element(), 'pm-staff-list': element(),
      'pm-staff-save': element(), 'pm-staff-revoke': element(), 'pm-staff-resolve': element(), 'pm-staff-refresh': element(),
    };
    const fakeDocument: any = { readyState: 'loading', addEventListener: jest.fn(), getElementById: (id: string) => elements[id] || null,
      createElement: () => element(), body: { appendChild: jest.fn() } };
    const instrumented = runtimeSource().replace(
      'window.pmStaffAccessRuntime = Object.freeze({ visibleSections });',
      'window.__pmStaffTest = { state, saveMembership }; window.pmStaffAccessRuntime = Object.freeze({ visibleSections });',
    );
    const fakeWindow: any = { pmStaffAccessCall: call };
    new Function('window', 'document', 'crypto', instrumented)(fakeWindow, fakeDocument, { randomUUID: () => 'op-refresh-fail' });
    fakeWindow.__pmStaffTest.state.members = [{ uid: 'staff-1', email: 'staff@example.test', emailVerified: true, disabled: false,
      active: true, revision: 1, badge: 'Редактор', sections: { workspace: 'view' } }];
    fakeWindow.__pmStaffTest.state.selected = { uid: 'staff-1', email: 'staff@example.test', emailVerified: true, disabled: false };
    await fakeWindow.__pmStaffTest.saveMembership(true);
    expect(fakeWindow.__pmStaffTest.state.members[0]).toEqual(expect.objectContaining({ active: false, revision: 2, sections: {} }));
    expect(elements['pm-staff-status'].textContent).toContain('Доступ отозван');
    expect(elements['pm-staff-status'].textContent).toContain('Список не обновлён');
  });

  test('invitation create and revoke reuse uncertain operation ids and apply receipts before a failed refresh', async () => {
    let createCalls = 0;
    let revokeCalls = 0;
    const transient = () => Object.assign(new Error('temporary'), { code: 'functions/internal' });
    const call = jest.fn(async (name: string, data: any) => {
      if (name === 'adminStaffCreateInvitation') {
        createCalls++;
        if (createCalls === 1) throw transient();
        return { data: { schemaVersion: 1, reservationId: 'reservation-1', reservationCode: 'RESERVAT', revision: 1,
          status: 'pending', emailMasked: 'e***@example.com', badge: 'Редактор', createdAtMs: 1000, expiresAtMs: 2000,
          activation: 'blocked_identity_isolation_required', replayed: true } };
      }
      if (name === 'adminStaffRevokeInvitation') {
        revokeCalls++;
        if (revokeCalls === 1) throw transient();
        return { data: { schemaVersion: 1, reservationId: data.reservationId, revision: 2, status: 'revoked', replayed: true } };
      }
      if (name === 'adminStaffListInvitations') throw transient();
      return { data: {} };
    });
    const element = (value = ''): any => ({ value, disabled: false, hidden: false, textContent: '', innerHTML: '', dataset: {},
      querySelectorAll: () => [], addEventListener: jest.fn(), setAttribute: jest.fn(), closest: () => null });
    const elements: Record<string, any> = {
      'pm-staff-invite-email': element('employee@example.com'), 'pm-staff-invite-badge': element('Редактор'),
      'pm-staff-invite-expiry': element('72'), 'pm-staff-invite-status': element(), 'pm-staff-invite-list': element(),
      'pm-staff-invite-create': element(), 'pm-staff-invite-refresh': element(),
    };
    const fakeDocument: any = { readyState: 'loading', addEventListener: jest.fn(), querySelectorAll: () => [],
      getElementById: (id: string) => elements[id] || null, createElement: () => element(), body: { appendChild: jest.fn() } };
    const instrumented = runtimeSource().replace(
      'const previousMount=window.pmStaffAccessMountOwnerPanel;',
      'window.__pmStaffInvitationTest={invitationState,create,revoke,refresh}; const previousMount=window.pmStaffAccessMountOwnerPanel;',
    );
    const uuids = ['create-once', 'revoke-once'];
    const fakeWindow: any = { pmStaffAccessCall: call };
    new Function('window', 'document', 'crypto', instrumented)(fakeWindow, fakeDocument, { randomUUID: jest.fn(() => uuids.shift()) });

    await fakeWindow.__pmStaffInvitationTest.create();
    await fakeWindow.__pmStaffInvitationTest.create();
    const createPayloads = call.mock.calls.filter(([name]) => name === 'adminStaffCreateInvitation').map(([, data]) => data);
    expect(createPayloads).toHaveLength(2);
    expect(createPayloads[0].operationId).toBe(createPayloads[1].operationId);
    expect(fakeWindow.__pmStaffInvitationTest.invitationState.rows[0]).toEqual(expect.objectContaining({ reservationId: 'reservation-1', status: 'pending' }));
    expect(elements['pm-staff-invite-status'].textContent).toContain('Список не обновлён');

    await fakeWindow.__pmStaffInvitationTest.revoke('reservation-1', 1);
    await fakeWindow.__pmStaffInvitationTest.revoke('reservation-1', 1);
    const revokePayloads = call.mock.calls.filter(([name]) => name === 'adminStaffRevokeInvitation').map(([, data]) => data);
    expect(revokePayloads).toHaveLength(2);
    expect(revokePayloads[0].operationId).toBe(revokePayloads[1].operationId);
    expect(fakeWindow.__pmStaffInvitationTest.invitationState.rows[0]).toEqual(expect.objectContaining({ revision: 2, status: 'revoked' }));
    expect(elements['pm-staff-invite-status'].textContent).toContain('отзыв показан по ответу сервера');
  });
});
