import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import sharp from 'sharp';

const BANNER_DIR = path.join(process.cwd(), 'assets', 'images', 'settings', 'referral_theme');
const COMPONENT_PATH = path.join(process.cwd(), 'components', 'ReferralInviteBannerArt.tsx');
const SAGE_THEME = 'sagePorcelain';
const SAGE_FILE = `invite-${SAGE_THEME}-v2.webp`;
const SAGE_ASSET_PATH = path.join(BANNER_DIR, SAGE_FILE);
const RETAINED_BANNER_THEMES = ['dark', 'gold', 'business', 'businessLight', 'midnight', 'ember', 'aurora', 'volt', 'indigo', SAGE_THEME] as const;

describe('referral invite banner themed art', () => {
  it('keeps canonical retained banner assets wired into the runtime map', () => {
    // зачем: добавили тему — обязаны добавить и баннер, иначе карточка
    // приглашения останется без картинки на этой теме.
    const source = fs.readFileSync(COMPONENT_PATH, 'utf8');
    for (const theme of RETAINED_BANNER_THEMES) {
      const assetPath = path.join(BANNER_DIR, `invite-${theme}-v2.webp`);
      expect(fs.existsSync(assetPath)).toBe(true);
      expect(source).toContain(
        `${theme}: require('../assets/images/settings/referral_theme/invite-${theme}-v2.webp')`,
      );
    }
    expect(source).toContain("minimalDark: require('../assets/images/settings/referral_theme/invite-indigo-v2.webp')");
    expect(source).toContain("candyBlue: require('../assets/images/settings/referral_theme/invite-indigo-v2.webp')");
  });

  it('never reuses the same artwork for two themes', () => {
    // зачем: баг 2026-07-26 — на теме «Индиго» показывался volt-баннер.
    // Одинаковые файлы означают, что тема визуально не отличается.
    const files = fs.readdirSync(BANNER_DIR).filter((f) => f.endsWith('.webp'));
    const seen = new Map<string, string>();

    for (const file of files) {
      const digest = fs.readFileSync(path.join(BANNER_DIR, file)).toString('base64');
      const duplicate = seen.get(digest);
      expect(duplicate === undefined || `${duplicate} === ${file}`).toBe(true);
      seen.set(digest, file);
    }
  });

  it('ships unique 3:1 WebP art for Sage Porcelain', async () => {
    expect(fs.existsSync(SAGE_ASSET_PATH)).toBe(true);
    expect(path.extname(SAGE_ASSET_PATH)).toBe('.webp');

    const metadata = await sharp(SAGE_ASSET_PATH).metadata();
    expect(metadata.format).toBe('webp');
    expect(metadata.width).toBe(900);
    expect(metadata.height).toBe(300);

    const source = fs.readFileSync(COMPONENT_PATH, 'utf8');
    expect(source).toContain(
      "sagePorcelain: require('../assets/images/settings/referral_theme/invite-sagePorcelain-v2.webp')",
    );

    const sageDigest = crypto.createHash('sha256').update(fs.readFileSync(SAGE_ASSET_PATH)).digest('hex');
    for (const theme of RETAINED_BANNER_THEMES.filter((theme) => theme !== SAGE_THEME)) {
      const otherAsset = path.join(BANNER_DIR, `invite-${theme}-v2.webp`);
      expect(fs.existsSync(otherAsset)).toBe(true);
      const otherDigest = crypto.createHash('sha256').update(fs.readFileSync(otherAsset)).digest('hex');
      expect(sageDigest).not.toBe(otherDigest);
    }
  });

  it('resets the cached native frame when the theme changes', () => {
    // зачем: expo-image переиспользует нативную вьюху и держит кадр прошлой
    // темы. recyclingKey/key по теме — единственное, что сбрасывает картинку.
    const source = fs.readFileSync(COMPONENT_PATH, 'utf8');

    expect(source).toContain('recyclingKey={themeMode}');
    expect(source).toContain('key={themeMode}');
  });

  it('keeps referral banner art bundled in OTA updates', () => {
    // зачем: баннеры лежат во вложенной папке settings/referral_theme —
    // одиночная звёздочка её не покрывает и картинки не доедут в OTA.
    const appJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'app.json'), 'utf8'));
    const patterns: string[] = appJson.expo.updates.assetPatternsToBeBundled;

    expect(patterns).toContain('assets/images/settings/**/*');
    expect(patterns).not.toContain('assets/images/settings/*');
  });
});
