import { createHash } from 'crypto';
import type { SupportRepositorySnapshot } from './support_repository_context_types';
import { retrieveSupportRepositoryContext } from './support_repository_context';

// Read-only build guard: `npm run build` creates this artifact before tsc/Jest.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const artifact = require('./generated/support_repo_context.json') as SupportRepositorySnapshot;
// eslint-disable-next-line @typescript-eslint/no-var-requires
const appJson = require('../../app.json') as { expo?: { version?: string; ios?: { buildNumber?: string } } };

describe('generated support repository context artifact', () => {
  test('contains every required product area instead of an alphabetically truncated app prefix', () => {
    expect(artifact.schemaVersion).toBe(2);
    expect(artifact.filesIndexed).toBe(new Set(artifact.chunks.map((chunk) => chunk.path)).size);
    expect(artifact.rootsIncluded).toMatchObject({
      app: expect.any(Number), components: expect.any(Number), constants: expect.any(Number), 'functions/src': expect.any(Number),
    });
    for (const root of ['app', 'components', 'constants', 'functions/src']) {
      expect(artifact.rootsIncluded[root]).toBeGreaterThan(0);
    }
    expect(artifact.requiredFilesIncluded).toEqual(expect.arrayContaining([
      'specs/gmail-support-inbox.md',
      'knowly-www/PRODUCT.md',
      'functions/src/support_auto_reply_policy.ts',
      'functions/src/support_repository_context.ts',
      'functions/src/support_reply_delivery.ts',
    ]));
    const paths = new Set(artifact.chunks.map((chunk) => chunk.path));
    expect(paths.has('components/PremiumContext.tsx')).toBe(true);
    expect(paths.has('functions/src/support_inbox.ts')).toBe(true);
  });

  test('records the app release and an integrity hash over exactly emitted chunks', () => {
    expect(artifact.appVersion).toBe(appJson.expo?.version);
    expect(artifact.appBuild).toBe(String(appJson.expo?.ios?.buildNumber));
    expect(artifact.sourceFingerprint).toBe(createHash('sha256').update(JSON.stringify(artifact.chunks)).digest('hex'));
  });

  test('TypeScript normalization preserves generics and comparisons', () => {
    const repositorySource = artifact.chunks
      .filter((chunk) => chunk.path === 'functions/src/support_repository_context.ts')
      .map((chunk) => chunk.text)
      .join('\n');
    expect(repositorySource).toContain('ReadonlyArray<readonly [string, RegExp]>');
  });

  test.each([
    ['How can I practise? Which learning activities are available?', 'learning_activity'],
    ['Не работает микрофон в упражнении', 'audio'],
    ['Как поменять язык интерфейса?', 'language'],
  ])('real artifact retrieves the requested product concept: %s', (question, concept) => {
    const result = retrieveSupportRepositoryContext(question, artifact, 8);
    expect(result.trustworthy).toBe(true);
    expect(result.evidence.length).toBeGreaterThan(0);
    expect(result.evidence.every((item) => item.matchedConcepts.includes(concept))).toBe(true);
    expect(result.evidence.every((item) => item.relevanceScore >= 14 && item.queryCoverage > 0)).toBe(true);
  });
});
