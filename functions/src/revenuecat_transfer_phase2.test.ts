import fs from 'fs';
import path from 'path';
import * as logger from 'firebase-functions/logger';
import { __revenueCatWebhookTestHooks } from './revenuecat_shards';

jest.mock('firebase-functions/logger', () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() }));

const source = fs.readFileSync(path.join(__dirname, 'revenuecat_shards.ts'), 'utf8');
const transferSource = source.slice(
  source.indexOf('async function handleTransferEvent('),
  source.indexOf('export const revenueCatShardsWebhook'),
);

function responseStub() {
  const response: any = { statusCode: 0, body: null };
  response.status = (statusCode: number) => { response.statusCode = statusCode; return response; };
  response.json = (body: unknown) => { response.body = body; return response; };
  response.send = (body: unknown) => { response.body = body; return response; };
  return response;
}

describe('RevenueCat TRANSFER is authenticated audit-only', () => {
  it.each([
    [['stable-donor'], ['stable-recipient']],
    [['$RCAnonymousID:donor'], ['stable-recipient']],
    [['stable-donor'], ['$RCAnonymousID:recipient']],
  ])('accepts bounded donor/recipient permutations without any Firestore access', async (transferredFrom, transferredTo) => {
    const admin = require('firebase-admin');
    const firestore = jest.spyOn(admin, 'firestore').mockImplementation(() => {
      throw new Error('TRANSFER must not access Firestore');
    });
    const info = logger.info as jest.Mock;
    info.mockClear();
    const response = responseStub();
    try {
      await __revenueCatWebhookTestHooks.handleTransferEvent({
        id: 'transfer-audit-only',
        type: 'TRANSFER',
        event_timestamp_ms: 2_000_000,
        transferred_from: transferredFrom,
        transferred_to: transferredTo,
      } as any, 'TRANSFER', response);

      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual({ ok: true, kind: 'transfer', accepted: true, auditOnly: true });
      expect(firestore).not.toHaveBeenCalled();
      expect(info).toHaveBeenCalledTimes(1);
      expect(info.mock.calls[0]?.[0]).toBe('revenuecat_transfer_audit_only');
      expect(JSON.stringify(info.mock.calls[0]?.[1])).not.toContain('stable-donor');
      expect(JSON.stringify(info.mock.calls[0]?.[1])).not.toContain('stable-recipient');
      expect(JSON.stringify(info.mock.calls[0]?.[1])).not.toContain('$RCAnonymousID:');
    } finally {
      firestore.mockRestore();
    }
  });

  it('contains no transfer reducer, owner move, projection, delete, or public-profile tail', () => {
    expect(transferSource).not.toContain('runTransaction');
    expect(transferSource).not.toContain('revenuecat_premium_lineages');
    expect(transferSource).not.toContain('TRANSFER_OUT');
    expect(transferSource).not.toContain('writeAccessProjection');
    expect(transferSource).not.toContain('syncPublicProfilePlusAfterCommit');
    expect(transferSource).not.toContain('tx.delete');
    expect(transferSource).toContain("logger.info('revenuecat_transfer_audit_only'");
  });
});
