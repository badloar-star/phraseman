import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');

describe('level gifts inventory tonal design contract', () => {
  const source = fs.readFileSync(path.join(ROOT, 'app', 'level_gifts_inventory.tsx'), 'utf8');

  it('uses rarity/accent tonal surfaces for inventory gift cards', () => {
    expect(source).toContain('const giftTone =');
    expect(source).toContain('const emptyGiftSurface =');
    expect(source).toContain('giftGradientBaseColor(themeMode');
    expect(source).toContain('giftGradientAlpha(strongestRarity');
    expect(source).toContain('giftGradientShape(strongestRarity');
    expect(source).toContain("colors={emptyGiftSurface}");
    expect(source).toMatch(/colors=\{\[giftTone\(accent,\s*gradientAlpha\),\s*surface\[0\],\s*surface\[1\]\]/);
    expect(source).toContain('start={gradientShape.start}');
    expect(source).toContain('end={gradientShape.end}');
    expect(source).not.toContain('const giftCardSurface =');
  });

  it('keeps active gift chips borderless and separated by tonal fill', () => {
    expect(source).toContain("colors={[giftTone(gift.accent, '24'), t.bgCard, t.bgSurface]}");
    expect(source).toContain("backgroundColor: giftTone(gift.accent, '28')");
    expect(source).toContain("backgroundColor: giftTone(gift.accent, '1F')");
    expect(source).not.toContain('backgroundColor: t.bgCard,\n                    borderWidth: 0,\n                    borderColor: `${gift.accent}70`');
  });

  it('does not add realtime blur to the gifts inventory list', () => {
    expect(source).not.toContain('BlurView');
    expect(source).not.toContain('backdropFilter');
    expect(source).not.toContain('filter: blur');
  });
});
