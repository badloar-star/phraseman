import { HttpsError } from 'firebase-functions/v2/https';
import { parseAnalyticsRequest } from './admin_analytics';

describe('analytics request contract', () => {
  it('allows the supported bounded periods', () => {
    expect(parseAnalyticsRequest({ rangeDays: 28 })).toEqual({ rangeDays: 28 });
  });
  it('rejects unbounded or arbitrary periods', () => {
    expect(() => parseAnalyticsRequest({ rangeDays: 365 })).toThrow(HttpsError);
  });
});
