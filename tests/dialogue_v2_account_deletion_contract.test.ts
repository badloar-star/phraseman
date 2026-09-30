import fs from 'node:fs';
import path from 'node:path';

describe('Dialogue V2 account-deletion integration', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'functions', 'src', 'account_delete.ts'),
    'utf8',
  );

  it('audits the opaque Dialogue V2 memory namespace as user-tree data', () => {
    expect(source).toContain('export const ACCOUNT_DELETE_USER_TREE_NAMESPACES');
    expect(source).toContain("'dialogue_v2_memory'");
  });

  it('recursively deletes both identity-owned user trees rather than guessing opaque memory ids', () => {
    expect(source).toContain("{ collection: 'users', values: 'both' }");
    expect(source).toContain('for (const spec of accountDeleteDirectDocumentPlan(stableUid, authUid))');
    expect(source).toContain('await deleteDocTree(ctx, db.collection(spec.collection).doc(spec.id))');
    expect(source).toContain('await ctx.db.recursiveDelete(ref, ctx.writer)');
    expect(source).not.toMatch(/collectionGroup\(['"]dialogue_v2_memory['"]\)/);
  });
});
