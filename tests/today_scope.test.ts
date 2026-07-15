import type { AccountGenerationToken } from '../app/account_generation';
import { createTodayScope, rebuildCurrentTodayScope } from '../lib/today/scope';

const account: AccountGenerationToken = { generation: 7, stableId: 'user-a', phase: 'active' };

describe('Today scope', () => {
  test('includes identity, target, locale, local day and timezone', () => {
    const scope = createTodayScope({ account, studyTargetId: 'en', uiLocale: 'ru', now: new Date('2026-07-13T10:00:00Z'), timeZone: 'Europe/Dublin' });
    expect(scope).toMatchObject({ accountScopeId: 'user-a', accountGeneration: 7, studyTargetId: 'en', uiLocale: 'ru', localDateKey: '2026-07-13', timeZone: 'Europe/Dublin' });
    expect(createTodayScope({ account, studyTargetId: 'en', uiLocale: 'ru', now: new Date('2026-07-13T10:00:00Z'), timeZone: 'Asia/Tokyo' })?.scopeKey).not.toBe(scope?.scopeKey);
  });

  test('refuses non-active or blank identities', () => {
    expect(createTodayScope({ account: { ...account, phase: 'transitioning' }, studyTargetId: 'en', uiLocale: 'ru' })).toBeNull();
    expect(createTodayScope({ account: { ...account, stableId: ' ' }, studyTargetId: 'en', uiLocale: 'ru' })).toBeNull();
  });

  test('post-await rebuild accepts only the exact current scope', () => {
    const scope = createTodayScope({ account, studyTargetId: 'en', uiLocale: 'ru', now: new Date('2026-07-13T10:00:00Z'), timeZone: 'Europe/Dublin' })!;
    expect(rebuildCurrentTodayScope(scope, account, 'en', 'ru', new Date('2026-07-13T11:00:00Z'), 'Europe/Dublin')).toEqual(scope);
    expect(rebuildCurrentTodayScope(scope, account, 'fr', 'ru', new Date('2026-07-13T11:00:00Z'), 'Europe/Dublin')).toBeNull();
  });
});
