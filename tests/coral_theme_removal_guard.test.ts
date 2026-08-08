import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const SOURCE_ROOTS = ['app', 'components', 'constants', 'hooks', 'lib', 'modules', 'scripts'];
const SOURCE_EXTENSIONS = new Set(['.cjs', '.js', '.jsx', '.json', '.mjs', '.py', '.ts', '.tsx']);

const normalize = (filePath: string) => filePath.replace(/\\/g, '/');

const walkFiles = (relativeRoot: string): string[] => {
  const absoluteRoot = path.join(ROOT, relativeRoot);
  const files: string[] = [];

  const visit = (directory: string) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        visit(absolutePath);
      } else if (SOURCE_EXTENSIONS.has(path.extname(entry.name))) {
        files.push(normalize(path.relative(ROOT, absolutePath)));
      }
    }
  };

  visit(absoluteRoot);
  return files;
};

describe('removed Coral theme regression guard', () => {
  it('has a dedicated command for the removal gate', () => {
    const packageJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')) as {
      scripts?: Record<string, string>;
    };

    expect(packageJson.scripts?.['test:removed-themes']).toBe(
      'jest --runTestsByPath tests/coral_theme_removal_guard.test.ts --no-cache --runInBand',
    );
  });

  it('allows Coral only in the migration tombstone and unrelated named content', () => {
    const filesWithCoral = SOURCE_ROOTS.flatMap(walkFiles)
      .filter((relativePath) => !/(?:^|\/)(?:__tests__|generated)\/|\.(?:spec|test)\.[^.]+$/i.test(relativePath))
      .filter((relativePath) => {
        const source = fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
        return /coral/i.test(source);
      })
      .sort();

    expect(filesWithCoral).toEqual([
      'app/flashcards/cardBackCatalog.ts',
      'app/plan_content_gavan.ts',
      'components/ThemeContext.tsx',
      'constants/avatar_auras.ts',
      'constants/custom_avatars.ts',
      'scripts/build_lingman_wednesday_audio_assets.mjs',
      'scripts/generate-flashcard-back-assets.mjs',
      'scripts/patch_lingman_two_word_into_existing_capcut.mjs',
    ]);
  });

  it('keeps the only theme occurrence as a persisted-value migration tombstone', () => {
    const themeContext = fs.readFileSync(path.join(ROOT, 'components', 'ThemeContext.tsx'), 'utf8');
    const themePalette = fs.readFileSync(path.join(ROOT, 'constants', 'theme.ts'), 'utf8');
    const themeSettings = fs.readFileSync(path.join(ROOT, 'app', 'settings_themes.tsx'), 'utf8');

    expect(themeContext.match(/coral/gi)).toHaveLength(1);
    expect(themeContext).toMatch(/REMOVED_THEME_MODES[^\n]*'coral'/);
    expect(themePalette).not.toMatch(/coral/i);
    expect(themeSettings).not.toMatch(/coral/i);
  });

  it('preserves only the two unrelated Coral Sunset card-back assets', () => {
    const coralAssets: string[] = [];
    const assetsRoot = path.join(ROOT, 'assets');

    const visit = (directory: string) => {
      for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const absolutePath = path.join(directory, entry.name);
        if (entry.isDirectory()) {
          visit(absolutePath);
        } else {
          const relativePath = normalize(path.relative(assetsRoot, absolutePath));
          if (/coral/i.test(relativePath)) coralAssets.push(relativePath);
        }
      }
    };

    visit(assetsRoot);
    expect(coralAssets.sort()).toEqual([
      'images/flashcard_backs/community_02_coral_sunset.webp',
      'images/flashcard_backs/community_02_coral_sunset_fan.webp',
    ]);
  });
});
