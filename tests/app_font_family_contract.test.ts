import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..');

function readProjectFile(relativePath: string): string {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

describe('app typography contract', () => {
  test('embeds the app text font once and applies it as the global React Native Text default', () => {
    const typographySource = readProjectFile('app/typography.ts');
    const typographyDevSource = readProjectFile('app/typography_dev_fonts.ts');
    const rootLayoutSource = readProjectFile('app/_layout.tsx');
    const themeContextSource = readProjectFile('components/ThemeContext.tsx');
    const appConfig = JSON.parse(readProjectFile('app.json')) as {
      expo?: { plugins?: unknown[] };
    };
    const reactNativePatchSource = readProjectFile('patches/react-native+0.81.5.patch');

    expect(fs.existsSync(path.join(root, 'assets/fonts/Inter-Regular.ttf'))).toBe(true);
    expect(fs.existsSync(path.join(root, 'assets/fonts/Inter-SemiBold.ttf'))).toBe(true);
    expect(fs.existsSync(path.join(root, 'assets/fonts/Inter-Bold.ttf'))).toBe(true);
    expect(fs.existsSync(path.join(root, 'assets/fonts/Inter-Black.ttf'))).toBe(true);

    expect(typographySource).toContain("APP_FONT_FAMILY = 'Inter'");
    expect(typographySource).not.toContain("require('../assets/fonts/");
    expect(typographyDevSource).toContain('[APP_FONT_FAMILY]');
    expect(rootLayoutSource).toContain('useFonts');
    expect(rootLayoutSource).toContain("require('./typography_dev_fonts')");
    expect(rootLayoutSource).toContain('__DEV__');
    expect(rootLayoutSource).toContain('devFontAssets');
    expect(rootLayoutSource).not.toContain('!fontsLoaded && !fontsError');
    expect(rootLayoutSource).toContain('fontFamily: APP_FONT_FAMILY');
    expect(themeContextSource).toContain('APP_FONT_FAMILY');

    const fontPlugin = appConfig.expo?.plugins?.find(
      (entry) => Array.isArray(entry) && entry[0] === 'expo-font',
    ) as [string, { android?: { fonts?: Array<{ fontFamily?: string }> } }] | undefined;
    expect(fontPlugin?.[1].android?.fonts?.map((font) => font.fontFamily)).toEqual([
      'Inter',
      'Inter-SemiBold',
      'Inter-Bold',
      'Inter-Black',
    ]);
    expect(reactNativePatchSource).toContain('PHRASEMAN PATCH (RN 0.81 text family lock)');
  });
});
