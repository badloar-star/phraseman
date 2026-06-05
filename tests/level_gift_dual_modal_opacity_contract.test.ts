import fs from 'fs';
import path from 'path';

describe('level gift dual modal opacity contract', () => {
  it('uses an opaque panel background behind the decorative reward art', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'components', 'LevelGiftDualModal.tsx'), 'utf8');

    expect(source).toContain('dualGiftModalPanelBackground');
    expect(source).toContain('const modalPanelBackground = dualGiftModalPanelBackground(themeMode, t)');
    expect(source).toContain("backgroundColor: USE_ELITE_DUAL_LEVEL_GIFT_MODAL ? modalPanelBackground : t.bgCard");
    expect(source).not.toContain("backgroundColor: USE_ELITE_DUAL_LEVEL_GIFT_MODAL ? 'transparent' : t.bgCard");
  });
});
