import { buildPlusControlSnapshot, filterPlusAccounts, filterPlusFindings } from './admin_plus_control_core';

const NOW = Date.UTC(2026, 6, 13, 12);
const DAY = 24 * 60 * 60 * 1000;

describe('Admin Plus Control Center projection', () => {
  test('keeps access origins exclusive in totals while surfacing overlapping access as a radar finding', () => {
    const snapshot = buildPlusControlSnapshot([
      { id: 'store', name: 'Store', progress: { premium_plan: 'yearly', premium_rc_product_id: 'yearly', premium_rc_expiry_ms: String(NOW + DAY), vip_active: 'true', vip_plan: 'admin_vip', vip_until: String(NOW + DAY) } },
      { id: 'gift', name: 'Gift', progress: { intro_access_until_ms: String(NOW + DAY) } },
      { id: 'legacy', name: 'Legacy', progress: { premium_plan: 'admin_grant', admin_premium_override: 'true' } },
      { id: 'manual', name: 'Manual', progress: { premium_plan: 'monthly', premium_expiry: String(NOW + DAY) } },
    ], NOW);

    expect(snapshot.summary.activeAccessTotal).toBe(4);
    expect(snapshot.summary.byKind).toMatchObject({ store_subscription: 1, gift: 1, admin_grant: 1, manual_or_unknown: 1 });
    expect(snapshot.findings.some((row) => row.kind === 'double_access' && row.uid === 'store')).toBe(true);
    expect(snapshot.findings.some((row) => row.kind === 'legacy_admin_grant' && row.uid === 'legacy')).toBe(true);
    expect(snapshot.findings.some((row) => row.kind === 'manual_store_fields' && row.uid === 'manual')).toBe(true);
  });

  test('uses the canonical 72-hour RevenueCat grace and includes gifts without calling them paid', () => {
    const snapshot = buildPlusControlSnapshot([
      { id: 'grace', progress: { premium_plan: 'monthly', premium_rc_product_id: 'monthly', premium_rc_expiry_ms: String(NOW - 2 * DAY) } },
      { id: 'expired', progress: { premium_plan: 'monthly', premium_rc_product_id: 'monthly', premium_rc_expiry_ms: String(NOW - 4 * DAY) } },
      { id: 'loyalty', progress: { loyalty_gift_until_ms: String(NOW + DAY) } },
    ], NOW);
    expect(snapshot.accounts.find((row) => row.uid === 'grace')?.primaryKind).toBe('store_subscription');
    expect(snapshot.accounts.find((row) => row.uid === 'expired')?.active).toBe(false);
    expect(snapshot.accounts.find((row) => row.uid === 'loyalty')?.primaryKind).toBe('gift');
    expect(snapshot.summary.storeBackedTotal).toBe(1);
  });

  test('detects duplicate identity signals without returning raw provider identifiers', () => {
    const snapshot = buildPlusControlSnapshot([
      { id: 'canonical', name: 'Ada', email: 'ada@example.com', firebaseAuthUid: 'provider-secret', progress: { vip_active: 'true', vip_plan: 'admin_vip' } },
      { id: 'orphan', name: 'Ada copy', email: 'ADA@example.com', firebaseAuthUid: 'provider-secret', identityHidden: true, progress: { premium_plan: 'yearly', premium_rc_product_id: 'yearly', premium_rc_expiry_ms: String(NOW + DAY) } },
    ], NOW);
    const finding = snapshot.findings.find((row) => row.kind === 'identity_duplicate_access');
    expect(finding).toBeDefined();
    expect(finding?.users).toHaveLength(2);
    expect(JSON.stringify(finding)).not.toContain('provider-secret');
    expect(finding?.matchedSignals).toEqual(expect.arrayContaining(['email', 'firebaseAuthUid']));
    expect(snapshot.summary.hiddenUsersExcluded).toBe(1);
  });

  test('preserves all seven legacy radar kinds and bounds search/filter output', () => {
    const snapshot = buildPlusControlSnapshot([
      { id: 'stale', name: 'Same', progress: { premium_active: 'true' } },
      { id: 'future', name: 'Same', progress: { vip_active: 'true', vip_plan: 'admin_vip', vip_from: String(NOW + DAY) } },
      { id: 'active-name', name: 'Same', progress: { vip_active: 'true', vip_plan: 'admin_vip' } },
      { id: 'active-name-2', name: 'Same', progress: { vip_active: 'true', vip_plan: 'admin_vip' } },
    ], NOW);
    expect(snapshot.findings.some((row) => row.kind === 'stale_premium_flag')).toBe(true);
    expect(snapshot.findings.some((row) => row.kind === 'vip_inactive_shape')).toBe(true);
    expect(snapshot.findings.some((row) => row.kind === 'name_duplicate_access')).toBe(true);
    expect(filterPlusAccounts(snapshot.accounts, { filter: 'inactive', query: 'future' }).map((row) => row.uid)).toEqual(['future']);
    expect(filterPlusFindings(snapshot.findings, { filter: 'critical', query: 'stale' }).map((row) => row.uid)).toEqual(['stale']);
  });

  test('projects only allowlisted user fields', () => {
    const snapshot = buildPlusControlSnapshot([{ id: 'safe', name: 'Safe', email: 'safe@example.com', token: 'secret', progress: { vip_active: 'true', vip_plan: 'admin_vip', authToken: 'secret' } }], NOW);
    const serialized = JSON.stringify(snapshot.accounts[0]);
    expect(serialized).not.toContain('authToken');
    expect(serialized).not.toContain('secret');
    expect(snapshot.accounts[0]).toMatchObject({ uid: 'safe', name: 'Safe', email: 'safe@example.com', active: true, primaryKind: 'vip' });
  });
});
