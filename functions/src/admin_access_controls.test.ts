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

  // ── 22.10 владелец: «Plus любому профилю на любое время» — своя дата, 100 лет, кольцо сразу ──
  describe('vip Plus for any term', () => {
    const NOW = 1_700_000_000_000;
    const YEAR_MS = 365 * DAY_MS;

    it('lets only admins with the manual-access permission grant or revoke Plus', () => {
      const actor = (accessControls as any).adminAccessActor;
      expect(typeof actor).toBe('function');
      const deny = (request: unknown) => expect(() => actor(request, 'money.manual_access.write')).toThrow(HttpsError);
      deny({});
      deny({ auth: null });
      deny({ auth: { uid: 'user-1', token: {} } });
      deny({ auth: { uid: 'user-1', token: { admin: false } } });
      deny({ auth: { uid: 'user-1', token: { admin: 'true' } } });
      deny({ auth: { uid: '', token: { admin: true } } });
      expect(actor({ auth: { uid: 'admin-1', token: { admin: true, email: 'a@b.c' } } }, 'money.manual_access.write'))
        .toEqual({ actorUid: 'admin-1', role: 'owner', email: 'a@b.c' });
    });

    it('accepts an exact future end date for a vip grant and uses it as the expiry', () => {
      const untilMs = NOW + 400 * DAY_MS;
      const input = normalizeAdminAccessInput({ ...base, kind: 'vip', untilMs }, NOW);
      expect(input.untilMs).toBe(untilMs);
      const patch = buildAdminAccessPatch({ progress: { vip_until: String(NOW + 10 * DAY_MS) } }, input, NOW);
      expect(patch.expiresAtMs).toBe(untilMs);
      expect(patch.after).toMatchObject({ vip_active: 'true', vip_plan: 'admin_vip', vip_until: String(untilMs), vip_admin_override: 'true' });
    });

    it.each([
      ['in the past', { kind: 'vip', untilMs: NOW - 1 }],
      ['equal to now', { kind: 'vip', untilMs: NOW }],
      ['more than 100 calendar years ahead', { kind: 'vip', untilMs: NOW + 36_525 * DAY_MS + 1 }],
      ['not an integer', { kind: 'vip', untilMs: NOW + 1.5 }],
      ['a string', { kind: 'vip', untilMs: String(NOW + DAY_MS) }],
      ['for the premium branch', { kind: 'premium', untilMs: NOW + DAY_MS }],
      ['for a revoke', { kind: 'vip', active: false, untilMs: NOW + DAY_MS }],
    ])('rejects an end date %s', (_label, extra) => {
      expect(() => normalizeAdminAccessInput({ ...base, ...extra }, NOW)).toThrow(HttpsError);
    });

    it('allows terms up to 100 years and keeps 0 as forever', () => {
      expect(normalizeAdminAccessInput({ ...base, kind: 'vip', durationDays: 36_500 }, NOW).durationDays).toBe(36_500);
      expect(() => normalizeAdminAccessInput({ ...base, kind: 'vip', durationDays: 36_501 }, NOW)).toThrow(HttpsError);
      expect(normalizeAdminAccessInput({ ...base, kind: 'vip', untilMs: NOW + 100 * YEAR_MS }, NOW).untilMs).toBe(NOW + 100 * YEAR_MS);
      expect(normalizeAdminAccessInput({ ...base, kind: 'vip', untilMs: NOW + 36_525 * DAY_MS }, NOW).untilMs).toBe(NOW + 36_525 * DAY_MS);
      const forever = buildAdminAccessPatch({ progress: {} }, normalizeAdminAccessInput({ ...base, kind: 'vip', durationDays: 0 }, NOW), NOW);
      expect(forever.expiresAtMs).toBe(0);
    });

    it('keeps old fingerprints for durationDays commands and separates exact-date commands', () => {
      const old = normalizeAdminAccessInput({ ...base, kind: 'vip' }, NOW);
      expect(old.untilMs).toBeNull();
      expect(adminAccessFingerprint(old)).toBe(JSON.stringify({ action: 'grant_access', uid: base.uid, kind: 'vip', durationDays: 30, active: true, reason: base.reason }));
      const exact = normalizeAdminAccessInput({ ...base, kind: 'vip', untilMs: NOW + DAY_MS }, NOW);
      expect(adminAccessFingerprint(exact)).not.toBe(adminAccessFingerprint(old));
    });

    it('updates the Plus ring only after the committed transaction, for vip grants and revokes, never on replay', () => {
      const lf = source.replace(/\r\n/g, '\n');
      const start = lf.indexOf('export const adminGrantAccess = onCall(');
      const body = lf.slice(start, lf.indexOf('\nexport ', start + 1));
      const txEnd = body.indexOf('  });\n', body.indexOf('db.runTransaction(async (tx) =>'));
      const ring = body.indexOf('syncPublicProfilePlusAfterCommit(');
      expect(txEnd).toBeGreaterThan(-1);
      expect(ring).toBeGreaterThan(txEnd);
      expect(body).toContain("input.kind === 'vip' && committedProgress && out.replayed !== true");
      expect(body).toContain("source: input.active ? 'admin_grant_access' : 'admin_revoke_access'");
      expect(body).toContain('...patch.after');
    });
  });

  it('uses the canonical target for the transactional write, audit entity, and callable result', () => {
    expect(source).toContain('resolveCanonicalAdminAccessTarget(tx, db, input.uid)');
    expect(source).toContain('tx.update(target.ref, { ...patch.updates, updatedAt: now })');
    expect(source).toContain("entity: { collection: 'users', id: target.uid }");
    expect(source).toContain('uid: target.uid');
  });
});
