import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..');

function readProjectFile(relativePath: string): string {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

describe('app typography contract', () => {
  test('bundles the app text font and applies it as the global React Native Text default', () => {
    const typographySource = readProjectFile('app/typography.ts');
    const rootLayoutSource = readProjectFile('app/_layout.tsx');
    const themeContextSource = readProjectFile('components/ThemeContext.tsx');
    const appJsonSource = readProjectFile('app.json');
    const reactNativePatchSource = readProjectFile('patches/react-native+0.81.5.patch');

    expect(fs.existsSync(path.join(root, 'assets/fonts/Inter-Regular.ttf'))).toBe(true);
    expect(fs.existsSync(path.join(root, 'assets/fonts/Inter-SemiBold.ttf'))).toBe(true);
    expect(fs.existsSync(path.join(root, 'assets/fonts/Inter-Bold.ttf'))).toBe(true);
    expect(fs.existsSync(path.join(root, 'assets/fonts/Inter-Black.ttf'))).toBe(true);

    expect(typographySource).toContain("APP_FONT_FAMILY = 'Inter'");
    expect(typographySource).toContain('[APP_FONT_FAMILY]');
    expect(rootLayoutSource).toContain('useFonts');
    expect(rootLayoutSource).toContain('APP_FONT_ASSETS');
    expect(rootLayoutSource).not.toContain('!fontsLoaded && !fontsError');
    expect(rootLayoutSource).toContain('fontFamily: APP_FONT_FAMILY');
    expect(themeContextSource).toContain('APP_FONT_FAMILY');
    expect(appJsonSource).toContain('assets/fonts/*.ttf');
    expect(appJsonSource).toContain('"fontFamily": "Inter"');
    expect(reactNativePatchSource).toContain('PHRASEMAN PATCH (RN 0.81 text family lock)');
  });
});
