import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

const read = (file: string) => fs.readFileSync(path.join(ROOT, file), 'utf8');

describe('modal opaque surface contract', () => {
  it('keeps shared reward modal panel gradients opaque', () => {
    const source = read('components/RewardModalBackdrop.tsx');
    const fn = source.match(/export function rewardModalPanelColors[\s\S]*?\n}\n/)?.[0] ?? '';

    expect(fn).not.toContain('rgba(');
    expect(fn).not.toContain('transparent');
  });

  it('does not use transparent backgrounds for reward modal card containers', () => {
    const files = [
      'app/_layout.tsx',
      'components/AchievementToast.tsx',
      'components/ActivityHeatmap365.tsx',
      'components/LevelGiftModal.tsx',
      'components/ReleaseWaveBonusModal.tsx',
      'components/ShardRewardModal.tsx',
      'components/StreakReviveModal.tsx',
    ];

    for (const file of files) {
      const source = read(file);
      expect(source).not.toContain("backgroundColor: 'transparent', borderColor: rewardModalPanelBorder");
      expect(source).not.toContain("backgroundColor: 'transparent' }]}");
      expect(source).not.toContain("colors={USE_ELITE_LEVEL_UP_MODAL ? ['transparent', 'transparent', 'transparent']");
    }
  });
});
