import fs from 'fs';
import path from 'path';

describe('level-up account-generation locking', () => {
  test('Spin completion keeps durable XP delivery account-scoped', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'app/_layout.tsx'), 'utf8');
    const start = source.indexOf('const drainLevelUpBonusOutbox = useCallback');
    const end = source.indexOf('const flushQueue = useCallback', start);
    const block = source.slice(start, end);

    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    expect(block).toContain("await registerXP(100, 'level_up_bonus'");
    expect(block).toContain('accountToken,');
    expect(block).toContain('isCurrentAccountGeneration(accountToken, intent.ownerStableId)');
  });
});
