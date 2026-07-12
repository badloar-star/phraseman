import {
  cacheDocumentFingerprint,
  decodeCacheCursor,
  encodeCacheCursor,
  isCacheResetAllowed,
  parseCacheListRequest,
  projectCacheEntry,
} from './admin_cache_control';

describe('admin cache control contracts', () => {
  test('accepts only exact production cache sources and bounds filters', () => {
    expect(parseCacheListRequest({
      source: 'mistake_explanations', status: 'ready', lang: ' RU ', query: '  Wrong answer  ', pageSize: 999,
    })).toEqual({
      source: 'mistake_explanations', status: 'ready', lang: 'ru', query: 'wrong answer', pageSize: 50, cursor: '',
    });
    expect(() => parseCacheListRequest({ source: 'users' })).toThrow('invalid_cache_source');
    expect(() => parseCacheListRequest({ source: 'phrase_explanations', status: 'deleted' })).toThrow('invalid_cache_status');
  });

  test('cursor is source-bound, bounded and exact-hash validated', () => {
    const cursor = encodeCacheCursor('choice_explanations', 'a'.repeat(40));
    expect(decodeCacheCursor(cursor, 'choice_explanations')).toBe('a'.repeat(40));
    expect(() => decodeCacheCursor(cursor, 'phrase_explanations')).toThrow('cache_cursor_source_mismatch');
    expect(() => decodeCacheCursor(Buffer.from(JSON.stringify({ source: 'choice_explanations', id: '../users' })).toString('base64url'), 'choice_explanations'))
      .toThrow('invalid_cache_cursor');
  });

  test('projects only source-specific known fields and redacts unknown identity data', () => {
    const item = projectCacheEntry('mistake_explanations', 'b'.repeat(40), {
      status: 'ready', lang: 'ru', schemaVersion: 6, targetEn: 'I am ready', userAnswer: 'I ready',
      full: 'Use am.', eli5: 'Add am.', model: 'model', updatedAtMs: 100,
      authUid: 'private-auth', stableUid: 'private-stable', rawPrompt: 'private prompt', tokenUsage: 999,
    });
    expect(item).toMatchObject({
      id: 'b'.repeat(40), source: 'mistake_explanations', status: 'ready', lang: 'ru', schemaVersion: 6,
      targetEn: 'I am ready', userAnswer: 'I ready', full: 'Use am.', eli5: 'Add am.', updatedAtMs: 100,
    });
    expect(item).not.toHaveProperty('authUid');
    expect(item).not.toHaveProperty('stableUid');
    expect(item).not.toHaveProperty('rawPrompt');
    expect(item).not.toHaveProperty('tokenUsage');
  });

  test.each([
    ['choice_explanations', { correctEn: 'Correct', confirm: 'Yes', distractors: { Wrong: 'Why' } }, ['correctEn', 'confirm', 'distractors']],
    ['phrase_explanations', { phraseEn: 'Hello', text: 'Explanation' }, ['phraseEn', 'text']],
    ['quiz_explanations', { correctEn: 'Correct', questionPrompt: 'Meaning', confirm: 'Yes', options: { Wrong: 'Why' } }, ['correctEn', 'questionPrompt', 'confirm', 'options']],
    ['compass_briefings', { comment: 'Daily voice', reason: null }, ['comment', 'reason']],
  ] as const)('keeps the visible %s shape', (source, data, keys) => {
    const item = projectCacheEntry(source, 'c'.repeat(40), { status: 'ready', lang: 'uk', ...data });
    for (const key of keys) expect(item).toHaveProperty(key);
  });

  test('fingerprint is stable across key order and changes with cache content', () => {
    expect(cacheDocumentFingerprint({ status: 'ready', text: 'A', nested: { b: 2, a: 1 } }))
      .toBe(cacheDocumentFingerprint({ nested: { a: 1, b: 2 }, text: 'A', status: 'ready' }));
    expect(cacheDocumentFingerprint({ status: 'ready', text: 'A' }))
      .not.toBe(cacheDocumentFingerprint({ status: 'ready', text: 'B' }));
  });

  test('rejects fresh generation locks but permits stale pending and terminal entries', () => {
    expect(isCacheResetAllowed({ status: 'pending', createdAtMs: 95_000, updatedAtMs: 95_000 }, 100_000)).toEqual({ ok: false, reason: 'cache_generation_in_progress' });
    expect(isCacheResetAllowed({ status: 'pending', createdAtMs: 1, updatedAtMs: 1 }, 700_001)).toEqual({ ok: true });
    expect(isCacheResetAllowed({ status: 'ready', updatedAtMs: 99_999 }, 100_000)).toEqual({ ok: true });
  });
});
