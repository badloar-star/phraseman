import { createHash } from 'crypto';
import { retrieveSupportRepositoryContext, tokenizeSupportQuery } from './support_repository_context';
import type { SupportRepositoryChunk, SupportRepositorySnapshot } from './support_repository_context_types';

const required: SupportRepositoryChunk[] = [
  { path: 'specs/gmail-support-inbox.md', line: 1, text: 'Phraseman support inbox contract.' },
  { path: 'knowly-www/PRODUCT.md', line: 1, text: 'Public product contract.' },
  { path: 'functions/src/support_auto_reply_policy.ts', line: 1, text: 'Bounded support reply policy.' },
  { path: 'functions/src/support_repository_context.ts', line: 1, text: 'Repository evidence retrieval.' },
  { path: 'functions/src/support_reply_delivery.ts', line: 1, text: 'Durable email delivery.' },
  { path: 'app/help.tsx', line: 1, text: 'Application help screen.' },
  { path: 'components/Help.tsx', line: 1, text: 'Help component.' },
  { path: 'constants/help.ts', line: 1, text: 'Help constants.' },
];

function snapshot(extra: SupportRepositoryChunk[]): SupportRepositorySnapshot {
  const chunks = [...required, ...extra];
  return {
    schemaVersion: 2,
    generatedAt: '2026-08-11T00:00:00.000Z',
    repository: 'badloar-star/phraseman',
    commit: 'a'.repeat(40),
    dirty: false,
    appVersion: '1.6.7',
    appBuild: '112',
    sourceFingerprint: createHash('sha256').update(JSON.stringify(chunks)).digest('hex'),
    filesDiscovered: chunks.length,
    filesIndexed: new Set(chunks.map((chunk) => chunk.path)).size,
    requiredFilesIncluded: required.slice(0, 5).map((chunk) => chunk.path),
    rootsIncluded: { app: 1, components: 1, constants: 1, 'functions/src': 3 },
    chunks,
  };
}

describe('support repository context', () => {
  test('ranks the matching product concept and excludes a frequent distractor', () => {
    const input = snapshot([
      { path: 'app/auth.ts', line: 10, text: 'The app is available for account access.' },
      { path: 'components/Learning.tsx', line: 20, text: 'Learners practise with lessons, flashcards and review activities.' },
    ]);
    const result = retrieveSupportRepositoryContext('How can I practise? Which learning activities are available?', input, 2);
    expect(result.trustworthy).toBe(true);
    expect(result.evidence.map((item) => item.path)).toEqual(['components/Learning.tsx']);
    expect(result.evidence[0].matchedConcepts).toContain('learning_activity');
  });

  test('generic substring overlap is not evidence', () => {
    const input = snapshot([{ path: 'app/auth.ts', line: 1, text: 'scan mapping canonical apply' }]);
    expect(retrieveSupportRepositoryContext('How can I use the app?', input).evidence).toEqual([]);
  });

  test('unknown product behavior returns no nearest noise', () => {
    const input = snapshot([{ path: 'app/auth.ts', line: 1, text: 'Account sign in with Apple.' }]);
    expect(retrieveSupportRepositoryContext('Can you recover a deleted chat from 2019?', input).evidence).toEqual([]);
  });

  test('tokenization is bounded, ignores filler, and preserves the late real question', () => {
    const tokens = tokenizeSupportQuery(`${Array.from({ length: 100 }, (_, i) => `noise${i}`).join(' ')} как восстановить покупку`);
    expect(tokens.length).toBeLessThanOrEqual(80);
    expect(tokens).toEqual(expect.arrayContaining(['восстановить', 'покупку']));
  });

  test('tampered snapshot fails trust validation', () => {
    const input = snapshot([{ path: 'components/PremiumContext.tsx', line: 20, text: 'Restore Plus subscription purchase.' }]);
    const tampered = { ...input, chunks: [...input.chunks, { path: 'app/tampered.ts', line: 1, text: 'changed' }] };
    expect(retrieveSupportRepositoryContext('restore purchase', tampered).trustReason).toBe('fingerprint_mismatch');
  });
});
