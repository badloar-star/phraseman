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

  it('fails closed for both deletion guards before every premium authority effect', () => {
    const marker = 'export async function applyVerifiedPremiumSubscriptionEvent';
    const start = webhookSource.indexOf(marker);
    const nextHandler = webhookSource.indexOf('\nasync function ', start + marker.length);
    const handler = webhookSource.slice(start, nextHandler > start ? nextHandler : undefined);

    const earlyGuardStart = handler.indexOf('const auditCandidates = boundPremiumOwnerCandidates');
    const selectedGuardStart = handler.indexOf('const deletionIdentities = [');
    expect(earlyGuardStart).toBeGreaterThan(-1);
    expect(selectedGuardStart).toBeGreaterThan(earlyGuardStart);
    const earlyGuard = handler.slice(earlyGuardStart, selectedGuardStart);
    expect(earlyGuard).toContain('readPermanentDeletionDenials(tx, db, auditCandidates.candidates)');
    expect(earlyGuard).toContain('db.collection(ACCOUNT_DELETE_TOMBSTONES).doc(identity)');
    expect(earlyGuard).toContain('db.collection(ACCOUNT_DELETE_AUTH_MARKERS).doc(identity)');
    expect(earlyGuard).toMatch(
      /if \(\[\.\.\.earlyPermanentDenials, \.\.\.earlyDeletionSnapshots\]\.some\(\(snapshot\) => snapshot\.exists\)\) \{[\s\S]{0,700}return zeroTail\('receipt_evidence_conflict', 'account_deletion_pending_or_tombstoned'\);/,
    );

    const selectedGuardEnd = handler.indexOf('const targetUserRef = ', selectedGuardStart);
    expect(selectedGuardEnd).toBeGreaterThan(selectedGuardStart);
    const selectedGuard = handler.slice(selectedGuardStart, selectedGuardEnd);
    for (const protectedIdentity of [
      'authority.targetOwnerUid',
      "evidence?.rawOriginalOwnerUid ?? ''",
      "evidenceCanonicalOwnerUid ?? ''",
      "requesterCanonicalUid ?? ''",
    ]) {
      expect(selectedGuard).toContain(protectedIdentity);
    }
    expect(selectedGuard).toContain('readPermanentDeletionDenials(tx, db, deletionIdentities)');
    expect(selectedGuard).toContain('db.collection(ACCOUNT_DELETE_TOMBSTONES).doc(identity)');
    expect(selectedGuard).toContain('db.collection(ACCOUNT_DELETE_AUTH_MARKERS).doc(identity)');
    expect(selectedGuard).toMatch(
      /if \(\[\.\.\.permanentDenials, \.\.\.deletionSnapshots\]\.some\(\(snapshot\) => snapshot\.exists\)\) \{[\s\S]{0,700}return zeroTail\('receipt_evidence_conflict', 'account_deletion_pending_or_tombstoned'\);/,
    );

    const failClosedReturn = handler.indexOf(
      "return zeroTail('receipt_evidence_conflict', 'account_deletion_pending_or_tombstoned');",
      selectedGuardStart,
    );
    expect(failClosedReturn).toBeGreaterThan(selectedGuardStart);
    for (const protectedEffect of [
      'tx.create(ownerRef',
      'tx.set(processedRef',
      'tx.set(lineageRef',
      'tx.set(targetUserRef',
      'writeAccessProjection(tx, targetUserRef',
    ]) {
      const effectIndex = handler.indexOf(protectedEffect, selectedGuardStart);
      expect(effectIndex).toBeGreaterThan(-1);
      expect(failClosedReturn).toBeLessThan(effectIndex);
    }
  });

  it('keeps authenticated TRANSFER routed to a strict audit-only, no-state handler', () => {
    const marker = 'async function handleTransferEvent';
    const start = webhookSource.indexOf(marker);
    const end = webhookSource.indexOf('\ntype AuthenticatedRevenueCatRoute', start + marker.length);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const handler = webhookSource.slice(start, end);
    expect(handler).toContain("logger.info('revenuecat_transfer_audit_only'");
    expect(handler).toContain('eventIdHash: validEventId ? hashAuditIdentity(eventId) : null');
    expect(handler).toContain('donorIdHashes:');
    expect(handler).toContain('recipientIdHashes:');
    expect(handler).toContain("res.status(200).json({ ok: true, kind: 'transfer', accepted: true, auditOnly: true })");
    expect(handler).not.toMatch(/admin\.firestore|runTransaction|\.collection\(|\btx\.|\bdb\b/);
    expect(handler).not.toMatch(/applyVerifiedPremiumSubscriptionEvent|revenuecat_premium_lineage|writeAccessProjection/);
    expect(handler).not.toMatch(/syncPublicProfilePlusAfterCommit|TRANSFER_OUT|\.(?:set|update|delete)\(/);

    const routeStart = webhookSource.indexOf('async function routeAuthenticatedRevenueCatWebhook');
    const routeEnd = webhookSource.indexOf('\nasync function dispatchAuthenticatedRevenueCatWebhook', routeStart);
    const route = webhookSource.slice(routeStart, routeEnd);
    expect(route).toMatch(
      /if \(eventType === 'TRANSFER'\) \{\s*await handleTransferEvent\(event, eventType, res\);\s*return;\s*\}/,
    );
  });
});
