import fs from 'fs';
import path from 'path';

const deleteSource = fs.readFileSync(path.join(__dirname, 'account_delete.ts'), 'utf8');
const jobSource = fs.readFileSync(path.join(__dirname, 'account_delete_job.ts'), 'utf8');
const workerSource = fs.readFileSync(path.join(__dirname, 'account_delete_worker.ts'), 'utf8');
const webhookSource = fs.readFileSync(path.join(__dirname, 'revenuecat_shards.ts'), 'utf8');

describe('account deletion RevenueCat permanent denial Phase 2 (RED)', () => {
  it('creates a permanent hashed denial receipt atomically with deletion enqueue', () => {
    expect(jobSource).toContain("ACCOUNT_DELETE_PERMANENT_DENIALS = 'account_deletion_permanent_denials'");
    expect(jobSource).toContain('const permanentDenialRef = db.collection(ACCOUNT_DELETE_PERMANENT_DENIALS)');
    expect(jobSource).toContain('tx.set(permanentDenialRef');
  });

  it('never garbage-collects the permanent denial with operational jobs and markers', () => {
    expect(workerSource).toContain('ACCOUNT_DELETE_PERMANENT_DENIALS');
    expect(workerSource).not.toMatch(/collection\(ACCOUNT_DELETE_PERMANENT_DENIALS\)[\s\S]*retentionUntilMs/);
    expect(workerSource).not.toContain('batch.delete(permanentDenialRef');
  });

  it('deletes all premium lineages owned by the stable or auth identity', () => {
    expect(deleteSource).toContain("{ collection: 'revenuecat_premium_lineages', field: 'ownerUid', values: 'both' }");
    expect(deleteSource).toContain("{ collection: 'revenuecat_premium_denials', field: 'ownerUid', values: 'both' }");
  });

  it.each([
    ['premium', 'async function handlePremiumSubscriptionEvent'],
    ['transfer', 'async function handleTransferEvent'],
    ['shard purchase', 'async function handleShardPurchaseEvent'],
    ['shard refund', 'async function handleShardRefundEvent'],
  ])('checks permanent denial before any %s user mutation or final receipt', (_label, marker) => {
    const start = webhookSource.indexOf(marker);
    const nextHandler = webhookSource.indexOf('\nasync function ', start + marker.length);
    const handler = webhookSource.slice(start, nextHandler > start ? nextHandler : undefined);
    expect(handler).toContain('readPermanentDeletionDenials(tx, db');
    const denialRead = handler.indexOf('readPermanentDeletionDenials(tx, db');
    const firstUserMutation = handler.search(/tx\.(?:set|update)\((?:userRef|recipientRef|donor\.ref)/);
    expect(firstUserMutation).toBeGreaterThan(-1);
    expect(denialRead).toBeLessThan(firstUserMutation);
  });
});
