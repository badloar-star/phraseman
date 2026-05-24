import fs from 'fs';
import path from 'path';

const LEAGUE_V4_ICON_FILES = [
  ['LIG MED ASCENDANT.webp', 'lig-med-ascendant.webp'],
  ['LIG BRONZ ASCENDANT.webp', 'lig-bronz-ascendant.webp'],
  ['LIG SEREBRO ASCENDANT.webp', 'lig-serebro-ascendant.webp'],
  ['LIG ZOLOTO ASCENDANT.webp', 'lig-zoloto-ascendant.webp'],
  ['LIG PLATINA ASCENDANT.webp', 'lig-platina-ascendant.webp'],
  ['LIG IZUMRUD ASCENDANT.webp', 'lig-izumrud-ascendant.webp'],
  ['LIG SAPFIR ASCENDANT.webp', 'lig-sapfir-ascendant.webp'],
  ['LIG RUBIN ASCENDANT.webp', 'lig-rubin-ascendant.webp'],
  ['LIG ALMAZ ASCENDANT.webp', 'lig-almaz-ascendant.webp'],
  ['LIG CHERNIY ALMAZ ASCENDANT.webp', 'lig-cherniy-almaz-ascendant.webp'],
  ['LIG EFIR ASCENDANT.webp', 'lig-efir-ascendant.webp'],
  ['LIG VISHAYA ASCENDANT.webp', 'lig-vishaya-ascendant.webp'],
] as const;

describe('league icon assets', () => {
  it('keeps every league wired to a bundled image asset', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'app', 'league_engine.ts'), 'utf8');

    for (const [, bundledFile] of LEAGUE_V4_ICON_FILES) {
      expect(source).toContain(`require("../assets/images/levels/league-v4-icons/${bundledFile}")`);
    }

    expect(source).not.toMatch(/require\("\.\.\/assets\/images\/levels\/[^"]*\s[^"]*"\)/);
  });

  it('keeps bundled icons byte-identical to the DALL-E v4 sources', () => {
    for (const [sourceFile, bundledFile] of LEAGUE_V4_ICON_FILES) {
      const sourcePath = path.join(process.cwd(), 'assets', 'images', 'levels', 'league-v4', sourceFile);
      const bundledPath = path.join(process.cwd(), 'assets', 'images', 'levels', 'league-v4-icons', bundledFile);

      expect(fs.existsSync(sourcePath)).toBe(true);
      expect(fs.existsSync(bundledPath)).toBe(true);
      expect(fs.readFileSync(bundledPath).equals(fs.readFileSync(sourcePath))).toBe(true);
    }
  });

  it('keeps league icon art bundled in OTA updates', () => {
    const appJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'app.json'), 'utf8'));
    const patterns: string[] = appJson.expo.updates.assetPatternsToBeBundled;

    expect(patterns).toContain('assets/images/levels/league-v4-icons/*');
    expect(patterns).toContain('assets/images/levels/league-v4/*');
  });
});
