import { weeklyReviewV2StorageKey } from '../app/target_storage_keys';

describe('weekly review V2 storage key', () => {
  it('isolates account generation, UI language and study target', () => {
    const aliceEn = weeklyReviewV2StorageKey('generation:3:uid:alice', 'ru', 'en');
    const aliceFr = weeklyReviewV2StorageKey('generation:3:uid:alice', 'ru', 'fr');
    const aliceNextGeneration = weeklyReviewV2StorageKey('generation:4:uid:alice', 'ru', 'en');

    expect(aliceEn).toContain('weekly_review_v2');
    expect(aliceEn).not.toContain('generation:3:uid:alice');
    expect(aliceEn).not.toBe(aliceFr);
    expect(aliceEn).not.toBe(aliceNextGeneration);
    expect(aliceEn).not.toBe(weeklyReviewV2StorageKey('generation:3:uid:alice', 'uk', 'en'));
  });

  it('normalizes blank language and rejects a missing account scope', () => {
    expect(weeklyReviewV2StorageKey('generation:1:uid:a', '  ', 'en'))
      .toBe(weeklyReviewV2StorageKey('generation:1:uid:a', 'ru', 'en'));
    expect(() => weeklyReviewV2StorageKey('  ', 'ru', 'en')).toThrow('weekly_review_account_scope_required');
  });
});
