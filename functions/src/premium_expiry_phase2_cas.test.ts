import fs from 'fs';
import path from 'path';
import { reconcilePremiumExpiry, samePremiumAuthority } from './premium_expiry_cron';
import type { PremiumLineageState } from './revenuecat_premium_lineage';

const source = fs.readFileSync(path.join(__dirname, 'premium_expiry_cron.ts'), 'utf8');
const sweepSource = source.slice(
  source.indexOf('export async function sweepExpiredPremium'),
  source.indexOf('export const premiumExpiryCron'),
);

describe('premium expiry cron Phase 2 CAS safety (RED)', () => {
  it('re-reads each candidate in a transaction before applying expiration', () => {
    expect(sweepSource).toContain('db.runTransaction(async (tx) =>');
    expect(sweepSource).toContain('const current = await tx.get(doc.ref)');
    expect(sweepSource).toContain('reconcilePremiumExpiry(currentProgress, currentLineages, now)');
    expect(sweepSource).not.toContain('doc.ref\n          .set');
  });

  it('uses canonical lineage/version CAS so a concurrent renewal wins over the stale sweep', () => {
    expect(samePremiumAuthority(
      { premium_rc_active_lineage: 'old', premium_rc_expiry_ms: '100' },
      { premium_rc_active_lineage: 'new', premium_rc_expiry_ms: '200' },
    )).toBe(false);
    expect(samePremiumAuthority(
      { premium_rc_active_lineage: 'same', premium_rc_expiry_ms: '200' },
      { premium_rc_active_lineage: 'same', premium_rc_expiry_ms: '200' },
    )).toBe(true);
    const activeSecondary = {
      lineageHash: 'lineage-b',
      plan: 'monthly',
      revoked: false,
      activeThroughMs: 3_000_000,
      productId: 'premium_monthly',
      store: 'APP_STORE',
      environment: 'PRODUCTION',
      lastEventType: 'RENEWAL',
      lastAccessEventTimeMs: 2_000_000,
      lastGrantEventTimeMs: 2_000_000,
    } as PremiumLineageState;
    expect(reconcilePremiumExpiry({
      premium_plan: 'yearly',
      premium_expiry: '1000',
      premium_rc_product_id: 'old_yearly',
      premium_rc_store: 'APP_STORE',
      premium_rc_event_type: 'RENEWAL',
    }, [activeSecondary], 2_500_000)?.patch).toMatchObject({
      premium_plan: 'monthly',
      premium_expiry: '0',
      premium_rc_active_lineage: 'lineage-b',
    });
    expect(reconcilePremiumExpiry({
      premium_plan: 'yearly',
      premium_expiry: '1000',
      premium_rc_product_id: 'old_yearly',
      premium_rc_store: 'APP_STORE',
      premium_rc_event_type: 'RENEWAL',
      premium_rc_active_lineage: 'old-lineage',
    }, [{ ...activeSecondary, revoked: true, activeThroughMs: 1000 }], 2_500_000)?.patch)
      .toMatchObject({ premium_plan: '', premium_rc_active_lineage: '' });
    expect(sweepSource).toContain('if (!samePremiumAuthority(scannedProgress, currentProgress)) return');
  });

  it('checks deletion denial inside the transaction and never recreates a deleted user', () => {
    expect(sweepSource).toContain('ACCOUNT_DELETE_TOMBSTONES');
    expect(sweepSource).toContain('ACCOUNT_DELETE_PERMANENT_DENIALS');
    expect(sweepSource).toContain('tx.update(doc.ref');
    expect(sweepSource).not.toContain('tx.set(doc.ref');
  });
});
