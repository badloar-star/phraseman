import fs from 'fs';
import path from 'path';

const classicSource = fs.readFileSync(
  path.join(process.cwd(), 'components', 'BoonChestModal.tsx'),
  'utf8',
);
const hybridSource = fs.readFileSync(
  path.join(process.cwd(), 'components', 'celebration', 'BoonChestHybrid.tsx'),
  'utf8',
);

// зачем: владелец 2026-08-23 — модалки сундука-награды (День возвращения /
// Сундук недели / Идеальная неделя) красили заголовок/кнопку/фон в жёсткий
// цвет РЕДКОСТИ (palette.accent), игнорируя активную тему приложения. Тот же
// класс бага уже закрыт для LevelGiftModal (level_gift_modal_theme_contract) —
// здесь тот же контракт для семьи BoonChestModal/BoonChestHybrid.
describe('boon chest modal active-theme contract', () => {
  it('BoonChestModal (classic) uses the active theme for chrome, not rarity color', () => {
    expect(classicSource).toContain('const accent = rewardModalAccentColor(themeMode, t)');
    expect(classicSource).toContain('const primaryButtonColors = rewardModalPrimaryButtonColors(themeMode)');
    expect(classicSource).toContain('const primaryButtonText = rewardModalPrimaryButtonText(themeMode)');
    expect(classicSource).toContain('colors={primaryButtonColors}');
    expect(classicSource).toContain('color: primaryButtonText');
    expect(classicSource).not.toContain('const accent = palette.accent');
    expect(classicSource).not.toContain('colors={palette.button}');
    expect(classicSource).not.toContain('color: palette.buttonInk');
    expect(classicSource).not.toContain('colors={[palette.panelTop, palette.panelBottom]}');
    expect(classicSource).not.toContain('backgroundColor: palette.accentSoft');
  });

  it('BoonChestHybrid uses the active theme for chrome, not rarity color', () => {
    expect(hybridSource).toContain('const modalAccent = rewardModalAccentColor(themeMode, t)');
    expect(hybridSource).toContain('const primaryButtonColors = rewardModalPrimaryButtonColors(themeMode)');
    expect(hybridSource).toContain('const primaryButtonText = rewardModalPrimaryButtonText(themeMode)');
    expect(hybridSource).toContain('gradientColors={primaryButtonColors}');
    expect(hybridSource).toContain('color: primaryButtonText');
    expect(hybridSource).toContain("{ color: modalAccent }]}>{title}");
    expect(hybridSource).not.toContain("{ backgroundColor: `${palette.accent}38` }");
    expect(hybridSource).not.toContain('shadowColor: palette.accent');
    expect(hybridSource).not.toContain('{ color: palette.accent }');
    expect(hybridSource).not.toContain('backgroundColor: palette.accent');
  });

  it('keeps rarity colors scoped to the chest/reward icon itself, not the chrome', () => {
    expect(classicSource).toContain('const palette = paletteForRarity(rarity)');
    expect(classicSource).toContain('palette={palette}');
    expect(hybridSource).toContain('color={palette.accent}');
    expect(hybridSource).toContain('palette={palette}');
  });
});
