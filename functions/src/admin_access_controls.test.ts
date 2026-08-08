import fs from 'fs';
import path from 'path';
import { HttpsError } from 'firebase-functions/v2/https';
import * as accessControls from './admin_access_controls';
import { adminAccessFingerprint, buildAdminAccessPatch, normalizeAdminAccessInput, normalizeAdminBanInput } from './admin_access_controls';

const base = { uid: 'stable-user_1', durationDays: 30, reason: 'support compensation', requestId: 'request-1', idempotencyKey: 'op-1' };
const DAY_MS = 86_400_000;

function identityDb(users: Record<string, Record<string, unknown>>) {
  const db = {
    collection: (collection: string) => ({
      doc: (id: string) => ({ collection, id }),
    }),
  };
  const tx = {
    get: jest.fn(async (ref: { collection: string; id: string }) => {
      const data = ref.collection === 'users' ? users[ref.id] : undefined;
      return { exists: data !== undefined, data: () => data, ref };
    }),
  };
  return { db, tx };
}

describe('admin access controls', () => {
  const source = fs.readFileSync(path.join(__dirname, 'admin_access_controls.ts'), 'utf8');
  it('defaults active to true for frozen callers and fingerprints grant/revoke separately', () => {
    const input = normalizeAdminAccessInput({ ...base, kind: 'premium' });
    const revoke = normalizeAdminAccessInput({ ...base, kind: 'premium', active: false });

    expect(input).toMatchObject({ kind: 'premium', active: true });
    expect((revoke as any).active).toBe(false);
    expect(adminAccessFingerprint(input)).not.toBe(adminAccessFingerprint(revoke));
    expect(adminAccessFingerprint(input)).toContain('"active":true');
    expect(() => normalizeAdminAccessInput({ ...base, kind: 'vip', active: 'false' })).toThrow(HttpsError);
  });

  it('extends finite admin Plus from the later of now and the existing expiry', () => {
    const now = 1_000;
    const existingUntil = now + 2 * DAY_MS;
    const input = normalizeAdminAccessInput({ ...base, kind: 'vip', durationDays: 3 });
    const patch = buildAdminAccessPatch({
      progress: {
        vip_active: 'true',
        vip_plan: 'admin_vip',
        vip_from: '100',
        vip_until: String(existingUntil),
        vip_admin_override: 'true',
        vip_admin_grant_at: '100',
        vip_granted_by: 'previous-admin',
      },
    }, input, now);
    const expiresAtMs = existingUntil + 3 * DAY_MS;

    expect(patch).toEqual({
      updates: {
        'progress.vip_active': 'true',
        'progress.vip_plan': 'admin_vip',
        'progress.vip_from': String(now),
        'progress.vip_until': String(expiresAtMs),
        'progress.vip_admin_override': 'true',
        'progress.vip_admin_grant_at': String(now),
        'progress.vip_granted_by': 'admin',
      },
      before: {
        vip_active: 'true',
        vip_plan: 'admin_vip',
        vip_from: '100',
        vip_until: String(existingUntil),
        vip_admin_override: 'true',
        vip_admin_grant_at: '100',
        vip_granted_by: 'previous-admin',
      },
      after: {
        vip_active: 'true',
        vip_plan: 'admin_vip',
        vip_from: String(now),
        vip_until: String(expiresAtMs),
        vip_admin_override: 'true',
        vip_admin_grant_at: String(now),
        vip_granted_by: 'admin',
      },
      expiresAtMs,
    });
  });

  it('grants admin Plus forever without touching premium fields', () => {
    const input = normalizeAdminAccessInput({ ...base, kind: 'vip', durationDays: 0 });
    const patch = buildAdminAccessPatch({ progress: {} }, input, 5_000);

    expect(patch.after).toEqual({
      vip_active: 'true', vip_plan: 'admin_vip', vip_from: '5000', vip_until: '0',
      vip_admin_override: 'true', vip_admin_grant_at: '5000', vip_granted_by: 'admin',
    });
    expect(patch.expiresAtMs).toBe(0);
    expect(Object.keys(patch.updates).some((key) => key.includes('premium'))).toBe(false);
  });

  it('revokes only admin Plus fields and records exact before/after values', () => {
    const input = normalizeAdminAccessInput({ ...base, kind: 'vip', active: false });
    const patch = buildAdminAccessPatch({ progress: {
      vip_active: 'true', vip_admin_override: 'true', vip_until: '9999', vip_revoked_at: null,
      premium_plan: 'yearly', premium_expiry: '8888', premium_rc_product_id: 'store-yearly',
    } }, input, 5_000);

    expect(patch).toEqual({
      updates: {
        'progress.vip_active': 'false',
        'progress.vip_admin_override': 'false',
        'progress.vip_until': '5000',
        'progress.vip_revoked_at': '5000',
      },
      before: { vip_active: 'true', vip_admin_override: 'true', vip_until: '9999', vip_revoked_at: null },
      after: { vip_active: 'false', vip_admin_override: 'false', vip_until: '5000', vip_revoked_at: '5000' },
      expiresAtMs: 5_000,
    });
    expect(Object.keys(patch.updates).some((key) => key.includes('premium'))).toBe(false);
  });

  it('retains premium grants and safely revokes only the admin override', () => {
    const grant = normalizeAdminAccessInput({ ...base, kind: 'premium', durationDays: 2 });
    expect(buildAdminAccessPatch({ progress: {} }, grant, 1_000)).toEqual({
      updates: {
        'progress.premium_plan': 'admin_grant',
        'progress.premium_expiry': String(1_000 + 2 * DAY_MS),
        'progress.admin_premium_override': 'true',
      },
      before: { premium_plan: null, premium_expiry: null, admin_premium_override: null },
      after: { premium_plan: 'admin_grant', premium_expiry: String(1_000 + 2 * DAY_MS), admin_premium_override: 'true' },
      expiresAtMs: 1_000 + 2 * DAY_MS,
    });

    const revoke = normalizeAdminAccessInput({ ...base, kind: 'premium', active: false });
    const revoked = buildAdminAccessPatch({ progress: {
      premium_plan: 'yearly', premium_expiry: '9999', premium_rc_product_id: 'store-yearly',
      premium_rc_entitlement_id: 'premium', admin_premium_override: 'true', premium_admin_revoked_at: null,
    } }, revoke, 5_000);
    expect(revoked).toEqual({
      updates: { 'progress.admin_premium_override': 'false', 'progress.premium_admin_revoked_at': '5000' },
      before: { admin_premium_override: 'true', premium_admin_revoked_at: null },
      after: { admin_premium_override: 'false', premium_admin_revoked_at: '5000' },
      expiresAtMs: 5_000,
    });
  });

  it('rejects unsafe access commands and ban commands', () => {
    expect(() => normalizeAdminAccessInput({ ...base, kind: 'store', durationDays: 3651 })).toThrow(HttpsError);
    expect(() => normalizeAdminBanInput({ uid: '../users', banned: true, reason: 'x', requestId: 'r', idempotencyKey: 'k' })).toThrow(HttpsError);
    expect(normalizeAdminBanInput({ uid: 'stable-user_1', banned: true, reason: 'abuse report', requestId: 'r-1', idempotencyKey: 'k-1' }).banned).toBe(true);
  });

  it('resolves hidden legacy identities to an existing non-hidden canonical user', async () => {
    const resolver = (accessControls as any).resolveCanonicalAdminAccessTarget;
    expect(typeof resolver).toBe('function');
    const { db, tx } = identityDb({
      legacy: { identityHidden: true, canonicalStableId: 'canonical' },
      canonical: { identityHidden: false, progress: {} },
    });

    await expect(resolver(tx, db, 'legacy')).resolves.toMatchObject({
      uid: 'canonical',
      ref: { collection: 'users', id: 'canonical' },
    });
    expect(tx.get).toHaveBeenCalledTimes(2);
  });

  it.each([
    ['missing canonicalStableId', { legacy: { identityHidden: true } }],
    ['missing canonical document', { legacy: { identityHidden: true, canonicalStableId: 'missing' } }],
    ['hidden canonical document', { legacy: { identityHidden: true, canonicalStableId: 'canonical' }, canonical: { identityHidden: true } }],
  ])('fails closed for %s', async (_label, users) => {
    const resolver = (accessControls as any).resolveCanonicalAdminAccessTarget;
    expect(typeof resolver).toBe('function');
    const { db, tx } = identityDb(users as Record<string, Record<string, unknown>>);
    await expect(resolver(tx, db, 'legacy')).rejects.toBeInstanceOf(HttpsError);
  });

  it('propagates canonical document read failures instead of falling back to the legacy uid', async () => {
    const resolver = (accessControls as any).resolveCanonicalAdminAccessTarget;
    expect(typeof resolver).toBe('function');
    const { db, tx } = identityDb({ legacy: { identityHidden: true, canonicalStableId: 'canonical' } });
    tx.get.mockImplementation(async (ref: { collection: string; id: string }) => {
      if (ref.id === 'canonical') throw new Error('canonical read unavailable');
      return { exists: true, data: () => ({ identityHidden: true, canonicalStableId: 'canonical' }), ref };
    });
    await expect(resolver(tx, db, 'legacy')).rejects.toThrow('canonical read unavailable');
  });

  it('uses the canonical target for the transactional write, audit entity, and callable result', () => {
    expect(source).toContain('resolveCanonicalAdminAccessTarget(tx, db, input.uid)');
    expect(source).toContain('tx.update(target.ref, { ...patch.updates, updatedAt: now })');
    expect(source).toContain("entity: { collection: 'users', id: target.uid }");
    expect(source).toContain('uid: target.uid');
  });
});
