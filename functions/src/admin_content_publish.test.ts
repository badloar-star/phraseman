import { HttpsError } from 'firebase-functions/v2/https';
import { parseContentPublishRequest } from './admin_content_publish';

describe('parseContentPublishRequest', () => {
  it('requires an explicit CAS revision and human reason', () => {
    expect(parseContentPublishRequest({ packId: 'fr:lessons:1', expectedCatalogRevision: 0, idempotencyKey: 'pub-1', reason: 'Reviewed release', requestId: 'req-1' })).toMatchObject({ packId: 'fr:lessons:1' });
    expect(() => parseContentPublishRequest({ packId: 'fr', expectedCatalogRevision: -1, idempotencyKey: '', reason: '', requestId: '' })).toThrow(HttpsError);
  });
});
