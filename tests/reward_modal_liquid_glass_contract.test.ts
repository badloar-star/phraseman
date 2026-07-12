import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');

const read = (file: string) => fs.readFileSync(path.join(ROOT, file), 'utf8');

describe('reward modal liquid glass design contract', () => {
  it('uses a shared static liquid-glass layer for level and boon gift moments', () => {
    const backdrop = read('components/RewardModalBackdrop.tsx');
    const single = read('components/LevelGiftModal.tsx');
    const dual = read('components/LevelGiftDualModal.tsx');
    const boon = read('components/BoonChestModal.tsx');

    expect(backdrop).toContain('export function RewardModalLiquidGlass');
    expect(backdrop).toContain('testID="reward-modal-liquid-glass"');
    expect(single).toContain('<RewardModalLiquidGlass themeMode={themeMode} accent={accent} intensity="strong" />');
    expect(dual).toContain('<RewardModalLiquidGlass themeMode={themeMode} accent={modalAccent} intensity="strong" />');
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

  it('keeps elite dual gift modal separation tonal instead of decorative borders', () => {
    const dual = read('components/LevelGiftDualModal.tsx');

    expect(dual).toContain('borderWidth: USE_ELITE_DUAL_LEVEL_GIFT_MODAL ? 0 : 1.5');
    expect(dual).toContain('borderWidth: USE_ELITE_DUAL_LEVEL_GIFT_MODAL ? 0 : 1.2');
    expect(dual).toContain("backgroundColor: USE_ELITE_DUAL_LEVEL_GIFT_MODAL ? (premVisual ? 'rgba(214,184,92,0.085)' : 'rgba(255,255,255,0.058)') : 'rgba(0,0,0,0.15)'");
  });
});
