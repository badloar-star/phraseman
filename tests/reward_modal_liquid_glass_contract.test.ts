import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');

const read = (file: string) => fs.readFileSync(path.join(ROOT, file), 'utf8');

describe('reward modal liquid glass design contract', () => {
  it('uses the shared static liquid-glass layer only for gift moments that retain it', () => {
    const backdrop = read('components/RewardModalBackdrop.tsx');
    const single = read('components/LevelGiftModal.tsx');
    const dual = read('components/LevelGiftDualModal.tsx');
    const boon = read('components/BoonChestModal.tsx');

    expect(backdrop).toContain('export function RewardModalLiquidGlass');
    expect(backdrop).toContain('testID="reward-modal-liquid-glass"');
    expect(single).toContain('<RewardModalLiquidGlass themeMode={themeMode} accent={modalAccent} intensity="strong" />');
    expect(dual).not.toContain('RewardModalLiquidGlass');
    expect(boon).toContain('<RewardModalLiquidGlass themeMode={themeMode} accent={accent} intensity="strong" />');
  });

  it('keeps the liquid-glass effect static and free of realtime blur surfaces', () => {
    const sources = [
      read('components/RewardModalBackdrop.tsx'),
      read('components/LevelGiftModal.tsx'),
      read('components/LevelGiftDualModal.tsx'),
      read('components/BoonChestModal.tsx'),
    ].join('\n');

    expect(sources).not.toContain('BlurView');
    expect(sources).not.toContain('backdropFilter');
    expect(sources).not.toContain('filter: blur');
  });

  it('keeps the elite dual gift modal fully dark and free of decorative highlights', () => {
    const dual = read('components/LevelGiftDualModal.tsx');

    expect(dual).toContain('borderWidth: USE_ELITE_DUAL_LEVEL_GIFT_MODAL ? 0 : 1.5');
    expect(dual).toContain('borderWidth: USE_ELITE_DUAL_LEVEL_GIFT_MODAL ? 0 : 1.2');
    expect(dual).toContain("backgroundColor: USE_ELITE_DUAL_LEVEL_GIFT_MODAL ? '#0B1018' : 'rgba(0,0,0,0.15)'");
    expect(dual).not.toContain('rewardModalSoftSurface');
    expect(dual).not.toContain('height: 84');
  });

  it('keeps the opening moment focused on the two reward icons and standard actions', () => {
    const dual = read('components/LevelGiftDualModal.tsx');

    expect(dual).toContain('{opened.size === 2 && f2pGift && premGift && (');
    expect(dual).toContain("{presentationMode === 'apply' && (");
    expect(dual).toContain('testID="level-gift-dual-claim"');
    expect(dual).toContain('testID="level-gift-dual-save-opened"');
  });
});
