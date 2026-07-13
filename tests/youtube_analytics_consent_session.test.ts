const randomUUID = jest.fn()
  .mockReturnValueOnce('session-generated-1')
  .mockReturnValueOnce('session-generated-2');

jest.mock('expo-crypto', () => ({ randomUUID: () => randomUUID() }));
jest.mock('../app/firebase', () => ({ applyAnalyticsCollectionConsent: jest.fn() }));

import {
  setAnalyticsConsent,
  subscribeAnalyticsConsent,
} from '../app/analytics_consent';
import {
  clearProductAnalyticsSessionId,
  getProductAnalyticsSessionId,
} from '../app/product_analytics_session_context';

describe('YouTube analytics consent session compatibility', () => {
  beforeEach(async () => {
    clearProductAnalyticsSessionId();
    await setAnalyticsConsent('denied');
  });

  test('notifies subscribers until unsubscribe', async () => {
    const seen: string[] = [];
    const unsubscribe = subscribeAnalyticsConsent((state) => seen.push(state));
    await setAnalyticsConsent('granted');
    unsubscribe();
    await setAnalyticsConsent('denied');
    expect(seen).toEqual(['granted']);
  });

  test('creates a stable anonymous session only while consent is granted and rotates after revoke', async () => {
    expect(getProductAnalyticsSessionId()).toBeNull();
    await setAnalyticsConsent('granted');
    expect(getProductAnalyticsSessionId()).toBe('session-generated-1');
    expect(getProductAnalyticsSessionId()).toBe('session-generated-1');
    await setAnalyticsConsent('denied');
    expect(getProductAnalyticsSessionId()).toBeNull();
    await setAnalyticsConsent('granted');
    expect(getProductAnalyticsSessionId()).toBe('session-generated-2');
  });
});
