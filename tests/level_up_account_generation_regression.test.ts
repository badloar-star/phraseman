import fs from 'fs';
import path from 'path';

describe('level-up account-generation locking', () => {
  test('dismiss path lets registerXP own the transition lock and forwards the modal token', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'app/_layout.tsx'), 'utf8');
    const start = source.indexOf('const dismissLevelUp = () =>');
    const end = source.indexOf('const onGiftClose =', start);
    const block = source.slice(start, end);

    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    expect(block).toContain("await registerXP(100, 'level_up_bonus'");
    expect(block).toContain('accountToken,');
    expect(block).not.toMatch(/withAccountTransitionLock\([\s\S]*await registerXP\(/);
  });
});

