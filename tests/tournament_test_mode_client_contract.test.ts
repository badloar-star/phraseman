import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('tournament temporary test-mode client contract', () => {
  const source = readFileSync(resolve(__dirname, '../app/(tabs)/tournaments.tsx'), 'utf8');

  it('shows and uses a zero entry only for the server-enabled instant test room', () => {
    expect(source).toContain('testingEnabled?: boolean');
    expect(source).toContain("const effectiveEntryGems = instantEntry && schedule?.testingEnabled === true ? 0 : entryGems;");
    expect(source).toContain('setCoins((current) => Math.max(0, current - effectiveEntryGems));');
  });

  it('explains when the server has disabled temporary testing', () => {
    expect(source).toContain("code.includes('tournament_testing_disabled')");
  });
});
