import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');

describe('streak revive shop and stats contract', () => {
  // зачем: D101 — восстановление серии за жемчуг удалено: экран статистики его
  // больше не предлагает (модалка удалена).
  it('no longer offers a paid streak revive on the statistics screen', () => {
    const source = fs.readFileSync(path.join(ROOT, 'app', 'streak_stats.tsx'), 'utf8');

    expect(source).not.toContain('getReviveOffer');
    expect(source).not.toContain('<StreakReviveModal');
    expect(source).not.toContain('purchaseStreakFreeze');
  });
});
