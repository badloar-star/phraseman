import fs from 'fs';
import path from 'path';

const deleteSource = fs.readFileSync(path.join(__dirname, 'account_delete.ts'), 'utf8');
const jobSource = fs.readFileSync(path.join(__dirname, 'account_delete_job.ts'), 'utf8');
const workerSource = fs.readFileSync(path.join(__dirname, 'account_delete_worker.ts'), 'utf8');
const webhookSource = fs.readFileSync(path.join(__dirname, 'revenuecat_shards.ts'), 'utf8');

describe('account deletion RevenueCat permanent denial Phase 2 (RED)', () => {
  it('creates a permanent hashed denial receipt atomically with deletion enqueue', () => {
    expect(jobSource).toContain("ACCOUNT_DELETE_PERMANENT_DENIALS = 'account_deletion_permanent_denials'");
    // зачем (Q47): реализация давно есть, но по одному отказу на каждую личность
    // замыкания (`denialRefs`), а не одной переменной `permanentDenialRef` —
    // проверяем смысл (та же транзакция, хэш, без перезаписи), а не написание.
    expect(jobSource).toMatch(/db\.collection\(ACCOUNT_DELETE_PERMANENT_DENIALS\)\s*\.doc\(accountDeletePermanentDenialId\(identity\)\)/);
    const txStart = jobSource.indexOf('return db.runTransaction(async (tx) => {', jobSource.indexOf('const denialRefs = '));
    expect(txStart).toBeGreaterThan(-1);
    const txBody = jobSource.slice(txStart);
    const denialWrite = txBody.indexOf('tx.set(denialRef, {');
    expect(denialWrite).toBeGreaterThan(-1);
    expect(txBody.slice(0, denialWrite)).toContain('if (denialSnapshots[index].exists) return;');
    expect(txBody.slice(denialWrite, denialWrite + 200)).toContain('identityHash: sha256(identity)');
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
    // Premium processing was intentionally extracted from the HTTP adapter so
    // the verified event reducer can be tested without an Express response.
    ['premium', 'export async function applyVerifiedPremiumSubscriptionEvent'],
    ['transfer', 'async function handleTransferEvent'],
    // D103: обработчики покупки/возврата жемчуга удалены — пользователей не меняют.
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
