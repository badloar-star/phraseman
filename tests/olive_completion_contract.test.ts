import fs from 'node:fs';
import path from 'node:path';

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

describe('Olive completion surfaces', () => {
  it('gives reward and revival surfaces explicit piano, ivory, sage and champagne branches', () => {
    const bonus = read('components/BonusXPCard.tsx');
    expect(bonus).toContain("const isOliveTheme = themeMode === 'olive';");
    expect(bonus).toContain('OLIVE_RICH.champagne');
    expect(bonus).toContain('<Ionicons');
  });

  it('keeps the remaining Olive shells explicit and matte', () => {
    for (const file of [
      'app/lingman_youtube_chrome.ts',
      'app/level_exam.tsx',
    ]) expect(read(file)).toContain("themeMode === 'olive'");
  });

  it('keeps the accessible add-friend control after social gift retirement', () => {
    const friends = read('app/(tabs)/friends.tsx');
    expect(friends).not.toContain('friendGiftAccent');
    expect(friends).toContain('function eventIconColor(type: FriendEvent[\'type\'], accent: string, themeMode: ThemeMode)');
    expect(friends).toContain("accessibilityLabel={L('Добавить друга'");
  });

  it('keeps theme picker responsive and distinguishes applied from previewed', () => {
    const picker = read('app/settings_themes.tsx');
    expect(picker).not.toContain("Dimensions.get('window')");
    expect(picker).toContain('useStableSafeAreaInsets');
    expect(picker).toContain('accessibilityValue');
  });

  it('uses a scalable high-contrast Olive Plus badge and localized tab labels', () => {
    const badge = read('components/PlusBadge.tsx');
    const tabs = read('app/(tabs)/_layout.tsx');
    expect(badge).toContain("themeMode === 'olive'");
    expect(badge).not.toContain('maxFontSizeMultiplier={1}');
    expect(tabs).not.toContain('accessibilityLabel={`qa-tab-${tab.key}`}');
    expect(tabs).toContain('accessibilityLabel={');
  });
});
