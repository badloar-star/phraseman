import { HttpsError } from 'firebase-functions/v2/https';
import { parseContentPublishRequest, parseContentRollbackRequest } from './admin_content_publish';

describe('parseContentPublishRequest', () => {
  it('requires an explicit CAS revision and human reason', () => {
    expect(parseContentPublishRequest({ packId: 'fr:lessons:1', expectedCatalogRevision: 0, idempotencyKey: 'pub-1', reason: 'Reviewed release', requestId: 'req-1' })).toMatchObject({ packId: 'fr:lessons:1' });
    expect(() => parseContentPublishRequest({ packId: 'fr', expectedCatalogRevision: -1, idempotencyKey: '', reason: '', requestId: '' })).toThrow(HttpsError);
  });

  it('requires a valid rollback CAS request', () => {
    expect(parseContentRollbackRequest({ catalogId: 'fr-a1', expectedCatalogRevision: 2, idempotencyKey: 'rb-1', reason: 'Revert failed release', requestId: 'req-rb' })).toMatchObject({ catalogId: 'fr-a1' });
    expect(() => parseContentRollbackRequest({ catalogId: '../escape', expectedCatalogRevision: 2, idempotencyKey: 'rb-1', reason: 'x', requestId: 'r' })).toThrow(HttpsError);
  });
});
