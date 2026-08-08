import fs from 'fs';
import path from 'path';

const read = (relativePath: string) =>
  fs.readFileSync(path.resolve(__dirname, '..', relativePath), 'utf8');

describe('collectibles empty-state motion contract', () => {
  const screen = read('app/collectibles_screen.tsx');
  const component = read('components/collectibles/CollectiblesEmptyStateMotion.tsx');

  it('wires the motion component only into the loaded empty branch', () => {
    expect(screen).toContain(
      "import CollectiblesEmptyStateMotion from '../components/collectibles/CollectiblesEmptyStateMotion';",
    );
    expect(screen).toMatch(/ownedCount === 0[\s\S]*?<CollectiblesEmptyStateMotion/);
    expect(screen).toContain("ru: 'Здесь появятся ваши карточки'");
    expect(screen).toContain("ru: 'Проходите уроки и собирайте коллекцию'");
  });

  it('gates repeating motion by runtime activity and reduced motion', () => {
    expect(component).toContain('useReduceMotion');
    expect(component).toContain('useRuntimeActive');
    expect(component).toContain('if (reduceMotion || !runtimeActive)');
    expect(component).toContain('withRepeat');
    expect(component).toContain('cancelAnimation');
  });

  it('uses semantic theme roles without local palette literals', () => {
    for (const token of [
      'theme.bgCard',
      'theme.bgSurface',
      'theme.bgSurface2',
      'theme.textSecond',
      'theme.textMuted',
      'theme.border',
      'theme.borderLight',
    ]) {
      expect(component).toContain(token);
    }
    expect(component).toContain('getVolumetricShadow(themeMode, theme, 1)');
    expect(component).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(/);
  });

  it('keeps decoration out of the accessibility tree', () => {
    expect(component).toContain('testID="collectibles-empty-state-motion"');
    expect(component).toContain('accessibilityElementsHidden');
    expect(component).toContain('importantForAccessibility="no-hide-descendants"');
  });
});
