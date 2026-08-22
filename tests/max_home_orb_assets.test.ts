import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const root = path.join(__dirname, '..');
const resolverPath = path.join(root, 'app/max_home_orb_assets.ts');
const componentPath = path.join(root, 'components/home/MaxHomeOrb.tsx');

const themes = [
  'indigo',
  'sagePorcelain',
  'olive',
  'midnight',
  'ember',
  'aurora',
  'volt',
  'dark',
  'gold',
] as const;

const layers = ['shell', 'field', 'glints'] as const;

describe('MAX Home multilayer orb assets', () => {
  test('statically wires exactly three compact layers for every active theme', () => {
    const resolver = fs.readFileSync(resolverPath, 'utf8');

    for (const theme of themes) {
      for (const layer of layers) {
        const relative = `../assets/images/home_menu/max/${theme}/${layer}.webp`;
        expect(resolver).toContain(`require('${relative}')`);
        expect(fs.existsSync(path.join(root, relative.replace('../', '')))).toBe(true);
      }
    }

    expect(resolver).not.toContain('business/');
    expect(resolver).not.toContain('businessLight/');
    expect(resolver).not.toContain('wave');
    expect(resolver).not.toContain('orbit');
  });

  test('keeps the complete theme set small enough for the app bundle', () => {
    const files = themes.flatMap((theme) =>
      layers.map((layer) => path.join(root, `assets/images/home_menu/max/${theme}/${layer}.webp`)),
    );
    const sizes = files.map((file) => fs.statSync(file).size);

    expect(Math.max(...sizes)).toBeLessThanOrEqual(80_000);
    expect(sizes.reduce((sum, size) => sum + size, 0)).toBeLessThanOrEqual(900_000);
  });

  test('keeps every moving glint inside the orb instead of on or beyond its rim', async () => {
    const maxInnerRadius = 112;

    for (const theme of themes) {
      const file = path.join(root, `assets/images/home_menu/max/${theme}/glints.webp`);
      const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      const centerX = (info.width - 1) / 2;
      const centerY = (info.height - 1) / 2;
      let outerPixelCount = 0;

      for (let y = 0; y < info.height; y += 1) {
        for (let x = 0; x < info.width; x += 1) {
          const alpha = data[(y * info.width + x) * 4 + 3];
          if (alpha < 6) continue;
          if (Math.hypot(x - centerX, y - centerY) > maxInnerRadius) outerPixelCount += 1;
        }
      }

      expect({ theme, outerPixelCount }).toEqual({ theme, outerPixelCount: 0 });
    }
  });

  test('animates only the internal field, glints, and subtle shell lifecycle', () => {
    const component = fs.readFileSync(componentPath, 'utf8');

    expect(component).toContain('useRuntimeActive');
    expect(component).toContain('useReduceMotion');
    expect(component).toContain('cancelAnimation');
    expect(component).toContain('MAX_HOME_ORB_HYBRID');
    expect(component).toContain('layers.field');
    expect(component).toContain('layers.glints');
    expect(component).toContain('layers.shell');
    expect(component).not.toContain('wave');
    expect(component).not.toContain('orbit');
  });
});
