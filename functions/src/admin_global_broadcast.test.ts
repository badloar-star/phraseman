import { HttpsError } from 'firebase-functions/v2/https';
import {
  buildGlobalBroadcastPublicDocument,
  buildGlobalBroadcastPrivacyVerificationResult,
  forbiddenGlobalBroadcastMetadataKeys,
  globalBroadcastFingerprint,
  normalizeGlobalBroadcastDeactivateInput,
  normalizeGlobalBroadcastListInput,
  normalizeGlobalBroadcastPublishInput,
  normalizeGlobalBroadcastScrubInput,
  planGlobalBroadcastMetadataMigration,
  createGlobalBroadcastScrubCursorToken,
  resolveGlobalBroadcastScrubCursorOperation,
  GLOBAL_BROADCAST_FINAL_VERIFY_CAP,
  projectGlobalBroadcastOperationStatus,
  projectGlobalBroadcastRow,
} from './admin_global_broadcast';

describe('admin global broadcast contracts', () => {
  test('normalizes a bounded publish command and fills missing translations from Russian', () => {
    const input = normalizeGlobalBroadcastPublishInput({
      rewardType: 'shards',
      rewardAmount: 25,
      titles: { ru: 'ÐÐ¾Ð´Ð°ÑÐ¾Ðº', uk: 'ÐÐ¾Ð´Ð°ÑÑÐ½Ð¾Ðº' },
      messages: { ru: 'Ð¡Ð¿Ð°ÑÐ¸Ð±Ð¾, ÑÑÐ¾ ÑÑÐ¸ÑÐµÑÑ Ñ Ð½Ð°Ð¼Ð¸.', uk: 'ÐÑÐºÑÑÐ¼Ð¾, ÑÐ¾ Ð½Ð°Ð²ÑÐ°ÑÑÐµÑÑ Ð· Ð½Ð°Ð¼Ð¸.' },
      reason: 'ÐÐ¾Ð¼Ð¿ÐµÐ½ÑÐ°ÑÐ¸Ñ Ð¿Ð¾ÑÐ»Ðµ Ð¿Ð¾Ð´ÑÐ²ÐµÑÐ¶Ð´ÐµÐ½Ð½Ð¾Ð³Ð¾ ÑÐ±Ð¾Ñ',
      idempotencyKey: 'broadcast-publish-1',
      requestId: 'request-1',
    });

    expect(input).toMatchObject({
      rewardType: 'shards',
      rewardAmount: 25,
      reason: 'ÐÐ¾Ð¼Ð¿ÐµÐ½ÑÐ°ÑÐ¸Ñ Ð¿Ð¾ÑÐ»Ðµ Ð¿Ð¾Ð´ÑÐ²ÐµÑÐ¶Ð´ÐµÐ½Ð½Ð¾Ð³Ð¾ ÑÐ±Ð¾Ñ',
      idempotencyKey: 'broadcast-publish-1',
      requestId: 'request-1',
    });
    expect(input.titles).toEqual({
      ru: 'ÐÐ¾Ð´Ð°ÑÐ¾Ðº',
      uk: 'ÐÐ¾Ð´Ð°ÑÑÐ½Ð¾Ðº',
      es: 'ÐÐ¾Ð´Ð°ÑÐ¾Ðº',
      ptBr: 'ÐÐ¾Ð´Ð°ÑÐ¾Ðº',
      vi: 'ÐÐ¾Ð´Ð°ÑÐ¾Ðº',
      id: 'ÐÐ¾Ð´Ð°ÑÐ¾Ðº',
      tr: 'ÐÐ¾Ð´Ð°ÑÐ¾Ðº',
      pl: 'ÐÐ¾Ð´Ð°ÑÐ¾Ðº',
    });
    expect(input.messages.es).toBe(input.messages.ru);
  });

  test('rejects unknown rewards, unsafe shard amounts, missing preview content and malformed command ids', () => {
    const valid = {
      rewardType: 'none',
      rewardAmount: 0,
      titles: { ru: 'ÐÐ°Ð¶Ð½Ð¾Ðµ ÑÐ¾Ð¾Ð±ÑÐµÐ½Ð¸Ðµ' },
      messages: { ru: 'ÐÑÐ¾Ð²ÐµÑÑÑÐµ Ð¾Ð±Ð½Ð¾Ð²Ð»ÐµÐ½Ð¸Ðµ Ð¿ÑÐ¸Ð»Ð¾Ð¶ÐµÐ½Ð¸Ñ.' },
      reason: 'ÐÐ¿ÐµÑÐ°ÑÐ¸Ð¾Ð½Ð½Ð¾Ðµ ÑÐ²ÐµÐ´Ð¾Ð¼Ð»ÐµÐ½Ð¸Ðµ',
      idempotencyKey: 'broadcast-publish-1',
      requestId: 'request-1',
    };

    expect(() => normalizeGlobalBroadcastPublishInput({ ...valid, rewardType: 'cash' })).toThrow(HttpsError);
    expect(() => normalizeGlobalBroadcastPublishInput({ ...valid, rewardType: 'arena_extra_5' })).toThrow(HttpsError);
    expect(() => normalizeGlobalBroadcastPublishInput({ ...valid, rewardType: 'shards', rewardAmount: 1001 })).toThrow(HttpsError);
    expect(() => normalizeGlobalBroadcastPublishInput({ ...valid, titles: { ru: '' } })).toThrow(HttpsError);
    expect(() => normalizeGlobalBroadcastPublishInput({ ...valid, idempotencyKey: '../reuse' })).toThrow(HttpsError);
  });

  test('forces rewardAmount to zero for fixed rewards and keeps fingerprints stable across retry time', () => {
    const input = normalizeGlobalBroadcastPublishInput({
      rewardType: 'xp_boost_2x_24h',
      rewardAmount: 999,
      titles: { ru: 'Ð£ÑÐºÐ¾ÑÐµÐ½Ð¸Ðµ' },
      messages: { ru: 'ÐÐ°Ð±ÐµÑÐ¸ÑÐµ Ð´Ð²Ð¾Ð¹Ð½Ð¾Ð¹ Ð¾Ð¿ÑÑ.' },
      reason: 'ÐÐ¾Ð´Ð°ÑÐ¾Ðº Ð°ÐºÑÐ¸Ð²Ð½ÑÐ¼ ÑÑÐµÐ½Ð¸ÐºÐ°Ð¼',
      idempotencyKey: 'broadcast-publish-2',
      requestId: 'request-2',
    });

    expect(input.rewardAmount).toBe(0);
    expect(globalBroadcastFingerprint('publish', input)).toBe(globalBroadcastFingerprint('publish', input));
  });

  test('fingerprints operator-authored payload but ignores retry-time derived translation variance', () => {
    const base = {
      rewardType: 'none',
      rewardAmount: 0,
      titles: { ru: 'Важно', uk: 'Важливо', es: 'Uno' },
      messages: { ru: 'Основной текст', uk: 'Основний текст', es: 'Primero' },
      reason: 'Операционное сообщение',
      idempotencyKey: 'broadcast-publish-derived-translation',
      requestId: 'request-derived-translation',
    };
    const first = normalizeGlobalBroadcastPublishInput(base);
    const translatedAgain = normalizeGlobalBroadcastPublishInput({
      ...base,
      titles: { ...base.titles, es: 'Dos' },
      messages: { ...base.messages, es: 'Segundo' },
    });
    const changedOperatorText = normalizeGlobalBroadcastPublishInput({
      ...base,
      titles: { ...base.titles, ru: 'Другое' },
    });
    expect(globalBroadcastFingerprint('publish', first)).toBe(globalBroadcastFingerprint('publish', translatedAgain));
    expect(globalBroadcastFingerprint('publish', first)).not.toBe(globalBroadcastFingerprint('publish', changedOperatorText));
  });

  test('requires a reason and idempotency for bulk deactivation and bounds history reads', () => {
    expect(normalizeGlobalBroadcastDeactivateInput({
      reason: 'ÐÐ°Ð¼Ð¿Ð°Ð½Ð¸Ñ Ð·Ð°Ð²ÐµÑÑÐµÐ½Ð°',
      idempotencyKey: 'broadcast-off-1',
      requestId: 'request-off-1',
    })).toEqual({
      reason: 'ÐÐ°Ð¼Ð¿Ð°Ð½Ð¸Ñ Ð·Ð°Ð²ÐµÑÑÐµÐ½Ð°',
      idempotencyKey: 'broadcast-off-1',
      requestId: 'request-off-1',
    });
    expect(() => normalizeGlobalBroadcastDeactivateInput({ reason: '', idempotencyKey: 'x', requestId: 'y' })).toThrow(HttpsError);
    expect(normalizeGlobalBroadcastListInput({ limit: 999 })).toEqual({ limit: 50, operationIds: [] });
    expect(normalizeGlobalBroadcastListInput({ limit: -10 })).toEqual({ limit: 1, operationIds: [] });
    expect(normalizeGlobalBroadcastListInput({ operationIds: ['op-1', 'op-1', 'op-2'] })).toEqual({
      limit: 20,
      operationIds: ['op-1', 'op-2'],
    });
    expect(() => normalizeGlobalBroadcastListInput({ operationIds: Array.from({ length: 9 }, (_, i) => `op-${i}`) })).toThrow(HttpsError);
  });

  test('projects actor-bound operation receipts and quarantines foreign or unrelated ids', () => {
    expect(projectGlobalBroadcastOperationStatus('op-1', {
      action: 'global_broadcast_send',
      actorUid: 'admin-a',
      auditId: 'audit-1',
      result: { broadcastId: 'broadcast-1', deactivatedCount: 2 },
    }, 'admin-a')).toEqual({
      operationId: 'op-1',
      status: 'completed',
      receipt: {
        ok: true,
        replayed: true,
        broadcastId: 'broadcast-1',
        deactivatedCount: 2,
        auditId: 'audit-1',
      },
    });
    const foreign = projectGlobalBroadcastOperationStatus('op-2', {
      action: 'global_broadcast_send',
      actorUid: 'admin-b',
      auditId: 'secret-audit',
      result: { broadcastId: 'secret-broadcast' },
    }, 'admin-a');
    expect(foreign).toEqual({ operationId: 'op-2', status: 'conflict' });
    expect(JSON.stringify(foreign)).not.toContain('secret');
    expect(projectGlobalBroadcastOperationStatus('op-3', {
      action: 'another_admin_command', actorUid: 'admin-a',
    }, 'admin-a')).toEqual({ operationId: 'op-3', status: 'conflict' });
    expect(projectGlobalBroadcastOperationStatus('op-4', {
      action: 'global_broadcast_send',
      result: { broadcastId: 'legacy-without-owner' },
    }, 'admin-a')).toEqual({ operationId: 'op-4', status: 'conflict' });
  });

  test('projects only allowlisted broadcast history fields', () => {
    const row = projectGlobalBroadcastRow('broadcast-1', {
      active: true,
      rewardType: 'shards',
      rewardAmount: 10,
      titleRu: 'ÐÐ°Ð³Ð¾Ð»Ð¾Ð²Ð¾Ðº',
      messageRu: 'Ð¢ÐµÐºÑÑ',
      createdAt: '2026-07-17T12:00:00.000Z',
      createdBy: 'owner@example.com',
      createdByUid: 'admin-1',
      createdByRole: 'owner',
      adminOperationId: 'operation-secret',
      secret: 'drop-me',
      nested: { token: 'drop-me-too' },
    });

    expect(row).toMatchObject({
      id: 'broadcast-1',
      active: true,
      rewardType: 'shards',
      rewardAmount: 10,
      titleRu: 'ÐÐ°Ð³Ð¾Ð»Ð¾Ð²Ð¾Ðº',
      messageRu: 'Ð¢ÐµÐºÑÑ',
    });
    expect(JSON.stringify(row)).not.toContain('secret');
    expect(JSON.stringify(row)).not.toContain('token');
    expect(JSON.stringify(row)).not.toContain('admin-1');
    expect(JSON.stringify(row)).not.toContain('owner@example.com');
  });

  test('future broadcast documents contain only public app payload', () => {
    const input = normalizeGlobalBroadcastPublishInput({
      rewardType: 'shards', rewardAmount: 10,
      titles: { ru: 'Публичный заголовок' }, messages: { ru: 'Публичный текст' },
      reason: 'Проверенная публичная рассылка', idempotencyKey: 'public-doc-1', requestId: 'public-request-1',
    });
    const row = buildGlobalBroadcastPublicDocument(input, 1_800_000_000_000);
    expect(row).toMatchObject({ publicPayloadSchemaVersion: 1, publicPayloadValidatedV1: true, active: true, rewardType: 'shards', rewardAmount: 10, titleRu: 'Публичный заголовок' });
    expect(forbiddenGlobalBroadcastMetadataKeys(row)).toEqual([]);
    expect(Object.keys(row)).not.toEqual(expect.arrayContaining([
      'createdBy', 'createdByUid', 'createdByRole', 'adminOperationId',
      'replacedBy', 'replacedByUid', 'replacedByRole', 'replacementOperationId',
      'deactivatedBy', 'deactivatedByUid', 'deactivatedByRole', 'deactivationOperationId',
    ]));
  });

  test('normalizes bounded owner scrub pages and identifies only forbidden metadata', () => {
    expect(normalizeGlobalBroadcastScrubInput({
      dryRun: true, reason: 'Privacy preflight', idempotencyKey: 'scrub-1', requestId: 'scrub-request-1', limit: 999,
    })).toEqual({
      dryRun: true, reason: 'Privacy preflight', idempotencyKey: 'scrub-1', requestId: 'scrub-request-1', limit: 50, cursor: null,
    });
    expect(normalizeGlobalBroadcastScrubInput({
      dryRun: false, reason: 'Remove leaked actor metadata', idempotencyKey: 'scrub-2', requestId: 'scrub-request-2', limit: 20, cursor: 'A'.repeat(32),
    }).cursor).toBe('A'.repeat(32));
    expect(() => normalizeGlobalBroadcastScrubInput({
      dryRun: true, reason: 'Privacy preflight', idempotencyKey: 'scrub-raw', requestId: 'scrub-raw-request', cursor: 'документ с пробелом',
    })).toThrow(HttpsError);
    expect(() => normalizeGlobalBroadcastScrubInput({ dryRun: false, reason: '', idempotencyKey: 'scrub', requestId: 'request' })).toThrow(HttpsError);
    expect(forbiddenGlobalBroadcastMetadataKeys({
      active: true, titleRu: 'keep', createdBy: 'email', deactivationOperationId: 'op', unrelated: 'keep',
    })).toEqual(['createdBy', 'deactivationOperationId']);
    expect(planGlobalBroadcastMetadataMigration({
      active: true, titleRu: 'keep', createdBy: 'email', unrelated: 'keep',
    })).toEqual({ forbiddenKeys: ['createdBy'], unknownKeys: ['unrelated'], needsPublicMarker: true, needsPublicValidation: true });
    expect(planGlobalBroadcastMetadataMigration({
      publicPayloadSchemaVersion: 1, publicPayloadValidatedV1: true, active: false, titleRu: 'keep',
    })).toEqual({ forbiddenKeys: [], unknownKeys: [], needsPublicMarker: false, needsPublicValidation: false });
  });

  test('uses an opaque server cursor while preserving arbitrary Firestore document ids only server-side', () => {
    const token = createGlobalBroadcastScrubCursorToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]{32}$/);
    expect(resolveGlobalBroadcastScrubCursorOperation(token, {
      action: 'global_broadcast_scrub_cursor',
      actorUid: 'owner-a',
      cursorAfterDocumentId: 'Документ с пробелом ünicode',
      expiresAtMs: 1_800_000_100_000,
    }, 'owner-a', 1_800_000_000_000)).toBe('Документ с пробелом ünicode');
    expect(() => resolveGlobalBroadcastScrubCursorOperation(token, {
      action: 'global_broadcast_scrub_cursor', actorUid: 'owner-b', cursorAfterDocumentId: 'secret', expiresAtMs: 1_800_000_100_000,
    }, 'owner-a', 1_800_000_000_000)).toThrow(HttpsError);
  });

  test('produces readiness only from one complete aggregate scan and binds immutable release evidence', () => {
    const safe = buildGlobalBroadcastPublicDocument(normalizeGlobalBroadcastPublishInput({
      rewardType: 'none', rewardAmount: 0,
      titles: { ru: 'Safe' }, messages: { ru: 'Safe payload' },
      reason: 'Verification fixture', idempotencyKey: 'verification-fixture', requestId: 'verification-request',
    }), 1_800_000_000_000);
    const result = buildGlobalBroadcastPrivacyVerificationResult({
      rows: [safe],
      projectId: 'phraseman-ea0b3',
      environment: 'production',
      generation: 7,
      operationId: 'verify-operation',
      actorUid: 'owner-a',
      auditId: 'audit-a',
      startedAtMs: 1_800_000_000_000,
      finishedAtMs: 1_800_000_000_100,
    });
    expect(result).toMatchObject({ ready: true, complete: true, truncated: false, scannedCount: 1, unsafeCount: 0, unknownCount: 0 });
    expect(result.verificationReceipt).toMatchObject({
      receiptType: 'global_broadcast_privacy_final_v1',
      scope: 'aggregate',
      projectId: 'phraseman-ea0b3',
      environment: 'production',
      generation: 7,
      operationId: 'verify-operation',
      actorUid: 'owner-a',
      auditId: 'audit-a',
      complete: true,
      unsafeCount: 0,
      unknownCount: 0,
    });
    const verificationReceipt = result.verificationReceipt as Record<string, unknown>;
    expect(verificationReceipt.schemaAllowlistHash).toMatch(/^[a-f0-9]{64}$/);
    expect(verificationReceipt.functionArtifactHashes).toEqual({
      globalBroadcastClaimSourceSha256: expect.stringMatching(/^[a-f0-9]{64}$/),
      globalBroadcastPublicSourceSha256: expect.stringMatching(/^[a-f0-9]{64}$/),
      communityPacksSourceSha256: expect.stringMatching(/^[a-f0-9]{64}$/),
    });
    expect(verificationReceipt.appQueryArtifact).toEqual({
      version: 'global-broadcast-callable-reader-v2',
      sourceSha256: expect.stringMatching(/^[a-f0-9]{64}$/),
    });
  });

  test('never emits a final receipt from a capped tail or an unsafe aggregate', () => {
    const safe = { publicPayloadSchemaVersion: 1, publicPayloadValidatedV1: true, active: false };
    const truncated = buildGlobalBroadcastPrivacyVerificationResult({
      rows: Array.from({ length: GLOBAL_BROADCAST_FINAL_VERIFY_CAP + 1 }, () => safe),
      projectId: 'phraseman-ea0b3', environment: 'production', generation: 1,
      operationId: 'verify-tail', actorUid: 'owner-a', auditId: 'audit-tail', startedAtMs: 100, finishedAtMs: 200,
    });
    expect(truncated).toMatchObject({ ready: false, complete: false, truncated: true, scannedCount: GLOBAL_BROADCAST_FINAL_VERIFY_CAP });
    expect(truncated.verificationReceipt).toBeNull();

    const unsafe = buildGlobalBroadcastPrivacyVerificationResult({
      rows: [{ ...safe, unknownInternal: 'blocked' }],
      projectId: 'phraseman-ea0b3', environment: 'production', generation: 1,
      operationId: 'verify-unsafe', actorUid: 'owner-a', auditId: 'audit-unsafe', startedAtMs: 100, finishedAtMs: 200,
    });
    expect(unsafe).toMatchObject({ ready: false, complete: true, unsafeCount: 1, unknownCount: 1 });
    expect(unsafe.verificationReceipt).toBeNull();
  });
});

