import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.resolve(__dirname, '../scripts/content-factory-flashcard-semantic-backfill.mjs'), 'utf8');
describe('flashcard semantic registry backfill command', () => {
  it('defaults to dry-run, pages deterministically and writes only in explicit apply/rollback modes', () => {
    expect(source).toContain("const apply = args.has('--apply')");
    expect(source).toContain("orderBy(admin.firestore.FieldPath.documentId())");
    expect(source).toContain('.codex-tmp/flashcard-registry/');
    expect(source).toContain('if (apply)');
    expect(source).toContain('if (rollback)');
    expect(source).toContain('introduced');
    expect(source).toContain("--cutover=shadow|registry");
    expect(source).toContain('Cutover manifest is stale');
    expect(source).toContain('Cutover registry parity failed');
    expect(source).toContain('JSON.stringify(sourceKeys(expected.sources))');
    expect(source).toContain('catalogGeneration');
    expect(source).toContain('verifiedGeneration: catalogGeneration');
    expect(source).toContain("mode: 'shadow', manifestComplete: false, verifiedGeneration: -1");
    expect(source).toContain("where('listingStatus', '==', 'published')");
  });
});
