import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('tournament automatic identity client contract', () => {
  const source = readFileSync(resolve(__dirname, '../app/tournament_client.ts'), 'utf8');

  it('bootstraps the existing automatic account before every tournament callable', () => {
    const start = source.indexOf('async function callFunction');
    const end = source.indexOf('\n}', start);
    const block = source.slice(start, end);

    expect(source).toContain("import { ensureAnonUser } from './cloud_sync';");
    expect(block).toContain('await ensureAnonUser().catch(() => null);');
    expect(block.indexOf('await ensureAnonUser()')).toBeLessThan(block.indexOf('httpsCallable('));
    expect(source).not.toContain('signInWithProvider');
  });
});
