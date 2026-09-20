import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'functions/src/admin_arena_config.ts'), 'utf8');

describe('admin Arena config preserves server-owned target publications', () => {
  test('reads the current config inside the same transaction that writes it', () => {
    const transaction = source.slice(
      source.indexOf('await db.runTransaction(async (tx) =>'),
      source.indexOf('propagationDelayMs'),
    );
    expect(transaction).toContain('const before = await tx.get(ref)');
    expect(transaction).toContain('targetPublications: before.data()?.targetPublications');
    expect(transaction.indexOf('await tx.get(ref)')).toBeLessThan(transaction.indexOf('tx.set(ref'));
  });

  test('never accepts publication hashes or readiness from browser payload', () => {
    const setCallable = source.slice(source.indexOf('export const adminArenaConfigSet'));
    expect(setCallable).not.toContain('data.targetPublications');
    expect(setCallable).not.toContain('data.manifestSha256');
    expect(setCallable).not.toContain('data.publicationFingerprint');
    expect(setCallable).not.toContain('data.ready');
  });
});
