import fs from 'node:fs';
import path from 'node:path';

import { deleteApp, initializeApp } from 'firebase-admin/app';

import {
  createIsolatedStaffFirestoreDependencies,
  createIsolatedStaffStoreDependencies,
  type IsolatedStaffStorePort,
} from './admin_staff_isolated_firestore';
import { isolatedStaffPrincipalKey } from './admin_staff_isolated_core';

const mainProjectId = 'phraseman-ea0b3';
const principalKey = isolatedStaffPrincipalKey('phraseman-staff-auth', 'staff-1');

function port(projectId = mainProjectId, overrides: Partial<IsolatedStaffStorePort> = {}) {
  let rateState: unknown | null = null;
  const value: IsolatedStaffStorePort = {
    projectId,
    getDocument: jest.fn(async () => null),
    updateDocumentAtomically: jest.fn(async (_collection, _id, update) => {
      rateState = update(rateState);
    }),
    ...overrides,
  };
  return { value, getRateState: () => rateState };
}

describe('isolated staff narrow Firestore store', () => {
  test('real factory rejects an App configured for a different project before Firestore access', async () => {
    const app = initializeApp({ projectId: 'different-main-project' }, `isolated-store-mismatch-${Date.now()}`);
    try {
      expect(() => createIsolatedStaffFirestoreDependencies(app, mainProjectId))
        .toThrow('isolated_staff_not_configured');
    } finally {
      await deleteApp(app);
    }
  });

  test('fails closed on main-project mismatch before reading or transacting', () => {
    const p = port('phraseman-staff-auth');
    expect(() => createIsolatedStaffStoreDependencies(p.value, mainProjectId)).toThrow('isolated_staff_not_configured');
    expect(p.value.getDocument).not.toHaveBeenCalled();
    expect(p.value.updateDocumentAtomically).not.toHaveBeenCalled();
  });

  test('loads only the namespaced v2 membership document', async () => {
    const row = { schemaVersion: 2 };
    const p = port(mainProjectId, { getDocument: jest.fn(async () => row) });
    const deps = createIsolatedStaffStoreDependencies(p.value, mainProjectId);
    await expect(deps.loadMembershipV2(principalKey)).resolves.toBe(row);
    expect(p.value.getDocument).toHaveBeenCalledWith('admin_staff_members_v2', principalKey);
  });

  test('uses the shared server-only rate store, hashes identity, and enforces the atomic window', async () => {
    const p = port();
    let nowMs = 1000;
    const deps = createIsolatedStaffStoreDependencies(p.value, mainProjectId, () => nowMs);
    await deps.consumeRateLimit('isolated-session-read', principalKey, 2, 60_000);
    await deps.consumeRateLimit('isolated-session-read', principalKey, 2, 60_000);
    await expect(deps.consumeRateLimit('isolated-session-read', principalKey, 2, 60_000)).rejects.toThrow('rate_limited');
    expect(p.value.updateDocumentAtomically).toHaveBeenCalledTimes(3);
    for (const call of (p.value.updateDocumentAtomically as jest.Mock).mock.calls) {
      expect(call[0]).toBe('admin_staff_rate_limits');
      expect(call[1]).toMatch(/^[a-f0-9]{64}$/);
      expect(call[1]).not.toContain(principalKey);
    }
    expect(p.getRateState()).toEqual({ schemaVersion: 1, scope: 'isolated-session-read',
      windowStartedAtMs: 1000, count: 2, updatedAtMs: 1000 });

    nowMs += 60_001;
    await expect(deps.consumeRateLimit('isolated-session-read', principalKey, 2, 60_000)).resolves.toBeUndefined();
  });

  test('fails closed on malformed rate state', async () => {
    const p = port(mainProjectId, { updateDocumentAtomically: jest.fn(async (_collection, _id, update) => {
      update({ schemaVersion: 1, scope: 'other', windowStartedAtMs: 1, count: 1, updatedAtMs: 1 });
    }) });
    const deps = createIsolatedStaffStoreDependencies(p.value, mainProjectId, () => 2);
    await expect(deps.consumeRateLimit('isolated-session-read', principalKey, 2, 60_000))
      .rejects.toThrow('invalid_rate_state');
  });

  test('source contains only the two approved collections and no product references', () => {
    const functionsRoot = path.resolve(__dirname, '..');
    const source = fs.readFileSync(path.join(functionsRoot, 'src', 'admin_staff_isolated_firestore.ts'), 'utf8');
    expect(source).toContain('ADMIN_STAFF_ISOLATED_MEMBERS_COLLECTION');
    expect(source).toContain("'admin_staff_rate_limits'");
    for (const forbidden of ['public_profiles', "'users'", 'auth_links']) {
      expect(source).not.toContain(forbidden);
    }
    expect(source).not.toMatch(/['"]admin_staff_members['"]/);
  });
});
